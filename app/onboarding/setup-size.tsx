/**
 * Onboarding Screen 3 — Household Size
 *
 * One question. Stepper from 1 to 10, default 2.
 * Step 2 of 5.
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
import { Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

const TOTAL_STEPS = 5;
const ACTIVE_STEP = 2; // 1-indexed

export default function SetupSizeScreen() {
  const insets = useSafeAreaInsets();
  const { data, setHouseholdSize } = useOnboarding();

  const [size, setSize] = useState<number>(data.household_size ?? 2);

  const decrement = () => setSize(s => Math.max(1, s - 1));
  const increment = () => setSize(s => Math.min(10, s + 1));

  const handleContinue = () => {
    setHouseholdSize(size);
    router.push('/onboarding/setup-units' as Href);
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
        <Text style={styles.heading}>How many people{'\n'}are you cooking for?</Text>
        <Text style={styles.subheading}>
          Sets the default serving size across all your recipes and meal plans.
        </Text>

        {/* Stepper */}
        <View style={styles.stepperWrap}>
          <TouchableOpacity
            style={[styles.stepBtn, size <= 1 && styles.stepBtnDisabled]}
            onPress={decrement}
            disabled={size <= 1}
            activeOpacity={0.7}
            testID="size-minus"
          >
            <Minus size={22} color={size <= 1 ? Colors.inactive : Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>

          <View style={styles.sizeDisplay}>
            <Text style={styles.sizeNumber}>{size}</Text>
            <Text style={styles.sizeLabel}>{size === 1 ? 'person' : 'people'}</Text>
          </View>

          <TouchableOpacity
            style={[styles.stepBtn, size >= 10 && styles.stepBtnDisabled]}
            onPress={increment}
            disabled={size >= 10}
            activeOpacity={0.7}
            testID="size-plus"
          >
            <Plus size={22} color={size >= 10 ? Colors.inactive : Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="setup-size-continue"
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
    alignItems: 'center',
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  heading: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 64,
    alignSelf: 'flex-start',
  },
  stepperWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 0,
  },
  stepBtn: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.35,
  },
  sizeDisplay: {
    width: 140,
    alignItems: 'center',
  },
  sizeNumber: {
    fontSize: 72,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 80,
  },
  sizeLabel: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: -4,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
