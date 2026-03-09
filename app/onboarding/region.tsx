import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function RegionScreen() {
  const insets = useSafeAreaInsets();
  const { data, setRegion, setStep } = useOnboarding();
  const [country, setCountry] = useState<string>(data.region ?? 'Singapore');
  const [units, setUnits] = useState<'metric' | 'imperial'>(data.measurement_units ?? 'metric');

  const handleContinue = () => {
    setRegion(country.trim() || 'Singapore', units);
    setStep(2);
    router.push('/onboarding/family-name' as Href);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ProgressBar current={1} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 1 of 11</Text>
        <Text style={styles.heading}>Where are you cooking from?</Text>
        <Text style={styles.subheading}>
          We'll tailor recipes and units to your region.
        </Text>

        <Text style={styles.inputLabel}>Country</Text>
        <TextInput
          style={styles.input}
          value={country}
          onChangeText={setCountry}
          placeholder="e.g. Singapore"
          placeholderTextColor={Colors.inactive}
          autoCapitalize="words"
          returnKeyType="done"
          testID="country-input"
        />

        <Text style={styles.sectionTitle}>Measurement Units</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.toggleOption, units === 'metric' && styles.toggleOptionSelected]}
            onPress={() => setUnits('metric')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleEmoji]}>📏</Text>
            <Text style={[styles.toggleLabel, units === 'metric' && styles.toggleLabelSelected]}>
              Metric
            </Text>
            <Text style={[styles.toggleSub, units === 'metric' && styles.toggleSubSelected]}>
              g, ml, °C
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toggleOption, units === 'imperial' && styles.toggleOptionSelected]}
            onPress={() => setUnits('imperial')}
            activeOpacity={0.7}
          >
            <Text style={[styles.toggleEmoji]}>🇺🇸</Text>
            <Text style={[styles.toggleLabel, units === 'imperial' && styles.toggleLabelSelected]}>
              Imperial
            </Text>
            <Text style={[styles.toggleSub, units === 'imperial' && styles.toggleSubSelected]}>
              oz, cups, °F
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
  },
  toggleOption: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  toggleOptionSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  toggleEmoji: {
    fontSize: 28,
    marginBottom: 8,
  },
  toggleLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  toggleLabelSelected: {
    color: Colors.primary,
  },
  toggleSub: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  toggleSubSelected: {
    color: Colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
