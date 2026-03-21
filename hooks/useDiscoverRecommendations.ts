import { useMemo } from 'react';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useDiscover, DiscoverInteraction } from '@/providers/DiscoverProvider';
import { DiscoverMeal } from '@/types';
import {
  buildUserProfile,
  buildCarousels,
  DiscoverCarousel,
} from '@/services/recommendationEngine';
import { resolveGoal } from '@/utils/goalUtils';

export interface UseDiscoverRecommendationsResult {
  carousels:          DiscoverCarousel[];
  isLoading:          boolean;
  recordInteraction:  (event: Omit<DiscoverInteraction, 'created_at'>) => void;
  dismissMeal:        (mealId: string) => void;
  recordView:         (mealId: string) => void;
  isDismissed:        (mealId: string) => boolean;
}

/**
 * Wires up all providers into the recommendation engine.
 *
 * Accepts `allMeals` — the live Spoonacular pool to build carousels from.
 * Pass the array from `useDiscoverMeals()` in discover/index.tsx.
 * Returns empty carousels while the first fetch is in progress.
 */
export function useDiscoverRecommendations(
  allMeals: DiscoverMeal[] = [],
): UseDiscoverRecommendationsResult {
  const { meals: plannedMeals }              = useMealPlan();
  const { meals: favMeals, recentSearches }  = useFavs();
  const { familySettings, userSettings }     = useFamilySettings();
  const {
    discoverPrefs,
    viewHistory,
    recordInteraction,
    recordView,
    dismissMeal,
    isDismissed,
  } = useDiscover();

  const carousels = useMemo(() => {
    if (allMeals.length === 0) return [];

    const effectiveGoal = resolveGoal(
      userSettings.health_goals,
      familySettings.diet_preferences,
    );

    const profile = buildUserProfile(
      plannedMeals,
      favMeals,
      familySettings.dietary_preferences_family,
      discoverPrefs,
      viewHistory,
      recentSearches ?? [],
      effectiveGoal,
      // Onboarding dietary constraint fields — hard gates for the engine.
      familySettings.cultural_restrictions,
      familySettings.intolerances,
      // Cold-start seeds — prime cuisineAffinity + timeBandAffinity before the
      // user has any meal history. Behavioural data quickly overtakes these.
      familySettings.cuisine_preferences,
      familySettings.cooking_time_pref,
      // Household composition — shapes context scoring (mild meals for young
      // families, heart-healthy for seniors, etc.)
      familySettings.household_type,
    );
    return buildCarousels(allMeals, profile);
  }, [
    allMeals,
    plannedMeals,
    favMeals,
    familySettings.dietary_preferences_family,
    familySettings.cultural_restrictions,
    familySettings.intolerances,
    familySettings.cuisine_preferences,
    familySettings.cooking_time_pref,
    familySettings.diet_preferences,
    familySettings.household_type,
    discoverPrefs,
    viewHistory,
    recentSearches,
    userSettings.health_goals,
  ]);

  return {
    carousels,
    isLoading: allMeals.length === 0,
    recordInteraction,
    dismissMeal,
    isDismissed,
    recordView,
  };
}
