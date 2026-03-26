/**
 * Onboarding Screen 3 — Meal Slots
 *
 * Visual toggle cards for Breakfast / Lunch / Dinner / Snacks.
 * Defaults: Breakfast, Lunch, Dinner ON — Snacks OFF.
 * At least one slot must remain enabled.
 *
 * Step 2 of 3.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

const SLOTS = [
  {
    id: 'breakfast',
    emoji: '🌅',
    label: 'Breakfast',
    tagline: 'Start the day right',
    defaultOn: true,
  },
  {
    id: 'lunch',
    emoji: '🍱',
    label: 'Lunch',
    tagline: 'Midday sorted',
    defaultOn: true,
  },
  {
    id: 'dinner',
    emoji: '🍽️',
    label: 'Dinner',
    tagline: 'The main event',
    defaultOn: true,
  },
  {
    id: 'snacks',
    emoji: '🥤',
    label: 'Snacks',
    tagline: 'In-between bites',
    defaultOn: false,
  },
];

export default function SlotsScreen() {
  const insets = useSafeAreaInsets();
  const { data, setEnabledSlots, setStep } = useOnboarding();

  const initial = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initial));
  const [minWarning, setMinWarning] = useState(false);

  const toggle = (id: string) => {
    if (enabled.has(id) && enabled.size === 1) {
      setMinWarning(true);
      setTimeout(() => setMinWarning(false), 2000);
      return;
    }
    setMinWarning(false);
    setEnabled(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleContinue = () => {
    const ordered = SLOTS.map(s => s.id).filter(id => enabled.has(id));
    setEnabledSlots(ordered);
    setStep(3);
    router.push('/onboarding/preview' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>

      {/* Progress */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[
              styles.progressDot,
              i <= 2 && styles.progressDotActive,
              i === 2 && styles.progressDotCurrent,
            ]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 2 of 3</Text>
        <Text style={styles.heading}>Your meal schedule</Text>
        <Text style={styles.subheading}>
          Toggle the meals you plan for. You can change this anytime in Settings.
        </Text>

        {/* Slot cards */}
        <View style={styles.slotList}>
          {SLOTS.map(slot => {
            const on = enabled.has(slot.id);
            return (
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotCard, on && styles.slotCardOn]}
                onPress={() => toggle(slot.id)}
                activeOpacity={0.7}
                testID={`slot-${slot.id}`}
              >
                <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                <View style={styles.slotText}>
                  <Text style={[styles.slotLabel, on && styles.slotLabelOn]}>
                    {slot.label}
                  </Text>
                  <Text style={styles.slotTagline}>{slot.tagline}</Text>
                </View>
                {/* pointerEvents="none" prevents Switch capturing the touch */}
                <View pointerEvents="none">
                  <Switch
                    value={on}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {minWarning && (
          <View style={styles.warning}>
            <Text style={styles.warningText}>
              You need at least one meal slot enabled.
            </Text>
          </View>
        )}
      </View>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Looks good"
          onPress={handleContinue}
          testID="slots-continue"
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

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primaryLight,
  },
  progressDotCurrent: {
    backgroundColor: Colors.primary,
  },

  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },

  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },

  slotList: {
    gap: 10,
  },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  slotCardOn: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  slotEmoji: {
    fontSize: 26,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  slotText: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  slotLabelOn: {
    color: Colors.primary,
  },
  slotTagline: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  warning: {
    marginTop: 16,
    backgroundColor: Colors.offlineBanner,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warningText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.offlineText,
    textAlign: 'center',
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
