/**
 * Onboarding Screen 6 — Welcome / Completion
 *
 * Animated celebration screen. Syncs the three settings collected during
 * onboarding (household size, measurement units, enabled meal slots) into
 * FamilySettings, marks onboarding complete, and drops the user into the app.
 *
 * Terminal — no back gesture.
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { MealSlot } from '@/types';

// The 4 available slot definitions — order is canonical
const SLOT_DEFINITIONS: MealSlot[] = [
  { slot_id: 'breakfast', name: 'Breakfast', order: 0 },
  { slot_id: 'lunch',     name: 'Lunch',     order: 1 },
  { slot_id: 'dinner',    name: 'Dinner',    order: 2 },
  { slot_id: 'snacks',    name: 'Snacks',    order: 3 },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, completeOnboarding } = useOnboarding();
  const { updateFamilySettings } = useFamilySettings();
  const { session } = useAuth();

  const [isCommitting, setIsCommitting] = useState(false);

  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslate, {
          toValue: 0,
          useNativeDriver: true,
          speed: 10,
          bounciness: 6,
        }),
      ]),
    ]).start();
  }, [logoScale, logoOpacity, textOpacity, textTranslate]);

  const handleGetStarted = () => {
    if (isCommitting) return;
    setIsCommitting(true);

    // Build meal_slots from the enabled_slots the user chose in slots.tsx
    const enabledSlotIds = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
    const mealSlots: MealSlot[] = SLOT_DEFINITIONS
      .filter(slot => enabledSlotIds.includes(slot.slot_id))
      .map((slot, idx) => ({ ...slot, order: idx }));

    // Sync collected settings into FamilySettings.
    // family_name is not collected in this onboarding flow — default to 'My Family'
    // so the app never renders a blank name anywhere.
    updateFamilySettings({
      family_name:          data.family_name || 'My Family',
      measurement_units:    data.measurement_units ?? 'metric',
      meal_slots:           mealSlots,
      default_serving_size: data.household_size ?? 2,
    });

    // Mark onboarding complete server-side for multi-device support
    const userId = session?.user?.id;
    if (userId) {
      getSupabase()
        .from('families')
        .update({ onboarding_completed: true, onboarding_step: 99 })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('[Welcome] onboarding_completed sync error:', error.message);
        });
    }

    // Mark complete locally THEN navigate so the home screen's check sees the flag
    completeOnboarding();
    router.replace('/(tabs)' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.center}>
        <Animated.View
          style={[
            styles.logoWrap,
            { transform: [{ scale: logoScale }], opacity: logoOpacity },
          ]}
        >
          <View style={styles.logoCircle}>
            <UtensilsCrossed size={48} color={Colors.primary} strokeWidth={2} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            styles.textBlock,
            { opacity: textOpacity, transform: [{ translateY: textTranslate }] },
          ]}
        >
          <Text style={styles.allSet}>🎉 You're all set!</Text>
          <Text style={styles.headline}>Your meal planner is ready.</Text>
          <Text style={styles.subtitle}>
            Start by adding your favourite meals, then plan your week — it takes minutes.
          </Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Let's start planning"
          onPress={handleGetStarted}
          disabled={isCommitting}
          testID="get-started-btn"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    width: '100%',
  },
  allSet: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  headline: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
