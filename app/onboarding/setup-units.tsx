/**
 * Onboarding Screen 4 — Measurement Units
 *
 * One question. Two cards: Metric vs Imperial.
 * Step 3 of 5.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

const TOTAL_STEPS = 5;
const ACTIVE_STEP = 3; // 1-indexed

const UNITS = [
  {
    id: 'metric' as const,
    emoji: '⚖️',
    label: 'Metric',
    sub: 'g, ml, °C',
    description: 'Used in most of the world',
  },
  {
    id: 'imperial' as const,
    emoji: '🇺🇸',
    label: 'Imperial',
    sub: 'oz, cups, °F',
    description: 'Used in the US and a few others',
  },
];

export default function SetupUnitsScreen() {
  const insets = useSafeAreaInsets();
  const { data, setMeasurementUnits, setStep } = useOnboarding();

  const [units, setUnits] = useState<'metric' | 'imperial'>(data.measurement_units ?? 'metric');

  const handleContinue = () => {
    setMeasurementUnits(units);
    setStep(2);
    router.push('/onboarding/slots' as Href);
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
      {/* Progress */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View
            key={i}
            style={[styles.progressSeg, i < ACTIVE_STEP && styles.progressSegActive]}
          />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step {ACTIVE_STEP} of {TOTAL_STEPS}</Text>
        <Text style={styles.heading}>Which units{'\n'}do you prefer?</Text>
        <Text style={styles.subheading}>
          We'll use this when displaying recipe ingredients.
        </Text>

        {/* Unit cards */}
        <View style={styles.cardsCol}>
          {UNITS.map(u => (
            <TouchableOpacity
              key={u.id}
              style={[styles.card, units === u.id && styles.cardSelected]}
              onPress={() => setUnits(u.id)}
              activeOpacity={0.7}
              testID={`units-${u.id}`}
            >
              <Text style={styles.cardEmoji}>{u.emoji}</Text>
              <View style={styles.cardTextCol}>
                <Text style={[styles.cardLabel, units === u.id && styles.cardLabelSelected]}>
                  {u.label}
                </Text>
                <Text style={[styles.cardSub, units === u.id && styles.cardSubSelected]}>
                  {u.sub} · {u.description}
                </Text>
              </View>
              {/* Selection indicator */}
              <View style={[styles.radio, units === u.id && styles.radioSelected]}>
                {units === u.id && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="setup-units-continue"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressSeg: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressSegActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heading: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 36,
  },
  cardsCol: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.card,
    backgroundColor: Colors.surface,
    paddingVertical: 20,
    paddingHorizontal: 20,
  },
  cardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  cardEmoji: {
    fontSize: 28,
  },
  cardTextCol: {
    flex: 1,
    gap: 2,
  },
  cardLabel: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  cardLabelSelected: {
    color: Colors.primary,
  },
  cardSub: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  cardSubSelected: {
    color: Colors.primary,
    opacity: 0.8,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: Colors.primary,
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
