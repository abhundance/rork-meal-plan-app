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

    const profile = buildUserProfile(
      plannedMeals,
      favMeals,
      familySettings.dietary_preferences_family,
      discoverPrefs,
      viewHistory,
      recentSearches ?? [],
      userSettings.personal_goal ?? 'balanced',
    );
    return buildCarousels(allMeals, profile);
  }, [
    allMeals,
    plannedMeals,
    favMeals,
    familySettings.dietary_preferences_family,
    discoverPrefs,
    viewHistory,
    recentSearches,
    userSettings.personal_goal,
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
