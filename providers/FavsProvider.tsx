import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { Meal, DiscoverMeal } from '@/types';

const FAVS_KEY = 'favs_meals';
const RECENT_SEARCHES_KEY = 'favs_recent_searches';

export const [FavsProvider, useFavs] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const favsQuery = useQuery({
    queryKey: ['favsMeals'],
    queryFn: async (): Promise<Meal[]> => {
      try {
        const stored = await AsyncStorage.getItem(FAVS_KEY);
        if (stored) {
          console.log('[Favs] Loaded from storage');
          const parsed = JSON.parse(stored) as Meal[];
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
    mutationFn: async (updated: Meal[]) => {
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

  const addFav = useCallback((meal: Meal) => {
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

  const updateFav = useCallback((mealId: string, partial: Partial<Meal>) => {
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

  const addFromDiscover = useCallback((discoverMeal: DiscoverMeal): Meal => {
    const favMeal: Meal = {
      id: discoverMeal.id,
      name: discoverMeal.name,
      image_url: discoverMeal.image_url,
      cuisine: discoverMeal.cuisine,
      cooking_time_band: discoverMeal.cooking_time_band,
      prep_time: discoverMeal.prep_time,
      cook_time: discoverMeal.cook_time,
      dietary_tags: [
        ...discoverMeal.dietary_tags,
        ...(discoverMeal.is_dairy_free &&
            !discoverMeal.dietary_tags.includes('Dairy-Free')
              ? ['Dairy-Free'] : []),
      ],
      custom_tags: [],
      ingredients: discoverMeal.ingredients,
      recipe_serving_size: discoverMeal.recipe_serving_size,
      method_steps: discoverMeal.method_steps,
      description: discoverMeal.description,
      chef_notes: discoverMeal.chef_notes,
      source: 'discover',
      meal_type: discoverMeal.meal_type,
      source_chef_id: discoverMeal.chef_id,
      source_chef_name: discoverMeal.chef_name,
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: discoverMeal.ingredients.length > 0,
      is_recipe_complete: discoverMeal.method_steps.length > 0,
    };
    addFav(favMeal);
    return favMeal;
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

export function useFilteredFavs(
  search: string,
  filters: {
    mealType?: string;
    cuisine?: string;
    cookingTime?: string;
    dietaryTag?: string;
    activeDietary?: string;
    source?: string;
  },
  sortBy: string
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

    if (filters.mealType) {
      const slotToMealType: Record<string, string[]> = {
        breakfast: ['breakfast'],
        lunch:     ['lunch_dinner'],
        dinner:    ['lunch_dinner'],
        snack:     ['light_bites'],
      };
      const allowed = slotToMealType[filters.mealType] ?? [filters.mealType];
      result = result.filter((m) => !!m.meal_type && allowed.includes(m.meal_type));
    }
    if (filters.cuisine) {
      result = result.filter((m) => m.cuisine === filters.cuisine);
    }
    if (filters.cookingTime) {
      result = result.filter((m) => m.cooking_time_band === filters.cookingTime);
    }
    if (filters.activeDietary) {
      result = result.filter((m) => {
        const tags = m.dietary_tags ?? [];
        switch (filters.activeDietary) {
          case 'vegan':        return tags.includes('Vegan');
          case 'vegetarian':   return tags.includes('Vegetarian');
          case 'gluten_free':  return tags.includes('Gluten-Free');
          case 'dairy_free':   return tags.includes('Dairy-Free');
          case 'high_protein': return tags.includes('High Protein');
          default:             return true;
        }
      });
    }
    if (filters.source) {
      result = result.filter((m) => m.source === filters.source);
    }

    switch (sortBy) {
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
  }, [meals, search, filters, sortBy]);
}
