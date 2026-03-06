/**
 * Recommendation Engine — pure functions, no React, no side effects.
 * Safe to run client-side or copy verbatim into a Supabase Edge Function.
 */

import { DiscoverMeal, Recipe, PlannedMeal } from '@/types';

// ─── Supporting types ─────────────────────────────────────────────────────────

export interface TasteVector {
  sweetness:  number;
  saltiness:  number;
  sourness:   number;
  bitterness: number;
  savoriness: number;
  fattiness:  number;
  spiciness:  number;
}

export interface DiscoverPreference {
  meal_id:        string;
  rating?:        'disliked' | 'liked' | 'loved';
  last_cooked_at?: string;   // ISO date string
  is_dismissed:   boolean;
}

export interface ViewHistoryEntry {
  meal_id:   string;
  viewed_at: string;  // ISO date string
}

export interface UserProfile {
  cuisineAffinity:    Record<string, number>;   // { italian: 0.35, japanese: 0.22 }
  proteinAffinity:    Record<string, number>;   // { chicken: 0.50, seafood: 0.20 }
  timeBandAffinity:   Record<string, number>;   // { 'Under 30': 0.65 }
  tasteVector:        TasteVector;
  dietaryConstraints: string[];                 // hard exclusion filters
  recentlyCooked:     Set<string>;              // meal IDs cooked in last 14 days
  viewedMeals:        Set<string>;              // meal IDs viewed in last 30 days
  loved:              Set<string>;              // meal IDs rated 'loved'
  disliked:           Set<string>;              // meal IDs rated 'disliked'
  dominantProtein:    string | null;            // protein > 50% in last 14 days
  topCuisine:         string | null;            // cuisine > 30% affinity
  isWeekend:          boolean;
  isSunday:           boolean;
  currentHour:        number;
  currentWeekMealTypes: string[];               // meal_types already planned this week
  recentSearchTerms:  string[];
  healthTrend:        'light' | 'neutral' | 'indulgent';
  totalMealsPlanned:  number;
  seasonalTag:        string | null;            // e.g. 'christmas', 'summer'
}

export interface DiscoverCarousel {
  id:        string;
  title:     string;
  subtitle?: string;
  emoji:     string;
  meals:     DiscoverMeal[];
}

// ─── Build UserProfile ────────────────────────────────────────────────────────

