/**
 * RecipesProvider — manages saved recipes and recent searches.
 *
 * Storage strategy (Phase 4 — Supabase primary):
 *   • Supabase is the single source of truth. Every device has a real auth.uid()
 *     thanks to anonymous sign-in in AuthProvider, so RLS (family_id = auth.uid())
 *     always passes.
 *   • AsyncStorage is used as a write-through cache only — Supabase is read on
 *     mount, AsyncStorage is written to keep the cache warm for fast re-renders.
 *   • queryKey includes userId so TanStack Query re-fetches on sign-in / sign-out.
 *   • One-time cleanup (PHASE4_CLEANUP_KEY): on first launch after Phase 4, legacy
 *     AsyncStorage recipe data is wiped so the app starts fresh from Supabase.
 *
 * NOTE: useFilteredRecipes (the 300-line filter/sort hook) is unchanged — it lives
 *       below the provider export and reads from useRecipes() as before.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Recipe } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { recipeToRow, rowToRecipe, upsertRecipeToSupabase } from '@/services/db';
import { generateUUID } from '@/utils/uuid';
import { backfillMealImages } from '@/services/imageGeneration';

const RECIPES_KEY         = 'saved_recipes';
const RECENT_SEARCHES_KEY = 'recipes_recent_searches';
const PHASE4_CLEANUP_KEY  = 'phase4_cleanup_v1';

// One-time migration from old key
async function migrateFromLegacyKey() {
  try {
    const legacy = await AsyncStorage.getItem('favs_meals');
    if (legacy) {
      await AsyncStorage.setItem(RECIPES_KEY, legacy);
      await AsyncStorage.removeItem('favs_meals');
    }
  } catch (e) {
    console.error('[Recipes] Migration from legacy key failed:', e);
  }
}

export const [RecipesProvider, useRecipes] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  // ── One-time Phase 4 cleanup ──────────────────────────────────────────────
  // Wipes legacy AsyncStorage recipe data on first launch after Phase 4 so the
  // app starts with a clean slate. Runs exactly once per install.
  useEffect(() => {
    Promise.resolve()
      .then(() => migrateFromLegacyKey())
      .then(() => AsyncStorage.getItem(PHASE4_CLEANUP_KEY))
      .then((done) => {
        if (!done) {
          console.log('[Recipes] Phase 4 cleanup: wiping legacy AsyncStorage data');
          return Promise.all([
            AsyncStorage.removeItem(RECIPES_KEY),
            AsyncStorage.removeItem(RECENT_SEARCHES_KEY),
          ]).then(() => AsyncStorage.setItem(PHASE4_CLEANUP_KEY, 'done'));
        }
      })
      .catch(console.error);
  }, []);

  const [meals, setMeals] = useState<Recipe[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // ── Main recipes query ────────────────────────────────────────────────────
  const recipesQuery = useQuery({
    queryKey: ['recipes', userId],
    queryFn: async (): Promise<Recipe[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('recipes')
          .select('*, recipe_ingredients(*), recipe_method_steps(*)')
          .eq('family_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Recipes] Supabase fetch error:', error.message);
        } else if (data) {
          const recipes = data.map((row) => rowToRecipe(row as Record<string, unknown>));
          const seen = new Set<string>();
          const unique = recipes.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          console.log('[Recipes] Loaded from Supabase:', unique.length, 'recipes');
          // Keep AsyncStorage in sync
          AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(unique)).catch(console.error);
          return unique;
        }
      }

      // Fallback to AsyncStorage (not authenticated or Supabase error)
      try {
        const stored = await AsyncStorage.getItem(RECIPES_KEY);
        if (stored) {
          console.log('[Recipes] Loaded from AsyncStorage');
          const parsed = JSON.parse(stored) as Recipe[];
          const seen = new Set<string>();
          const unique = parsed.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });

          return unique;
        }
      } catch (e) {
        console.error('[Recipes] AsyncStorage load error:', e);
      }
      return [];
    },
  });

  // ── Recent searches query ─────────────────────────────────────────────────
  const searchesQuery = useQuery({
    queryKey: ['recipesRecentSearches', userId],
    queryFn: async (): Promise<string[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('recent_searches')
          .select('search_term')
          .eq('family_id', userId)
          .order('searched_at', { ascending: false })
          .limit(10);
        if (!error && data) {
          return data.map((r: Record<string, string>) => r.search_term);
        }
      }
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('[Recipes] Error loading searches:', e);
      }
      return [];
    },
  });

  useEffect(() => {
    if (recipesQuery.data) setMeals(recipesQuery.data);
  }, [recipesQuery.data]);

  useEffect(() => {
    if (searchesQuery.data) setRecentSearches(searchesQuery.data);
  }, [searchesQuery.data]);

  // ── One-time backfill: generate AI images for recipes that have none ────
  const backfillRanRef = useRef(false);
  const recipesLoaded = recipesQuery.isSuccess && !!recipesQuery.data;
  useEffect(() => {
    if (backfillRanRef.current) return;
    if (!userId || !recipesLoaded || !recipesQuery.data) return;
    const recipesWithoutImages = recipesQuery.data.filter((r) => !r.image_url);
    if (recipesWithoutImages.length === 0) return;

    backfillRanRef.current = true;
    console.log(`[Recipes] Backfilling images for ${recipesWithoutImages.length} recipes`);

    backfillMealImages(userId, Math.min(recipesWithoutImages.length, 5), (recipeId, imageUrl) => {
      // Use functional update to avoid stale closure over mealsRef —
      // prevents race condition with concurrent manual image generation.
      setMeals((prev) => {
        const updated = prev.map((m) =>
          m.id === recipeId ? { ...m, image_url: imageUrl } : m,
        );
        mealsRef.current = updated;
        saveMutateRef.current(updated);
        return updated;
      });
      console.log('[Recipes] Backfill updated image for:', recipeId);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, recipesLoaded]);

  const mealsRef = useRef(meals);
  mealsRef.current = meals;
  const recentSearchesRef = useRef(recentSearches);
  recentSearchesRef.current = recentSearches;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Save mutation (AsyncStorage + Supabase upsert) ─────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (updated: Recipe[]) => {
      await AsyncStorage.setItem(RECIPES_KEY, JSON.stringify(updated));
      console.log('[Recipes] Saved, count:', updated.length);
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['recipes', userIdRef.current], d),
  });

  const saveSearchesMutation = useMutation({
    mutationFn: async (updated: string[]) => {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['recipesRecentSearches', userIdRef.current], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;
  const saveSearchesMutateRef = useRef(saveSearchesMutation.mutate);
  saveSearchesMutateRef.current = saveSearchesMutation.mutate;

  // ── Supabase background sync helper ──────────────────────────────────────
  // Returns the upsert Promise so callers that need write-ordering (e.g. adding
  // to the meal plan immediately after saving a new recipe) can await it before
  // writing FK-dependent rows like planned_meals.
  // Returns a Promise that rejects on failure — callers that need write-ordering
  // (syncRecipeNow) can catch and decide whether to skip downstream FK writes.
  const syncToSupabase = useCallback((recipe: Recipe): Promise<void> => {
    const uid = userIdRef.current;
    if (!uid) return Promise.resolve();
    return upsertRecipeToSupabase(recipe, uid, getSupabase());
  }, []);

  const deleteFromSupabase = useCallback((recipeId: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('recipes')
      .delete()
      .eq('id', recipeId)
      .eq('family_id', uid)
      .then(({ error }) => {
        if (error) console.error('[Recipes] Supabase delete error:', error.message);
      });
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────

  const addRecipe = useCallback((meal: Recipe, options?: { skipSync?: boolean }) => {
    const exists = mealsRef.current.find((m) => m.id === meal.id);
    if (exists) {
      console.log('[Recipes] Meal already saved:', meal.name);
      return false;
    }
    const updated = [meal, ...mealsRef.current];
    mealsRef.current = updated;
    setMeals(updated);
    saveMutateRef.current(updated);
    // Fire-and-forget — errors logged but not propagated.
    // Callers needing write-ordering should use syncRecipeNow() separately
    // and pass { skipSync: true } to avoid a race condition that duplicates
    // ingredients/method_steps rows (DELETE+INSERT interleaving).
    if (!options?.skipSync) {
      syncToSupabase(meal).catch((e) =>
        console.error('[Recipes] Background Supabase upsert error:', e)
      );
    }
    console.log('[Recipes] Added:', meal.name);
    return true;
  }, [syncToSupabase]);

  const removeRecipe = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    mealsRef.current = updated;
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteFromSupabase(mealId);
    console.log('[Recipes] Removed:', mealId);
  }, [deleteFromSupabase]);

  const updateRecipe = useCallback((mealId: string, partial: Partial<Recipe>) => {
    const updated = mealsRef.current.map((m) => {
      if (m.id !== mealId) return m;
      return { ...m, ...partial };
    });
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === mealId);
    if (updatedMeal) syncToSupabase(updatedMeal);
    console.log('[Recipes] Updated:', mealId);
  }, [syncToSupabase]);

  const incrementPlanCount = useCallback((mealId: string) => {
    const now = new Date().toISOString().split('T')[0];
    const updated = mealsRef.current.map((m) =>
      m.id === mealId
        ? { ...m, add_to_plan_count: m.add_to_plan_count + 1, last_planned_date: now }
        : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === mealId);
    if (updatedMeal) {
      const uid = userIdRef.current;
      if (uid) {
        getSupabase()
          .from('recipes')
          .update({ add_to_plan_count: updatedMeal.add_to_plan_count, last_planned_date: now })
          .eq('id', mealId)
          .eq('family_id', uid)
          .then(({ error }) => {
            if (error) console.error('[Recipes] incrementPlanCount Supabase error:', error.message);
          });
      }
    }
  }, []);

  const isSaved = useCallback((mealId: string): boolean => {
    return mealsRef.current.some((m) => m.id === mealId);
  }, []);

  const isSavedByName = useCallback((mealName: string): boolean => {
    return mealsRef.current.some((m) => m.name.toLowerCase() === mealName.toLowerCase());
  }, []);


  const addRecentSearch = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed) return;
    const updated = [trimmed, ...recentSearchesRef.current.filter((s) => s !== trimmed)].slice(0, 10);
    setRecentSearches(updated);
    saveSearchesMutateRef.current(updated);
    // Also write to Supabase recent_searches table
    const uid = userIdRef.current;
    if (uid) {
      getSupabase()
        .from('recent_searches')
        .upsert(
          { family_id: uid, search_term: trimmed, searched_at: new Date().toISOString() },
          { onConflict: 'family_id,search_term' }
        )
        .then(({ error }) => {
          if (error) console.error('[Recipes] recent_searches Supabase error:', error.message);
        });
    }
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveSearchesMutateRef.current([]);
    const uid = userIdRef.current;
    if (uid) {
      getSupabase()
        .from('recent_searches')
        .delete()
        .eq('family_id', uid)
        .then(({ error }) => {
          if (error) console.error('[Recipes] clear recent_searches error:', error.message);
        });
    }
  }, []);

  const isLoading = recipesQuery.isLoading;

  return {
    meals,
    recentSearches,
    isLoading,
    addRecipe,
    removeRecipe,
    updateRecipe,
    incrementPlanCount,
    isSaved,
    isSavedByName,
    addRecentSearch,
    clearRecentSearches,
    // Exposed so call sites that immediately follow addRecipe with addMeal can
    // sequence the writes: syncRecipeNow(recipe).then(() => addMeal(...))
    // This prevents the planned_meals FK violation that occurs when the recipe
    // hasn't landed in Supabase yet when the planned_meal row is inserted.
    syncRecipeNow: syncToSupabase,
  };
});

import { RecipeFilterState } from '@/components/RecipeFilterSheet';

// ─── Dietary filter helper ───────────────────────────────────────────────────

/**
 * Checks whether a meal satisfies a single dietary filter key.
 * Checks dietary_tags (legacy string array), diet_labels (Spoonacular positive labels),
 * and allergens (free-from list) to cover all data sources.
 */
