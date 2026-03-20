/**
 * DiscoverProvider — manages per-meal preferences, view history, and interaction events.
 *
 * Storage strategy (Supabase-primary, Phase 7):
 *   • Reads from Supabase first (anonymous auth guarantees userId from first launch).
 *   • AsyncStorage is written as a local cache for offline resilience.
 *   • Each preference upsert / view / interaction is synced to Supabase in the background.
 *   • Tables: discover_preferences, discover_view_history, discover_interactions.
 */
import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { DiscoverPreference, ViewHistoryEntry } from '@/services/recommendationEngine';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const DISCOVER_PREFS_KEY        = 'discover_preferences';   // per-meal ratings, last_cooked_at
const DISCOVER_VIEW_KEY         = 'discover_view_history';  // last 100 viewed meal IDs
const DISCOVER_INTERACTIONS_KEY = 'discover_interactions';  // append-only event log (last 200)
const PHASE7_CLEANUP_KEY        = 'phase7_discover_cleanup_v1';

// ─── Types ────────────────────────────────────────────────────────────────────

export type InteractionEventType =
  | 'view'
  | 'add_to_plan'
  | 'save_to_favs'
  | 'remove_from_favs'
  | 'rate'
  | 'dismiss'
  | 'search_click'
  | 'carousel_tap';

export interface DiscoverInteraction {
  meal_id:    string;
  event_type: InteractionEventType;
  metadata:   Record<string, unknown>;
  created_at: string;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export const [DiscoverProvider, useDiscover] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── One-time cleanup: wipe AsyncStorage test data on first Phase 7 launch ─
  useEffect(() => {
    AsyncStorage.getItem(PHASE7_CLEANUP_KEY).then((done) => {
      if (!done) {
        Promise.all([
          AsyncStorage.removeItem(DISCOVER_PREFS_KEY),
          AsyncStorage.removeItem(DISCOVER_VIEW_KEY),
          AsyncStorage.removeItem(DISCOVER_INTERACTIONS_KEY),
        ])
          .then(() => AsyncStorage.setItem(PHASE7_CLEANUP_KEY, 'done'))
          .catch(console.error);
      }
    });
  }, []);

  // ── Load preferences ──────────────────────────────────────────────────────

