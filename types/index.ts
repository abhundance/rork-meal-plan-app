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
  meal_type?: 'breakfast' | 'lunch_dinner' | 'light_bites';
  cuisine?: string;
  serving_size: number;
  ingredients: Ingredient[];
  recipe_serving_size: number;
  daily_note?: string;
  is_delivery?: boolean;
  delivery_url?: string;
  delivery_platform?: 'uber_eats' | 'zomato' | 'grab' | 'swiggy' | 'deliveroo' | 'doordash' | 'other';
  position?: number;
  meal_id?: string;
}

export interface Recipe {
  // ── Core identity (always present) ────────────────────────────────────────
  id: string;
  name: string;
  source: 'family_created' | 'discover';
  is_customized?: boolean;       // true once user has saved edits to a discover-sourced meal
  ingredients: Ingredient[];
  recipe_serving_size: number;
  method_steps: string[];
  dietary_tags: string[];        // legacy tag list — kept for backward compat
  custom_tags: string[];
  add_to_plan_count: number;
  created_at: string;
  is_ingredient_complete: boolean;
  is_recipe_complete: boolean;

  // ── Optional core ──────────────────────────────────────────────────────────
  image_url?: string;
  description?: string;
  cuisine?: string;              // single string (family-created / legacy). Use cuisines[] for discover.
  cuisines?: string[];           // multi-cuisine array (populated for discover-sourced recipes)
  meal_type?: 'breakfast' | 'lunch_dinner' | 'light_bites';
  cooking_time_band?: 'Under 30' | '30-60' | 'Over 60';
  prep_time?: number;
  cook_time?: number;
  last_planned_date?: string;
  delivery_url?: string;
  delivery_platform?: 'uber_eats' | 'zomato' | 'grab' | 'swiggy' | 'deliveroo' | 'doordash' | 'other';
  meal_type_slot_id?: string;

  // ── Rich classification (populated for discover-sourced recipes) ───────────
  dish_category?: DishCategory;
  protein_source?: ProteinSource;
  occasions?: string[];

  // ── Dietary & allergens (discover) ────────────────────────────────────────
  allergens?: string[];          // what the recipe is FREE FROM (e.g. ['gluten-free', 'dairy-free'])
  diet_labels?: string[];        // positive classifications (e.g. ['vegan', 'high-protein', 'keto'])

  // ── Taste profile (0–100 scale, discover) ─────────────────────────────────
  taste_sweetness?: number;
  taste_saltiness?: number;
  taste_sourness?: number;
  taste_bitterness?: number;
  taste_savoriness?: number;
  taste_fattiness?: number;
  taste_spiciness?: number;

  // ── Nutrition per serving (discover) ──────────────────────────────────────
  calories_per_serving?: number;
  protein_per_serving_g?: number;
  carbs_per_serving_g?: number;

  // ── Scores & metadata ─────────────────────────────────────────────────────
  health_score?: number;         // 0–100

  // ── Family interaction data ────────────────────────────────────────────────
  rating?: MealRating;
  family_notes?: string;
  last_cooked_at?: string;       // ISO date string

  // ── Attribution (discover) ────────────────────────────────────────────────
  source_url?: string;
  credits?: string;
  spoonacular_id?: number | null;
}

/** @deprecated Use Recipe instead. Alias retained for backward compatibility during migration. */
export type Meal = Recipe;

// ─── Discover-specific vocabulary types ──────────────────────────────────────

export type DishCategory =
  | 'main'
  | 'salad'
  | 'soup'
  | 'appetizer'
  | 'side'
  | 'dessert'
  | 'drink'
  | 'bread'
  | 'sandwich'
  | 'sauce'
  | 'other';

export type ProteinSource =
  | 'chicken'
  | 'beef'
  | 'pork'
  | 'lamb'
  | 'turkey'
  | 'seafood'
  | 'egg'
  | 'dairy'
  | 'plant'
  | 'none';

export type MealRating = 'disliked' | 'liked' | 'loved';

export interface DiscoverMeal {
  // ── Core identity ──────────────────────────────────
  id: string;
  name: string;
  image_url: string;
  description: string;
  created_at: string;

  // ── Classification ─────────────────────────────────
  cuisines: string[];              // e.g. ['italian', 'french']
  meal_type: 'breakfast' | 'lunch_dinner' | 'light_bites';
  dish_category: DishCategory;    // WHAT type of dish (main, soup, appetizer, etc.)
  protein_source: ProteinSource;  // primary protein (chicken, plant, seafood, etc.)
  occasions: string[];            // e.g. ['weeknight', 'christmas', 'game-day']

  // ── Dietary & Allergens ─────────────────────────────
  allergens: string[];            // what the recipe is FREE FROM (e.g. ['gluten-free', 'dairy-free'])
  diet_labels: string[];          // positive classifications (e.g. ['vegan', 'high-protein', 'keto'])

  // ── Legacy classification — kept for backward compat ─
  /** @deprecated Use cuisines[] instead */
  cuisine?: string;
  /** @deprecated Use allergens[] and diet_labels[] instead */
  dietary_tags: string[];   // kept required — used in FavsProvider, discover-filter-results, discover-search
  
