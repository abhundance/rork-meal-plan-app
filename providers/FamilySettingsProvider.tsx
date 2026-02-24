import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { FamilySettings, UserSettings, MealSlot, PantryItem, NotificationSettings, FamilyMember } from '@/types';
import { DEFAULT_FAMILY_SETTINGS, DEFAULT_USER_SETTINGS, DEFAULT_NOTIFICATION_SETTINGS } from '@/constants/defaults';

const FAMILY_SETTINGS_KEY = 'family_settings';
const USER_SETTINGS_KEY = 'user_settings';
const NOTIFICATION_SETTINGS_KEY = 'notification_settings';

export const [FamilySettingsProvider, useFamilySettings] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [familySettings, setFamilySettings] = useState<FamilySettings>(DEFAULT_FAMILY_SETTINGS);
  const [userSettings, setUserSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(DEFAULT_NOTIFICATION_SETTINGS);

  const familyMembers: FamilyMember[] = [
    {
      user_id: 'user_1',
      display_name: userSettings.display_name,
      avatar_url: userSettings.avatar_url,
      is_admin: userSettings.is_admin,
      dietary_preferences: userSettings.dietary_preferences_individual,
    },
  ];

  const familyQuery = useQuery({
    queryKey: ['familySettings'],
    queryFn: async (): Promise<FamilySettings> => {
      try {
        const stored = await AsyncStorage.getItem(FAMILY_SETTINGS_KEY);
        if (stored) {
          console.log('[FamilySettings] Loaded from storage');
          return JSON.parse(stored) as FamilySettings;
        }
      } catch (e) {
        console.log('[FamilySettings] Error loading from storage:', e);
      }
      return DEFAULT_FAMILY_SETTINGS;
    },
  });

  const userQuery = useQuery({
    queryKey: ['userSettings'],
    queryFn: async (): Promise<UserSettings> => {
      try {
        const stored = await AsyncStorage.getItem(USER_SETTINGS_KEY);
        if (stored) {
          console.log('[UserSettings] Loaded from storage');
          return JSON.parse(stored) as UserSettings;
        }
      } catch (e) {
        console.log('[UserSettings] Error loading from storage:', e);
      }
      return DEFAULT_USER_SETTINGS;
    },
  });

  const notifQuery = useQuery({
    queryKey: ['notificationSettings'],
    queryFn: async (): Promise<NotificationSettings> => {
      try {
        const stored = await AsyncStorage.getItem(NOTIFICATION_SETTINGS_KEY);
        if (stored) {
          return JSON.parse(stored) as NotificationSettings;
        }
      } catch (e) {
        console.log('[NotificationSettings] Error loading:', e);
      }
      return DEFAULT_NOTIFICATION_SETTINGS;
    },
  });

  useEffect(() => {
    if (familyQuery.data) setFamilySettings(familyQuery.data);
  }, [familyQuery.data]);

  useEffect(() => {
    if (userQuery.data) setUserSettings(userQuery.data);
  }, [userQuery.data]);

  useEffect(() => {
    if (notifQuery.data) setNotificationSettings(notifQuery.data);
  }, [notifQuery.data]);

  const familyRef = useRef(familySettings);
  familyRef.current = familySettings;
  const userRef = useRef(userSettings);
  userRef.current = userSettings;
  const notifRef = useRef(notificationSettings);
  notifRef.current = notificationSettings;

  const saveFamilyMutation = useMutation({
    mutationFn: async (updated: FamilySettings) => {
      await AsyncStorage.setItem(FAMILY_SETTINGS_KEY, JSON.stringify(updated));
      console.log('[FamilySettings] Saved to storage');
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['familySettings'], d),
  });

  const saveUserMutation = useMutation({
    mutationFn: async (updated: UserSettings) => {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(updated));
      console.log('[UserSettings] Saved to storage');
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['userSettings'], d),
  });

  const saveNotifMutation = useMutation({
    mutationFn: async (updated: NotificationSettings) => {
      await AsyncStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['notificationSettings'], d),
  });

  const saveFamilyRef = useRef(saveFamilyMutation.mutate);
  saveFamilyRef.current = saveFamilyMutation.mutate;
  const saveUserRef = useRef(saveUserMutation.mutate);
  saveUserRef.current = saveUserMutation.mutate;
  const saveNotifRef = useRef(saveNotifMutation.mutate);
  saveNotifRef.current = saveNotifMutation.mutate;

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
    const updated = familyRef.current.pantry_items.filter(i => i.id !== id);
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
