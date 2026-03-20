/**
 * useOnboardingMeals
 *
 * Fetches curated recipes from Supabase for the onboarding pick screens.
 * Replaces the old hardcoded starterMeals.ts local lists.
 *
 * Filtering logic:
 *  - is_vegan=true  when cultural_restrictions includes 'vegan'
 *  - is_vegetarian=true  when cultural_restrictions includes 'no_meat'
 *  - is_gluten_free=true  when intolerances includes 'gluten-free'
 *  - is_dairy_free=true  when intolerances includes 'dairy-free'
 *
 * Sorting logic:
 *  1. Explicit cuisine_preferences (from Step 9) bubble to the top
 *  2. Remaining meals ordered by health_score DESC (server-side)
 */

import { useState, useEffect } from 'react';
import { getSupabase } from '@/services/supabase';
import { StarterMealPick } from '@/types';

const LIMIT = 60;

interface Opts {
  cultural: string[];
  intolerances: string[];
  cuisinePrefs: string[];
}

export function useOnboardingMeals(mealType: 'breakfast' | 'lunch_dinner', opts: Opts) {
  const [meals, setMeals] = useState<StarterMealPick[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const culturalKey = opts.cultural.slice().sort().join(',');
  const intolerancesKey = opts.intolerances.slice().sort().join(',');
  const cuisineKey = opts.cuisinePrefs.slice().sort().join(',');

  useEffect(() => {
    let cancelled = false;

    async function fetchMeals() {
      setLoading(true);
      setError(null);

      try {
        const supabase = getSupabase();

        let query = supabase
          .from('recipes')
          .select('id, name, meal_type, cuisine, cook_time, image_url')
          .eq('source', 'curated')
          .eq('meal_type', mealType)
          .order('health_score', { ascending: false })
          .limit(LIMIT);

        // Hard dietary gates — only show recipes that pass restrictions
        if (opts.cultural.includes('vegan')) {
          query = query.eq('is_vegan', true);
        } else if (opts.cultural.includes('no_meat')) {
          query = query.eq('is_vegetarian', true);
        }
        if (opts.intolerances.includes('gluten-free')) {
          query = query.eq('is_gluten_free', true);
        }
        if (opts.intolerances.includes('dairy-free')) {
          query = query.eq('is_dairy_free', true);
        }

        const { data, error: supabaseError } = await query;

        if (cancelled) return;

        if (supabaseError) {
          setError('Could not load meals. Please check your connection.');
          setLoading(false);
          return;
        }

        const rows = (data ?? []) as {
          id: string;
          name: string;
          meal_type: string;
          cuisine: string | null;
          cook_time: number | null;
          image_url: string | null;
        }[];

        // Client-side sort: cuisine preferences bubble to the top
        const sorted = [...rows].sort((a, b) => {
          const aMatch = opts.cuisinePrefs.includes(a.cuisine ?? '') ? 0 : 1;
          const bMatch = opts.cuisinePrefs.includes(b.cuisine ?? '') ? 0 : 1;
          return aMatch - bMatch;
        });

        setMeals(
          sorted.map((r) => ({
            id: r.id,
            name: r.name,
            meal_type: r.meal_type as 'breakfast' | 'lunch_dinner',
            cuisine: r.cuisine ?? '',
            cook_time: r.cook_time ?? 0,
            image_url: r.image_url ?? undefined,
          }))
        );
      } catch {
        if (!cancelled) setError('Could not load meals. Please check your connection.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchMeals();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mealType, culturalKey, intolerancesKey, cuisineKey]);

  return { meals, loading, error };
}
