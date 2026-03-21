/**
 * utils/goalUtils.ts
 *
 * Single source of truth for resolving a PersonalGoal from the multi-select
 * health_goals array (Step 8 of onboarding) and diet_preferences soft signals.
 *
 * The legacy `personal_goal` stored field has been removed (2026-03-21).
 * All code that previously read `userSettings.personal_goal` must call
 * resolveGoal() instead.
 *
 * Priority:
 *   1. First valid goal in health_goals (the user's explicit selection)
 *   2. Any diet_preferences value that maps to a known goal (soft signal)
 *   3. 'balanced' — no specific goal set
 */

import { PersonalGoal } from '@/types';

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

export function resolveGoal(
  healthGoals: string[] | undefined,
  dietPrefs:   string[] | undefined,
): PersonalGoal {
  const fromHealth = (healthGoals ?? []).find(g => VALID_GOALS.includes(g));
  if (fromHealth) return fromHealth as PersonalGoal;

  for (const pref of (dietPrefs ?? [])) {
    if (VALID_GOALS.includes(pref))  return pref as PersonalGoal;
    if (DIET_PREF_TO_GOAL[pref])     return DIET_PREF_TO_GOAL[pref]!;
  }

  return 'balanced';
}
