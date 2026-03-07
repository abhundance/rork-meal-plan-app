/**
 * useWeekRatings — persists post-week emoji feedback in AsyncStorage.
 *
 * Storage key: 'week_plan_ratings'
 * Schema:      Record<weekKey, 'disliked' | 'liked' | 'loved'>
 *              where weekKey = ISO date string of the Monday for that week (e.g. '2026-02-23')
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MealRating } from '@/types';

const STORAGE_KEY = 'week_plan_ratings';

type WeekRatings = Record<string, MealRating>;

export function useWeekRatings() {
  const [ratings, setRatings] = useState<WeekRatings>({});
  const [loaded, setLoaded] = useState(false);

  // Load persisted ratings on mount
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (raw) {
          try {
            setRatings(JSON.parse(raw) as WeekRatings);
          } catch {
            // malformed — ignore
          }
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  /**
   * Persist a rating for a specific week.
   * @param weekKey — ISO date of the Monday of the week being rated
   * @param rating  — 'disliked' | 'liked' | 'loved'
   */
  const rateWeek = useCallback(async (weekKey: string, rating: MealRating) => {
    const updated = { ...ratings, [weekKey]: rating };
    setRatings(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }, [ratings]);

  /**
   * Returns the saved rating for a given week, or undefined if not yet rated.
   */
  const getWeekRating = useCallback((weekKey: string): MealRating | undefined => {
    return ratings[weekKey];
  }, [ratings]);

  return { rateWeek, getWeekRating, loaded };
}
