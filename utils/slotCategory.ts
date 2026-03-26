/**
 * Shared slot-to-meal-type mapping utilities.
 *
 * Used by: Smart Fill, meal-picker, and any future slot-aware logic.
 * Extracted from app/(tabs)/(home)/index.tsx to avoid duplication.
 */

export type MealCategory = 'breakfast' | 'lunch_dinner' | 'light_bites';

/**
 * Maps a slot name (e.g. "Breakfast", "Lunch", "Dinner", "Snack")
 * to a meal_type category. Slot names are user-configurable, so we
 * match on keywords rather than exact equality.
 */
export function getSlotCategory(slotName: string): MealCategory {
  const lower = slotName.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning') || lower.includes('brunch')) {
    return 'breakfast';
  }
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('supper') || lower.includes('evening meal')) {
    return 'lunch_dinner';
  }
  return 'light_bites';
}

/**
 * Fallback name-based classifier — only used when a meal has no
 * meal_type field set. Prefer the meal_type field directly wherever available.
 */
export function getMealCategoryByName(name: string): MealCategory {
  const lower = name.toLowerCase();
  if (
    lower.includes('pancake') || lower.includes('oat') || lower.includes('shakshuka') ||
    lower.includes('breakfast') || lower.includes('granola') || lower.includes('smoothie') ||
    lower.includes('cereal') || lower.includes('porridge') || lower.includes('waffle') ||
    lower.includes('toast') || lower.includes('muesli') || lower.includes('frittata')
  ) {
    return 'breakfast';
  }
  if (
    lower.includes('salad') || lower.includes('soup') || lower.includes('wrap') ||
    lower.includes('sandwich') || lower.includes('snack') || lower.includes('dip')
  ) {
    return 'light_bites';
  }
  return 'lunch_dinner';
}

/**
 * Returns the effective meal category for a recipe, using the explicit
 * meal_type field when available and falling back to name-based heuristic.
 */
export function getRecipeCategory(recipe: { meal_type?: string; name: string }): MealCategory {
  if (recipe.meal_type === 'breakfast' || recipe.meal_type === 'lunch_dinner' || recipe.meal_type === 'light_bites') {
    return recipe.meal_type;
  }
  return getMealCategoryByName(recipe.name);
}

/**
 * Returns true if a recipe's category matches the target slot category.
 */
export function matchesSlotCategory(
  recipe: { meal_type?: string; name: string },
  slotCategory: MealCategory,
): boolean {
  return getRecipeCategory(recipe) === slotCategory;
}
