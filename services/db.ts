/**
 * services/db.ts — Supabase row ↔ TypeScript type transformations
 *
 * All providers import helpers from here so the mapping logic lives in one place.
 * No imports from providers — this file has no circular dependency risk.
 */

import {
  Recipe,
  PlannedMeal,
  ShoppingItem,
  FamilySettings,
  UserSettings,
  NotificationSettings,
  MealSlot,
  PantryItem,
  Ingredient,
} from '@/types';
import {
  DEFAULT_FAMILY_SETTINGS,
  DEFAULT_MEAL_SLOTS,
  DEFAULT_USER_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
} from '@/constants/defaults';

// ── Recipe ────────────────────────────────────────────────────────────────────

/**
 * Convert a Recipe TypeScript object to a Supabase `recipes` table row.
 * Does NOT include ingredients / method_steps (those live in separate tables).
 */
export function recipeToRow(
  recipe: Recipe,
  familyId: string
): Record<string, unknown> {
  return {
    id: recipe.id,
    family_id: familyId,
    name: recipe.name,
    source: recipe.source,
    is_customized: recipe.is_customized ?? false,
    recipe_serving_size: recipe.recipe_serving_size ?? 2,
    dietary_tags: recipe.dietary_tags ?? [],
    custom_tags: recipe.custom_tags ?? [],
    add_to_plan_count: recipe.add_to_plan_count ?? 0,
    is_ingredient_complete: recipe.is_ingredient_complete ?? false,
    is_recipe_complete: recipe.is_recipe_complete ?? false,
    image_url: recipe.image_url ?? null,
    description: recipe.description ?? null,
    cuisine: recipe.cuisine ?? null,
    cuisines: recipe.cuisines ?? [],
    meal_type: recipe.meal_type ?? null,
    cooking_time_band: recipe.cooking_time_band ?? null,
    prep_time: recipe.prep_time ?? null,
    cook_time: recipe.cook_time ?? null,
    dish_category: recipe.dish_category ?? null,
    protein_source: recipe.protein_source ?? null,
    occasions: recipe.occasions ?? [],
    is_vegan: recipe.is_vegan ?? null,
    is_vegetarian: recipe.is_vegetarian ?? null,
    is_gluten_free: recipe.is_gluten_free ?? null,
    is_dairy_free: recipe.is_dairy_free ?? null,
    allergens: recipe.allergens ?? [],
    diet_labels: recipe.diet_labels ?? [],
    taste_sweetness: recipe.taste_sweetness ?? null,
    taste_saltiness: recipe.taste_saltiness ?? null,
    taste_sourness: recipe.taste_sourness ?? null,
    taste_bitterness: recipe.taste_bitterness ?? null,
    taste_savoriness: recipe.taste_savoriness ?? null,
    taste_fattiness: recipe.taste_fattiness ?? null,
    taste_spiciness: recipe.taste_spiciness ?? null,
    calories_per_serving: recipe.calories_per_serving ?? null,
    protein_per_serving_g: recipe.protein_per_serving_g ?? null,
    carbs_per_serving_g: recipe.carbs_per_serving_g ?? null,
    health_score: recipe.health_score ?? null,
    rating: recipe.rating ?? null,
    family_notes: recipe.family_notes ?? null,
    last_cooked_at: recipe.last_cooked_at ?? null,
    last_planned_date: recipe.last_planned_date ?? null,
    delivery_url: recipe.delivery_url ?? null,
    delivery_platform: recipe.delivery_platform ?? null,
    meal_type_slot_id: recipe.meal_type_slot_id ?? null,
    source_url: recipe.source_url ?? null,
    credits: recipe.credits ?? null,
    spoonacular_id: recipe.spoonacular_id ?? null,
    created_at: recipe.created_at,
  };
}

/**
 * Convert a Supabase recipes row (with nested recipe_ingredients + recipe_method_steps)
 * back to a Recipe TypeScript object.
 */
