/**
 * Onboarding Screen 5 — Welcome / Completion (v2)
 *
 * Celebration moment after the four data-collection screens. Strips the
 * old "Your meal planner is ready" copy and inline icon — replaces with
 * a tighter, on-brand layout matching the editorial flow:
 *
 *   [4-dot progress · 04/04]
 *   ────────────────────────
 *               (centred)
 *               🎉
 *               You're set, [name].
 *               Welcome to your kitchen.
 *               [ Open my plan ]
 *
 * Sync sequence is preserved EXACTLY — this is the only place that
 * pushes onboarding state into FamilySettings + Supabase. Any change
 * here will break the rest of the app's understanding of family setup.
 *
 * Terminal — no back gesture (set in _layout.tsx).
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import PrimaryButton from '@/components/PrimaryButton';
import OnboardingProgress from '@/components/OnboardingProgress';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { MealSlot } from '@/types';

// The 4 available slot definitions — order is canonical and MUST match
// the SLOTS list in rhythm.tsx and the legacy slots.tsx
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

  const [isCommitting, setIsCommitting] = useState<boolean>(false);

  // ── Entrance animations ──────────────────────────────────────────
  const emojiScale   = useRef(new Animated.Value(0.3)).current;
  const emojiOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(emojiScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(emojiOpacity, {
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
  }, [emojiScale, emojiOpacity, textOpacity, textTranslate]);

  // ── Completion handler — sync sequence MUST stay in this order ──
  const handleGetStarted = () => {
    if (isCommitting) return;
    setIsCommitting(true);

    const enabledSlotIds = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
    const mealSlots: MealSlot[] = SLOT_DEFINITIONS
      .filter(slot => enabledSlotIds.includes(slot.slot_id))
      .map((slot, idx) => ({ ...slot, order: idx }));

    updateFamilySettings({
      family_name:          data.family_name || 'My Family',
      measurement_units:    data.measurement_units ?? 'metric',
      meal_slots:           mealSlots,
      default_serving_size: data.household_size ?? 2,
    });

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

    completeOnboarding();
    router.replace('/(tabs)' as Href);
  };

  const familyName = data.family_name?.trim();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
      {/* ── Top bar: progress only (no back — terminal screen) ──────── */}
      <View style={styles.topBar}>
        <View style={styles.spacer} />
        <OnboardingProgress total={4} current={4} />
        <Text style={styles.counter}>04 / 04</Text>
      </View>

      {/* ── Celebration block (vertically centred) ──────────────────── */}
      <View style={styles.center}>
        <Animated.Text
          style={[
            styles.emoji,
            { transform: [{ scale: emojiScale }], opacity: emojiOpacity },
          ]}
        >
          🎉
        </Animated.Text>

        <Animated.View
          style={[
            styles.textBlock,
            { opacity: textOpacity, transform: [{ translateY: textTranslate }] },
          ]}
        >
          <Text style={styles.title}>
            {familyName ? `You're set,\n${familyName}.` : `You're all set.`}
          </Text>
          <Text style={styles.subtitle}>Welcome to your kitchen.</Text>
        </Animated.View>
      </View>

      {/* ── CTA pinned to bottom ────────────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Open my plan"
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
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  spacer: {
    width: 36,
    height: 36,
  },
  counter: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  center: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  emoji: {
    fontSize: 56,
    marginBottom: 16,
  },
  textBlock: {
    alignSelf: 'stretch',
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
