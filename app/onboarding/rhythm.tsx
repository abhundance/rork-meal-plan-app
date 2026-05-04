/**
 * Onboarding Screen 4 — Rhythm (v2)
 *
 * Combines meal slot toggles + measurement units into a single screen.
 * Replaces the legacy slots.tsx + setup-units.tsx pair.
 *
 * Validation: at least 1 slot must remain enabled. Toggling off the
 * last enabled slot is blocked with a transient warning toast.
 *
 * Writes: enabled_slots, measurement_units
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import SegmentedControl from '@/components/SegmentedControl';
import OnboardingProgress from '@/components/OnboardingProgress';
import { useOnboarding } from '@/providers/OnboardingProvider';

// Canonical slot definitions — order MUST match the existing slots.tsx
// for back-compat with welcome.tsx's MealSlot reconstruction logic.
const SLOTS = [
  { id: 'breakfast', emoji: '🌅', label: 'Breakfast', defaultOn: true },
  { id: 'lunch',     emoji: '🍱', label: 'Lunch',     defaultOn: true },
  { id: 'dinner',    emoji: '🍽️', label: 'Dinner',    defaultOn: true },
  { id: 'snacks',    emoji: '🥤', label: 'Snacks',    defaultOn: false },
] as const;

const UNIT_SEGMENTS = ['Metric', 'Imperial'] as const;

export default function RhythmScreen() {
  const insets = useSafeAreaInsets();
  const { data, setEnabledSlots, setMeasurementUnits, setStep } = useOnboarding();

  const initialEnabled = data.enabled_slots ?? SLOTS.filter(s => s.defaultOn).map(s => s.id);
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabled));
  const [units, setUnits] = useState<'metric' | 'imperial'>(data.measurement_units ?? 'metric');
  const [minWarning, setMinWarning] = useState<boolean>(false);

  const toggle = useCallback((id: string) => {
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        if (next.size === 1) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          setMinWarning(true);
          setTimeout(() => setMinWarning(false), 2000);
          return prev;
        }
        next.delete(id);
      } else {
        next.add(id);
      }
      Haptics.selectionAsync();
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    const ordered = SLOTS.map(s => s.id).filter(id => enabled.has(id));
    setEnabledSlots(ordered);
    setMeasurementUnits(units);
    setStep(3);
    router.push('/onboarding/welcome' as Href);
  }, [enabled, units, setEnabledSlots, setMeasurementUnits, setStep]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
        </Pressable>
        <OnboardingProgress total={4} current={3} />
        <Text style={styles.counter}>03 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.title}>When do you cook?</Text>
        <Text style={styles.subtitle}>Choose the meals you&apos;ll plan each day.</Text>

        {/* ── Slot grid (2x2) ──────────────────────────────────────── */}
        <View style={styles.slotGrid}>
          {SLOTS.map(slot => {
            const on = enabled.has(slot.id);
            return (
              <Pressable
                key={slot.id}
                onPress={() => toggle(slot.id)}
                style={[styles.slotCard, on && styles.slotCardOn]}
                testID={`slot-${slot.id}`}
              >
                <View style={styles.slotTopRow}>
                  <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                  <View style={[styles.toggle, on && styles.toggleOn]}>
                    <View style={[styles.toggleKnob, on && styles.toggleKnobOn]} />
                  </View>
                </View>
                <Text style={[styles.slotName, on && styles.slotNameOn]}>{slot.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {minWarning && (
          <Text style={styles.warning}>Plan at least one meal type.</Text>
        )}

        {/* ── Units segmented control ─────────────────────────────── */}
        <View style={styles.unitsRow}>
          <Text style={styles.unitsLabel}>Measurements</Text>
          <View style={styles.unitsControl}>
            <SegmentedControl
              segments={[...UNIT_SEGMENTS]}
              activeIndex={units === 'metric' ? 0 : 1}
              onChange={(i) => setUnits(i === 0 ? 'metric' : 'imperial')}
            />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Continue" onPress={handleContinue} testID="rhythm-continue-btn" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  scroll: {
    paddingHorizontal: 24,
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
    marginBottom: 28,
  },
  slotGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  slotCard: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 14,
    gap: 8,
  },
  slotCardOn: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  slotTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  slotEmoji: {
    fontSize: 28,
  },
  toggle: {
    width: 36,
    height: 22,
    borderRadius: 999,
    backgroundColor: Colors.inactive,
    padding: 2,
  },
  toggleOn: {
    backgroundColor: Colors.primary,
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: Colors.white,
  },
  toggleKnobOn: {
    transform: [{ translateX: 14 }],
  },
  slotName: {
    fontFamily: FontFamily.bold,
    fontSize: 15,
    color: Colors.text,
  },
  slotNameOn: {
    color: Colors.text,
  },
  warning: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.danger,
    marginBottom: 16,
  },
  unitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  unitsLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  unitsControl: {
    width: 180,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
