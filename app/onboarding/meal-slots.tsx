import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import MealSlotEditor from '@/components/MealSlotEditor';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { MealSlot } from '@/types';

export default function MealSlotConfigScreen() {
  const insets = useSafeAreaInsets();
  const { data, setMealSlots, setStep } = useOnboarding();
  const [slots, setSlots] = useState<MealSlot[]>(data.meal_slots);

  const handleContinue = () => {
    const validSlots = slots.filter(s => s.name.trim());
    if (validSlots.length === 0) return;
    setMealSlots(validSlots);
    setStep(4);
    router.push('/onboarding/family-dietary' as Href);
  };

  const hasValidSlot = slots.some(s => s.name.trim());

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={3} total={6} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 3 of 6</Text>
        <Text style={styles.heading}>What do you call your daily meals?</Text>
        <Text style={styles.helper}>
          We've added the defaults below. Rename them, remove any you don't need, or add your own.
        </Text>

        <View style={styles.editorContainer}>
          <MealSlotEditor slots={slots} onSlotsChange={setSlots} />
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          disabled={!hasValidSlot}
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
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
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
    lineHeight: 20,
  },
  editorContainer: {
    marginTop: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
