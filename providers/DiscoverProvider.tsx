import { useState, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { DiscoverPreference, ViewHistoryEntry } from '@/services/recommendationEngine';

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const DISCOVER_PREFS_KEY        = 'discover_preferences';   // per-meal ratings, last_cooked_at
const DISCOVER_VIEW_KEY         = 'discover_view_history';  // last 100 viewed meal IDs
const DISCOVER_INTERACTIONS_KEY = 'discover_interactions';  // append-only event log (last 200)

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

  // ── Load preferences ──────────────────────────────────────────────────────

  const prefsQuery = useQuery({
    queryKey: ['discoverPrefs'],
    queryFn: async (): Promise<DiscoverPreference[]> => {
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
    queryKey: ['discoverViewHistory'],
    queryFn: async (): Promise<ViewHistoryEntry[]> => {
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
    queryKey: ['discoverInteractions'],
    queryFn: async (): Promise<DiscoverInteraction[]> => {
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

  // ── Save mutations ────────────────────────────────────────────────────────

  const savePrefsMutation = useMutation({
    mutationFn: async (updated: DiscoverPreference[]) => {
      await AsyncStorage.setItem(DISCOVER_PREFS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverPrefs'], d),
  });
  const savePrefsRef = useRef(savePrefsMutation.mutate);
  savePrefsRef.current = savePrefsMutation.mutate;

  const saveViewMutation = useMutation({
    mutationFn: async (updated: ViewHistoryEntry[]) => {
      await AsyncStorage.setItem(DISCOVER_VIEW_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverViewHistory'], d),
  });
  const saveViewRef = useRef(saveViewMutation.mutate);
  saveViewRef.current = saveViewMutation.mutate;

  const saveInteractionsMutation = useMutation({
    mutationFn: async (updated: DiscoverInteraction[]) => {
      await AsyncStorage.setItem(DISCOVER_INTERACTIONS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['discoverInteractions'], d),
  });
  const saveInteractionsRef = useRef(saveInteractionsMutation.mutate);
  saveInteractionsRef.current = saveInteractionsMutation.mutate;

  // ── Helpers ───────────────────────────────────────────────────────────────

  const upsertPref = useCallback((
    mealId: string,
    update: Partial<Omit<DiscoverPreference, 'meal_id'>>,
  ) => {
    const current = prefsRef.current;
    const idx = current.findIndex(p => p.meal_id === mealId);
    let updated: DiscoverPreference[];
    if (idx >= 0) {
      updated = [...current];
      updated[idx] = { ...updated[idx], ...update };
    } else {
      updated = [...current, { meal_id: mealId, is_dismissed: false, ...update }];
    }
    savePrefsRef.current(updated);
  }, []);

  // ── Public API ────────────────────────────────────────────────────────────

  const getPreference = useCallback((mealId: string): DiscoverPreference | undefined => {
    return prefsRef.current.find(p => p.meal_id === mealId);
  }, []);

  const isDismissed = useCallback((mealId: string): boolean => {
    return prefsRef.current.some(p => p.meal_id === mealId && p.is_dismissed);
  }, []);

  const dismissMeal = useCallback((mealId: string) => {
    upsertPref(mealId, { is_dismissed: true });
    // Also log interaction
    const event: DiscoverInteraction = {
      meal_id:    mealId,
      event_type: 'dismiss',
      metadata:   {},
      created_at: new Date().toISOString(),
    };
    const updated = [...interactionsRef.current, event].slice(-200);
    saveInteractionsRef.current(updated);
  }, [upsertPref]);

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
  }, [upsertPref]);

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
  }, []);

  const recordInteraction = useCallback((
    event: Omit<DiscoverInteraction, 'created_at'>,
  ) => {
    const full: DiscoverInteraction = {
      ...event,
      created_at: new Date().toISOString(),
    };
    const updated = [...interactionsRef.current, full].slice(-200);
    saveInteractionsRef.current(updated);
  }, []);

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
