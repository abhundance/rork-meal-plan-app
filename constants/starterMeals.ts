/**
 * Starter meal bank used in onboarding breakfast / lunch / dinner pick screens,
 * and auto-seeded into Favs for snacks, desserts, and drinks.
 *
 * Design principles:
 * - ~195 meals across 6 categories: breakfast, lunch_dinner (lunch & dinner),
 *   snack, dessert, drink.
 * - Focused on the 5 most globally popular cuisines: Italian, Chinese, Japanese,
 *   Mexican, Indian — with wide representation from other world cuisines.
 * - Every meal is tagged with dietary flags (has_beef, has_pork, has_shellfish,
 *   is_vegetarian, is_vegan) for onboarding restriction filtering.
 * - All cuisine values must exist in CUISINE_OPTIONS (types/index.ts).
 * - Indonesian dishes are tagged 'Malaysian' (closest available cuisine tag).
 * - The `filterAndSortStarterMeals()` function:
 *   1. Filters out meals that violate cultural restrictions / intolerances
 *   2. Sorts by: explicit cuisine_preferences (Step 9) → regional (Step 1) → original order
 */

import { StarterMealPick } from '@/types';

// ─── Breakfast (40 meals) ────────────────────────────────────────────────────

export const BREAKFAST_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'b_nasilemak',      name: 'Nasi Lemak',                    emoji: '🍚', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 40 },
  { id: 'b_nasigoreng',     name: 'Nasi Goreng',                   emoji: '🍳', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 15 },
  { id: 'b_roticanai',      name: 'Roti Canai',                    emoji: '🫓', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_kayatoast',      name: 'Kaya Toast & Soft-Boiled Eggs', emoji: '🍳', meal_type: 'breakfast', cuisine: 'Singaporean',    cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_bubur',          name: 'Bubur Ayam',                    emoji: '🥣', meal_type: 'breakfast', cuisine: 'Malaysian',      cook_time_mins: 35 },
  // East Asian
  { id: 'b_congee',         name: 'Congee',                        emoji: '🥣', meal_type: 'breakfast', cuisine: 'Chinese',        cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'b_jianbing',       name: 'Jianbing (Chinese Crêpe)',      emoji: '🥞', meal_type: 'breakfast', cuisine: 'Chinese',        cook_time_mins: 10 },
  { id: 'b_dimsum_bfast',   name: 'Har Gow & Siu Mai',             emoji: '🥟', meal_type: 'breakfast', cuisine: 'Chinese',        cook_time_mins: 25, has_pork: true, has_shellfish: true },
  { id: 'b_misosoup',       name: 'Miso Soup & Steamed Rice',      emoji: '🍜', meal_type: 'breakfast', cuisine: 'Japanese',       cook_time_mins: 15, is_vegetarian: true },
  { id: 'b_tamagoyaki',     name: 'Tamagoyaki (Rolled Omelette)',  emoji: '🍳', meal_type: 'breakfast', cuisine: 'Japanese',       cook_time_mins: 15, is_vegetarian: true },
  { id: 'b_onigiri_bfast',  name: 'Onigiri',                       emoji: '🍙', meal_type: 'breakfast', cuisine: 'Japanese',       cook_time_mins: 15, is_vegetarian: true },
  { id: 'b_natto',          name: 'Natto & Rice',                  emoji: '🍱', meal_type: 'breakfast', cuisine: 'Japanese',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  // South Asian
  { id: 'b_idli',           name: 'Idli & Sambar',                 emoji: '🍽️', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'b_paratha',        name: 'Paratha & Chai',                emoji: '🫓', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_upma',           name: 'Upma',                          emoji: '🍚', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 'b_dosa',           name: 'Masala Dosa',                   emoji: '🫓', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true },
  { id: 'b_poha',           name: 'Poha',                          emoji: '🍚', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 15, is_vegetarian: true, is_vegan: true },
  { id: 'b_aloopuri',       name: 'Aloo Puri',                     emoji: '🫓', meal_type: 'breakfast', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true },
  // Middle Eastern
  { id: 'b_shakshuka',      name: 'Shakshuka',                     emoji: '🍳', meal_type: 'breakfast', cuisine: 'Middle Eastern', cook_time_mins: 25, is_vegetarian: true },
  // Mexican
  { id: 'b_huevosrancheros',name: 'Huevos Rancheros',              emoji: '🥚', meal_type: 'breakfast', cuisine: 'Mexican',        cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_chilaquiles',    name: 'Chilaquiles',                   emoji: '🌮', meal_type: 'breakfast', cuisine: 'Mexican',        cook_time_mins: 25, is_vegetarian: true },
  { id: 'b_breakfastburrito',name: 'Breakfast Burrito',            emoji: '🌯', meal_type: 'breakfast', cuisine: 'Mexican',        cook_time_mins: 15 },
  // Italian
  { id: 'b_cornetto',       name: 'Cornetto & Espresso',           emoji: '🥐', meal_type: 'breakfast', cuisine: 'Italian',        cook_time_mins: 5,  is_vegetarian: true },
  { id: 'b_frittata',       name: 'Vegetable Frittata',            emoji: '🍳', meal_type: 'breakfast', cuisine: 'Italian',        cook_time_mins: 20, is_vegetarian: true },
  // French / European
  { id: 'b_croissant',      name: 'Croissant & Café au Lait',      emoji: '🥐', meal_type: 'breakfast', cuisine: 'French',         cook_time_mins: 5,  is_vegetarian: true },
  { id: 'b_frenchtoast',    name: 'French Toast',                  emoji: '🍞', meal_type: 'breakfast', cuisine: 'French',         cook_time_mins: 15, is_vegetarian: true },
  { id: 'b_bircher',        name: 'Bircher Muesli',                emoji: '🥣', meal_type: 'breakfast', cuisine: 'European',       cook_time_mins: 5,  is_vegetarian: true },
  // British
  { id: 'b_fullenglish',    name: 'Full English Breakfast',        emoji: '🍳', meal_type: 'breakfast', cuisine: 'British',        cook_time_mins: 25, has_pork: true },
  // Spanish
  { id: 'b_tortillaespanola',name: 'Spanish Omelette',             emoji: '🍳', meal_type: 'breakfast', cuisine: 'Spanish',        cook_time_mins: 25, is_vegetarian: true },
  // Greek
  { id: 'b_yogurt',         name: 'Greek Yogurt & Granola',        emoji: '🥛', meal_type: 'breakfast', cuisine: 'Greek',          cook_time_mins: 5,  is_vegetarian: true },
  // American / Western
  { id: 'b_eggs',           name: 'Scrambled Eggs on Toast',       emoji: '🥚', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true },
  { id: 'b_oats',           name: 'Overnight Oats',                emoji: '🌾', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 'b_pancakes',       name: 'Pancakes',                      emoji: '🥞', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_waffles',        name: 'Waffles & Maple Syrup',         emoji: '🧇', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 20, is_vegetarian: true },
  { id: 'b_avotoast',       name: 'Avocado Toast',                 emoji: '🥑', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'b_smoothie',       name: 'Smoothie Bowl',                 emoji: '🫐', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'b_bagel',          name: 'Bagel & Cream Cheese',          emoji: '🥯', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true },
  { id: 'b_acai',           name: 'Açaí Bowl',                     emoji: '🫐', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'b_granola',        name: 'Granola & Berries',             emoji: '🌾', meal_type: 'breakfast', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 'b_juk',            name: 'Korean Porridge (Juk)',         emoji: '🥣', meal_type: 'breakfast', cuisine: 'Korean',         cook_time_mins: 30, is_vegetarian: true },
];

// ─── Lunch (40 meals) ────────────────────────────────────────────────────────

export const LUNCH_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'l_laksa',          name: 'Laksa',                         emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Singaporean',  cook_time_mins: 30, has_shellfish: true },
  { id: 'l_chickenrice',    name: 'Chicken Rice',                  emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Singaporean',  cook_time_mins: 45 },
  { id: 'l_gadogado',       name: 'Gado-Gado',                     emoji: '🥜', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_sotoayam',       name: 'Soto Ayam',                     emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 45 },
  { id: 'l_miebakso',       name: 'Mie Bakso',                     emoji: '🥣', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 30, has_beef: true },
  { id: 'l_springrolls',    name: 'Fresh Spring Rolls',            emoji: '🌯', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',   cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 'l_banh_mi',        name: 'Bánh Mì',                       emoji: '🥖', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',   cook_time_mins: 15 },
  { id: 'l_padthai',        name: 'Pad Thai',                      emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Thai',         cook_time_mins: 25, has_shellfish: true },
  { id: 'l_pho',            name: 'Pho',                           emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',   cook_time_mins: 45, has_beef: true },
  // East Asian
  { id: 'l_wonton',         name: 'Wonton Noodles',                emoji: '🥟', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 30, has_pork: true },
  { id: 'l_mapoTofu',       name: 'Mapo Tofu Bowl',                emoji: '🌶️', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 25, has_pork: true },
  { id: 'l_kungpao',        name: 'Kung Pao Chicken',              emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 20 },
  { id: 'l_bento',          name: 'Bento Box',                     emoji: '🍱', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 25 },
  { id: 'l_sobabowl',       name: 'Soba Noodle Bowl',              emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 15, is_vegetarian: true },
  { id: 'l_chahan',         name: 'Japanese Fried Rice',           emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 15 },
  { id: 'l_tonkatsu',       name: 'Tonkatsu Curry',                emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 30, has_pork: true },
  { id: 'l_bibimbap',       name: 'Bibimbap',                      emoji: '🌶️', meal_type: 'lunch_dinner', cuisine: 'Korean',       cook_time_mins: 30 },
  // South Asian
  { id: 'l_dalrice',        name: 'Dal & Rice',                    emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'l_biryani',        name: 'Chicken Biryani',               emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 50 },
  { id: 'l_cholebbhature',  name: 'Chole Bhature',                 emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'l_paneertikka',    name: 'Paneer Tikka Wrap',             emoji: '🌯', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_thali',          name: 'Vegetable Thali',               emoji: '🍱', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  // Italian
  { id: 'l_caprese',        name: 'Caprese Salad',                 emoji: '🍅', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 10, is_vegetarian: true },
  { id: 'l_minestrone',     name: 'Minestrone Soup',               emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 35, is_vegetarian: true, is_vegan: true },
  { id: 'l_pasta',          name: 'Pasta al Pomodoro',             emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_panino',         name: 'Italian Panino',                emoji: '🥪', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 5 },
  // Mexican
  { id: 'l_quesadilla',     name: 'Cheese Quesadilla',             emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 10, is_vegetarian: true },
  { id: 'l_burrito',        name: 'Chicken Burrito',               emoji: '🌯', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 20 },
  { id: 'l_tostada',        name: 'Tostada',                       emoji: '🫓', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 15 },
  { id: 'l_tacos',          name: 'Tacos',                         emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 20 },
  // Mediterranean / European
  { id: 'l_greeksalad',     name: 'Greek Salad & Pita',            emoji: '🫒', meal_type: 'lunch_dinner', cuisine: 'Greek',        cook_time_mins: 10, is_vegetarian: true },
  { id: 'l_souvlaki',       name: 'Souvlaki Wrap',                 emoji: '🥙', meal_type: 'lunch_dinner', cuisine: 'Greek',        cook_time_mins: 20 },
  { id: 'l_frenchonion',    name: 'French Onion Soup',             emoji: '🥣', meal_type: 'lunch_dinner', cuisine: 'French',       cook_time_mins: 45, is_vegetarian: true },
  { id: 'l_nicoise',        name: 'Niçoise Salad',                 emoji: '🥗', meal_type: 'lunch_dinner', cuisine: 'French',       cook_time_mins: 15 },
  // American / Western
  { id: 'l_caesar',         name: 'Caesar Salad',                  emoji: '🥗', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 15, is_vegetarian: true },
  { id: 'l_sandwich',       name: 'Sandwich & Wrap',               emoji: '🥙', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 10 },
  { id: 'l_pokebowl',       name: 'Poke Bowl',                     emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 15 },
  { id: 'l_clubsandwich',   name: 'Club Sandwich',                 emoji: '🥪', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 10 },
  { id: 'l_tomatosoup',     name: 'Tomato Soup & Grilled Cheese',  emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 20, is_vegetarian: true },
  { id: 'l_tacosalad',      name: 'Taco Salad',                    emoji: '🥗', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 15 },
];

// ─── Dinner (45 meals) ───────────────────────────────────────────────────────

export const DINNER_MEALS_ALL: StarterMealPick[] = [
  // Southeast Asian
  { id: 'd_rendang',        name: 'Beef Rendang',                  emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 90,  has_beef: true },
  { id: 'd_nasipadang',     name: 'Nasi Padang',                   emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 30 },
  { id: 'd_nasigoreng',     name: 'Nasi Goreng',                   emoji: '🍳', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 20 },
  { id: 'd_satay',          name: 'Chicken Satay',                 emoji: '🍢', meal_type: 'lunch_dinner', cuisine: 'Malaysian',    cook_time_mins: 35 },
  { id: 'd_tomyum',         name: 'Tom Yum Soup',                  emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Thai',         cook_time_mins: 30,  has_shellfish: true },
  { id: 'd_thaicurry',      name: 'Thai Green Curry',              emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Thai',         cook_time_mins: 35 },
  { id: 'd_pho',            name: 'Pho Bo',                        emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Vietnamese',   cook_time_mins: 60,  has_beef: true },
  { id: 'd_sundubu',        name: 'Sundubu Jjigae',                emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Korean',       cook_time_mins: 20 },
  // East Asian
  { id: 'd_stirfry',        name: 'Stir-Fried Vegetables & Rice',  emoji: '🥦', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 20,  is_vegetarian: true, is_vegan: true },
  { id: 'd_friedrice',      name: 'Fried Rice',                    emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 20,  is_vegetarian: true },
  { id: 'd_pekingduck',     name: 'Peking Duck',                   emoji: '🦆', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 60 },
  { id: 'd_sweetsourchicken',name: 'Sweet & Sour Chicken',         emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 30 },
  { id: 'd_dandannoodles',  name: 'Dan Dan Noodles',               emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 25,  has_pork: true },
  { id: 'd_dimsumfeast',    name: 'Dim Sum Basket',                emoji: '🥟', meal_type: 'lunch_dinner', cuisine: 'Chinese',      cook_time_mins: 45,  has_pork: true, has_shellfish: true },
  { id: 'd_ramen',          name: 'Ramen',                         emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 35,  has_pork: true },
  { id: 'd_teriyakisalmon', name: 'Teriyaki Salmon',               emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 20 },
  { id: 'd_yakitori',       name: 'Yakitori Skewers',              emoji: '🍢', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 30 },
  { id: 'd_gyoza',          name: 'Gyoza & Steamed Rice',          emoji: '🥟', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 25,  has_pork: true },
  { id: 'd_yakiudon',       name: 'Yaki Udon',                     emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 20 },
  { id: 'd_kbbq',           name: 'Korean BBQ',                    emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Korean',       cook_time_mins: 40,  has_beef: true, has_pork: true },
  // South Asian
  { id: 'd_butterchicken',  name: 'Butter Chicken',                emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 40 },
  { id: 'd_chickencurry',   name: 'Chicken Curry',                 emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 45 },
  { id: 'd_lambroganjosh',  name: 'Lamb Rogan Josh',               emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 60 },
  { id: 'd_dalmakhani',     name: 'Dal Makhani',                   emoji: '🫘', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 45,  is_vegetarian: true },
  { id: 'd_palakpaneer',    name: 'Palak Paneer',                  emoji: '🥬', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 35,  is_vegetarian: true },
  { id: 'd_fishcurry',      name: 'Kerala Fish Curry',             emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 35 },
  { id: 'd_biryanilamb',    name: 'Lamb Biryani',                  emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 70 },
  // Italian
  { id: 'd_spaghetti',      name: 'Spaghetti Bolognese',           emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 40,  has_beef: true },
  { id: 'd_pizza',          name: 'Homemade Pizza',                emoji: '🍕', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 45,  is_vegetarian: true },
  { id: 'd_carbonara',      name: 'Spaghetti Carbonara',           emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 25,  has_pork: true },
  { id: 'd_lasagne',        name: 'Lasagne',                       emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 60,  has_beef: true, has_pork: true },
  { id: 'd_risotto',        name: 'Mushroom Risotto',              emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 40,  is_vegetarian: true },
  { id: 'd_caciopepe',      name: 'Cacio e Pepe',                  emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 20,  is_vegetarian: true },
  { id: 'd_gnocchipesto',   name: 'Gnocchi al Pesto',              emoji: '🌿', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 25,  is_vegetarian: true },
  // Mexican
  { id: 'd_enchiladas',     name: 'Chicken Enchiladas',            emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 40 },
  { id: 'd_carneasada',     name: 'Carne Asada',                   emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 30,  has_beef: true },
  { id: 'd_pozole',         name: 'Pozole',                        emoji: '🍲', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 60,  has_pork: true },
  { id: 'd_tacos',          name: 'Tacos al Pastor',               emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 30,  has_pork: true },
  // European / Mediterranean
  { id: 'd_paella',         name: 'Seafood Paella',                emoji: '🥘', meal_type: 'lunch_dinner', cuisine: 'Spanish',      cook_time_mins: 50,  has_shellfish: true },
  { id: 'd_moussaka',       name: 'Moussaka',                      emoji: '🍆', meal_type: 'lunch_dinner', cuisine: 'Greek',        cook_time_mins: 60,  has_beef: true },
  { id: 'd_beefbourguignon',name: 'Beef Bourguignon',              emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'French',       cook_time_mins: 120, has_beef: true },
  // American / Western
  { id: 'd_salmon',         name: 'Grilled Salmon',                emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 20 },
  { id: 'd_bbqribs',        name: 'BBQ Ribs',                      emoji: '🍖', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 120, has_pork: true },
  { id: 'd_burgers',        name: 'Homemade Burgers',              emoji: '🍔', meal_type: 'lunch_dinner', cuisine: 'American',     cook_time_mins: 25,  has_beef: true },
  { id: 'd_roastchicken',   name: 'Roast Chicken & Vegetables',    emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'British',      cook_time_mins: 90 },
  { id: 'd_chickentikkamasala', name: 'Chicken Tikka Masala',      emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',       cook_time_mins: 45 },
  { id: 'd_vegetabletempura',   name: 'Vegetable Tempura & Rice',  emoji: '🥦', meal_type: 'lunch_dinner', cuisine: 'Japanese',     cook_time_mins: 25, is_vegetarian: true },
  { id: 'd_shepardspie',        name: 'Shepherd\'s Pie',           emoji: '🥧', meal_type: 'lunch_dinner', cuisine: 'British',      cook_time_mins: 60, has_beef: true },
  { id: 'd_margheritapizza',    name: 'Margherita Pizza',          emoji: '🍕', meal_type: 'lunch_dinner', cuisine: 'Italian',      cook_time_mins: 30, is_vegetarian: true },
  { id: 'd_tacosnveg',          name: 'Veggie Tacos',              emoji: '🌮', meal_type: 'lunch_dinner', cuisine: 'Mexican',      cook_time_mins: 20, is_vegetarian: true },
];

// ─── Snacks (25 meals) ───────────────────────────────────────────────────────

export const SNACK_MEALS_ALL: StarterMealPick[] = [
  // Italian
  { id: 's_bruschetta',     name: 'Bruschetta',                    emoji: '🍅', meal_type: 'snack', cuisine: 'Italian',        cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 's_arancini',       name: 'Arancini',                      emoji: '🍙', meal_type: 'snack', cuisine: 'Italian',        cook_time_mins: 30, is_vegetarian: true },
  { id: 's_focaccia',       name: 'Focaccia',                      emoji: '🫓', meal_type: 'snack', cuisine: 'Italian',        cook_time_mins: 40, is_vegetarian: true, is_vegan: true },
  { id: 's_capreseskewers', name: 'Caprese Skewers',               emoji: '🧀', meal_type: 'snack', cuisine: 'Italian',        cook_time_mins: 5,  is_vegetarian: true },
  // Chinese
  { id: 's_potstickers',    name: 'Potstickers',                   emoji: '🥟', meal_type: 'snack', cuisine: 'Chinese',        cook_time_mins: 15, has_pork: true },
  { id: 's_springrollsfried',name: 'Fried Spring Rolls',           emoji: '🥢', meal_type: 'snack', cuisine: 'Chinese',        cook_time_mins: 20 },
  { id: 's_steamedbaozi',   name: 'Steamed Bao Buns',              emoji: '🥟', meal_type: 'snack', cuisine: 'Chinese',        cook_time_mins: 20, has_pork: true },
  // Japanese
  { id: 's_edamame',        name: 'Edamame',                       emoji: '🫛', meal_type: 'snack', cuisine: 'Japanese',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 's_ricecrackers',   name: 'Rice Crackers',                 emoji: '🍘', meal_type: 'snack', cuisine: 'Japanese',       cook_time_mins: 0,  is_vegetarian: true, is_vegan: true },
  { id: 's_gyozasnack',     name: 'Pan-Fried Gyoza',               emoji: '🥟', meal_type: 'snack', cuisine: 'Japanese',       cook_time_mins: 15, has_pork: true },
  // Mexican
  { id: 's_guacamole',      name: 'Guacamole & Chips',             emoji: '🥑', meal_type: 'snack', cuisine: 'Mexican',        cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 's_nachos',         name: 'Loaded Nachos',                 emoji: '🌮', meal_type: 'snack', cuisine: 'Mexican',        cook_time_mins: 15, is_vegetarian: true },
  { id: 's_elote',          name: 'Elote (Mexican Street Corn)',   emoji: '🌽', meal_type: 'snack', cuisine: 'Mexican',        cook_time_mins: 15, is_vegetarian: true },
  { id: 's_taquitos',       name: 'Crispy Taquitos',               emoji: '🌯', meal_type: 'snack', cuisine: 'Mexican',        cook_time_mins: 20 },
  // Indian
  { id: 's_samosa',         name: 'Samosa',                        emoji: '🔺', meal_type: 'snack', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true },
  { id: 's_pakora',         name: 'Vegetable Pakora',              emoji: '🍡', meal_type: 'snack', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 's_panipuri',       name: 'Pani Puri',                     emoji: '🫧', meal_type: 'snack', cuisine: 'Indian',         cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 's_chaat',          name: 'Chaat',                         emoji: '🍛', meal_type: 'snack', cuisine: 'Indian',         cook_time_mins: 15, is_vegetarian: true },
  // Middle Eastern
  { id: 's_hummus',         name: 'Hummus & Pita',                 emoji: '🫘', meal_type: 'snack', cuisine: 'Middle Eastern', cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 's_tzatziki',       name: 'Tzatziki & Pita',               emoji: '🫙', meal_type: 'snack', cuisine: 'Greek',          cook_time_mins: 10, is_vegetarian: true },
  // French
  { id: 's_cheeseboard',    name: 'Cheese & Charcuterie Board',    emoji: '🧀', meal_type: 'snack', cuisine: 'French',         cook_time_mins: 10, is_vegetarian: true },
  // American
  { id: 's_buffalowings',   name: 'Buffalo Wings',                 emoji: '🍗', meal_type: 'snack', cuisine: 'American',       cook_time_mins: 35 },
  { id: 's_deviledeggs',    name: 'Deviled Eggs',                  emoji: '🥚', meal_type: 'snack', cuisine: 'American',       cook_time_mins: 20, is_vegetarian: true },
  { id: 's_trailmix',       name: 'Trail Mix',                     emoji: '🥜', meal_type: 'snack', cuisine: 'American',       cook_time_mins: 0,  is_vegetarian: true, is_vegan: true },
  { id: 's_fruitbowl',      name: 'Fresh Fruit Bowl',              emoji: '🍓', meal_type: 'snack', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
];

// ─── Desserts (25 meals) ─────────────────────────────────────────────────────

export const DESSERT_MEALS_ALL: StarterMealPick[] = [
  // Italian
  { id: 'ds_tiramisu',      name: 'Tiramisu',                      emoji: '☕', meal_type: 'dessert', cuisine: 'Italian',        cook_time_mins: 30, is_vegetarian: true },
  { id: 'ds_gelato',        name: 'Gelato',                        emoji: '🍦', meal_type: 'dessert', cuisine: 'Italian',        cook_time_mins: 0,  is_vegetarian: true },
  { id: 'ds_pannacotta',    name: 'Panna Cotta',                   emoji: '🍮', meal_type: 'dessert', cuisine: 'Italian',        cook_time_mins: 20, is_vegetarian: true },
  { id: 'ds_cannoli',       name: 'Cannoli',                       emoji: '🥐', meal_type: 'dessert', cuisine: 'Italian',        cook_time_mins: 45, is_vegetarian: true },
  // Chinese
  { id: 'ds_mangopudding',  name: 'Mango Pudding',                 emoji: '🥭', meal_type: 'dessert', cuisine: 'Chinese',        cook_time_mins: 20, is_vegetarian: true },
  { id: 'ds_tangyuan',      name: 'Tang Yuan (Glutinous Rice Balls)',emoji: '⚪',meal_type: 'dessert', cuisine: 'Chinese',        cook_time_mins: 20, is_vegetarian: true, is_vegan: true },
  { id: 'ds_redbeansoup',   name: 'Red Bean Soup',                 emoji: '🍵', meal_type: 'dessert', cuisine: 'Chinese',        cook_time_mins: 45, is_vegetarian: true, is_vegan: true },
  // Japanese
  { id: 'ds_mochi',         name: 'Mochi Ice Cream',               emoji: '🍡', meal_type: 'dessert', cuisine: 'Japanese',       cook_time_mins: 0,  is_vegetarian: true },
  { id: 'ds_matchaice',     name: 'Matcha Ice Cream',              emoji: '🍵', meal_type: 'dessert', cuisine: 'Japanese',       cook_time_mins: 0,  is_vegetarian: true },
  { id: 'ds_dorayaki',      name: 'Dorayaki',                      emoji: '🥞', meal_type: 'dessert', cuisine: 'Japanese',       cook_time_mins: 20, is_vegetarian: true },
  // Mexican
  { id: 'ds_churros',       name: 'Churros with Chocolate',        emoji: '🍩', meal_type: 'dessert', cuisine: 'Mexican',        cook_time_mins: 25, is_vegetarian: true },
  { id: 'ds_tresleches',    name: 'Tres Leches Cake',              emoji: '🎂', meal_type: 'dessert', cuisine: 'Mexican',        cook_time_mins: 60, is_vegetarian: true },
  { id: 'ds_flan',          name: 'Flan',                          emoji: '🍮', meal_type: 'dessert', cuisine: 'Mexican',        cook_time_mins: 50, is_vegetarian: true },
  // Indian
  { id: 'ds_gulabjamun',    name: 'Gulab Jamun',                   emoji: '🟤', meal_type: 'dessert', cuisine: 'Indian',         cook_time_mins: 30, is_vegetarian: true },
  { id: 'ds_kheer',         name: 'Kheer (Rice Pudding)',           emoji: '🍚', meal_type: 'dessert', cuisine: 'Indian',         cook_time_mins: 40, is_vegetarian: true },
  { id: 'ds_kulfi',         name: 'Mango Kulfi',                   emoji: '🍧', meal_type: 'dessert', cuisine: 'Indian',         cook_time_mins: 15, is_vegetarian: true },
  // French
  { id: 'ds_cremebrulee',   name: 'Crème Brûlée',                  emoji: '🍮', meal_type: 'dessert', cuisine: 'French',         cook_time_mins: 40, is_vegetarian: true },
  { id: 'ds_macaron',       name: 'Macarons',                      emoji: '🫧', meal_type: 'dessert', cuisine: 'French',         cook_time_mins: 60, is_vegetarian: true },
  { id: 'ds_chocolavacake', name: 'Chocolate Lava Cake',           emoji: '🍫', meal_type: 'dessert', cuisine: 'French',         cook_time_mins: 25, is_vegetarian: true },
  // American
  { id: 'ds_cheesecake',    name: 'New York Cheesecake',           emoji: '🎂', meal_type: 'dessert', cuisine: 'American',       cook_time_mins: 60, is_vegetarian: true },
  { id: 'ds_brownies',      name: 'Brownies',                      emoji: '🍫', meal_type: 'dessert', cuisine: 'American',       cook_time_mins: 35, is_vegetarian: true },
  { id: 'ds_icecreamsundae',name: 'Ice Cream Sundae',              emoji: '🍨', meal_type: 'dessert', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true },
  // Asian / Other
  { id: 'ds_mangostickyrice',name: 'Mango Sticky Rice',            emoji: '🥭', meal_type: 'dessert', cuisine: 'Thai',           cook_time_mins: 30, is_vegetarian: true, is_vegan: true },
  { id: 'ds_bingsu',        name: 'Bingsu (Korean Shaved Ice)',    emoji: '🧊', meal_type: 'dessert', cuisine: 'Korean',         cook_time_mins: 15, is_vegetarian: true },
  { id: 'ds_baklava',       name: 'Baklava',                       emoji: '🍯', meal_type: 'dessert', cuisine: 'Middle Eastern', cook_time_mins: 60, is_vegetarian: true },
];

// ─── Drinks (20 meals) ───────────────────────────────────────────────────────

export const DRINK_MEALS_ALL: StarterMealPick[] = [
  // Italian
  { id: 'dr_espresso',      name: 'Espresso',                      emoji: '☕', meal_type: 'drink', cuisine: 'Italian',        cook_time_mins: 3,  is_vegetarian: true, is_vegan: true },
  { id: 'dr_cappuccino',    name: 'Cappuccino',                    emoji: '☕', meal_type: 'drink', cuisine: 'Italian',        cook_time_mins: 5,  is_vegetarian: true },
  // Chinese / East Asian
  { id: 'dr_bubbletea',     name: 'Bubble Tea',                    emoji: '🧋', meal_type: 'drink', cuisine: 'Chinese',        cook_time_mins: 10, is_vegetarian: true },
  { id: 'dr_jasminetea',    name: 'Jasmine Tea',                   emoji: '🍵', meal_type: 'drink', cuisine: 'Chinese',        cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  // Japanese
  { id: 'dr_matchalatte',   name: 'Matcha Latte',                  emoji: '🍵', meal_type: 'drink', cuisine: 'Japanese',       cook_time_mins: 5,  is_vegetarian: true },
  { id: 'dr_yuzulemonade',  name: 'Yuzu Lemonade',                 emoji: '🍋', meal_type: 'drink', cuisine: 'Japanese',       cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  // Mexican
  { id: 'dr_horchata',      name: 'Horchata',                      emoji: '🥛', meal_type: 'drink', cuisine: 'Mexican',        cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'dr_aguafresca',    name: 'Agua Fresca',                   emoji: '🍹', meal_type: 'drink', cuisine: 'Mexican',        cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  // Indian
  { id: 'dr_masalachai',    name: 'Masala Chai',                   emoji: '🍵', meal_type: 'drink', cuisine: 'Indian',         cook_time_mins: 10, is_vegetarian: true },
  { id: 'dr_mangolassi',    name: 'Mango Lassi',                   emoji: '🥭', meal_type: 'drink', cuisine: 'Indian',         cook_time_mins: 5,  is_vegetarian: true },
  { id: 'dr_nimbupani',     name: 'Nimbu Pani (Lemonade)',         emoji: '🍋', meal_type: 'drink', cuisine: 'Indian',         cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  // Thai / Southeast Asian
  { id: 'dr_thaiicedtea',   name: 'Thai Iced Tea',                 emoji: '🧋', meal_type: 'drink', cuisine: 'Thai',           cook_time_mins: 10, is_vegetarian: true },
  // Middle Eastern
  { id: 'dr_minttea',       name: 'Moroccan Mint Tea',             emoji: '🍵', meal_type: 'drink', cuisine: 'Middle Eastern', cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  { id: 'dr_turkishcoffee', name: 'Turkish Coffee',                emoji: '☕', meal_type: 'drink', cuisine: 'Middle Eastern', cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  // Spanish
  { id: 'dr_sangria',       name: 'Sangria',                       emoji: '🍷', meal_type: 'drink', cuisine: 'Spanish',        cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
  // American
  { id: 'dr_coldbrew',      name: 'Cold Brew Coffee',              emoji: '☕', meal_type: 'drink', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 'dr_greensmoothie', name: 'Green Smoothie',                emoji: '🥤', meal_type: 'drink', cuisine: 'American',       cook_time_mins: 5,  is_vegetarian: true, is_vegan: true },
  { id: 'dr_kombucha',      name: 'Kombucha',                      emoji: '🫙', meal_type: 'drink', cuisine: 'American',       cook_time_mins: 0,  is_vegetarian: true, is_vegan: true },
  // Greek
  { id: 'dr_frappecoffee',  name: 'Freddo Frappé',                 emoji: '☕', meal_type: 'drink', cuisine: 'Greek',          cook_time_mins: 5,  is_vegetarian: true },
  // Indian (bonus)
  { id: 'dr_tamarind',      name: 'Tamarind Juice',                emoji: '🍹', meal_type: 'drink', cuisine: 'Indian',         cook_time_mins: 10, is_vegetarian: true, is_vegan: true },
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
    if (culturalRestrictions.includes('no_beef')      && meal.has_beef)      return false;
    if (culturalRestrictions.includes('no_pork')      && meal.has_pork)      return false;
    if (culturalRestrictions.includes('no_shellfish') && meal.has_shellfish) return false;
    if (culturalRestrictions.includes('vegan')        && !meal.is_vegan)     return false;
    if (culturalRestrictions.includes('no_meat')      && !meal.is_vegetarian && !meal.is_vegan) return false;
    return true;
  });

  // ── Step 2: Sort ─────────────────────────────────────────────────────────--
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