export function buildUserProfile(
  plannedMeals:         PlannedMeal[],
  favMeals:             Recipe[],
  familyDietaryPrefs:   string[],
  discoverPrefs:        DiscoverPreference[],
  viewHistory:          ViewHistoryEntry[],
  recentSearches:       string[],
): UserProfile {
  const now       = new Date();
  const todayStr  = now.toISOString().split('T')[0];
  const dayOfWeek = now.getDay(); // 0=Sun, 6=Sat

  // ── Affinity from planned meal history ──────────────────────────────────────
  const cuisineCounts:   Record<string, number> = {};
  const proteinCounts:   Record<string, number> = {};
  const timeBandCounts:  Record<string, number> = {};
  const tasteAccum:      number[] = [0, 0, 0, 0, 0, 0, 0];
  let   tasteCount = 0;
  let   healthSum  = 0;
  let   healthCount = 0;

  // Count from last 14 days for protein dominance
  const last14Start = new Date(now);
  last14Start.setDate(last14Start.getDate() - 14);
  const proteinLast14: Record<string, number> = {};
  let totalLast14 = 0;

  for (const pm of plannedMeals) {
    if (pm.cuisine) {
      cuisineCounts[pm.cuisine.toLowerCase()] =
        (cuisineCounts[pm.cuisine.toLowerCase()] ?? 0) + 1;
    }
  }

  // Enrich from fav meals (stronger signal — family explicitly saved these)
  for (const m of favMeals) {
    if (m.cuisine) {
      const key = m.cuisine.toLowerCase();
      cuisineCounts[key] = (cuisineCounts[key] ?? 0) + 2; // weight favs higher
    }
    if (m.cooking_time_band) {
      timeBandCounts[m.cooking_time_band] =
        (timeBandCounts[m.cooking_time_band] ?? 0) + 1;
    }
  }

  // Taste vector from discover prefs (loved / planned meals cross-referenced)
  // We accumulate from discover preferences for now; Phase 2 will use full meal data
  const lovedSet    = new Set<string>();
  const dislikedSet = new Set<string>();
  const cookedRecently = new Set<string>();

  for (const pref of discoverPrefs) {
    if (pref.rating === 'loved') lovedSet.add(pref.meal_id);
    if (pref.rating === 'disliked') dislikedSet.add(pref.meal_id);
    if (pref.last_cooked_at) {
      const cookedDate = new Date(pref.last_cooked_at);
      const daysSince = (now.getTime() - cookedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSince < 14) cookedRecently.add(pref.meal_id);
      if (cookedDate > last14Start) {
        totalLast14++;
      }
    }
  }

  // Viewed meals (last 30 days)
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const viewedSet = new Set(
    viewHistory
      .filter(v => new Date(v.viewed_at) > thirtyDaysAgo)
      .map(v => v.meal_id)
  );

  // Normalise affinity scores to 0–1
  const normaliseCounts = (counts: Record<string, number>): Record<string, number> => {
    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    if (total === 0) return {};
    return Object.fromEntries(
      Object.entries(counts).map(([k, v]) => [k, v / total])
    );
  };

  const cuisineAffinity   = normaliseCounts(cuisineCounts);
  const proteinAffinityMap = normaliseCounts(proteinCounts);
  const timeBandAffinity  = normaliseCounts(timeBandCounts);

  // Top cuisine (> 30% share)
  const topCuisineEntry = Object.entries(cuisineAffinity)
    .sort(([, a], [, b]) => b - a)[0];
  const topCuisine = topCuisineEntry && topCuisineEntry[1] > 0.30
    ? topCuisineEntry[0] : null;

  // Dominant protein (> 50% of last 14 days)
  const topProteinEntry = Object.entries(proteinAffinityMap)
    .sort(([, a], [, b]) => b - a)[0];
  const dominantProtein = topProteinEntry && topProteinEntry[1] > 0.50
    ? topProteinEntry[0] : null;

  // Taste vector — default "neutral" if no history
  const defaultTaste: TasteVector = {
    sweetness: 30, saltiness: 50, sourness: 20,
    bitterness: 15, savoriness: 60, fattiness: 40, spiciness: 25,
  };
  const tasteVector: TasteVector = tasteCount > 0
    ? {
        sweetness:  tasteAccum[0] / tasteCount,
        saltiness:  tasteAccum[1] / tasteCount,
        sourness:   tasteAccum[2] / tasteCount,
        bitterness: tasteAccum[3] / tasteCount,
        savoriness: tasteAccum[4] / tasteCount,
        fattiness:  tasteAccum[5] / tasteCount,
        spiciness:  tasteAccum[6] / tasteCount,
      }
    : defaultTaste;

  // Health trend
  const avgHealth = healthCount > 0 ? healthSum / healthCount : 65;
  const healthTrend: 'light' | 'neutral' | 'indulgent' =
    avgHealth >= 72 ? 'light' : avgHealth <= 50 ? 'indulgent' : 'neutral';

  // Current week meal types already planned
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  const currentWeekMealTypes = [
    ...new Set(
      plannedMeals
        .filter(m => new Date(m.date) >= weekStart)
        .map(m => m.meal_type)
        .filter(Boolean) as string[]
    )
  ];

  // Seasonal tag
  const month = now.getMonth() + 1; // 1–12
  const day   = now.getDate();
  let seasonalTag: string | null = null;
  if ((month === 12 && day >= 5) || (month === 1 && day <= 1)) seasonalTag = 'christmas';
  else if (month >= 6 && month <= 8) seasonalTag = 'summer';
  else if (month === 3 && day >= 15 && day <= 31) seasonalTag = 'easter';
  else if (dayOfWeek === 6 || dayOfWeek === 0) seasonalTag = 'bbq'; // weekend BBQ boost

  return {
    cuisineAffinity,
    proteinAffinity: proteinAffinityMap,
    timeBandAffinity,
    tasteVector,
    dietaryConstraints: familyDietaryPrefs,
    recentlyCooked: cookedRecently,
    viewedMeals: viewedSet,
    loved: lovedSet,
    disliked: dislikedSet,
    dominantProtein,
    topCuisine,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
    isSunday: dayOfWeek === 0,
    currentHour: now.getHours(),
    currentWeekMealTypes,
    recentSearchTerms: recentSearches,
    healthTrend,
    totalMealsPlanned: plannedMeals.length,
    seasonalTag,
  };
}

