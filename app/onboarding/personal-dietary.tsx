import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import DietaryPillGrid from '@/components/DietaryPillGrid';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function PersonalDietaryScreen() {
  const insets = useSafeAreaInsets();
  const { data, setPersonalDietary, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(
    data.dietary_preferences_individual.length > 0
      ? data.dietary_preferences_individual
      : data.dietary_preferences_family
  );

  const handleContinue = () => {
    setPersonalDietary(selected);
    setStep(8);
    router.push('/onboarding/welcome' as Href);
  };

  const handleSkip = () => {
    setPersonalDietary([]);
    setStep(8);
    router.push('/onboarding/welcome' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={7} total={7} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 7 of 7</Text>
        <Text style={styles.heading}>Do you personally have any additional preferences?</Text>

        <DietaryPillGrid selected={selected} onSelectionChange={setSelected} />

        <Text style={styles.helper}>
          Your personal preferences help refine your own Discover feed.
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
    fontWeight: '600' as const,
  },
});
