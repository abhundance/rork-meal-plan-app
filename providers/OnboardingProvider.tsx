import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { OnboardingData, MealSlot, PersonalGoal, StarterMealPick } from '@/types';
import { DEFAULT_ONBOARDING } from '@/constants/defaults';

// ─── Type for setters ─────────────────────────────────────────────────────────
type DietaryStringArray = string[];

const ONBOARDING_KEY = 'onboarding_data';

// ─── DEV BYPASS ─────────────────────────────────────────────────────────────
// Set to true to skip auth and onboarding during development.
// Revert to false before enabling authentication for production.
const DEV_SKIP_ONBOARDING = false;
// ────────────────────────────────────────────────────────────────────────────

export const [OnboardingProvider, useOnboarding] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [data, setData] = useState<OnboardingData>(
    DEV_SKIP_ONBOARDING ? { ...DEFAULT_ONBOARDING, completed: true } : DEFAULT_ONBOARDING
  );

  const query = useQuery({
    queryKey: ['onboarding'],
    initialData: DEV_SKIP_ONBOARDING
      ? { ...DEFAULT_ONBOARDING, completed: true }
      : undefined,
    queryFn: async (): Promise<OnboardingData> => {
      if (DEV_SKIP_ONBOARDING) {
        return { ...DEFAULT_ONBOARDING, completed: true };
      }
      try {
        const stored = await AsyncStorage.getItem(ONBOARDING_KEY);
        if (stored) {
          console.log('[Onboarding] Loaded from storage');
          return JSON.parse(stored) as OnboardingData;
        }
      } catch (e) {
        console.log('[Onboarding] Error loading:', e);
      }
      return DEFAULT_ONBOARDING;
    },
  });

  useEffect(() => {
    if (query.data) {
      setData(query.data);
    }
  }, [query.data]);

  const dataRef = useRef(data);
  dataRef.current = data;

  const saveMutation = useMutation({
    mutationFn: async (updated: OnboardingData) => {
      await AsyncStorage.setItem(ONBOARDING_KEY, JSON.stringify(updated));
      console.log('[Onboarding] Saved to storage, step:', updated.current_step);
      return updated;
    },
    onSuccess: (result) => {
      queryClient.setQueryData(['onboarding'], result);
    },
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;

  const updateOnboarding = useCallback((partial: Partial<OnboardingData>) => {
    const updated = { ...dataRef.current, ...partial };
    setData(updated);
    saveMutateRef.current(updated);
  }, []);

  const setStep = useCallback((step: number) => {
    updateOnboarding({ current_step: step });
  }, [updateOnboarding]);

  const setFamilyName = useCallback((name: string) => {
    updateOnboarding({ family_name: name });
  }, [updateOnboarding]);

  const setHouseholdSize = useCallback((size: number) => {
    updateOnboarding({ household_size: size });
  }, [updateOnboarding]);

  const setMealSlots = useCallback((slots: MealSlot[]) => {
    updateOnboarding({ meal_slots: slots });
  }, [updateOnboarding]);

  const setFamilyDietary = useCallback((prefs: string[]) => {
    updateOnboarding({ dietary_preferences_family: prefs });
  }, [updateOnboarding]);

  const setPersonalDietary = useCallback((prefs: string[]) => {
    updateOnboarding({ dietary_preferences_individual: prefs });
  }, [updateOnboarding]);

  const setPersonalGoal = useCallback((goal: PersonalGoal) => {
    updateOnboarding({ personal_goal: goal });
  }, [updateOnboarding]);

  // ── New dietary setters (onboarding overhaul Steps 4–8) ───────────────────

  const setCulturalRestrictions = useCallback((restrictions: DietaryStringArray) => {
    updateOnboarding({ cultural_restrictions: restrictions });
  }, [updateOnboarding]);

  const setIntolerances = useCallback((intolerances: DietaryStringArray) => {
    updateOnboarding({ intolerances });
  }, [updateOnboarding]);

  const setDietPreferences = useCallback((prefs: DietaryStringArray) => {
    updateOnboarding({ diet_preferences: prefs });
  }, [updateOnboarding]);

  const setHouseholdType = useCallback((type: string) => {
    updateOnboarding({ household_type: type });
  }, [updateOnboarding]);

  const setHealthGoals = useCallback((goals: DietaryStringArray) => {
    updateOnboarding({ health_goals: goals });
  }, [updateOnboarding]);

  const setRegion = useCallback((region: string, units: 'metric' | 'imperial') => {
    updateOnboarding({ region, measurement_units: units });
  }, [updateOnboarding]);

  const setCuisinePreferences = useCallback((prefs: string[]) => {
    updateOnboarding({ cuisine_preferences: prefs });
  }, [updateOnboarding]);

  const setCookingTimePref = useCallback((pref: 'under_20' | '20_40' | '40_60' | 'over_60') => {
    updateOnboarding({ cooking_time_pref: pref });
  }, [updateOnboarding]);

  const setPlanningStyle = useCallback((style: 'familiar' | 'balanced' | 'adventurous') => {
    updateOnboarding({ planning_style: style });
  }, [updateOnboarding]);

  const setEnabledSlots = useCallback((slots: string[]) => {
    updateOnboarding({ enabled_slots: slots });
  }, [updateOnboarding]);

  const setStarterMeals = useCallback((meals: StarterMealPick[]) => {
    updateOnboarding({ starter_meals: meals });
  }, [updateOnboarding]);

  const addStarterMeal = useCallback((meal: StarterMealPick) => {
    const current = dataRef.current.starter_meals ?? [];
    const already = current.some(m => m.id === meal.id);
    if (already) {
      updateOnboarding({ starter_meals: current.filter(m => m.id !== meal.id) });
    } else {
      updateOnboarding({ starter_meals: [...current, meal] });
    }
  }, [updateOnboarding]);

  const completeOnboarding = useCallback(() => {
    updateOnboarding({ completed: true });
  }, [updateOnboarding]);

  const resetOnboarding = useCallback(async () => {
    await AsyncStorage.removeItem(ONBOARDING_KEY);
    setData(DEFAULT_ONBOARDING);
    queryClient.setQueryData(['onboarding'], DEFAULT_ONBOARDING);
  }, [queryClient]);

  return {
    data,
    isLoading: query.isLoading,
    updateOnboarding,
    setStep,
    setFamilyName,
    setHouseholdSize,
    setMealSlots,
    setFamilyDietary,
    setPersonalDietary,
    setPersonalGoal,
    // ── New dietary setters (onboarding overhaul Steps 4–8) ─────────────────
    setCulturalRestrictions,
    setIntolerances,
    setDietPreferences,
    setHouseholdType,
    setHealthGoals,
    // ── Existing downstream setters ─────────────────────────────────────────
    setRegion,
    setCuisinePreferences,
    setCookingTimePref,
    setPlanningStyle,
    setEnabledSlots,
    setStarterMeals,
    addStarterMeal,
    completeOnboarding,
    resetOnboarding,
  };
});