export function rowToRecipe(row: Record<string, unknown>): Recipe {
  const ingredientRows = (row.recipe_ingredients as Record<string, unknown>[] | null) ?? [];
  const stepRows = (row.recipe_method_steps as Record<string, unknown>[] | null) ?? [];

  const ingredients: Ingredient[] = ingredientRows
    .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
    .map((i) => ({
      id: (i.id as string) ?? '',
      name: i.name as string,
      quantity: Number(i.quantity ?? 0),
      unit: (i.unit as string) ?? '',
      category: (i.category as string) ?? 'Other',
    }));

  const method_steps: string[] = stepRows
    .sort((a, b) => ((a.position as number) ?? 0) - ((b.position as number) ?? 0))
    .map((s) => s.step_text as string);

  return {
    id: row.id as string,
    name: row.name as string,
    source: (row.source as 'family_created' | 'discover') ?? 'family_created',
    ingredients,
    method_steps,
    recipe_serving_size: (row.recipe_serving_size as number) ?? 2,
    dietary_tags: (row.dietary_tags as string[]) ?? [],
    custom_tags: (row.custom_tags as string[]) ?? [],
    add_to_plan_count: (row.add_to_plan_count as number) ?? 0,
    created_at: (row.created_at as string) ?? new Date().toISOString(),
    is_ingredient_complete: (row.is_ingredient_complete as boolean) ?? false,
    is_recipe_complete: (row.is_recipe_complete as boolean) ?? false,
    is_customized: (row.is_customized as boolean) ?? false,
    image_url: (row.image_url as string) ?? undefined,
    description: (row.description as string) ?? undefined,
    cuisine: (row.cuisine as string) ?? undefined,
    cuisines: (row.cuisines as string[]) ?? [],
    meal_type: (row.meal_type as string) ?? undefined,
    cooking_time_band: (row.cooking_time_band as string) ?? undefined,
    prep_time: (row.prep_time as number) ?? undefined,
    cook_time: (row.cook_time as number) ?? undefined,
    dish_category: (row.dish_category as string) ?? undefined,
    protein_source: (row.protein_source as string) ?? undefined,
    occasions: (row.occasions as string[]) ?? [],
    allergens: (row.allergens as string[]) ?? [],
    diet_labels: (row.diet_labels as string[]) ?? [],
    taste_sweetness: (row.taste_sweetness as number) ?? undefined,
    taste_saltiness: (row.taste_saltiness as number) ?? undefined,
    taste_sourness: (row.taste_sourness as number) ?? undefined,
    taste_bitterness: (row.taste_bitterness as number) ?? undefined,
    taste_savoriness: (row.taste_savoriness as number) ?? undefined,
    taste_fattiness: (row.taste_fattiness as number) ?? undefined,
    taste_spiciness: (row.taste_spiciness as number) ?? undefined,
    calories_per_serving: (row.calories_per_serving as number) ?? undefined,
    protein_per_serving_g: (row.protein_per_serving_g as number) ?? undefined,
    carbs_per_serving_g: (row.carbs_per_serving_g as number) ?? undefined,
    health_score: (row.health_score as number) ?? undefined,
    rating: (row.rating as string) ?? undefined,
    family_notes: (row.family_notes as string) ?? undefined,
    last_cooked_at: (row.last_cooked_at as string) ?? undefined,
    last_planned_date: (row.last_planned_date as string) ?? undefined,
    delivery_url: (row.delivery_url as string) ?? undefined,
    delivery_platform: (row.delivery_platform as string) ?? undefined,
    meal_type_slot_id: (row.meal_type_slot_id as string) ?? undefined,
    source_url: (row.source_url as string) ?? undefined,
    credits: (row.credits as string) ?? undefined,
    spoonacular_id: (row.spoonacular_id as number) ?? undefined,
    is_vegan: (row.is_vegan as boolean) ?? undefined,
    is_vegetarian: (row.is_vegetarian as boolean) ?? undefined,
    is_gluten_free: (row.is_gluten_free as boolean) ?? undefined,
    is_dairy_free: (row.is_dairy_free as boolean) ?? undefined,
  };
}

/** Convert recipe ingredients to recipe_ingredients table rows. */
export function ingredientsToRows(
  ingredients: Ingredient[],
  recipeId: string,
  familyId: string
): Record<string, unknown>[] {
  return ingredients.map((ing, idx) => ({
    recipe_id: recipeId,
    family_id: familyId,
    name: ing.name,
    quantity: ing.quantity,
    unit: ing.unit ?? '',
    category: ing.category ?? 'Other',
    position: idx,
  }));
}

