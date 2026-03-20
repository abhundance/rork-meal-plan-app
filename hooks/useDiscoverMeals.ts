/**
 * useDiscoverMeals
 *
 * TanStack Query hook that fetches curated recipes directly from Supabase.
 * Replaces the previous Spoonacular-backed version — no external API calls,
 * no quota, works offline once data is cached.
 *
 * Filtering is done in Postgres (server-side) so we only fetch what's needed.
 * Pagination uses range-based offset/limit.
 *
 * Usage:
 *   const { meals, isLoading, fetchNextPage, hasNextPage } =
 *     useDiscoverMeals(filters, searchQuery);
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { RecipeFilterState, DEFAULT_FILTER_STATE } from '@/components/RecipeFilterSheet';
import { DiscoverMeal } from '@/types';
import { getSupabase } from '@/services/supabase';

const PAGE_SIZE = 20;
const STALE_TIME_MS = 10 * 60 * 1000; // 10 min — static data, re-fetch infrequently

export interface DiscoverPageResult {
  meals: DiscoverMeal[];
  offset: number;
  count: number;
  hasMore: boolean;
}

export interface UseDiscoverMealsResult {
  meals:               DiscoverMeal[];
  isLoading:           boolean;
  isError:             boolean;
  isFetchingNextPage:  boolean;
  hasNextPage:         boolean;
  fetchNextPage:       () => void;
  refetch:             () => void;
}

async function fetchCuratedRecipes(
  filters: RecipeFilterState,
  query: string,
  offset: number,
  limit: number,
): Promise<DiscoverPageResult> {
  const sb = getSupabase();

  // ── Build query ────────────────────────────────────────────────────────────
  let q = sb
    .from('recipes')
    .select(`
      id, name, image_url, description, source,
      cuisine, cuisines, meal_type, cooking_time_band, prep_time, cook_time,
      dish_category, protein_source, occasions,
      is_vegan, is_vegetarian, is_gluten_free, is_dairy_free,
      allergens, diet_labels, dietary_tags,
      taste_sweetness, taste_saltiness, taste_sourness, taste_bitterness,
      taste_savoriness, taste_fattiness, taste_spiciness,
      calories_per_serving, protein_per_serving_g, carbs_per_serving_g,
      health_score, recipe_serving_size, add_to_plan_count,
      created_at,
      recipe_ingredients ( id, name, quantity, unit, category, position ),
      recipe_method_steps ( id, step_text, position )
    `, { count: 'exact' })
    .eq('source', 'curated')
    .order('health_score', { ascending: false })
    .range(offset, offset + limit - 1);

  // ── Text search ────────────────────────────────────────────────────────────
  if (query.trim()) {
    q = q.ilike('name', `%${query.trim()}%`);
  }

  // ── Filters ────────────────────────────────────────────────────────────────
  if (filters.mealType) {
    q = q.eq('meal_type', filters.mealType);
  }

  if (filters.dishTypes.length > 0) {
    q = q.in('dish_category', filters.dishTypes);
  }

  if (filters.cuisines.length > 0) {
    q = q.overlaps('cuisines', filters.cuisines);
  }

  if (filters.protein.length > 0) {
    q = q.in('protein_source', filters.protein);
  }

  if (filters.cookTime) {
    q = q.eq('cooking_time_band', filters.cookTime);
  }

  if (filters.occasions.length > 0) {
    q = q.overlaps('occasions', filters.occasions);
  }

  // Dietary filters — map underscore keys to boolean columns / array overlap
  if (filters.dietary.length > 0) {
    for (const d of filters.dietary) {
      switch (d) {
        case 'vegan':       q = q.eq('is_vegan', true); break;
        case 'vegetarian':  q = q.eq('is_vegetarian', true); break;
        case 'gluten_free': q = q.eq('is_gluten_free', true); break;
        case 'dairy_free':  q = q.eq('is_dairy_free', true); break;
        default:
          // keto, paleo, high-protein, etc. stored in diet_labels array
          q = q.contains('diet_labels', [d.replace('_', '-')]);
      }
    }
  }

  // Spice: mild 0-25, medium 26-60, hot 61+
  if (filters.spiceLevel) {
    switch (filters.spiceLevel) {
      case 'mild':   q = q.lte('taste_spiciness', 25); break;
      case 'medium': q = q.gte('taste_spiciness', 26).lte('taste_spiciness', 60); break;
      case 'hot':    q = q.gte('taste_spiciness', 61); break;
    }
  }

  // Calories
  if (filters.calories) {
    switch (filters.calories) {
      case 'under_400': q = q.lt('calories_per_serving', 400); break;
      case '400_600':   q = q.gte('calories_per_serving', 400).lte('calories_per_serving', 600); break;
      case 'over_600':  q = q.gt('calories_per_serving', 600); break;
    }
  }

  const { data, error, count } = await q;
  if (error) throw new Error(error.message);

  // ── Map Supabase rows → DiscoverMeal ───────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const meals: DiscoverMeal[] = (data ?? []).map((row: any) => ({
    id:          row.id,
    name:        row.name,
    image_url:   row.image_url ?? undefined,
    description: row.description ?? '',
    source:      row.source,
    created_at:  row.created_at,

    cuisine:           row.cuisine ?? '',
    cuisines:          row.cuisines ?? [],
    meal_type:         row.meal_type ?? 'lunch_dinner',
    cooking_time_band: row.cooking_time_band ?? 'Under 30',
    prep_time:         row.prep_time ?? 0,
    cook_time:         row.cook_time ?? 0,
    dish_category:     row.dish_category ?? 'main',
    protein_source:    row.protein_source ?? 'none',
    occasions:         row.occasions ?? [],

    is_vegan:       row.is_vegan       ?? false,
    is_vegetarian:  row.is_vegetarian  ?? false,
    is_gluten_free: row.is_gluten_free ?? false,
    is_dairy_free:  row.is_dairy_free  ?? false,
    allergens:      row.allergens      ?? [],
    diet_labels:    row.diet_labels    ?? [],
    dietary_tags:   row.dietary_tags   ?? [],

    taste_sweetness:  row.taste_sweetness  ?? 0,
    taste_saltiness:  row.taste_saltiness  ?? 0,
    taste_sourness:   row.taste_sourness   ?? 0,
    taste_bitterness: row.taste_bitterness ?? 0,
    taste_savoriness: row.taste_savoriness ?? 0,
    taste_fattiness:  row.taste_fattiness  ?? 0,
    taste_spiciness:  row.taste_spiciness  ?? 0,

    calories_per_serving:  row.calories_per_serving  ?? 0,
    protein_per_serving_g: row.protein_per_serving_g ?? 0,
    carbs_per_serving_g:   row.carbs_per_serving_g   ?? 0,
    health_score:          row.health_score          ?? 0,

    recipe_serving_size: row.recipe_serving_size ?? 2,
    add_to_plan_count:   row.add_to_plan_count   ?? 0,

    ingredients: (row.recipe_ingredients ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.position - b.position)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((i: any) => ({
        id:       i.id,
        name:     i.name,
        quantity: i.quantity,
        unit:     i.unit,
        category: i.category,
      })),

    method_steps: (row.recipe_method_steps ?? [])
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => a.position - b.position)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((s: any) => s.step_text),
  }));

  const totalCount = count ?? 0;
  return {
    meals,
    offset,
    count: totalCount,
    hasMore: offset + meals.length < totalCount,
  };
}

export function useDiscoverMeals(
  filters: RecipeFilterState = DEFAULT_FILTER_STATE,
  query = '',
): UseDiscoverMealsResult {
  const result = useInfiniteQuery({
    queryKey: ['discoverMeals', filters, query],

    queryFn: async ({ pageParam }: { pageParam: number }): Promise<DiscoverPageResult> => {
      return fetchCuratedRecipes(filters, query, pageParam, PAGE_SIZE);
    },

    initialPageParam: 0,
    getNextPageParam: (lastPage: DiscoverPageResult): number | undefined => {
      if (!lastPage.hasMore) return undefined;
      return lastPage.offset + PAGE_SIZE;
    },

    staleTime: STALE_TIME_MS,
  });

  const meals: DiscoverMeal[] =
    result.data?.pages.flatMap((page) => page.meals) ?? [];

  return {
    meals,
    isLoading:          result.isLoading,
    isError:            result.isError,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage:        result.hasNextPage ?? false,
    fetchNextPage:      () => { void result.fetchNextPage(); },
    refetch:            () => { void result.refetch(); },
  };
}
