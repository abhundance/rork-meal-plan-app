/**
 * MealPlanProvider — manages PlannedMeal[] and view preference.
 *
 * Storage strategy (dual-write):
 *   • AsyncStorage is ALWAYS written — works offline / logged-out.
 *   • When authenticated, meals are also synced to Supabase (planned_meals table).
 *   • queryKey includes userId so TanStack Query re-fetches on sign-in / sign-out.
 *   • On first sign-in with existing local data: existing meals are seeded to Supabase.
 *
 * NOTE: The planned_meals table does NOT store a snapshot of ingredients.
 *       Ingredients are looked up at render time via meal_id → recipes table.
 *       The local PlannedMeal.ingredients[] array is set to [] when loading from Supabase.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { PlannedMeal, Ingredient, Recipe } from '@/types';
import { formatDateKey, getWeekDates } from '@/utils/dates';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { plannedMealToRow, rowToPlannedMeal } from '@/services/db';

const MEAL_PLAN_KEY = 'meal_plan_data';
const VIEW_PREF_KEY = 'meal_plan_view_pref';

export const [MealPlanProvider, useMealPlan] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [meals, setMeals] = useState<PlannedMeal[]>([]);
  const [viewMode, setViewModeState] = useState<'week' | 'day'>('day');

  // ── Meals query ───────────────────────────────────────────────────────────
  const mealsQuery = useQuery({
    queryKey: ['mealPlan', userId],
    queryFn: async (): Promise<PlannedMeal[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('planned_meals')
          .select('*')
          .eq('family_id', userId)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[MealPlan] Supabase fetch error:', error.message);
        } else if (data) {
          const result = data.map((row) => rowToPlannedMeal(row as Record<string, unknown>));
          console.log('[MealPlan] Loaded from Supabase:', result.length, 'meals');
          AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(result)).catch(console.error);
          return result;
        }
      }

      // Fallback to AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(MEAL_PLAN_KEY);
        if (stored) {
          console.log('[MealPlan] Loaded meals from AsyncStorage');
          const parsed = JSON.parse(stored) as PlannedMeal[];

          // First sign-in: seed Supabase with existing local data
          if (userId && parsed.length > 0) {
            console.log('[MealPlan] Seeding', parsed.length, 'meals to Supabase');
            const supabase = getSupabase();
            supabase.from('planned_meals').insert(
              parsed.map((m) => plannedMealToRow(m, userId))
            ).then(({ error }) => {
              if (error && error.code !== '23505') {
                console.error('[MealPlan] Supabase seed error:', error.message);
              }
            });
          }
          return parsed;
        }
      } catch (e) {
        console.error('[MealPlan] AsyncStorage load error:', e);
      }
      return [];
    },
  });

  // ── View preference query ─────────────────────────────────────────────────
  const viewPrefQuery = useQuery({
    queryKey: ['mealPlanViewPref', userId],
    queryFn: async (): Promise<'week' | 'day'> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('user_settings')
          .select('plan_view_pref')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data?.plan_view_pref) {
          const pref = data.plan_view_pref as 'week' | 'day';
          AsyncStorage.setItem(VIEW_PREF_KEY, pref).catch(console.error);
          return pref;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(VIEW_PREF_KEY);
        if (stored === 'week' || stored === 'day') return stored;
      } catch (e) {
        console.error('[MealPlan] Error loading view pref:', e);
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
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Save mutation ─────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (updated: PlannedMeal[]) => {
      await AsyncStorage.setItem(MEAL_PLAN_KEY, JSON.stringify(updated));
      console.log('[MealPlan] Saved to AsyncStorage, count:', updated.length);
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['mealPlan', userIdRef.current], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;

  // ── Supabase background sync helpers ─────────────────────────────────────
  const upsertMealsToSupabase = useCallback((updated: PlannedMeal[]) => {
    const uid = userIdRef.current;
    if (!uid || updated.length === 0) return;
    const supabase = getSupabase();
    supabase
      .from('planned_meals')
      .upsert(updated.map((m) => plannedMealToRow(m, uid)), { onConflict: 'id' })
      .then(({ error }) => {
        if (error) console.error('[MealPlan] Supabase upsert error:', error.message);
      });
  }, []);

  const deleteMealFromSupabase = useCallback((mealId: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('planned_meals')
      .delete()
      .eq('id', mealId)
      .eq('family_id', uid)
      .then(({ error }) => {
        if (error) console.error('[MealPlan] Supabase delete error:', error.message);
      });
  }, []);

  const deleteMealsFromSupabase = useCallback((ids: string[]) => {
    const uid = userIdRef.current;
    if (!uid || ids.length === 0) return;
    getSupabase()
      .from('planned_meals')
      .delete()
      .in('id', ids)
      .eq('family_id', uid)
      .then(({ error }) => {
        if (error) console.error('[MealPlan] Supabase batch delete error:', error.message);
      });
  }, []);

  // ── View mode ─────────────────────────────────────────────────────────────
  const setViewMode = useCallback((mode: 'week' | 'day') => {
    setViewModeState(mode);
    AsyncStorage.setItem(VIEW_PREF_KEY, mode);
    queryClient.setQueryData(['mealPlanViewPref', userIdRef.current], mode);
    const uid = userIdRef.current;
    if (uid) {
      getSupabase()
        .from('user_settings')
        .update({ plan_view_pref: mode })
        .eq('id', uid)
        .then(({ error }) => {
          if (error) console.error('[MealPlan] setViewMode Supabase error:', error.message);
        });
    }
  }, [queryClient]);

  // ── Meal CRUD ─────────────────────────────────────────────────────────────

  const addMeals = useCallback((newMeals: PlannedMeal[]) => {
    let updated = [...mealsRef.current];
    for (const meal of newMeals) {
      updated = updated.filter((m) => !(m.slot_id === meal.slot_id && m.date === meal.date));
      updated.push(meal);
    }
    setMeals(updated);
    saveMutateRef.current(updated);
    upsertMealsToSupabase(newMeals);
    console.log('[MealPlan] Bulk added meals:', newMeals.length);
  }, [upsertMealsToSupabase]);

  const addMeal = useCallback((meal: PlannedMeal) => {
    const slotMeals = mealsRef.current.filter(
      (m) => m.slot_id === meal.slot_id && m.date === meal.date
    );
    const duplicate = slotMeals.find(
      (m) => m.meal_name.toLowerCase() === meal.meal_name.toLowerCase()
    );
    if (duplicate) {
      const updatedMeal = { ...duplicate, serving_size: duplicate.serving_size + 1 };
      const updated = mealsRef.current.map((m) => m.id === duplicate.id ? updatedMeal : m);
      setMeals(updated);
      saveMutateRef.current(updated);
      upsertMealsToSupabase([updatedMeal]);
      console.log('[MealPlan] Duplicate detected, incremented serving for:', meal.meal_name);
      return;
    }
    if (slotMeals.length >= 10) {
      console.log('[MealPlan] Slot full (max 10), skipping add for:', meal.slot_id, meal.date);
      return;
    }
    const mealWithPosition = { ...meal, position: slotMeals.length };
    const updated = [...mealsRef.current, mealWithPosition];
    setMeals(updated);
    saveMutateRef.current(updated);
    upsertMealsToSupabase([mealWithPosition]);
    console.log('[MealPlan] Added meal:', meal.meal_name, 'to', meal.date, meal.slot_id);
  }, [upsertMealsToSupabase]);

  const removeMeal = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteMealFromSupabase(mealId);
    console.log('[MealPlan] Removed meal:', mealId);
  }, [deleteMealFromSupabase]);

  const removeMealById = useCallback((mealId: string) => {
    const updated = mealsRef.current.filter((m) => m.id !== mealId);
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteMealFromSupabase(mealId);
    console.log('[MealPlan] Removed meal by id:', mealId);
  }, [deleteMealFromSupabase]);

  const updateMealServing = useCallback((mealId: string, serving_size: number) => {
    const updated = mealsRef.current.map((m) =>
      m.id === mealId ? { ...m, serving_size } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === mealId);
    if (updatedMeal) upsertMealsToSupabase([updatedMeal]);
    console.log('[MealPlan] Updated serving for:', mealId, 'to', serving_size);
  }, [upsertMealsToSupabase]);

  const linkMealToPlan = useCallback((plannedMealId: string, mealId: string) => {
    const updated = mealsRef.current.map((m) =>
      m.id === plannedMealId ? { ...m, meal_id: mealId } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === plannedMealId);
    if (updatedMeal) upsertMealsToSupabase([updatedMeal]);
    console.log('[MealPlan] Linked meal_id for:', plannedMealId);
  }, [upsertMealsToSupabase]);

  const updatePlannedMealDelivery = useCallback((plannedMealId: string, updates: {
    meal_name?: string;
    delivery_url?: string;
    delivery_platform?: PlannedMeal['delivery_platform'];
    is_delivery?: boolean;
  }) => {
    const updated = mealsRef.current.map((m) =>
      m.id === plannedMealId ? { ...m, ...updates } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === plannedMealId);
    if (updatedMeal) upsertMealsToSupabase([updatedMeal]);
    console.log('[MealPlan] Updated delivery for:', plannedMealId);
  }, [upsertMealsToSupabase]);

  const updateMealNote = useCallback((mealId: string, daily_note: string) => {
    const updated = mealsRef.current.map((m) =>
      m.id === mealId ? { ...m, daily_note } : m
    );
    setMeals(updated);
    saveMutateRef.current(updated);
    const updatedMeal = updated.find((m) => m.id === mealId);
    if (updatedMeal) upsertMealsToSupabase([updatedMeal]);
    console.log('[MealPlan] Updated note for:', mealId);
  }, [upsertMealsToSupabase]);

  const clearDay = useCallback((dateKey: string) => {
    const toDelete = mealsRef.current.filter((m) => m.date === dateKey).map((m) => m.id);
    const updated = mealsRef.current.filter((m) => m.date !== dateKey);
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteMealsFromSupabase(toDelete);
    console.log('[MealPlan] Cleared day:', dateKey);
  }, [deleteMealsFromSupabase]);

  const clearWeek = useCallback((weekOffset: number) => {
    const dates = getWeekDates(weekOffset);
    const dateKeys = new Set<string>(dates.map(formatDateKey));
    const toDelete = mealsRef.current.filter((m) => dateKeys.has(m.date)).map((m) => m.id);
    const updated = mealsRef.current.filter((m) => !dateKeys.has(m.date));
    setMeals(updated);
    saveMutateRef.current(updated);
    deleteMealsFromSupabase(toDelete);
    console.log('[MealPlan] Cleared week offset:', weekOffset);
  }, [deleteMealsFromSupabase]);

  // ── Read-only selectors ───────────────────────────────────────────────────

  const getMealForSlot = useCallback(
    (date: string, slotId: string): PlannedMeal | undefined => {
      return mealsRef.current.find((m) => m.date === date && m.slot_id === slotId);
    },
    []
  );

  const getMealsForSlot = useCallback(
    (date: string, slotId: string): PlannedMeal[] => {
      return mealsRef.current
        .filter((m) => m.date === date && m.slot_id === slotId)
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
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
    (weekOffset: number, fromTodayOnly: boolean, mealsList: Recipe[] = []): {
      ingredients: Map<string, { name: string; quantity: number; unit: string; category: string; meals: { meal_name: string; quantity: number }[] }>;
      mealCount: number;
      totalDays: number;
    } => {
      const weekMeals = getMealsForWeek(weekOffset);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = formatDateKey(today);

      const filtered = fromTodayOnly
        ? weekMeals.filter((m) => m.date >= todayKey)
        : weekMeals;

      const ingredientMap = new Map<string, {
        name: string; quantity: number; unit: string; category: string;
        meals: { meal_name: string; quantity: number }[];
      }>();

      for (const meal of filtered) {
        const sourceMeal = meal.meal_id ? mealsList.find((m) => m.id === meal.meal_id) : undefined;
        const ingredients = sourceMeal ? sourceMeal.ingredients : meal.ingredients;
        const recipeServingSize = sourceMeal ? sourceMeal.recipe_serving_size : meal.recipe_serving_size;
        const scale = recipeServingSize > 0 ? meal.serving_size / recipeServingSize : 1;

        for (const ing of ingredients) {
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
    removeMealById,
    updateMealServing,
    updateMealNote,
    getMealForSlot,
    getMealsForSlot,
    getMealsForDate,
    getMealsForWeek,
    getIngredientsForWeek,
    clearDay,
    clearWeek,
    linkMealToPlan,
    updatePlannedMealDelivery,
  };
});