/** Convert method steps to recipe_method_steps table rows. */
export function stepsToRows(
  steps: string[],
  recipeId: string,
  familyId: string
): Record<string, unknown>[] {
  return steps.map((step, idx) => ({
    recipe_id: recipeId,
    family_id: familyId,
    step_text: step,
    position: idx,
  }));
}

// ── PlannedMeal ───────────────────────────────────────────────────────────────

export function plannedMealToRow(
  meal: PlannedMeal,
  familyId: string
): Record<string, unknown> {
  return {
    id: meal.id,
    family_id: familyId,
    recipe_id: meal.meal_id ?? null,
    slot_id: meal.slot_id,
    date: meal.date, // 'YYYY-MM-DD' string — matches Postgres date type
    meal_name: meal.meal_name,
    meal_image_url: meal.meal_image_url ?? null,
    meal_type: meal.meal_type ?? null,
    cuisine: meal.cuisine ?? null,
    serving_size: meal.serving_size,
    recipe_serving_size: meal.recipe_serving_size ?? 2,
    daily_note: meal.daily_note ?? null,
    is_delivery: meal.is_delivery ?? false,
    delivery_url: meal.delivery_url ?? null,
    delivery_platform: meal.delivery_platform ?? null,
    position: meal.position ?? 0,
  };
}

export function rowToPlannedMeal(row: Record<string, unknown>): PlannedMeal {
  return {
    id: row.id as string,
    meal_id: (row.recipe_id as string) ?? undefined,
    slot_id: row.slot_id as string,
    date: row.date as string, // Supabase returns date as 'YYYY-MM-DD'
    meal_name: row.meal_name as string,
    meal_image_url: (row.meal_image_url as string) ?? undefined,
    meal_type: (row.meal_type as PlannedMeal['meal_type']) ?? undefined,
    cuisine: (row.cuisine as string) ?? undefined,
    serving_size: (row.serving_size as number) ?? 2,
    recipe_serving_size: (row.recipe_serving_size as number) ?? 2,
    ingredients: [], // not stored in planned_meals; looked up via meal_id → recipes
    daily_note: (row.daily_note as string) ?? undefined,
    position: (row.position as number) ?? 0,
    is_delivery: (row.is_delivery as boolean) ?? false,
    delivery_url: (row.delivery_url as string) ?? undefined,
    delivery_platform: (row.delivery_platform as PlannedMeal['delivery_platform']) ?? undefined,
  };
}

// ── ShoppingItem ──────────────────────────────────────────────────────────────

export function shoppingItemToRow(
  item: ShoppingItem,
  familyId: string,
  generatedAt: string | null
): Record<string, unknown> {
  return {
    id: item.id,
    family_id: familyId,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit ?? '',
    category: item.category ?? 'Other',
    checked: item.checked ?? false,
    is_pantry: item.is_pantry ?? false,
    manually_added: item.manually_added ?? false,
    where_to_buy: item.where_to_buy ?? null,
    meal_breakdown: item.meal_breakdown ?? [],
    generated_at: generatedAt,
  };
}

export function rowToShoppingItem(row: Record<string, unknown>): ShoppingItem {
  return {
    id: row.id as string,
    name: row.name as string,
    quantity: Number(row.quantity ?? 0),
    unit: (row.unit as string) ?? '',
    category: (row.category as string) ?? 'Other',
    checked: (row.checked as boolean) ?? false,
    is_pantry: (row.is_pantry as boolean) ?? false,
    manually_added: (row.manually_added as boolean) ?? false,
    where_to_buy: (row.where_to_buy as string) ?? undefined,
    meal_breakdown: (row.meal_breakdown as { meal_name: string; quantity: number }[]) ?? [],
  };
}

// ── FamilySettings ────────────────────────────────────────────────────────────