  const prefsQuery = useQuery({
    queryKey: ['discoverPrefs', userId],
    queryFn: async (): Promise<DiscoverPreference[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('discover_preferences')
          .select('meal_id, rating, last_cooked_at, is_dismissed')
          .eq('family_id', userId);
        if (!error && data) {
          const result: DiscoverPreference[] = data.map((r) => ({
            meal_id:        r.meal_id as string,
            rating:         r.rating as DiscoverPreference['rating'],
            last_cooked_at: r.last_cooked_at as string | undefined,
            is_dismissed:   (r.is_dismissed as boolean) ?? false,
          }));
          AsyncStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(result)).catch(console.error);
          console.log('[Discover] Loaded prefs from Supabase:', result.length);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(DISCOVER_PREFS_KEY);
        if (stored) return JSON.parse(stored) as DiscoverPreference[];
      } catch (e) {
        console.log('[DiscoverProvider] Error loading prefs:', e);
      }
      return [];
    },
  });

  const viewQuery = useQuery({
    queryKey: ['discoverViewHistory', userId],
    queryFn: async (): Promise<ViewHistoryEntry[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('discover_view_history')
          .select('meal_id, viewed_at')
          .eq('family_id', userId)
          .order('viewed_at', { ascending: false })
          .limit(100);
        if (!error && data) {
          const result: ViewHistoryEntry[] = data.map((r) => ({
            meal_id:   r.meal_id as string,
            viewed_at: r.viewed_at as string,
          }));
          AsyncStorage.setItem(DISCOVER_VIEW_KEY, JSON.stringify(result)).catch(console.error);
          console.log('[Discover] Loaded view history from Supabase:', result.length);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(DISCOVER_VIEW_KEY);
        if (stored) return JSON.parse(stored) as ViewHistoryEntry[];
      } catch (e) {
        console.log('[DiscoverProvider] Error loading view history:', e);
      }
      return [];
    },
  });

  const interactionsQuery = useQuery({
    queryKey: ['discoverInteractions', userId],
    queryFn: async (): Promise<DiscoverInteraction[]> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('discover_interactions')
          .select('meal_id, interaction_type, metadata, created_at')
          .eq('family_id', userId)
          .order('created_at', { ascending: false })
          .limit(200);
        if (!error && data) {
          const result: DiscoverInteraction[] = data.map((r) => ({
            meal_id:    r.meal_id as string,
            event_type: r.interaction_type as InteractionEventType,
            metadata:   (r.metadata as Record<string, unknown>) ?? {},
            created_at: r.created_at as string,
          }));
          AsyncStorage.setItem(DISCOVER_INTERACTIONS_KEY, JSON.stringify(result)).catch(console.error);
          console.log('[Discover] Loaded interactions from Supabase:', result.length);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(DISCOVER_INTERACTIONS_KEY);
        if (stored) return JSON.parse(stored) as DiscoverInteraction[];
      } catch (e) {
        console.log('[DiscoverProvider] Error loading interactions:', e);
      }
      return [];
    },
  });

  const discoverPrefs   = prefsQuery.data   ?? [];
  const viewHistory     = viewQuery.data    ?? [];
  const interactions    = interactionsQuery.data ?? [];

  // Refs for use inside callbacks without stale closures
  const prefsRef        = useRef(discoverPrefs);
  prefsRef.current      = discoverPrefs;
  const viewRef         = useRef(viewHistory);
  viewRef.current       = viewHistory;
  const interactionsRef = useRef(interactions);
  interactionsRef.current = interactions;

  // ── Save mutations (AsyncStorage cache) ──────────────────────────────────

  const savePrefsMutation = useMutation({
    mutationFn: async (updated: DiscoverPreference[]) => {
      await AsyncStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverPrefs', userIdRef.current], d),
  });
  const savePrefsRef = useRef(savePrefsMutation.mutate);
  savePrefsRef.current = savePrefsMutation.mutate;

  const saveViewMutation = useMutation({
    mutationFn: async (updated: ViewHistoryEntry[]) => {
      await AsyncStorage.setItem(DISCOVER_VIEW_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverViewHistory', userIdRef.current], d),
  });
  const saveViewRef = useRef(saveViewMutation.mutate);
  saveViewRef.current = saveViewMutation.mutate;

  const saveInteractionsMutation = useMutation({
    mutationFn: async (updated: DiscoverInteraction[]) => {
      await AsyncStorage.setItem(DISCOVER_INTERACTIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverInteractions', userIdRef.current], d),
  });
  const saveInteractionsRef = useRef(saveInteractionsMutation.mutate);
  saveInteractionsRef.current = saveInteractionsMutation.mutate;

  // ── Supabase background sync helpers ─────────────────────────────────────

  const syncPrefToSupabase = useCallback((pref: DiscoverPreference) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('discover_preferences')
      .upsert(
        { family_id: uid, meal_id: pref.meal_id, rating: pref.rating ?? null, last_cooked_at: pref.last_cooked_at ?? null, is_dismissed: pref.is_dismissed },
        { onConflict: 'family_id,meal_id' }
      )
      .then(({ error }) => {
        if (error) console.error('[Discover] pref sync error:', error.message);
      });
  }, []);

  const syncViewToSupabase = useCallback((entry: ViewHistoryEntry) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('discover_view_history')
      .upsert(
        { family_id: uid, meal_id: entry.meal_id, viewed_at: entry.viewed_at },
        { onConflict: 'family_id,meal_id' }
      )
      .then(({ error }) => {
        if (error) console.error('[Discover] view sync error:', error.message);
      });
  }, []);

  const syncInteractionToSupabase = useCallback((event: DiscoverInteraction) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('discover_interactions')
      .insert({
        family_id:        uid,
        meal_id:          event.meal_id,
        interaction_type: event.event_type,
        metadata:         event.metadata,
        created_at:       event.created_at,
      })
      .then(({ error }) => {
        if (error) console.error('[Discover] interaction sync error:', error.message);
      });
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const upsertPref = useCallback((
    mealId: string,
    update: Partial<Omit<DiscoverPreference, 'meal_id'>>,
  ) => {
    const current = prefsRef.current;
    const idx = current.findIndex(p => p.meal_id === mealId);
    let updated: DiscoverPreference[];
    let updatedPref: DiscoverPreference;
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...update };
      updatedPref = updated[idx];
    } else {
      updatedPref = { meal_id: mealId, is_dismissed: false, ...update };
      updated = [...current, updatedPref];
    }
    savePrefsRef.current(updated);
    syncPrefToSupabase(updatedPref);
  }, [syncPrefToSupabase]);

  // ── Public API ────────────────────────────────────────────────────────────

  const getPreference = useCallback((mealId: string): DiscoverPreference | undefined => {
    return prefsRef.current.find(p => p.meal_id === mealId);
  }, []);

  const isDismissed = useCallback((mealId: string): boolean => {
    return prefsRef.current.some(p => p.meal_id === mealId && p.is_dismissed);
  }, []);

  const dismissMeal = useCallback((mealId: string) => {
    upsertPref(mealId, { is_dismissed: true });
    const event: DiscoverInteraction = {
      meal_id:    mealId,
      event_type: 'dismiss',
      metadata:   {},
      created_at: new Date().toISOString(),
    };
    const updated = [...interactionsRef.current, event].slice(-200);
    saveInteractionsRef.current(updated);
    syncInteractionToSupabase(event);
  }, [upsertPref, syncInteractionToSupabase]);

  const undismissMeal = useCallback((mealId: string) => {
    upsertPref(mealId, { is_dismissed: false });
  }, [upsertPref]);

  const setRating = useCallback((
    mealId: string,
    rating: 'disliked' | 'liked' | 'loved' | null,
  ) => {
    upsertPref(mealId, { rating: rating ?? undefined });
    const event: DiscoverInteraction = {
      meal_id:    mealId,
      event_type: 'rate',
      metadata:   { rating },
      created_at: new Date().toISOString(),
    };
    const updated = [...interactionsRef.current, event].slice(-200);
    saveInteractionsRef.current(updated);
    syncInteractionToSupabase(event);
  }, [upsertPref, syncInteractionToSupabase]);

  const setLastCooked = useCallback((mealId: string, date: string) => {
    upsertPref(mealId, { last_cooked_at: date });
  }, [upsertPref]);

  const recordView = useCallback((mealId: string) => {
    // Deduplicate same-session views
    if (viewRef.current.some(
      v => v.meal_id === mealId &&
        Date.now() - new Date(v.viewed_at).getTime() < 5 * 60 * 1000
    )) return;

    const entry: ViewHistoryEntry = {
      meal_id:   mealId,
      viewed_at: new Date().toISOString(),
    };
    const updated = [entry, ...viewRef.current].slice(0, 100);
    saveViewRef.current(updated);
    syncViewToSupabase(entry);
  }, [syncViewToSupabase]);

  const recordInteraction = useCallback((
    event: Omit<DiscoverInteraction, 'created_at'>,
  ) => {
    const full: DiscoverInteraction = {
      ...event,
      created_at: new Date().toISOString(),
    };
    const updated = [...interactionsRef.current, full].slice(-200);
    saveInteractionsRef.current(updated);
    syncInteractionToSupabase(full);
  }, [syncInteractionToSupabase]);

  return {
    discoverPrefs,
    viewHistory,
    interactions,
    getPreference,
    isDismissed,
    dismissMeal,
    undismissMeal,
    setRating,
    setLastCooked,
    recordView,
    recordInteraction,
  };
});