function matchesDietaryKey(
  m: { dietary_tags?: string[]; diet_labels?: string[]; allergens?: string[] },
  key: string
): boolean {
  const tags      = m.dietary_tags ?? [];
  const labels    = m.diet_labels  ?? [];
  const allergens = m.allergens    ?? [];

  switch (key) {
    case 'vegan':        return tags.includes('Vegan')        || labels.includes('vegan')       || allergens.includes('vegan');
    case 'vegetarian':   return tags.includes('Vegetarian')   || labels.includes('vegetarian');
    case 'gluten_free':  return tags.includes('Gluten-Free')  || labels.includes('gluten-free') || allergens.includes('gluten-free');
    case 'dairy_free':   return tags.includes('Dairy-Free')   || labels.includes('dairy-free')  || allergens.includes('dairy-free');
    case 'high_protein': return tags.includes('High Protein') || labels.includes('high-protein');
    case 'low_carb':     return tags.includes('Low Carb')     || labels.includes('low-carb');
    case 'keto':         return labels.includes('keto');
    case 'paleo':        return labels.includes('paleo');
    case 'whole30':      return labels.includes('whole30');
    case 'nut_free':     return allergens.includes('nut-free');
    default:             return true;
  }
}

/**
 * Keyword map for ingredient-based protein detection.
 * Used as a fallback when protein_source is not set on a saved meal.
 */
