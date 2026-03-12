/**
 * discoverMealCache — in-memory cache for recently viewed Discover meals.
 *
 * Solves the navigation problem: when a user taps a Spoonacular-sourced meal
 * in the Discover carousels, the meal data lives in the discover screen's
 * query cache. The recipe-detail screen can't access it via the URL alone.
 *
 * Usage pattern:
 *   1. Before navigating → cacheDiscoverMeal(meal)
 *   2. In recipe-detail  → getCachedDiscoverMeal(id) to retrieve it
 *
 * Cache is intentionally in-memory only — it resets on app restart, which
 * is fine since the Discover query cache will refetch from Spoonacular.
 * Holds up to MAX_ENTRIES meals (LRU eviction).
 */

import { DiscoverMeal } from '@/types';

const MAX_ENTRIES = 50;
const cache = new Map<string, DiscoverMeal>();

/**
 * Store a DiscoverMeal so recipe-detail can retrieve it by ID.
 * Call this immediately before `router.push('/recipe-detail?id=...')`.
 */
export function cacheDiscoverMeal(meal: DiscoverMeal): void {
  if (cache.size >= MAX_ENTRIES) {
    // Evict the oldest entry (Map preserves insertion order)
    const firstKey = cache.keys().next().value;
    if (firstKey !== undefined) cache.delete(firstKey);
  }
  cache.set(meal.id, meal);
}

/**
 * Retrieve a cached DiscoverMeal by its ID.
 * Returns undefined if not in cache (caller should fetch from API).
 */
export function getCachedDiscoverMeal(id: string): DiscoverMeal | undefined {
  return cache.get(id);
}

/**
 * Clear the entire cache (e.g. on sign-out).
 */
export function clearDiscoverMealCache(): void {
  cache.clear();
}
