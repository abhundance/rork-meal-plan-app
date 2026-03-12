/**
 * FamilySettingsProvider — manages FamilySettings, UserSettings, NotificationSettings.
 *
 * Storage strategy (dual-write):
 *   • AsyncStorage is ALWAYS written — data survives offline / logged-out sessions.
 *   • When authenticated, data is also synced to Supabase in the background.
 *   • On mount: if authenticated → load from Supabase; else → AsyncStorage.
 *   • queryKey includes userId so TanStack Query re-fetches on sign-in / sign-out.
 *
 * First sign-in:
 *   When no `families` row exists for auth.uid(), the provider creates one and
 *   seeds it with whatever the user already has in AsyncStorage.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { FamilySettings, UserSettings, MealSlot, PantryItem, NotificationSettings, FamilyMember } from '@/types';
import { DEFAULT_FAMILY_SETTINGS, DEFAULT_USER_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS, DEFAULT_MEAL_SLOTS } from '@/constants/defaults';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import {
  rowToFamilySettings,
  rowToUserSettings,
  rowToNotificationSettings,
} from '@/services/db';

const FAMILY_SETTINGS_KEY       = 'family_settings';
const USER_SETTINGS_KEY         = 'user_settings';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

// ── Helper: seed Supabase for a brand-new user ───────────────────────────────

async function seedSupabaseFromLocal(
  userId: string,
  localFamily: FamilySettings,
  localUser: UserSettings,
  localNotif: NotificationSettings
): Promise<void> {
  const supabase = getSupabase();

  const { error: fErr } = await supabase.from('families').insert({
    id: userId,
    family_name: localFamily.family_name,
    default_serving_size: localFamily.default_serving_size,
    measurement_units: localFamily.measurement_units,
    language: localFamily.language,
    region: localFamily.region,
    smart_fill_novelty_pct: localFamily.smart_fill_novelty_pct,
    cultural_restrictions: localFamily.cultural_restrictions,
    intolerances: localFamily.intolerances,
    diet_preferences: localFamily.diet_preferences,
    household_type: localFamily.household_type ?? null,
  });
  if (fErr && fErr.code !== '23505') {
    console.error('[FamilySettings] Failed to create families row:', fErr.message);
    return;
  }

  const slots = localFamily.meal_slots.length > 0 ? localFamily.meal_slots : DEFAULT_MEAL_SLOTS;
  await supabase.from('meal_slots').insert(
    slots.map((s) => ({
      family_id: userId,
      slot_id: s.slot_id,
      name: s.name,
      order: s.order,
      serving_size_override: s.serving_size_override ?? null,
    }))
  );

  if (localFamily.pantry_items.length > 0) {
    await supabase.from('pantry_items').insert(
      localFamily.pantry_items.map((p) => ({
        family_id: userId,
        name: p.name,
        category: p.category,
      }))
    );
  }

  await supabase.from('user_settings').insert({
    id: userId,
    family_id: userId,
    display_name: localUser.display_name,
    avatar_url: localUser.avatar_url ?? null,
    dietary_preferences_individual: localUser.dietary_preferences_individual,
    is_admin: localUser.is_admin,
    personal_goal: localUser.personal_goal ?? 'balanced',
    health_goals: localUser.health_goals ?? [],
  });

  await supabase.from('notification_settings').insert({
    user_id: userId,
    new_recipes: localNotif.new_recipes,
    weekly_reminder: localNotif.weekly_reminder,
    weekly_reminder_day: localNotif.weekly_reminder_day,
    weekly_reminder_time: localNotif.weekly_reminder_time,
    shopping_reminder: localNotif.shopping_reminder,
    shopping_reminder_day: localNotif.shopping_reminder_day,
    shopping_reminder_time: localNotif.shopping_reminder_time,
  });

  console.log('[FamilySettings] Seeded Supabase from AsyncStorage for user:', userId);
}

// ── Provider ─────────────────────────────────────────────────────────────────

export const [FamilySettingsProvider, useFamilySettings] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [familySettings, setFamilySettings] = useState<FamilySettings>(DEFAULT_FAMILY_SETTINGS);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const familyMembers: FamilyMember[] = [
    {
      user_id: userId ?? 'user_1',
      display_name: userSettings.display_name,
      avatar_url: userSettings.avatar_url,
      is_admin: userSettings.is_admin,
      dietary_preferences: userSettings.dietary_preferences_individual,
    },
  ];

  // ── Family Settings query ─────────────────────────────────────────────────
  const familyQuery = useQuery({
    queryKey: ['familySettings', userId],
    queryFn: async (): Promise<FamilySettings> => {
      if (userId) {
        const supabase = getSupabase();
        const { data: familyRow, error: fErr } = await supabase
          .from('families')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (fErr) console.error('[FamilySettings] Supabase fetch error:', fErr.message);

        if (!familyRow) {
          // First sign-in: no row yet — read from AsyncStorage and seed Supabase
          console.log('[FamilySettings] No Supabase row — seeding from AsyncStorage');
          const [storedFamily, storedUser, storedNotif] = await Promise.all([
            AsyncStorage.getItem(FAMILY_SETTINGS_KEY),
            AsyncStorage.getItem(USER_SETTINGS_KEY),
            AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY),
          ]);
          const localFamily = storedFamily ? (JSON.parse(storedFamily) as FamilySettings) : DEFAULT_FAMILY_SETTINGS;
          const localUser   = storedUser   ? (JSON.parse(storedUser)   as UserSettings)   : DEFAULT_USER_SETTINGS;
          const localNotif  = storedNotif  ? (JSON.parse(storedNotif)  as NotificationSettings) : DEFAULT_NOTIFICATION_SETTINGS;
          seedSupabaseFromLocal(userId, localFamily, localUser, localNotif).catch(console.error);
          return localFamily;
        }

        const [slotsRes, pantryRes] = await Promise.all([
          supabase.from('meal_slots').select('*').eq('family_id', userId).order('order'),
          supabase.from('pantry_items').select('*').eq('family_id', userId),
        ]);

        const result = rowToFamilySettings(
          familyRow as Record<string, unknown>,
          (slotsRes.data ?? []) as Record<string, unknown>[],
          (pantryRes.data ?? []) as Record<string, unknown>[]
        );
        console.log('[FamilySettings] Loaded from Supabase');
        AsyncStorage.setItem(FAMILY_SETTINGS_KEY, JSON.stringify(result)).catch(console.error);
        return result;
      }

      // Fallback to AsyncStorage (not authenticated)
      try {
        const stored = await AsyncStorage.getItem(FAMILY_SETTINGS_KEY);
        if (stored) {
          console.log('[FamilySettings] Loaded from AsyncStorage');
          return JSON.parse(stored) as FamilySettings;
        }
      } catch (e) {
        console.error('[FamilySettings] AsyncStorage load error:', e);
      }
      return DEFAULT_FAMILY_SETTINGS;
    },
  });

  // ── User Settings query ───────────────────────────────────────────────────
  const userQuery = useQuery({
    queryKey: ['userSettings', userId],
    queryFn: async (): Promise<UserSettings> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('id', userId)
          .maybeSingle();
        if (!error && data) {
          const result = rowToUserSettings(data as Record<string, unknown>, userId);
          AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(result)).catch(console.error);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(USER_SETTINGS_KEY);
        if (stored) return JSON.parse(stored) as UserSettings;
      } catch (e) {
        console.error('[UserSettings] AsyncStorage load error:', e);
      }
      return DEFAULT_USER_SETTINGS;
    },
  });

  // ── Notification Settings query ───────────────────────────────────────────
  const notifQuery = useQuery({
    queryKey: ['notificationSettings', userId],
    queryFn: async (): Promise<NotificationSettings> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('notification_settings')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        if (!error && data) {
          const result = rowToNotificationSettings(data as Record<string, unknown>);
          AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(result)).catch(console.error);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) return JSON.parse(stored) as NotificationSettings;
      } catch (e) {
        console.error('[NotificationSettings] AsyncStorage load error:', e);
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    },
  });

  // ── Sync query data → state ───────────────────────────────────────────────
  useEffect(() => {
    if (familyQuery.data) setFamilySettings(familyQuery.data);
  }, [familyQuery.data]);

  useEffect(() => {
    if (userQuery.data) setUserSettings(userQuery.data);
  }, [userQuery.data]);

  useEffect(() => {
    if (notifQuery.data) setNotificationSettings(notifQuery.data);
  }, [notifQuery.data]);

  // ── Refs to avoid stale closures in callbacks ─────────────────────────────
  const familyRef = useRef(familySettings);
  familyRef.current = familySettings;
  const userRef = useRef(userSettings);
  userRef.current = userSettings;
  const notifRef = useRef(notificationSettings);
  notifRef.current = notificationSettings;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Family mutations (AsyncStorage + Supabase) ────────────────────────────
  const saveFamilyMutation = useMutation({
    mutationFn: async (updated: FamilySettings) => {
      await AsyncStorage.setItem(FAMILY_SETTINGS_KEY, JSON.stringify(updated));
      const uid = userIdRef.current;
      if (uid) {
        const supabase = getSupabase();
        supabase.from('families').upsert({
          id: uid,
          family_name: updated.family_name,
          default_serving_size: updated.default_serving_size,
          measurement_units: updated.measurement_units,
          language: updated.language,
          region: updated.region,
          smart_fill_novelty_pct: updated.smart_fill_novelty_pct,
          cultural_restrictions: updated.cultural_restrictions,
          intolerances: updated.intolerances,
          diet_preferences: updated.diet_preferences,
          household_type: updated.household_type ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('[FamilySettings] Supabase save error:', error.message);
        });
        // Sync meal_slots: delete-and-reinsert
        supabase.from('meal_slots').delete().eq('family_id', uid).then(() => {
          supabase.from('meal_slots').insert(
            updated.meal_slots.map((s) => ({
              family_id: uid,
              slot_id: s.slot_id,
              name: s.name,
              order: s.order,
              serving_size_override: s.serving_size_override ?? null,
            }))
          );
        });
        // Sync pantry_items: delete-and-reinsert
        supabase.from('pantry_items').delete().eq('family_id', uid).then(() => {
          if (updated.pantry_items.length > 0) {
            supabase.from('pantry_items').insert(
              updated.pantry_items.map((p) => ({
                family_id: uid,
                name: p.name,
                category: p.category,
              }))
            );
          }
        });
      }
      console.log('[FamilySettings] Saved');
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['familySettings', userIdRef.current], d),
  });

  const saveUserMutation = useMutation({
    mutationFn: async (updated: UserSettings) => {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updated));
      const uid = userIdRef.current;
      if (uid) {
        getSupabase().from('user_settings').upsert({
          id: uid,
          family_id: uid,
          display_name: updated.display_name,
          avatar_url: updated.avatar_url ?? null,
          dietary_preferences_individual: updated.dietary_preferences_individual,
          is_admin: updated.is_admin,
          personal_goal: updated.personal_goal ?? 'balanced',
          health_goals: updated.health_goals ?? [],
        }, { onConflict: 'id' }).then(({ error }) => {
          if (error) console.error('[UserSettings] Supabase save error:', error.message);
        });
      }
      console.log('[UserSettings] Saved');
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['userSettings', userIdRef.current], d),
  });

  const saveNotifMutation = useMutation({
    mutationFn: async (updated: NotificationSettings) => {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      const uid = userIdRef.current;
      if (uid) {
        getSupabase().from('notification_settings').upsert(
          { user_id: uid, ...updated },
          { onConflict: 'user_id' }
        ).then(({ error }) => {
          if (error) console.error('[NotificationSettings] Supabase save error:', error.message);
        });
      }
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['notificationSettings', userIdRef.current], d),
  });

  const saveFamilyRef = useRef(saveFamilyMutation.mutate);
  saveFamilyRef.current = saveFamilyMutation.mutate;
  const saveUserRef = useRef(saveUserMutation.mutate);
  saveUserRef.current = saveUserMutation.mutate;
  const saveNotifRef = useRef(saveNotifMutation.mutate);
  saveNotifRef.current = saveNotifMutation.mutate;

  // ── Public actions ────────────────────────────────────────────────────────

  const updateFamilySettings = useCallback((partial: Partial<FamilySettings>) => {
    const updated = { ...familyRef.current, ...partial };
    setFamilySettings(updated);
    saveFamilyRef.current(updated);
  }, []);

  const updateUserSettings = useCallback((partial: Partial<UserSettings>) => {
    const updated = { ...userRef.current, ...partial };
    setUserSettings(updated);
    saveUserRef.current(updated);
  }, []);

  const updateNotificationSettings = useCallback((partial: Partial<NotificationSettings>) => {
    const updated = { ...notifRef.current, ...partial };
    setNotificationSettings(updated);
    saveNotifRef.current(updated);
  }, []);

  const updateMealSlots = useCallback((slots: MealSlot[]) => {
    updateFamilySettings({ meal_slots: slots });
  }, [updateFamilySettings]);

  const addPantryItem = useCallback((item: PantryItem) => {
    const updated = [...familyRef.current.pantry_items, item];
    updateFamilySettings({ pantry_items: updated });
  }, [updateFamilySettings]);

  const removePantryItem = useCallback((id: string) => {
    const updated = familyRef.current.pantry_items.filter((i) => i.id !== id);
    updateFamilySettings({ pantry_items: updated });
  }, [updateFamilySettings]);

  const isLoading = familyQuery.isLoading || userQuery.isLoading;

  return {
    familySettings,
    userSettings,
    notificationSettings,
    familyMembers,
    isLoading,
    updateFamilySettings,
    updateUserSettings,
    updateNotificationSettings,
    updateMealSlots,
    addPantryItem,
    removePantryItem,
  };
});
