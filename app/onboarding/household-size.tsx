import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import Stepper from '@/components/Stepper';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function HouseholdSizeScreen() {
  const insets = useSafeAreaInsets();
  const { data, setHouseholdSize, setStep } = useOnboarding();
  const [size, setSize] = useState<number>(data.household_size);

  const handleContinue = () => {
    setHouseholdSize(size);
    setStep(4);
    router.push('/onboarding/cultural-restrictions' as Href);
  };

  return (
    <View style={[styles.container]}>
      <OnboardingHeader current={3} total={14} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 3 of 14</Text>
        <Text style={styles.heading}>How many people are in your household?</Text>

        <View style={styles.stepperContainer}>
          <Stepper value={size} onValueChange={setSize} min={1} max={20} />
        </View>

        <Text style={styles.helper}>
          This sets your default serving size for meal planning and shopping. You can adjust it per meal at any time.
        </Text>
      </View>

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
    marginBottom: 48,
    lineHeight: 36,
  },
  stepperContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 32,
    lineHeight: 20,
    textAlign: 'center',
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