  is_vegan?: boolean;
  /** @deprecated Use diet_labels.includes('vegetarian') instead */
  is_vegetarian?: boolean;
  /** @deprecated Use allergens.includes('gluten-free') instead */
  is_gluten_free?: boolean;
  /** @deprecated Use allergens.includes('dairy-free') instead */
  is_dairy_free?: boolean;

  // ── Time & servings ────────────────────────────────
  prep_time: number;              // minutes
  cook_time: number;              // minutes
  cooking_time_band: 'Under 30' | '30-60' | 'Over 60';
  recipe_serving_size: number;    // canonical recipe yield (DB name: servings_default)

  // ── Taste profile (0–100 scale, Spoonacular-compatible) ──
  taste_sweetness: number;
  taste_saltiness: number;
  taste_sourness: number;
  taste_bitterness: number;
  taste_savoriness: number;
  taste_fattiness: number;
  taste_spiciness: number;

  // ── Nutrition (per serving at recipe_serving_size) ─
  calories_per_serving: number;
  protein_per_serving_g: number;
  carbs_per_serving_g: number;

  // ── Scores & metadata ──────────────────────────────
  health_score: number;           // 0–100
  add_to_plan_count: number;

  // ── Family data (populated after family interacts) ─
  rating?: MealRating;            // disliked | liked | loved (👎/👍/👍👍)
  family_notes?: string;          // persistent recipe-level family annotation
  last_cooked_at?: string;        // ISO date string

  // ── Recipe content ─────────────────────────────────
  ingredients: Ingredient[];
  method_steps: string[];

  // ── Attribution ────────────────────────────────────
  source_url?: string;            // original recipe URL, YouTube link, etc.
  credits?: string;               // e.g. 'BBC Good Food', 'Jamie Oliver'
  spoonacular_id?: number | null; // for Spoonacular-sourced recipes
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

// ─── Updated cuisine list (31 values, Spoonacular-compatible + additions) ─────
export const CUISINE_OPTIONS = [
  'African',
  'American',
  'British',
  'Cajun',
  'Caribbean',
  'Chinese',
  'Colombian',
  'Eastern European',
  'European',
  'Filipino',
  'French',
  'German',
  'Greek',
  'Indian',
  'Irish',
  'Italian',
  'Japanese',
  'Jewish',
  'Korean',
  'Latin American',
  'Malaysian',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Native American',
  'Nordic',
  'Singaporean',
  'Southern',
  'Spanish',
  'Thai',
  'Vietnamese',
] as const;

export const DISH_CATEGORY_OPTIONS: { value: DishCategory; label: string }[] = [
  { value: 'main',      label: 'Main Course' },
  { value: 'salad',     label: 'Salad' },
  { value: 'soup',      label: 'Soup' },
  { value: 'appetizer', label: 'Appetizer / Starter' },
  { value: 'side',      label: 'Side Dish' },
  { value: 'dessert',   label: 'Dessert' },
  { value: 'drink',     label: 'Drink' },
  { value: 'bread',     label: 'Bread / Baked' },
  { value: 'sandwich',  label: 'Sandwich / Wrap' },
  { value: 'sauce',     label: 'Sauce / Condiment' },
  { value: 'other',     label: 'Other' },
];

export const PROTEIN_SOURCE_OPTIONS: { value: ProteinSource; label: string }[] = [
  { value: 'chicken',  label: 'Chicken' },
  { value: 'beef',     label: 'Beef' },
  { value: 'pork',     label: 'Pork' },
  { value: 'lamb',     label: 'Lamb' },
  { value: 'turkey',   label: 'Turkey' },
  { value: 'seafood',  label: 'Seafood / Fish' },
  { value: 'egg',      label: 'Egg' },
  { value: 'dairy',    label: 'Dairy' },
  { value: 'plant',    label: 'Plant-Based' },
  { value: 'none',     label: 'None' },
];

export const COOKING_TIME_BANDS = ['Under 30', '30-60', 'Over 60'] as const;

// ─── Occasion options (for filtering and recommendations) ────────────────────
export const OCCASION_OPTIONS = [
  'weeknight',
  'weekend',
  'brunch',
  'date-night',
  'meal-prep',
  'potluck',
  'game-day',
  'bbq',
  'picnic',
  'summer',
  'christmas',
  'thanksgiving',
  'easter',
  'birthday',
] as const;

// ─── Allergen tags (what a recipe is free from) ──────────────────────────────
export const ALLERGEN_OPTIONS = [
  'gluten-free',
  'dairy-free',
  'egg-free',
  'nut-free',
  'peanut-free',
  'soy-free',
  'shellfish-free',
  'wheat-free',
  'sesame-free',
  'vegan',        // also an allergen category: free from all animal products
] as const;

// ─── Diet label options (positive classifications) ───────────────────────────
export const DIET_LABEL_OPTIONS = [
  'vegan',
  'vegetarian',
  'high-protein',
  'low-carb',
  'keto',
  'paleo',
  'whole30',
  'plant-based',
  'high-fibre',
  'low-calorie',
  'low-fat',
  'mediterranean',
  'gluten-free',
  'dairy-free',
  'omega-3',
  'antioxidant-rich',
] as const;
