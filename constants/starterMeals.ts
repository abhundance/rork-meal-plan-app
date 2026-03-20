/**
 * Starter meal bank used in onboarding breakfast / lunch / dinner pick screens.
 *
 * Design principles:
 * - Meals are tagged with their cuisine so they can be sorted regionally.
 * - Meals are tagged with dietary flags (has_beef, has_pork, has_shellfish,
 *   is_vegetarian, is_vegan) so they can be filtered based on the household's
 *   cultural restrictions and intolerances from onboarding Steps 4 & 5.
 * - All cuisine values must exist in CUISINE_OPTIONS (types/index.ts).
 * - "Indonesian" cuisine is not in CUISINE_OPTIONS; Indonesian dishes (Nasi Goreng,
 *   Rendang, Gado-Gado, etc.) are tagged as 'Malaysian' — the closest available
 *   cuisine, also widely eaten across the same region.
 * - The `filterAndSortStarterMeals()` function:
 *   1. Filters out meals that violate cultural restrictions / intolerances
 *   2. Sorts by: explicit cuisine preferences (Step 9) → regional preferences (Step 1) → original order
 */

import { StarterMealPick } from '@/types';

// ─── Breakfast ────────────────────────────────────────────────────────────────

export const BREAKFAST_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'b_nasilemak',    name: 'Nasi Lemak',                   emoji: '🍚', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 40 },
  { id: 'b_nasigoreng',   name: 'Nasi Goreng',                  emoji: '🍳', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 15 },
  { id: 'b_roticanai',    name: 'Roti Canai',                   emoji: '🫓', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_kayatoast',    name: 'Kaya Toast & Soft-Boiled Eggs',emoji: '🍳', meal_type: 'breakfast', cuisine: 'Singaporean',    cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_bubur',        name: 'Bubur Ayam',                   emoji: '🥣', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 35 },
  // East Asian
  { id: 'b_congee',       name: 'Congee',                       emoji: '🥣', meal_type: 'breakfast', cuisine: 'Chinese',        cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'b_misosoup',     name: 'Miso Soup & Steamed Rice',     emoji: '🍜', meal_type: 'breakfast', cuisine: 'Japanese',       cook_time_mins: 15, is_vegetarian: true },
  // South Asian
  { id: 'b_idli',         name: 'Idli & Sambar',                emoji: '🍽️', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'b_paratha',      name: 'Paratha & Chai',               emoji: '🫓', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_upma',         name: 'Upma',                         emoji: '🍚', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  // Middle Eastern
  { id: 'b_shakshuka',    name: 'Shakshuka',                    emoji: '🍳', meal_type: 'breakfast', cuisine: 'Middle Eastern', cook_time_mins: 25, is_vegetarian: true },
  // French / European
  { id: 'b_croissant',    name: 'Croissant & Café au Lait',     emoji: '🥐', meal_type: 'breakfast', cuisine: 'French',         cook_time_mins: 5,  is_vegetarian: true },
  { id: 'b_yogurt',       name: 'Greek Yogurt & Granola',       emoji: '🥛', meal_type: 'breakfast', cuisine: 'Greek',          cook_time_mins: 5,  is_vegetarian: true },
  // American / Western
  { id: 'b_eggs',         name: 'Scrambled Eggs on Toast',      emoji: '🥚', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_oats',         name: 'Overnight Oats',               emoji: '🌾', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 'b_pancakes',     name: 'Pancakes',                     emoji: '🥞', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_avotoast',     name: 'Avocado Toast',                emoji: '🥑', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'b_smoothie',     name: 'Smoothie Bowl',                emoji: '🫐', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
];

// ─── Lunch ────────────────────────────────────────────────────────────────────

export const LUNCH_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'l_laksa',        name: 'Laksa',                        emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Singaporean',  cook_time_mins: 30, has_shellfish: true },
  { id: 'l_chickenrice',  name: 'Chicken Rice',                 emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Singaporean',  cook_time_mins: 45 },
  { id: 'l_gadogado',     name: 'Gado-Gado',                    emoji: '🥜', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_sotoayam',     name: 'Soto Ayam',                    emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 45 },
  { id: 'l_miebakso',     name: 'Mie Bakso',                    emoji: '🥣', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 30, has_beef: true },
  // East Asian
  { id: 'l_wonton',       name: 'Wonton Noodles',               emoji: '🥟', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 30, has_pork: true },
  { id: 'l_bento',        name: 'Bento Box',                    emoji: '🍱', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 25 },
  { id: 'l_bibimbap',     name: 'Bibimbap',                     emoji: '🌶️', meal_type: 'lunch_dinner', cuisine: 'Korean',       cook_time_mins: 30 },
  // South Asian
  { id: 'l_dalrice',      name: 'Dal & Rice',                   emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'l_biryani',      name: 'Chicken Biryani',              emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 50 },
  // Southeast Asian cont.
  { id: 'l_padthai',      name: 'Pad Thai',                     emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Thai',         cook_time_mins: 25, has_shellfish: true },
  { id: 'l_pho',          name: 'Pho',                          emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',   cook_time_mins: 45, has_beef: true },
  // Mediterranean / European
  { id: 'l_pasta',        name: 'Pasta',                        emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_greeksalad',   name: 'Greek Salad & Pita',           emoji: '🫒', meal_type: 'lunch_dinner', cuisine: 'Greek',        cook_time_mins: 10, is_vegetarian: true },
  // American / Western
  { id: 'l_caesar',       name: 'Caesar Salad',                 emoji: '🥗', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 15, is_vegetarian: true },
  { id: 'l_sandwich',     name: 'Sandwich & Wrap',              emoji: '🥙', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 10 },
  { id: 'l_pokebowl',     name: 'Poke Bowl',                    emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 15 },
  { id: 'l_tacos',        name: 'Tacos',                        emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 20 },
];

// ─── Dinner ───────────────────────────────────────────────────────────────────

export const DINNER_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'd_rendang',       name: 'Beef Rendang',                 emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Malaysian',   cook_time_mins: 90, has_beef: true },
  { id: 'd_nasipadang',    name: 'Nasi Padang',                  emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Malaysian',   cook_time_mins: 30 },
  { id: 'd_nasigoreng',    name: 'Nasi Goreng',                  emoji: '🍳', meal_type: 'lunch_dinner', cuisine: 'Malaysian',   cook_time_mins: 20 },
  { id: 'd_satay',         name: 'Chicken Satay',                emoji: '🍢', meal_type: 'lunch_dinner', cuisine: 'Malaysian',   cook_time_mins: 35 },
  { id: 'd_tomyum',        name: 'Tom Yum Soup',                 emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Thai',        cook_time_mins: 30, has_shellfish: true },
  { id: 'd_pho',           name: 'Pho Bo',                       emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',  cook_time_mins: 60, has_beef: true },
  // East Asian
  { id: 'd_stirfry',       name: 'Stir-Fried Vegetables & Rice', emoji: '🥦', meal_type: 'lunch_dinner', cuisine: 'Chinese',     cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 'd_friedrice',     name: 'Fried Rice',                   emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Chinese',     cook_time_mins: 20, is_vegetarian: true },
  { id: 'd_ramen',         name: 'Ramen',                        emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Japanese',    cook_time_mins: 35, has_pork: true },
  { id: 'd_kbbq',          name: 'Korean BBQ',                   emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Korean',      cook_time_mins: 40, has_beef: true, has_pork: true },
  // South Asian
  { id: 'd_butterchicken', name: 'Butter Chicken',               emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Indian',      cook_time_mins: 40 },
  { id: 'd_chickencurry',  name: 'Chicken Curry',                emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',      cook_time_mins: 45 },
  // Mediterranean / European
  { id: 'd_spaghetti',     name: 'Spaghetti Bolognese',          emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',     cook_time_mins: 40, has_beef: true },
  { id: 'd_pizza',         name: 'Homemade Pizza',               emoji: '🍕', meal_type: 'lunch_dinner', cuisine: 'Italian',     cook_time_mins: 45, is_vegetarian: true },
  { id: 'd_carbonara',     name: 'Spaghetti Carbonara',          emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',     cook_time_mins: 25, has_pork: true },
  // American / Western
  { id: 'd_salmon',        name: 'Grilled Salmon',               emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'American',    cook_time_mins: 20 },
  { id: 'd_tacos',         name: 'Tacos al Pastor',              emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',     cook_time_mins: 30, has_pork: true },
];

// ─── Regional cuisine preferences ─────────────────────────────────────────────
//
// Maps a country name (from onboarding region screen) to an ordered list of
// cuisines to surface first. Cuisines earlier in the array are ranked higher.
// Countries not in this map get the default (popularity) ordering.

export const REGION_PREFERRED_CUISINES: Record<string, string[]> = {
  // Southeast Asia
  'Indonesia':   ['Malaysian', 'Singaporean', 'Chinese', 'Indian', 'Japanese'],
  'Malaysia':    ['Malaysian', 'Singaporean', 'Chinese', 'Indian', 'Thai'],
  'Singapore':   ['Singaporean', 'Malaysian', 'Chinese', 'Indian', 'Japanese'],
  'Thailand':    ['Thai', 'Malaysian', 'Chinese', 'Japanese'],
  'Vietnam':     ['Vietnamese', 'Chinese', 'Thai', 'Japanese'],
  'Philippines': ['Filipino', 'Chinese', 'American', 'Japanese'],
  'Myanmar':     ['Malaysian', 'Chinese', 'Indian', 'Thai'],
  // East Asia
  'China':       ['Chinese', 'Japanese', 'Korean'],
  'Hong Kong':   ['Chinese', 'Japanese', 'British'],
  'Taiwan':      ['Chinese', 'Japanese'],
  'Japan':       ['Japanese', 'Chinese', 'Korean'],
  'South Korea': ['Korean', 'Chinese', 'Japanese'],
  // South Asia
  'India':       ['Indian', 'Middle Eastern', 'Malaysian'],
  'Pakistan':    ['Indian', 'Middle Eastern'],
  'Bangladesh':  ['Indian', 'Middle Eastern'],
  'Nepal':       ['Indian', 'Chinese'],
  'Sri Lanka':   ['Indian', 'Malaysian'],
  // Middle East
  'Saudi Arabia':          ['Middle Eastern', 'Indian'],
  'United Arab Emirates':  ['Middle Eastern', 'Indian'],
  'Israel':                ['Middle Eastern', 'Mediterranean', 'French'],
  'Turkey':                ['Middle Eastern', 'Mediterranean', 'Greek'],
  'Egypt':                 ['Middle Eastern', 'Mediterranean', 'African'],
  // Western Europe
  'France':      ['French', 'Mediterranean', 'Italian'],
  'Italy':       ['Italian', 'Mediterranean', 'French'],
  'Spain':       ['Spanish', 'Mediterranean', 'French'],
  'Greece':      ['Greek', 'Mediterranean'],
  'Germany':     ['German', 'European', 'Italian'],
  'Netherlands': ['European', 'French', 'Italian'],
  'Belgium':     ['French', 'European', 'Italian'],
  'Switzerland': ['French', 'European', 'Italian'],
  'Austria':     ['European', 'German', 'Italian'],
  'Portugal':    ['Mediterranean', 'Spanish', 'European'],
  // UK & Ireland
  'United Kingdom': ['British', 'Indian', 'Italian', 'French'],
  'Ireland':        ['Irish', 'British', 'Italian'],
  // Nordic
  'Sweden':    ['Nordic', 'European', 'Italian'],
  'Norway':    ['Nordic', 'European', 'Italian'],
  'Denmark':   ['Nordic', 'European', 'French'],
  'Finland':   ['Nordic', 'European'],
  // Eastern Europe
  'Poland':    ['Eastern European', 'European', 'Italian'],
  'Romania':   ['Eastern European', 'Mediterranean', 'Greek'],
  'Hungary':   ['Eastern European', 'European', 'Italian'],
  // Americas
  'United States': ['American', 'Mexican', 'Italian', 'Chinese'],
  'Canada':        ['American', 'Italian', 'French', 'Chinese'],
  'Mexico':        ['Mexican', 'Latin American', 'American'],
  'Colombia':      ['Colombian', 'Latin American', 'American'],
  'Brazil':        ['Latin American', 'American', 'Italian'],
  'Argentina':     ['Latin American', 'American', 'Italian', 'Spanish'],
  'Chile':         ['Latin American', 'American', 'Spanish'],
  // Africa
  'Nigeria':      ['African', 'Middle Eastern', 'American'],
  'Kenya':        ['African', 'Indian', 'Middle Eastern'],
  'South Africa': ['African', 'British', 'American'],
  // Pacific
  'Australia':    ['American', 'British', 'Mediterranean', 'Italian', 'Chinese'],
  'New Zealand':  ['American', 'British', 'Mediterranean', 'Italian'],
};

/**
 * Sorts a list of starter meals so that those from cuisines popular in the
 * user's region surface first. Within each tier the original list order is
 * preserved (stable sort). Falls back to the original order if the region is
 * not mapped.
 *
 * @deprecated Prefer `filterAndSortStarterMeals` which also applies dietary
 * restriction filtering and respects explicit cuisine preferences from Step 9.
 */
export function getRegionalMeals<T extends { cuisine?: string }>(
  meals: T[],
  region: string,
): T[] {
  const preferred = REGION_PREFERRED_CUISINES[region];
  if (!preferred || preferred.length === 0) return meals;

  return [...meals].sort((a, b) => {
    const aRank = preferred.indexOf(a.cuisine ?? '');
    const bRank = preferred.indexOf(b.cuisine ?? '');

    if (aRank !== -1 && bRank !== -1) return aRank - bRank;
    if (aRank !== -1) return -1;
    if (bRank !== -1) return 1;
    return 0;
  });
}

/**
 * The main function used by the onboarding picks screens.
 *
 * 1. FILTER — removes meals that violate the household's dietary restrictions:
 *    - cultural_restrictions: no_beef, no_pork, no_shellfish, no_meat, vegan
 *    - intolerances: (reserved for future flags like gluten-free, dairy-free)
 *
 * 2. SORT — three-tier stable sort:
 *    Tier 1 (highest): cuisines in the user's explicit cuisine_preferences (Step 9)
 *    Tier 2: cuisines popular in the user's country / region (Step 1)
 *    Tier 3 (lowest): everything else, in original list order
 */
export function filterAndSortStarterMeals<T extends StarterMealPick>(
  meals: T[],
  region: string,
  culturalRestrictions: string[],
  _intolerances: string[],       // reserved — no starter meals have gluten/dairy flags yet
  cuisinePreferences: string[],  // explicit picks from Step 9 (e.g. ['Italian', 'Japanese'])
): T[] {
  // ── Step 1: Filter ──────────────────────────────────────────────────────────
  const filtered = meals.filter((meal) => {
    if (culturalRestrictions.includes('no_beef')     && meal.has_beef)      return false;
    if (culturalRestrictions.includes('no_pork')     && meal.has_pork)      return false;
    if (culturalRestrictions.includes('no_shellfish')&& meal.has_shellfish) return false;
    // no_meat and vegan: keep only vegetarian / vegan meals respectively
    if (culturalRestrictions.includes('vegan')       && !meal.is_vegan)     return false;
    if (culturalRestrictions.includes('no_meat')     && !meal.is_vegetarian && !meal.is_vegan) return false;
    return true;
  });

  // ── Step 2: Sort ─────────────────────────────────────────────────────────--
  // Normalise cuisine_preferences to lowercase for case-insensitive matching.
  const prefSet = new Set(cuisinePreferences.map((c) => c.toLowerCase()));
  const regionalPreferred = REGION_PREFERRED_CUISINES[region] ?? [];

  return [...filtered].sort((a, b) => {
    const aCuisine = (a.cuisine ?? '').toLowerCase();
    const bCuisine = (b.cuisine ?? '').toLowerCase();

    // Tier 1: explicit cuisine preferences from Step 9
    const aInPrefs = prefSet.has(aCuisine);
    const bInPrefs = prefSet.has(bCuisine);
    if (aInPrefs && !bInPrefs) return -1;
    if (!aInPrefs && bInPrefs) return 1;

    // Tier 2: regional preferences from Step 1 country
    const aRank = regionalPreferred.indexOf(a.cuisine ?? '');
    const bRank = regionalPreferred.indexOf(b.cuisine ?? '');
    if (aRank !== -1 && bRank !== -1) return aRank - bRank;
    if (aRank !== -1) return -1;
    if (bRank !== -1) return 1;

    // Tier 3: preserve original list order
    return 0;
  });
}