const PROTEIN_INGREDIENT_KEYWORDS: Record<string, string[]> = {
  chicken: ['chicken', 'poultry'],
  beef:    ['beef', 'steak', 'mince', 'brisket', 'veal', 'burger patty'],
  pork:    ['pork', 'bacon', 'ham', 'prosciutto', 'sausage', 'salami', 'chorizo', 'pancetta'],
  lamb:    ['lamb', 'mutton'],
  turkey:  ['turkey'],
  seafood: ['salmon', 'tuna', 'shrimp', 'prawn', 'crab', 'lobster', 'cod', 'tilapia',
            'snapper', 'mackerel', 'anchovy', 'sardine', 'squid', 'halibut', 'sea bass',
            'trout', 'mahi', 'scallop', 'mussel', 'oyster', 'clam', 'seafood', 'fish fillet'],
  egg:     ['egg', 'eggs'],
  dairy:   ['cheese', 'cream', 'milk', 'butter', 'yogurt', 'yoghurt', 'ricotta',
            'brie', 'cheddar', 'mozzarella', 'feta', 'parmesan', 'gouda', 'halloumi'],
  plant:   ['tofu', 'tempeh', 'lentil', 'chickpea', 'kidney bean', 'black bean', 'edamame',
            'soy', 'seitan', 'jackfruit'],
  none:    [],
};

