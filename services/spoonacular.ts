/**
 * Spoonacular client service
 *
 * All calls are proxied through the `spoonacular` Supabase Edge Function
 * so the API key never appears on the client.
 *
 * Uses the lazy-read pattern (functions, not module-level consts) to comply
 * with Rork's bundler rules. See CLAUDE.md §Architectural Rules.
 */

import { DiscoverMeal } from '@/types';
import { RecipeFilterState } from '@/components/RecipeFilterSheet';

// ── Lazy env readers ──────────────────────────────────────────────────────────
function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}
function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

// ── Core Edge Function caller ─────────────────────────────────────────────────
async function callEdgeFunction<T>(body: Record<string, unknown>): Promise<T> {
  const url = `${getSupabaseUrl()}/functions/v1/spoonacular`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getSupabaseAnonKey()}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Spoonacular Edge Function error: ${res.status} — ${text}`);
  }

  return res.json() as Promise<T>;
}

// ── Filter → Spoonacular params mapping ──────────────────────────────────────

/**
 * Maps the app's RecipeFilterState + search query to Spoonacular complexSearch params.
 *
 * Dietary handling:
 *   - Spoonacular `diet` accepts a single value; we pick the most restrictive.
 *   - Dietary intolerances (gluten-free, dairy-free, nut-free) go into `intolerances`.
 *   - `dietary` array in RecipeFilterState uses underscore keys (e.g. 'gluten_free').
 *   - `intolerances` array uses hyphen keys (e.g. 'gluten-free').
 */
function filtersToSpoonacularParams(
  filters: RecipeFilterState,
  query: string,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};

  if (query.trim()) params.query = query.trim();

  // ── Meal type ──
  if (filters.mealType === 'breakfast')    params.mealType = 'breakfast';
  if (filters.mealType === 'lunch_dinner') params.mealType = 'main course';
  if (filters.mealType === 'light_bites')  params.mealType = 'appetizer,snack';

  // ── Cuisine ──
  if (filters.cuisines.length > 0) params.cuisine = filters.cuisines.join(',');

  // ── Diet (single most-restrictive value) ──
  const dietPriority = ['vegan', 'vegetarian', 'ketogenic', 'paleo', 'whole30'] as const;
  const spoonacularDietMap: Record<string, string> = {
    vegan:        'vegan',
    vegetarian:   'vegetarian',
    keto:         'ketogenic',
    paleo:        'paleo',
    whole30:      'whole30',
  };
  for (const dietKey of dietPriority) {
    const appKey = Object.entries(spoonacularDietMap).find(([, v]) => v === dietKey)?.[0];
    if (appKey && filters.dietary.includes(appKey)) {
      params.diet = dietKey;
      break;
    }
  }

  // ── Intolerances (from both `dietary` and `intolerances` arrays) ──
  const intolerances: string[] = [];
  if (filters.dietary.includes('gluten_free') || filters.intolerances.includes('gluten-free')) {
    intolerances.push('gluten');
  }
  if (filters.dietary.includes('dairy_free') || filters.intolerances.includes('dairy-free')) {
    intolerances.push('dairy');
  }
  if (filters.dietary.includes('nut_free') || filters.intolerances.includes('nut-free')) {
    intolerances.push('peanut,tree nut');
  }
  if (intolerances.length > 0) params.intolerances = intolerances.join(',');

  // ── Cook time ──
  if (filters.cookTime === 'Under 30')  params.maxReadyTime = 30;
  if (filters.cookTime === '30-60')     params.maxReadyTime = 60;
  // 'Over 60' has no meaningful upper bound; omit.

  // ── Calories ──
  if (filters.calories === 'under_400')  params.maxCalories = 400;
  if (filters.calories === '400_600') {
    params.minCalories = 400;
    params.maxCalories = 600;
  }
  if (filters.calories === 'over_600')   params.minCalories = 600;

  return params;
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface DiscoverSearchResult {
  meals:        DiscoverMeal[];
  offset:       number;
  number:       number;
  totalResults: number;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Search Spoonacular recipes with optional filters + pagination.
 *
 * @param filters   Active RecipeFilterState from the filter sheet
 * @param query     Search text (empty = browse mode)
 * @param offset    Pagination offset (0-based)
 * @param number    Number of results to return (max 100)
 */
export async function searchDiscover(
  filters: RecipeFilterState,
  query: string,
  offset = 0,
  number = 20,
): Promise<DiscoverSearchResult> {
  const params = filtersToSpoonacularParams(filters, query);
  return callEdgeFunction<DiscoverSearchResult>({
    type: 'search',
    ...params,
    offset,
    number,
  });
}

/**
 * Fetch full recipe details for a single Spoonacular recipe.
 * Use this when navigating to recipe-detail for a Spoonacular-sourced meal.
 */
export async function getSpoonacularDetail(spoonacularId: number): Promise<DiscoverMeal> {
  const result = await callEdgeFunction<{ meal: DiscoverMeal }>({
    type: 'detail',
    id: spoonacularId,
  });
  return result.meal;
}
