import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

const ALL_SLOTS = [
  { id: 'breakfast', emoji: '☀️', label: 'Breakfast', description: 'Morning meals to start the day' },
  { id: 'lunch',     emoji: '🌤️', label: 'Lunch',     description: 'Midday meals' },
  { id: 'dinner',    emoji: '🌙', label: 'Dinner',    description: 'Evening family meals' },
  { id: 'snacks',    emoji: '🍎', label: 'Snacks',    description: 'Light bites between meals' },
];

export default function ConfigureSlotsScreen() {
  const insets = useSafeAreaInsets();
  const { data, setEnabledSlots, setStep } = useOnboarding();
  const initialEnabled = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
  const [enabled, setEnabled] = useState<Set<string>>(new Set(initialEnabled));
  const [showMinWarning, setShowMinWarning] = useState(false);

  const toggle = (id: string) => {
    if (enabled.has(id) && enabled.size === 1) {
      // Can't disable the last slot — show a warning instead
      setShowMinWarning(true);
      setTimeout(() => setShowMinWarning(false), 2000);
      return;
    }
    setShowMinWarning(false);
    setEnabled(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleContinue = () => {
    const slots = ALL_SLOTS.map(s => s.id).filter(id => enabled.has(id));
    setEnabledSlots(slots);
    setStep(10);
    // Navigate to first enabled picks screen (snacks has no picks screen)
    if (enabled.has('breakfast')) {
      router.push('/onboarding/breakfast-picks' as Href);
    } else if (enabled.has('lunch')) {
      router.push('/onboarding/lunch-picks' as Href);
    } else if (enabled.has('dinner')) {
      router.push('/onboarding/dinner-picks' as Href);
    } else {
      router.push('/onboarding/welcome' as Href);
    }
  };

  return (
    <View style={[styles.container]}>
      <OnboardingHeader current={9} total={11} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 9 of 11</Text>
        <Text style={styles.heading}>Which meal slots do you plan for?</Text>
        <Text style={styles.subheading}>
          We'll set up your weekly planner with these slots. You can always add or remove them later in Settings.
        </Text>

        <View style={styles.slotList}>
          {ALL_SLOTS.map((slot) => {
            const isEnabled = enabled.has(slot.id);
            return (
              // FIX: TouchableOpacity handles all row taps.
              // Switch is set to pointerEvents="none" to prevent double-trigger.
              <TouchableOpacity
                key={slot.id}
                style={[styles.slotRow, isEnabled && styles.slotRowEnabled]}
                onPress={() => toggle(slot.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.slotEmoji}>{slot.emoji}</Text>
                <View style={styles.slotText}>
                  <Text style={[styles.slotLabel, isEnabled && styles.slotLabelEnabled]}>
                    {slot.label}
                  </Text>
                  <Text style={styles.slotDesc}>{slot.description}</Text>
                </View>
                {/* pointerEvents="none" so Switch never captures the touch event */}
                <View pointerEvents="none">
                  <Switch
                    value={isEnabled}
                    trackColor={{ false: Colors.border, true: Colors.primary }}
                    thumbColor={Colors.white}
                    ios_backgroundColor={Colors.border}
                  />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {showMinWarning && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>You need at least one meal slot enabled.</Text>
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
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
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 16,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  slotList: {
    gap: 10,
  },
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  slotRowEnabled: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  slotEmoji: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  slotText: {
    flex: 1,
  },
  slotLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  slotLabelEnabled: {
    color: Colors.primary,
  },
  slotDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  warningBanner: {
    marginTop: 16,
    backgroundColor: Colors.offlineBanner,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  warningText: {
    fontSize: 13,
    color: Colors.offlineText,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