function deriveProteinFromIngredients(
  ingredients: { name: string }[],
  targetProtein: string,
): boolean {
  const keywords = PROTEIN_INGREDIENT_KEYWORDS[targetProtein];
  if (!keywords || keywords.length === 0) return false;

  const ingredientText = ingredients.map((i) => i.name.toLowerCase()).join(' | ');

  if (targetProtein === 'egg') {
    return /\beggs?\b/.test(ingredientText) && !/eggplant/.test(ingredientText);
  }

  return keywords.some((kw) => ingredientText.includes(kw));
}

export function useFilteredRecipes(
  search: string,
  filters: RecipeFilterState & {
    inlineMealType?:  string;
    inlineDishType?:  string;
    inlineProtein?:   string;
    inlineDietLabel?: string;
  }
) {
  const { meals } = useRecipes();

  return useMemo(() => {
    let result = [...meals];

    // ── Text search ─────────────────────────────────────────────────────────
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.ingredients.some((i) => i.name.toLowerCase().includes(q)) ||
          (m.cuisine && m.cuisine.toLowerCase().includes(q))
      );
    }

    // ── Meal type ───────────────────────────────────────────────────────────
    if (filters.mealType) {
      result = result.filter((m) => m.meal_type === filters.mealType);
    }
    const inlineMT = filters.inlineMealType;
    if (inlineMT && inlineMT !== 'all') {
      result = result.filter((m) => m.meal_type === inlineMT);
    }

    // ── Dish type ───────────────────────────────────────────────────────────
    if (filters.dishTypes.length > 0) {
      result = result.filter((m) => !!m.dish_category && filters.dishTypes.includes(m.dish_category));
    }
    const inlineDT = filters.inlineDishType;
    if (inlineDT && inlineDT !== 'all') {
      result = result.filter((m) => m.dish_category === inlineDT);
    }

    // ── Cuisine ─────────────────────────────────────────────────────────────
    if (filters.cuisines.length > 0) {
      result = result.filter((m) => !!m.cuisine && filters.cuisines.includes(m.cuisine));
    }

    // ── Protein ─────────────────────────────────────────────────────────────
    if (filters.protein.length > 0) {
      result = result.filter((m) =>
        m.protein_source
          ? filters.protein.includes(m.protein_source)
          : filters.protein.some((p) => deriveProteinFromIngredients(m.ingredients, p))
      );
    }
    const inlineP = filters.inlineProtein;
    if (inlineP && inlineP !== 'all') {
      result = result.filter((m) =>
        m.protein_source
          ? m.protein_source === inlineP
          : deriveProteinFromIngredients(m.ingredients, inlineP)
      );
    }

    // ── Cook time ───────────────────────────────────────────────────────────
    if (filters.cookTime) {
      result = result.filter((m) => m.cooking_time_band === filters.cookTime);
    }

    // ── Dietary ─────────────────────────────────────────────────────────────
    if (filters.dietary.length > 0) {
      result = result.filter((m) => filters.dietary.every((key) => matchesDietaryKey(m, key)));
    }
    const inlineDL = filters.inlineDietLabel;
    if (inlineDL && inlineDL !== 'all') {
      result = result.filter((m) => {
        const labels    = m.diet_labels ?? [];
        const allergens = m.allergens   ?? [];
        return labels.includes(inlineDL) || allergens.includes(inlineDL);
      });
    }

    // ── Calories ────────────────────────────────────────────────────────────
    if (filters.calories === 'under_400') {
      result = result.filter((m) => (m.calories_per_serving ?? 0) < 400);
    } else if (filters.calories === '400_600') {
      result = result.filter((m) => {
        const cal = m.calories_per_serving ?? 0;
        return cal >= 400 && cal <= 600;
      });
    } else if (filters.calories === 'over_600') {
      result = result.filter((m) => (m.calories_per_serving ?? 0) > 600);
    }

    // ── Source ──────────────────────────────────────────────────────────────
    if (filters.source) {
      result = result.filter((m) => m.source === filters.source);
    }

    // ── Rating ──────────────────────────────────────────────────────────────
    if (filters.rating === 'loved') {
      result = result.filter((m) => m.rating === 'loved');
    } else if (filters.rating === 'liked') {
      result = result.filter((m) => m.rating === 'liked');
    } else if (filters.rating === 'unrated') {
      result = result.filter((m) => !m.rating);
    }

    // ── Sort ────────────────────────────────────────────────────────────────
    switch (filters.sort) {
      case 'most_used':
        result.sort((a, b) => b.add_to_plan_count - a.add_to_plan_count);
        break;
      case 'recently_added':
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        break;
      case 'recently_planned':
        result.sort((a, b) => {
          if (!a.last_planned_date) return 1;
          if (!b.last_planned_date) return -1;
          return b.last_planned_date.localeCompare(a.last_planned_date);
        });
        break;
      case 'cooking_time':
        result.sort((a, b) => (a.cook_time ?? 999) - (b.cook_time ?? 999));
        break;
      case 'a_to_z':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        result.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }

    return result;
  }, [meals, search, filters]);
}
