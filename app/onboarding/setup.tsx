/**
 * Onboarding Screen 2 — Quick Setup
 *
 * Three quick questions before the user sees the app:
 * 1. What do you call your household? (family name — optional, personalises the app)
 * 2. Household size (stepper, min 1, max 10, default 2)
 * 3. Measurement units (Metric / Imperial)
 *
 * Step 1 of 3.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyName, setHouseholdSize, setMeasurementUnits, setStep } = useOnboarding();

  const [name, setName]   = useState<string>(data.family_name ?? '');
  const [size, setSize]   = useState<number>(data.household_size ?? 2);
  const [units, setUnits] = useState<'metric' | 'imperial'>(data.measurement_units ?? 'metric');

  const nameInputRef = useRef<TextInput>(null);

  const decrement = () => setSize(s => Math.max(1, s - 1));
  const increment = () => setSize(s => Math.min(10, s + 1));

  const handleContinue = () => {
    setFamilyName(name.trim());
    setHouseholdSize(size);
    setMeasurementUnits(units);
    setStep(2);
    router.push('/onboarding/slots' as Href);
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: Colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 16 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Progress */}
        <View style={styles.progressRow}>
          {[1, 2, 3].map(i => (
            <View
              key={i}
              style={[styles.progressDot, i === 1 && styles.progressDotActive]}
            />
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.stepLabel}>Step 1 of 3</Text>
          <Text style={styles.heading}>A few quick things</Text>
          <Text style={styles.subheading}>
            Help us set up your plan — takes less than 10 seconds.
          </Text>

          {/* ── Family name ───────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.questionLabel}>What do you call your household?</Text>
            <Text style={styles.questionHint}>Optional — personalises the app for you</Text>
            <TextInput
              ref={nameInputRef}
              style={styles.nameInput}
              value={name}
              onChangeText={setName}
              placeholder="e.g. The Johnsons, My Kitchen, Casa Garcia"
              placeholderTextColor={Colors.inactive}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => nameInputRef.current?.blur()}
              testID="family-name-input"
            />
          </View>

          {/* ── Household size ────────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.questionLabel}>How many people are you cooking for?</Text>
            <View style={styles.stepper}>
              <TouchableOpacity
                style={[styles.stepBtn, size <= 1 && styles.stepBtnDisabled]}
                onPress={decrement}
                disabled={size <= 1}
                activeOpacity={0.7}
                testID="size-minus"
              >
                <Minus
                  size={20}
                  color={size <= 1 ? Colors.inactive : Colors.text}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>

              <View style={styles.sizeDisplay}>
                <Text style={styles.sizeNumber}>{size}</Text>
                <Text style={styles.sizeLabel}>
                  {size === 1 ? 'person' : 'people'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.stepBtn, size >= 10 && styles.stepBtnDisabled]}
                onPress={increment}
                disabled={size >= 10}
                activeOpacity={0.7}
                testID="size-plus"
              >
                <Plus
                  size={20}
                  color={size >= 10 ? Colors.inactive : Colors.text}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Measurement units ─────────────────────────────────────────── */}
          <View style={styles.section}>
            <Text style={styles.questionLabel}>Which units do you prefer?</Text>
            <View style={styles.unitRow}>
              <TouchableOpacity
                style={[styles.unitOption, units === 'metric' && styles.unitOptionSelected]}
                onPress={() => setUnits('metric')}
                activeOpacity={0.7}
                testID="units-metric"
              >
                <Text style={styles.unitEmoji}>⚖️</Text>
                <Text style={[
                  styles.unitLabel,
                  units === 'metric' && styles.unitLabelSelected,
                ]}>
                  Metric
                </Text>
                <Text style={[
                  styles.unitSub,
                  units === 'metric' && styles.unitSubSelected,
                ]}>
                  g, ml, °C
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.unitOption, units === 'imperial' && styles.unitOptionSelected]}
                onPress={() => setUnits('imperial')}
                activeOpacity={0.7}
                testID="units-imperial"
              >
                <Text style={styles.unitEmoji}>🇺🇸</Text>
                <Text style={[
                  styles.unitLabel,
                  units === 'imperial' && styles.unitLabelSelected,
                ]}>
                  Imperial
                </Text>
                <Text style={[
                  styles.unitSub,
                  units === 'imperial' && styles.unitSubSelected,
                ]}>
                  oz, cups, °F
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer — outside ScrollView so it stays pinned */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="setup-continue"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
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
    backgroundColor: Colors.primary,
  },

  content: {
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
    marginBottom: 32,
  },

  // ── Section ──
  section: {
    marginBottom: 28,
  },
  questionLabel: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  questionHint: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: 12,
  },

  // ── Family name input ──
  nameInput: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },

  // ── Stepper ──
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
    marginTop: 12,
  },
  stepBtn: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnDisabled: {
    opacity: 0.4,
  },
  sizeDisplay: {
    width: 120,
    alignItems: 'center',
  },
  sizeNumber: {
    fontSize: 42,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 50,
  },
  sizeLabel: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: -4,
  },

  // ── Unit options ──
  unitRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  unitOption: {
    flex: 1,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
  },
  unitOptionSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  unitEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  unitLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  unitLabelSelected: {
    color: Colors.primary,
  },
  unitSub: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  unitSubSelected: {
    color: Colors.primary,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
});
