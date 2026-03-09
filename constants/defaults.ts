import { FamilySettings, UserSettings, MealSlot, NotificationSettings, OnboardingData } from '@/types';

export const DEFAULT_MEAL_SLOTS: MealSlot[] = [
  { slot_id: 'breakfast', name: 'Breakfast', order: 0 },
  { slot_id: 'lunch', name: 'Lunch', order: 1 },
  { slot_id: 'dinner', name: 'Dinner', order: 2 },
];

export const DEFAULT_FAMILY_SETTINGS: FamilySettings = {
  family_name: '',
  meal_slots: DEFAULT_MEAL_SLOTS,
  default_serving_size: 4,
  pantry_items: [],
  dietary_preferences_family: [],
  measurement_units: 'metric',
  language: 'English',
  region: 'US',
  smart_fill_novelty_pct: 30,  // 30% new meals by default (Balanced)
};

export const DEFAULT_USER_SETTINGS: UserSettings = {
  user_id: 'user_1',
  display_name: 'You',
  dietary_preferences_individual: [],
  is_admin: true,
  personal_goal: 'balanced',
};

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  new_recipes: true,
  weekly_reminder: true,
  weekly_reminder_day: 0,
  weekly_reminder_time: '18:00',
  shopping_reminder: true,
  shopping_reminder_day: 6,
  shopping_reminder_time: '09:00',
};

export const DEFAULT_ONBOARDING: OnboardingData = {
  completed: false,
  current_step: 0,
  family_name: '',
  household_size: 2,
  meal_slots: DEFAULT_MEAL_SLOTS,
  dietary_preferences_family: [],
  dietary_preferences_individual: [],
  is_admin: true,
  personal_goal: 'balanced',
};