export function rowToFamilySettings(
  familyRow: Record<string, unknown> | null,
  slotsRows: Record<string, unknown>[] | null,
  pantryRows: Record<string, unknown>[] | null
): FamilySettings {
  if (!familyRow) return DEFAULT_FAMILY_SETTINGS;

  const meal_slots: MealSlot[] =
    slotsRows && slotsRows.length > 0
      ? slotsRows
          .sort((a, b) => ((a.order as number) ?? 0) - ((b.order as number) ?? 0))
          .map((s) => ({
            slot_id: s.slot_id as string,
            name: s.name as string,
            order: (s.order as number) ?? 0,
            serving_size_override: (s.serving_size_override as number) ?? undefined,
          }))
      : DEFAULT_MEAL_SLOTS;

  const pantry_items: PantryItem[] = pantryRows
    ? pantryRows.map((p) => ({
        id: p.id as string,
        name: p.name as string,
        category: (p.category as string) ?? 'Other',
      }))
    : [];

  return {
    family_name: (familyRow.family_name as string) ?? '',
    meal_slots,
    default_serving_size: (familyRow.default_serving_size as number) ?? 4,
    pantry_items,
    dietary_preferences_family: [],
    measurement_units: (familyRow.measurement_units as 'metric' | 'imperial') ?? 'metric',
    language: (familyRow.language as string) ?? 'English',
    region: (familyRow.region as string) ?? 'US',
    smart_fill_novelty_pct: (familyRow.smart_fill_novelty_pct as number) ?? 30,
    cultural_restrictions: (familyRow.cultural_restrictions as string[]) ?? [],
    intolerances: (familyRow.intolerances as string[]) ?? [],
    diet_preferences: (familyRow.diet_preferences as string[]) ?? [],
    household_type: (familyRow.household_type as string) ?? undefined,
  };
}

export function rowToUserSettings(
  row: Record<string, unknown> | null,
  userId: string
): UserSettings {
  if (!row) return { ...DEFAULT_USER_SETTINGS, user_id: userId };
  return {
    user_id: userId,
    display_name: (row.display_name as string) ?? 'You',
    avatar_url: (row.avatar_url as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    dietary_preferences_individual: (row.dietary_preferences_individual as string[]) ?? [],
    is_admin: (row.is_admin as boolean) ?? true,
    personal_goal: (row.personal_goal as string) ?? 'balanced',
    health_goals: (row.health_goals as string[]) ?? [],
  };
}

export function rowToNotificationSettings(
  row: Record<string, unknown> | null
): NotificationSettings {
  if (!row) return DEFAULT_NOTIFICATION_SETTINGS;
  return {
    new_recipes: (row.new_recipes as boolean) ?? true,
    weekly_reminder: (row.weekly_reminder as boolean) ?? true,
    weekly_reminder_day: (row.weekly_reminder_day as number) ?? 0,
    weekly_reminder_time: (row.weekly_reminder_time as string) ?? '18:00',
    shopping_reminder: (row.shopping_reminder as boolean) ?? true,
    shopping_reminder_day: (row.shopping_reminder_day as number) ?? 6,
    shopping_reminder_time: (row.shopping_reminder_time as string) ?? '09:00',
  };
}

/**
 * Upsert a full recipe (row + ingredients + steps) to Supabase.
 * Uses delete-and-reinsert for ingredients/steps to keep things simple.
 * Exported so both FavsProvider and add-recipe flows can call it.
 */
export async function upsertRecipeToSupabase(
  recipe: Recipe,
  familyId: string,
  supabase: ReturnType<typeof import('@/services/supabase').getSupabase>
): Promise<void> {
  // 1. Upsert the recipe row
  const { error: recipeErr } = await supabase
    .from('recipes')
    .upsert(recipeToRow(recipe, familyId), { onConflict: 'id' });
  if (recipeErr) {
    console.error('[DB] upsertRecipe error:', recipeErr.message);
    return;
  }

  // 2. Delete existing ingredients/steps then re-insert
  await supabase.from('recipe_ingredients').delete().eq('recipe_id', recipe.id);
  await supabase.from('recipe_method_steps').delete().eq('recipe_id', recipe.id);

  if (recipe.ingredients.length > 0) {
    const { error: ingErr } = await supabase
      .from('recipe_ingredients')
      .insert(ingredientsToRows(recipe.ingredients, recipe.id, familyId));
    if (ingErr) console.error('[DB] insert ingredients error:', ingErr.message);
  }

  if (recipe.method_steps && recipe.method_steps.length > 0) {
    const { error: stepsErr } = await supabase
      .from('recipe_method_steps')
      .insert(stepsToRows(recipe.method_steps, recipe.id, familyId));
    if (stepsErr) console.error('[DB] insert steps error:', stepsErr.message);
  }
}
