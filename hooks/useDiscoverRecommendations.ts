import { useMemo } from 'react';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useDiscover, DiscoverInteraction } from '@/providers/DiscoverProvider';
import { DISCOVER_MEALS } from '@/mocks/discover';
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
 * Drop this into discover/index.tsx — it's the only import you need.
 *
 * Carousels recompute only when underlying data changes (planned meals,
 * favs, family settings, discover prefs, or view history).
 */
export function useDiscoverRecommendations(): UseDiscoverRecommendationsResult {
  const { meals: plannedMeals }              = useMealPlan();
  const { meals: favMeals, recentSearches }  = useFavs();
  const { familySettings }                   = useFamilySettings();
  const {
    discoverPrefs,
    viewHistory,
    recordInteraction,
    recordView,
    dismissMeal,
    isDismissed,
  } = useDiscover();

  const carousels = useMemo(() => {
    const profile = buildUserProfile(
      plannedMeals,
      favMeals,
      familySettings.dietary_preferences_family,
      discoverPrefs,
      viewHistory,
      recentSearches ?? [],
    );
    return buildCarousels(DISCOVER_MEALS, profile);
  }, [
    plannedMeals,
    favMeals,
    familySettings.dietary_preferences_family,
    discoverPrefs,
    viewHistory,
    recentSearches,
  ]);

  const isLoading = false; // Phase 2: derive from Supabase query loading state

  return {
    carousels,
    isLoading,
    recordInteraction,
    dismissMeal,
    isDismissed,
    recordView,
  };
}
