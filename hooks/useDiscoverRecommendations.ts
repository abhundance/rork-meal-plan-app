import { useMemo } from 'react';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useDiscover, DiscoverInteraction } from '@/providers/DiscoverProvider';
import { DiscoverMeal, PersonalGoal } from '@/types';
import {
  buildUserProfile,
  buildCarousels,
  DiscoverCarousel,
} from '@/services/recommendationEngine';

// ── Live personalGoal derivation ────────────────────────────────────────────
// Mirrors the logic in welcome.tsx so that:
// (a) existing users who went through onboarding before the fix and still have
//     personal_goal = 'balanced' get goal-specific carousels immediately;
// (b) the Discover feed re-derives the goal if the user updates health_goals or
//     diet_preferences in Settings without going through onboarding again.

const VALID_GOALS: string[] = [
  'weight_loss', 'muscle_gain', 'recomposition', 'keto', 'paleo', 'whole30', 'carnivore',
  'pregnancy', 'postpartum', 'pcos', 'diabetes_management', 'heart_health', 'gut_health',
  'longevity', 'anti_inflammatory',
];
const DIET_PREF_TO_GOAL: Partial<Record<string, PersonalGoal>> = {
  high_protein:  'muscle_gain',
  low_carb:      'weight_loss',
  mediterranean: 'heart_health',
  plant_forward: 'gut_health',
};

function resolvePersonalGoal(
  storedGoal: PersonalGoal | undefined,
  healthGoals: string[],
  dietPrefs: string[],
): PersonalGoal {
  if (storedGoal && storedGoal !== 'balanced') return storedGoal;
  const fromHealth = healthGoals.find(g => VALID_GOALS.includes(g));
  if (fromHealth) return fromHealth as PersonalGoal;
  for (const pref of dietPrefs) {
    if (VALID_GOALS.includes(pref)) return pref as PersonalGoal;
    if (DIET_PREF_TO_GOAL[pref]) return DIET_PREF_TO_GOAL[pref]!;
  }
  return 'balanced';
}

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

    // Resolve the effective personal goal at render time so that existing users
    // with stale personal_goal = 'balanced' also get goal-specific carousels
    // as soon as they have health_goals or diet_preferences set.
    const effectiveGoal = resolvePersonalGoal(
      userSettings.personal_goal,
      userSettings.health_goals ?? [],
      familySettings.diet_preferences ?? [],
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
    userSettings.personal_goal,
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
