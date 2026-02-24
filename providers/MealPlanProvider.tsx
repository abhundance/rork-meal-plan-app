import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { PlannedMeal, Ingredient } from '@/types';
import { formatDateKey, getWeekDates } from '@/utils/dates';

const MEAL_PLAN_KEY = 'meal_plan_data';
const VIEW_PREF_KEY = 'meal_plan_view_pref';

export const [MealPlanProvider, useMealPlan] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [viewMode, setViewModeState] = useState<'week' | 'day'>('week');

  const mealsQuery = useQuery({
    queryKey: ['mealPlan'],
    queryFn: async (): Promise<PlannedMeal[]> => {
      try {
        const stored = await AsyncStorage.getItem(MEAL_PLAN_KEY);
        if (stored) {
          console.log('[MealPlan] Loaded meals from storage');
          return JSON.parse(stored) as PlannedMeal[];
        }
      } catch (e) {
        console.log('[MealPlan] Error loading:', e);
      }
      return [];
    },
  });

  const viewPrefQuery = useQuery({
    queryKey: ['mealPlanViewPref'],
    queryFn: async (): Promise<'week' | 'day'> => {
      try {
        const stored = await AsyncStorage.getItem(VIEW_PREF_KEY);
        if (stored === 'week' || stored === 'day') return stored;
      } catch (e) {
        console.log('[MealPlan] Error loading view pref:', e);
      }
      return 'week';
    },
  });

  useEffect(() => {
    if (mealsQuery.data) setMeals(mealsQuery.data);
  }, [mealsQuery.data]);

  useEffect(() => {
    if (viewPrefQuery.data) setViewModeState(viewPrefQuery.data);
  }, [viewPrefQuery.data]);

  const mealsRef = useRef(meals);
  mealsRef.current = meals;

  const saveMutation = useMutation({
    mutationFn: async (updated: PlannedMeal[]) => {
      await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(updated));
      console.log('[MealPlan] Saved to storage, count:', updated.length);
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['mealPlan'], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;

  const setViewMode = useCallback((mode: 'week' | 'day') => {
    setViewModeState(mode);
    AsyncStorage.setItem(VIEW_PREF_KEY, mode);
    queryClient.setQueryData(['mealPlanViewPref'], mode);
  }, [queryClient]);

  const addMeals = useCallback((newMeals: PlannedMeal[]) => {
    let updated = [...mealsRef.current];
    for (const meal of newMeals) {
      updated = updated.filter((m) => !(m.slot_id === meal.slot_id && m.date === meal.date));
      updated.push(meal);
    }
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[MealPlan] Bulk added meals:', newMeals.length);
  }, []);

  const addMeal = useCallback((meal: PlannedMeal) => {
    const existing = mealsRef.current.filter(
      (m) => !(m.slot_id === meal.slot_id && m.date === meal.date)
    );
    const updated = [...existing, meal];
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[MealPlan] Added meal:', meal.meal_name, 'to', meal.date, meal.slot_id);
  }, []);

  const removeMeal = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[MealPlan] Removed meal:', mealId);
  }, []);

  const updateMealServing = useCallback((mealId: string, serving_size: number) => {
    const updated = mealsRef.current.map((m) =>
      m.id === mealId ? { ...m, serving_size } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[MealPlan] Updated serving for:', mealId, 'to', serving_size);
  }, []);

  const updateMealNote = useCallback((mealId: string, daily_note: string) => {
    const updated = mealsRef.current.map((m) =>
      m.id === mealId ? { ...m, daily_note } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    console.log('[MealPlan] Updated note for:', mealId);
  }, []);

  const getMealForSlot = useCallback(
    (date: string, slotId: string): PlannedMeal | undefined => {
      return mealsRef.current.find((m) => m.date === date && m.slot_id === slotId);
    },
    []
  );

  const getMealsForDate = useCallback(
    (date: string): PlannedMeal[] => {
      return mealsRef.current.filter((m) => m.date === date);
    },
    []
  );

  const getMealsForWeek = useCallback(
    (weekOffset: number): PlannedMeal[] => {
      const dates = getWeekDates(weekOffset);
      const dateKeys = new Set(dates.map(formatDateKey));
      return mealsRef.current.filter((m) => dateKeys.has(m.date));
    },
    []
  );

  const getIngredientsForWeek = useCallback(
    (weekOffset: number, fromTodayOnly: boolean): { ingredients: Map<string, { name: string; quantity: number; unit: string; category: string; meals: { meal_name: string; quantity: number }[] }>; mealCount: number; totalDays: number } => {
      const weekMeals = getMealsForWeek(weekOffset);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = formatDateKey(today);

      const filtered = fromTodayOnly
        ? weekMeals.filter((m) => m.date >= todayKey)
        : weekMeals;

      const ingredientMap = new Map<string, { name: string; quantity: number; unit: string; category: string; meals: { meal_name: string; quantity: number }[] }>();

      for (const meal of filtered) {
        const scale = meal.recipe_serving_size > 0
          ? meal.serving_size / meal.recipe_serving_size
          : 1;

        for (const ing of meal.ingredients) {
          const key = `${ing.name.toLowerCase()}_${ing.unit}`;
          const scaledQty = ing.quantity * scale;
          const existing = ingredientMap.get(key);

          if (existing) {
            existing.quantity += scaledQty;
            existing.meals.push({ meal_name: meal.meal_name, quantity: scaledQty });
          } else {
            ingredientMap.set(key, {
              name: ing.name,
              quantity: scaledQty,
              unit: ing.unit,
              category: ing.category,
              meals: [{ meal_name: meal.meal_name, quantity: scaledQty }],
            });
          }
        }
      }

      const dates = getWeekDates(weekOffset);
      const datesWithMeals = new Set(filtered.map((m) => m.date));

      return {
        ingredients: ingredientMap,
        mealCount: filtered.length,
        totalDays: datesWithMeals.size,
      };
    },
    [getMealsForWeek]
  );

  const isLoading = mealsQuery.isLoading;

  return {
    meals,
    viewMode,
    isLoading,
    setViewMode,
    addMeal,
    addMeals,
    removeMeal,
    updateMealServing,
    updateMealNote,
    getMealForSlot,
    getMealsForDate,
    getMealsForWeek,
    getIngredientsForWeek,
  };
});
