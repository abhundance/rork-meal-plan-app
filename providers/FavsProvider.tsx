import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Recipe, DiscoverMeal } from '@/types';

const FAVS_KEY = 'favs_meals';
const RECENT_SEARCHES_KEY = 'favs_recent_searches';

export const [FavsProvider, useFavs] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [meals, setMeals] = useState<Recipe[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const favsQuery = useQuery({
    queryKey: ['favsMeals'],
    queryFn: async (): Promise<Recipe[]> => {
      try {
        const stored = await AsyncStorage.getItem(FAVS_KEY);
        if (stored) {
          console.log('[Favs] Loaded from storage');
          const parsed = JSON.parse(stored) as Recipe[];
          const seen = new Set<string>();
          return parsed.filter((m) => {
            if (seen.has(m.id)) return false;
            seen.add(m.id);
            return true;
          });
        }
      } catch (e) {
        console.log('[Favs] Error loading:', e);
      }
      return [];
    },
  });

  const searchesQuery = useQuery({
    queryKey: ['favsRecentSearches'],
    queryFn: async (): Promise<string[]> => {
      try {
        const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.log('[Favs] Error loading searches:', e);
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

  const saveMutation = useMutation({
    mutationFn: async (updated: Recipe[]) => {
      await AsyncStorage.setItem(FAVS_KEY, JSON.stringify(updated));
      console.log('[Favs] Saved, count:', updated.length);
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['favsMeals'], d),
  });

  const saveSearchesMutation = useMutation({
    mutationFn: async (updated: string[]) => {
      await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['favsRecentSearches'], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;
  const saveSearchesMutateRef = useRef(saveSearchesMutation.mutate);
  saveSearchesMutateRef.current = saveSearchesMutation.mutate;

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
    console.log('[Favs] Added:', meal.name);
    return true;
  }, []);

  const removeFav = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    mealsRef.current = updated;
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[Favs] Removed:', mealId);
  }, []);

  const updateFav = useCallback((mealId: string, partial: Partial<Recipe>) => {
    const updated = mealsRef.current.map((m) => (m.id === mealId ? { ...m, ...partial } : m));
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[Favs] Updated:', mealId);
  }, []);

  const incrementPlanCount = useCallback((mealId: string) => {
    const now = new Date().toISOString().split('T')[0];
    const updated = mealsRef.current.map((m) =>
      m.id === mealId
        ? { ...m, add_to_plan_count: m.add_to_plan_count + 1, last_planned_date: now }
        : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
  }, []);

  const isFav = useCallback((mealId: string): boolean => {
    return mealsRef.current.some((m) => m.id === mealId);
  }, []);

  const isFavByName = useCallback((mealName: string): boolean => {
    return mealsRef.current.some((m) => m.name.toLowerCase() === mealName.toLowerCase());
  }, []);

  const addFromDiscover = useCallback((discoverMeal: DiscoverMeal): Recipe => {
    const recipe: Recipe = {
      // ── Core identity ────────────────────────────────────────────────────
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

      // ── Optional core ────────────────────────────────────────────────────
      image_url: discoverMeal.image_url,
      description: discoverMeal.description,
      cuisine: discoverMeal.cuisine,
      cuisines: discoverMeal.cuisines,
      meal_type: discoverMeal.meal_type,
      cooking_time_band: discoverMeal.cooking_time_band,
      prep_time: discoverMeal.prep_time,
      cook_time: discoverMeal.cook_time,

      // ── Rich classification ───────────────────────────────────────────────
      dish_category: discoverMeal.dish_category,
      protein_source: discoverMeal.protein_source,
      occasions: discoverMeal.occasions,

      // ── Dietary & allergens ───────────────────────────────────────────────
      allergens: discoverMeal.allergens,
      diet_labels: discoverMeal.diet_labels,

      // ── Taste profile ─────────────────────────────────────────────────────
      taste_sweetness: discoverMeal.taste_sweetness,
      taste_saltiness: discoverMeal.taste_saltiness,
      taste_sourness: discoverMeal.taste_sourness,
      taste_bitterness: discoverMeal.taste_bitterness,
      taste_savoriness: discoverMeal.taste_savoriness,
      taste_fattiness: discoverMeal.taste_fattiness,
      taste_spiciness: discoverMeal.taste_spiciness,

      // ── Nutrition ─────────────────────────────────────────────────────────
      calories_per_serving: discoverMeal.calories_per_serving,
      protein_per_serving_g: discoverMeal.protein_per_serving_g,
      carbs_per_serving_g: discoverMeal.carbs_per_serving_g,

      // ── Scores ───────────────────────────────────────────────────────────
      health_score: discoverMeal.health_score,

      // ── Family interaction (carry over if already rated) ──────────────────
      rating: discoverMeal.rating,
      family_notes: discoverMeal.family_notes,
      last_cooked_at: discoverMeal.last_cooked_at,

      // ── Attribution ───────────────────────────────────────────────────────
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
  }, []);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    saveSearchesMutateRef.current([]);
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

// Maps RecipeFilterSheet dietary keys → Meal.dietary_tags values
const DIETARY_TAG_MAP: Record<string, string> = {
  vegan:        'Vegan',
  vegetarian:   'Vegetarian',
  gluten_free:  'Gluten-Free',
  dairy_free:   'Dairy-Free',
  high_protein: 'High Protein',
  low_carb:     'Low Carb',
};

export function useFilteredFavs(
  search: string,
  filters: {
    sort:           string;
    cuisines:       string[];
    cookTime:       string;
    dietary:        string[];
    dishType?:      string;
    mealType?:      string;
    proteinSource?: string;   // maps to Recipe.protein_source
    dietLabel?:     string;   // matches against diet_labels[] and allergens[]
  }
) {
  const { meals } = useFavs();

  return useMemo(() => {
    let result = [...meals];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.ingredients.some((i) => i.name.toLowerCase().includes(q)) ||
          (m.cuisine && m.cuisine.toLowerCase().includes(q))
      );
    }

    // Multi-select cuisine — OR logic (show if meal matches any selected cuisine)
    if (filters.cuisines.length > 0) {
      result = result.filter((m) => !!m.cuisine && filters.cuisines.includes(m.cuisine));
    }

    if (filters.cookTime) {
      result = result.filter((m) => m.cooking_time_band === filters.cookTime);
    }

    // Multi-select dietary — AND logic (meal must satisfy all selected tags)
    if (filters.dietary.length > 0) {
      result = result.filter((m) => {
        const tags = m.dietary_tags ?? [];
        return filters.dietary.every((key) => {
          const tag = DIETARY_TAG_MAP[key];
          return tag ? tags.includes(tag) : true;
        });
      });
    }

    const hasDish = !!(filters.dishType && filters.dishType !== 'all');
    if (hasDish) {
      result = result.filter((m) => m.dish_category === filters.dishType);
    }

    const hasMealType = !!(filters.mealType && filters.mealType !== 'all');
    if (hasMealType) {
      result = result.filter((m) => m.meal_type === filters.mealType);
    }

    // Protein source filter — matches Recipe.protein_source directly
    const hasProtein = !!(filters.proteinSource && filters.proteinSource !== 'all');
    if (hasProtein) {
      result = result.filter((m) => m.protein_source === filters.proteinSource);
    }

    // Diet label filter — checks both diet_labels[] and allergens[] (Spoonacular-compatible)
    const hasDiet = !!(filters.dietLabel && filters.dietLabel !== 'all');
    if (hasDiet) {
      result = result.filter((m) => {
        const labels   = m.diet_labels  ?? [];
        const allergens = m.allergens   ?? [];
        return labels.includes(filters.dietLabel!) || allergens.includes(filters.dietLabel!);
      });
    }

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