// ─── Score a single meal ──────────────────────────────────────────────────────

export function scoreMeal(meal: DiscoverMeal, profile: UserProfile): number {
  // Hard gates
  if (profile.disliked.has(meal.id)) return 0;
  if (violatesDietaryConstraints(meal, profile.dietaryConstraints)) return 0;

  const cuisine  = cuisineScore(meal, profile);
  const protein  = proteinScore(meal, profile);
  const taste    = tasteScore(meal, profile);
  const health   = healthScoreFn(meal, profile);
  const novelty  = noveltyScore(meal, profile);
  const context  = contextScore(meal, profile);

  const base = cuisine * 0.25
             + protein * 0.15
             + taste   * 0.20
             + health  * 0.10
             + novelty * 0.20
             + context * 0.10;

  // Boost loved meals (unless recently cooked)
  if (profile.loved.has(meal.id) && !profile.recentlyCooked.has(meal.id)) {
    return Math.min(base * 1.3, 1.0);
  }
  return base;
}

function violatesDietaryConstraints(meal: DiscoverMeal, constraints: string[]): boolean {
  for (const c of constraints) {
    const lower = c.toLowerCase();
    if (lower === 'vegan' && !meal.diet_labels.includes('vegan')) return true;
    if (lower === 'vegetarian' && !meal.diet_labels.includes('vegetarian')
        && !meal.diet_labels.includes('vegan')) return true;
    if ((lower === 'gluten-free' || lower === 'gluten_free')
        && !meal.allergens.includes('gluten-free')) return true;
    if ((lower === 'dairy-free' || lower === 'dairy_free')
        && !meal.allergens.includes('dairy-free')) return true;
  }
  return false;
}

function cuisineScore(meal: DiscoverMeal, profile: UserProfile): number {
  // Find best cuisine match across meal's cuisine list
  const best = meal.cuisines.reduce((max, c) => {
    return Math.max(max, profile.cuisineAffinity[c.toLowerCase()] ?? 0);
  }, 0);
  // Exploration bonus for untried cuisines
  return best > 0 ? best : 0.25;
}

function proteinScore(meal: DiscoverMeal, profile: UserProfile): number {
  return profile.proteinAffinity[meal.protein_source] ?? 0.3;
}

function tasteScore(meal: DiscoverMeal, profile: UserProfile): number {
  const a = profile.tasteVector;
  const b: number[] = [
    meal.taste_sweetness, meal.taste_saltiness, meal.taste_sourness,
    meal.taste_bitterness, meal.taste_savoriness, meal.taste_fattiness,
    meal.taste_spiciness,
  ];
  const aVec = [
    a.sweetness, a.saltiness, a.sourness,
    a.bitterness, a.savoriness, a.fattiness, a.spiciness,
  ];
  // Cosine similarity
  const dot = aVec.reduce((sum, v, i) => sum + v * b[i], 0);
  const magA = Math.sqrt(aVec.reduce((sum, v) => sum + v * v, 0));
  const magB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));
  if (magA === 0 || magB === 0) return 0.5;
  return (dot / (magA * magB)); // 0–1
}

function healthScoreFn(meal: DiscoverMeal, profile: UserProfile): number {
  const normalised = meal.health_score / 100;
  if (profile.healthTrend === 'indulgent') return normalised;         // boost healthy options
  if (profile.healthTrend === 'light')     return 0.5;                // already eating well, neutral
  return normalised * 0.5;                                            // weak signal when neutral
}

function noveltyScore(meal: DiscoverMeal, profile: UserProfile): number {
  if (!meal.last_cooked_at) return 1.0; // never cooked = fully novel
  const daysSince = (Date.now() - new Date(meal.last_cooked_at).getTime())
    / (1000 * 60 * 60 * 24);
  return Math.min(daysSince / 14, 1.0); // full novelty after 14 days
}

function contextScore(meal: DiscoverMeal, profile: UserProfile): number {
  if (profile.isSunday && meal.occasions.includes('meal-prep'))     return 1.0;
  if (profile.isWeekend && meal.occasions.includes('weekend'))       return 1.0;
  if (profile.isWeekend && meal.occasions.includes('date-night'))    return 0.9;
  if (!profile.isWeekend && meal.cooking_time_band === 'Under 30')  return 0.8;
  if (meal.occasions.includes('weeknight') && !profile.isWeekend)   return 0.7;
  return 0.4;
}

