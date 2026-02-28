export interface MealSlot {
  slot_id: string;
  name: string;
  order: number;
  serving_size_override?: number;
}

export interface FamilySettings {
  family_name: string;
  family_avatar_url?: string;
  meal_slots: MealSlot[];
  default_serving_size: number;
  pantry_items: PantryItem[];
  dietary_preferences_family: string[];
  measurement_units: 'metric' | 'imperial';
  language: string;
  region: string;
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
}

export interface UserSettings {
  user_id: string;
  display_name: string;
  email?: string;
  avatar_url?: string;
  dietary_preferences_individual: string[];
  is_admin: boolean;
}

export interface FamilyMember {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  is_admin: boolean;
  dietary_preferences: string[];
}

export interface NotificationSettings {
  new_recipes: boolean;
  weekly_reminder: boolean;
  weekly_reminder_day: number;
  weekly_reminder_time: string;
  shopping_reminder: boolean;
  shopping_reminder_day: number;
  shopping_reminder_time: string;
}

export interface OnboardingData {
  completed: boolean;
  current_step: number;
  family_name: string;
  household_size: number;
  meal_slots: MealSlot[];
  dietary_preferences_family: string[];
  dietary_preferences_individual: string[];
  is_admin: boolean;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
}

export interface PlannedMeal {
  id: string;
  slot_id: string;
  date: string;
  meal_name: string;
  meal_image_url?: string;
  serving_size: number;
  ingredients: Ingredient[];
  recipe_serving_size: number;
  daily_note?: string;
  delivery_url?: string;
  delivery_platform?: 'uber_eats' | 'zomato' | 'grab' | 'swiggy' | 'deliveroo' | 'doordash' | 'other';
  position?: number;
  meal_id?: string;
}

export interface Meal {
  id: string;
  name: string;
  image_url?: string;
  cuisine?: string;
  cooking_time_band?: 'Under 30' | '30-60' | 'Over 60';
  prep_time?: number;
  cook_time?: number;
  dietary_tags: string[];
  custom_tags: string[];
  meal_type_slot_id?: string;
  meal_type?: 'breakfast' | 'lunch_dinner' | 'light_bites';
  ingredients: Ingredient[];
  recipe_serving_size: number;
  method_steps: string[];
  description?: string;
  source: 'family_created' | 'discover';
  add_to_plan_count: number;
  last_planned_date?: string;
  created_at: string;
  is_ingredient_complete: boolean;
  is_recipe_complete: boolean;
  delivery_url?: string;
  delivery_platform?: 'uber_eats' | 'zomato' | 'grab' | 'swiggy' | 'deliveroo' | 'doordash' | 'other';
}

export interface DiscoverMeal {
  // ── Core identity ──────────────────────────────────
  id: string;
  name: string;
  image_url: string;
  description: string;
  created_at: string;

  // ── Classification ─────────────────────────────────
  cuisine: string;
  meal_type: 'breakfast' | 'lunch_dinner' | 'light_bites';
  dish_types?: string[];          // Spoonacular: ['main course', 'soup', etc.]
  occasions?: string[];           // Spoonacular: ['christmas', 'summer', etc.]

  // ── Time & servings ────────────────────────────────
  prep_time: number;              // minutes
  cook_time: number;              // minutes
  cooking_time_band: 'Under 30' | '30-60' | 'Over 60';
  recipe_serving_size: number;

  // ── Diet & allergens ───────────────────────────────
  dietary_tags: string[];         // e.g. ['Vegetarian', 'Gluten-Free']
  is_vegan?: boolean;
  is_vegetarian?: boolean;
  is_gluten_free?: boolean;
  is_dairy_free?: boolean;

  // ── Nutrition (per serving at recipe_serving_size) ─
  nutrition?: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };

  // ── Taste profile ──────────────────────────────────
  taste_profile?: {
    sweetness: number;            // 0–100
    saltiness: number;
    spiciness: number;
    savoriness: number;
    fattiness: number;
  };

  // ── Cost ───────────────────────────────────────────
  price_per_serving_cents?: number;   // e.g. 240 = $2.40
  is_budget_friendly?: boolean;

  // ── Popularity ─────────────────────────────────────
  popularity_score?: number;      // Spoonacular aggregateLikes

  // ── Recipe content ─────────────────────────────────
  ingredients: Ingredient[];
  method_steps: string[];

  // ── Attribution ────────────────────────────────────
  source_url?: string;            // For Spoonacular-sourced recipes
  source_name?: string;           // e.g. 'BBC Good Food'

  // ── App metadata ───────────────────────────────────
  health_score?: number;          // 0–100, Spoonacular calculated
}

export interface MealCollection {
  id: string;
  title: string;
  subtitle?: string;
  cover_image_url: string;
  meal_count: number;
  is_new?: boolean;
  meal_ids: string[];
}

export interface CuisineCategory {
  id: string;
  name: string;
  image_url: string;
}

export interface ShoppingItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: boolean;
  is_pantry: boolean;
  manually_added: boolean;
  where_to_buy?: string;
  meal_breakdown: MealBreakdownEntry[];
}

export interface MealBreakdownEntry {
  meal_name: string;
  quantity: number;
}

export const DIETARY_OPTIONS = [
  'Vegetarian',
  'Vegan',
  'Gluten-Free',
  'Dairy-Free',
  'Nut-Free',
  'High Protein',
  'Low Carb',
  'No Restrictions',
] as const;

export const PANTRY_CATEGORIES = [
  'Oils & Vinegars',
  'Spices & Herbs',
  'Condiments',
  'Grains & Pasta',
  'Canned Goods',
  'Baking',
  'Dairy',
  'Other',
] as const;

export const INGREDIENT_CATEGORIES = [
  'Produce',
  'Meat & Fish',
  'Dairy',
  'Bakery',
  'Pantry Staples',
  'Frozen',
  'Household',
  'Other',
] as const;

export const CUISINE_OPTIONS = [
  'Italian',
  'Mexican',
  'Asian',
  'Mediterranean',
  'American',
  'Indian',
  'Japanese',
  'Thai',
  'French',
  'Middle Eastern',
  'Korean',
  'Other',
] as const;

export const COOKING_TIME_BANDS = ['Under 30', '30-60', 'Over 60'] as const;
