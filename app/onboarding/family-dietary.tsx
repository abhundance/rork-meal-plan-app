import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import ProgressBar from '@/components/ProgressBar';
import OnboardingBackButton from '@/components/OnboardingBackButton';
import PrimaryButton from '@/components/PrimaryButton';
import DietaryPillGrid from '@/components/DietaryPillGrid';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function FamilyDietaryScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyDietary, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.dietary_preferences_family);

  const handleContinue = () => {
    setFamilyDietary(selected);
    setStep(5);
    router.push('/onboarding/personal-goal' as Href);
  };

  const handleSkip = () => {
    setFamilyDietary([]);
    setStep(5);
    router.push('/onboarding/personal-goal' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <OnboardingBackButton />
      <ProgressBar current={4} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 4 of 11</Text>
        <Text style={styles.heading}>Does your family follow any dietary preferences?</Text>

        <DietaryPillGrid selected={selected} onSelectionChange={setSelected} />

        <Text style={styles.helper}>
          We'll use this to personalise your Discover feed. Each member can also set personal preferences after joining.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-btn">
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
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
    marginBottom: 28,
    lineHeight: 36,
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 24,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
});
