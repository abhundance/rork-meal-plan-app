/**
 * FavsProvider — manages saved recipes (Favs) and recent searches.
 *
 * Storage strategy (dual-write):
 *   • AsyncStorage is ALWAYS written — works offline / logged-out.
 *   • When authenticated, recipes are also synced to Supabase in the background.
 *     Supabase stores recipes in three tables: recipes, recipe_ingredients, recipe_method_steps.
 *   • queryKey includes userId so TanStack Query re-fetches on sign-in / sign-out.
 *   • On first sign-in: existing AsyncStorage recipes are upserted to Supabase.
 *
 * NOTE: useFilteredFavs (the 300-line filter/sort hook) is unchanged — it lives
 *       below the provider export and reads from useFavs() as before.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Recipe, DiscoverMeal } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { recipeToRow, rowToRecipe, upsertRecipeToSupabase } from '@/services/db';

const FAVS_KEY            = 'favs_meals';
const RECENT_SEARCHES_KEY = 'favs_recent_searches';

export const [FavsProvider, useFavs] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [meals, setMeals] = useState<Recipe[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // ── Main recipes query ────────────────────────────────────────────────────
  const favsQuery = useQuery({
    queryKey: ['favsMeals', userId],
    queryFn: async (): Promise<Recipe[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('recipes')
          .select('*, recipe_ingredients(*), recipe_method_steps(*)')
          .eq('family_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[Favs] Supabase fetch error:', error.message);
        } else if (data) {
          const recipes = data.map((row) => rowToRecipe(row as Record<string, unknown>));
          const seen = new Set<string>();
          const unique = recipes.filter((r) => {
            if (seen.has(r.id)) return false;
            seen.add(r.id);
            return true;
          });
          console.log('[Favs] Loaded from Supabase:', unique.length, 'recipes');
          // Keep AsyncStorage in sync
          AsyncStorage.setItem(FAVS_KEY, JSON.stringify(unique)).catch(console.error);
          return unique;
        }
      }

      // Fallback to AsyncStorage (not authenticated or Supabase error)
      try {
        const stored = await AsyncStorage.getItem(FAVS_KEY);
        if (stored) {
          console.log('[Favs] Loaded from AsyncStorage');
          const parsed = JSON.parse(stored) as Recipe[];
          const seen = new Set<string>();
          const unique = parsed.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });

          // If authenticated and we fell back to AsyncStorage, seed Supabase
          if (userId && unique.length > 0) {
            console.log('[Favs] Seeding', unique.length, 'recipes to Supabase');
            Promise.all(
              unique.map((r) => upsertRecipeToSupabase(r, userId, getSupabase()))
            ).catch(console.error);
          }
          return unique;
        }
      } catch (e) {
        console.error('[Favs] AsyncStorage load error:', e);
      }
      return [];
    },
  });

  // ── Recent searches query ─────────────────────────────────────────────────
  const searchesQuery = useQuery({
    queryKey: ['favsRecentSearches', userId],
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
        console.error('[Favs] Error loading searches:', e);
      }
      return [];
    },
  });

  useEffect(() => {
    if (favsQuery.data) setMeals(favsQuery.data);
  }, [favsQuery.data]);

  useEffect(() => {
    if (searchesQuery.data) setRecentSearches(searchesQuery.data);
  }, [searchesQuery.data]);

  const mealsRef = useRef(meals);
  mealsRef.current = meals;
  const recentSearchesRef = useRef(recentSearches);
  recentSearchesRef.current = recentSearches;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Save mutation (AsyncStorage + Supabase upsert) ─────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (updated: Recipe[]) => {
      await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(updated));
      console.log('[Favs] Saved, count:', updated.length);
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['favsMeals', userIdRef.current], d),
  });

  const saveSearchesMutation = useMutation({
    mutationFn: async (updated: string[]) => {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['favsRecentSearches', userIdRef.current], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;
  const saveSearchesMutateRef = useRef(saveSearchesMutation.mutate);
  saveSearchesMutateRef.current = saveSearchesMutation.mutate;

  // ── Supabase background sync helper ──────────────────────────────────────
  const syncToSupabase = useCallback((recipe: Recipe) => {
    const uid = userIdRef.current;
    if (!uid) return;
    upsertRecipeToSupabase(recipe, uid, getSupabase()).catch((e) =>
      console.error('[Favs] Supabase upsert error:', e)
    );
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
        if (error) console.error('[Favs] Supabase delete error:', error.message);
      });
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────

  const addFav = useCallback((meal: Recipe) => {
    const exists = mealsRef.current.find((m) => m.id === meal.id);
    if (exists) {
      console.log('[Favs] Meal already in favs:', meal.name);
      return false;
    }
    const updated = [meal, ...mealsRef.current];
    mealsRef.current = updated;
    setMeals(updated);
    saveMutateRef.current(updated);
    syncToSupabase(meal);
    console.log('[Favs] Added:', meal.name);
    return true;
  }, [syncToSupabase]);

  const removeFav = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    mealsRef.current = updated;
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteFromSupabase(mealId);
    console.log('[Favs] Removed:', mealId);
  }, [deleteFromSupabase]);

  const updateFav = useCallback((mealId: string, partial: Partial<Recipe>) => {
    const updated = mealsRef.current.map((m) => {
      if (m.id !== mealId) return m;
      const customizedPatch = m.source === 'discover' && !m.is_customized ? { is_customized: true } : {};
      return { ...m, ...partial, ...customizedPatch };
    });
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === mealId);
    if (updatedMeal) syncToSupabase(updatedMeal);
    console.log('[Favs] Updated:', mealId);
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
            if (error) console.error('[Favs] incrementPlanCount Supabase error:', error.message);
          });
      }
    }
  }, []);

  const isFav = useCallback((mealId: string): boolean => {
    return mealsRef.current.some((m) => m.id === mealId);
  }, []);

  const isFavByName = useCallback((mealName: string): boolean => {
    return mealsRef.current.some((m) => m.name.toLowerCase() === mealName.toLowerCase());
  }, []);

  const addFromDiscover = useCallback((discoverMeal: DiscoverMeal): Recipe => {
    const recipe: Recipe = {
      id: discoverMeal.id,
      name: discoverMeal.name,
      source: 'discover',
      ingredients: discoverMeal.ingredients,
      recipe_serving_size: discoverMeal.recipe_serving_size,
      method_steps: discoverMeal.method_steps,
      dietary_tags: [
        ...discoverMeal.dietary_tags,
        ...(discoverMeal.is_dairy_free && !discoverMeal.dietary_tags.includes('Dairy-Free')
          ? ['Dairy-Free'] : []),
      ],
      custom_tags: [],
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: discoverMeal.ingredients.length > 0,
      is_recipe_complete: discoverMeal.method_steps.length > 0,
      image_url: discoverMeal.image_url,
      description: discoverMeal.description,
      cuisine: discoverMeal.cuisine,
      cuisines: discoverMeal.cuisines,
      meal_type: discoverMeal.meal_type,
      cooking_time_band: discoverMeal.cooking_time_band,
      prep_time: discoverMeal.prep_time,
      cook_time: discoverMeal.cook_time,
      dish_category: discoverMeal.dish_category,
      protein_source: discoverMeal.protein_source,
      occasions: discoverMeal.occasions,
      allergens: discoverMeal.allergens,
      diet_labels: discoverMeal.diet_labels,
      taste_sweetness: discoverMeal.taste_sweetness,
      taste_saltiness: discoverMeal.taste_saltiness,
      taste_sourness: discoverMeal.taste_sourness,
      taste_bitterness: discoverMeal.taste_bitterness,
      taste_savoriness: discoverMeal.taste_savoriness,
      taste_fattiness: discoverMeal.taste_fattiness,
      taste_spiciness: discoverMeal.taste_spiciness,
      calories_per_serving: discoverMeal.calories_per_serving,
      protein_per_serving_g: discoverMeal.protein_per_serving_g,
      carbs_per_serving_g: discoverMeal.carbs_per_serving_g,
      health_score: discoverMeal.health_score,
      rating: discoverMeal.rating,
      family_notes: discoverMeal.family_notes,
      last_cooked_at: discoverMeal.last_cooked_at,
      source_url: discoverMeal.source_url,
      credits: discoverMeal.credits,
      spoonacular_id: discoverMeal.spoonacular_id,
    };
    addFav(recipe);
    return recipe;
  }, [addFav]);

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
          if (error) console.error('[Favs] recent_searches Supabase error:', error.message);
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
          if (error) console.error('[Favs] clear recent_searches error:', error.message);
        });
    }
  }, []);

  const isLoading = favsQuery.isLoading;

  return {
    meals,
    recentSearches,
    isLoading,
    addFav,
    removeFav,
    updateFav,
    incrementPlanCount,
    isFav,
    isFavByName,
    addFromDiscover,
    addRecentSearch,
    clearRecentSearches,
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

export function useFilteredFavs(
  search: string,
  filters: RecipeFilterState & {
    inlineMealType?:  string;
    inlineDishType?:  string;
    inlineProtein?:   string;
    inlineDietLabel?: string;
  }
) {
  const { meals } = useFavs();

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