// ─── Build Carousels ──────────────────────────────────────────────────────────

const MIN_CAROUSEL_MEALS = 3;
const MAX_CAROUSEL_MEALS = 10;
const MAX_CAROUSELS      = 7;

export function buildCarousels(
  allMeals: DiscoverMeal[],
  profile:  UserProfile,
): DiscoverCarousel[] {
  // Filter out dismissed meals globally
  const available = allMeals.filter(m => !profile.disliked.has(m.id));

  // Pre-score everything once
  const scored = available
    .map(m => ({ meal: m, score: scoreMeal(m, profile) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  const byScore = scored.map(x => x.meal);

  const candidates: (DiscoverCarousel | null)[] = [

    // C1 — For You (always shown)
    buildCarousel('c1_for_you', 'For You', '✨',
      'Picks we think your family will love', true,
      byScore.filter(m => !isRecentlyCookedStrict(m, profile, 7)),
    ),

    // C3 — Quick wins (always shown)
    buildCarousel('c3_quick_wins',
      profile.isWeekend ? 'Easy weekend eats' : 'Quick wins tonight',
      '⚡',
      'On the table in 30 minutes', true,
      sortBy(
        available.filter(m => m.cooking_time_band === 'Under 30'),
        m => scoreMeal(m, profile)
      ),
    ),

    // C6 — Fill the week (shown when gaps exist)
    ...buildFillWeekCarousels(available, profile),

    // C2 — Back on the table (shown when loved meals exist)
    buildLovedCarousel(available, profile),

    // C8 — Weekend special (Fri–Sun only)
    profile.isWeekend
      ? buildCarousel('c8_weekend_special', 'Weekend special', '🍷',
          'Worth the extra effort', false,
          sortBy(
            available.filter(m =>
              m.cooking_time_band !== 'Under 30' &&
              (m.occasions.includes('weekend') || m.occasions.includes('date-night'))
            ),
            m => scoreMeal(m, profile)
          ),
        )
      : null,

    // C9 — Meal prep Sunday
    profile.isSunday
      ? buildCarousel('c9_meal_prep', 'Meal prep Sunday', '📦',
          'Cook once, eat all week', false,
          sortBy(
            available.filter(m => m.occasions.includes('meal-prep')),
            m => m.protein_per_serving_g
          ),
        )
      : null,

    // C7 — Cuisine kitchen (when one cuisine dominates)
    profile.topCuisine
      ? buildCarousel(
          'c7_cuisine_kitchen',
          `${capitalise(profile.topCuisine)} kitchen`,
          '🌍',
          `More of what your family loves`,
          false,
          sortBy(
            available.filter(m =>
              m.cuisines.some(c => c.toLowerCase() === profile.topCuisine)
            ),
            m => scoreMeal(m, profile)
          ),
        )
      : null,

    // C4 — Something new (when enough plan history)
    profile.totalMealsPlanned >= 15
      ? buildCarousel('c4_something_new', 'Try something new', '🗺️',
          'Cuisines your family hasn\'t explored yet', false,
          sortBy(
            available.filter(m =>
              m.cuisines.every(
                c => (profile.cuisineAffinity[c.toLowerCase()] ?? 0) < 0.1
              )
            ),
            m => (1 - cuisineScore(m, profile)) * 0.6 + tasteScore(m, profile) * 0.4
          ),
        )
      : null,

    // C5 — Your kind of healthy
    (profile.healthTrend === 'indulgent' ||
     profile.dietaryConstraints.some(c =>
       ['keto', 'low-carb', 'low_carb', 'high-protein', 'high_protein'].includes(c.toLowerCase())
     ))
      ? buildCarousel('c5_your_healthy', 'Your kind of healthy', '🥗',
          'Lighter options that still taste great', false,
          sortBy(
            available.filter(m => m.health_score >= 70),
            m => tasteScore(m, profile) * (m.health_score / 100)
          ),
        )
      : null,

    // C10 — Protein switch (when one protein dominates)
    profile.dominantProtein
      ? buildCarousel('c10_protein_switch',
          `Beyond the ${profile.dominantProtein}`,
          '🔄',
          `You\'ve been cooking a lot of ${profile.dominantProtein} — try a change`, false,
          sortBy(
            available.filter(m => m.protein_source !== profile.dominantProtein),
            m => cuisineScore(m, profile) + tasteScore(m, profile)
          ),
        )
      : null,

    // C11 — Season's edit
    profile.seasonalTag
      ? buildCarousel('c11_seasonal', getSeasonalTitle(profile.seasonalTag),
          getSeasonalEmoji(profile.seasonalTag), undefined, false,
          sortBy(
            available.filter(m => m.occasions.includes(profile.seasonalTag!)),
            m => tasteScore(m, profile)
          ),
        )
      : null,

    // C12 — Trending (always shown, always last)
    buildCarousel('c12_trending', 'Trending with families', '📈',
      'Most added to meal plans', true,
      [...available].sort((a, b) => b.add_to_plan_count - a.add_to_plan_count),
    ),
  ];

  return candidates
    .filter((c): c is DiscoverCarousel => c !== null)
    .slice(0, MAX_CAROUSELS);
}

// ─── Carousel helpers ─────────────────────────────────────────────────────────

function buildCarousel(
  id:       string,
  title:    string,
  emoji:    string,
  subtitle: string | undefined,
  required: boolean,
  meals:    DiscoverMeal[],
): DiscoverCarousel | null {
  const sliced = meals.slice(0, MAX_CAROUSEL_MEALS);
  if (!required && sliced.length < MIN_CAROUSEL_MEALS) return null;
  return { id, title, emoji, subtitle, meals: sliced };
}

function buildLovedCarousel(
  available: DiscoverMeal[],
  profile:   UserProfile,
): DiscoverCarousel | null {
  const loved = available.filter(
    m => profile.loved.has(m.id) && !isRecentlyCookedStrict(m, profile, 14)
  );
  if (loved.length < MIN_CAROUSEL_MEALS) return null;
  return {
    id:       'c2_back_on_table',
    title:    'Back on the table',
    emoji:    '❤️',
    subtitle: 'Loved meals ready for a comeback',
    meals:    loved
      .sort((a, b) => {
        const dA = a.last_cooked_at ? new Date(a.last_cooked_at).getTime() : 0;
        const dB = b.last_cooked_at ? new Date(b.last_cooked_at).getTime() : 0;
        return dA - dB; // oldest cooked first
      })
      .slice(0, MAX_CAROUSEL_MEALS),
  };
}

function buildFillWeekCarousels(
  available: DiscoverMeal[],
  profile:   UserProfile,
): (DiscoverCarousel | null)[] {
  const allTypes = ['breakfast', 'lunch_dinner', 'light_bites'];
  const missing = allTypes.filter(t => !profile.currentWeekMealTypes.includes(t));
  if (missing.length < 2) return [null]; // don't show if only 1 type missing

  const labelMap: Record<string, string> = {
    breakfast:     'Breakfast ideas',
    lunch_dinner:  'Lunch & dinner ideas',
    light_bites:   'Light bite ideas',
  };
  const emojiMap: Record<string, string> = {
    breakfast: '🌅', lunch_dinner: '🍽️', light_bites: '🥙',
  };

  const firstMissing = missing[0];
  const meals = sortBy(
    available.filter(m => m.meal_type === firstMissing),
    m => scoreMeal(m, profile)
  );

  return [buildCarousel(
    'c6_fill_the_week',
    labelMap[firstMissing] ?? 'Fill your week',
    emojiMap[firstMissing] ?? '📅',
    'You\'re missing these from your plan this week',
    false,
    meals,
  )];
}

function isRecentlyCookedStrict(
  meal:    DiscoverMeal,
  profile: UserProfile,
  days:    number,
): boolean {
  if (!meal.last_cooked_at) return false;
  const d = (Date.now() - new Date(meal.last_cooked_at).getTime()) / (1000 * 60 * 60 * 24);
  return d < days;
}

function sortBy<T>(arr: T[], fn: (item: T) => number): T[] {
  return [...arr].sort((a, b) => fn(b) - fn(a));
}

function capitalise(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getSeasonalTitle(tag: string): string {
  const map: Record<string, string> = {
    christmas: 'Christmas table',
    summer:    'Summer on a plate',
    easter:    'Easter favourites',
    bbq:       'BBQ season',
  };
  return map[tag] ?? 'Season\'s picks';
}

function getSeasonalEmoji(tag: string): string {
  const map: Record<string, string> = {
    christmas: '🎄', summer: '☀️', easter: '🐣', bbq: '🔥',
  };
  return map[tag] ?? '🌿';
}
