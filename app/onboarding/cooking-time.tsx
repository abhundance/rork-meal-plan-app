import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

type CookTimePref = 'under_20' | '20_40' | '40_60' | 'over_60';

const TIME_OPTIONS: { value: CookTimePref; emoji: string; label: string; description: string }[] = [
  { value: 'under_20', emoji: '⚡', label: 'Under 20 minutes', description: 'Quick weeknight fixes' },
  { value: '20_40',    emoji: '🕐', label: '20–40 minutes',    description: 'The everyday sweet spot' },
  { value: '40_60',    emoji: '🍳', label: '40–60 minutes',    description: 'Worth the extra time' },
  { value: 'over_60',  emoji: '🫕', label: 'Over an hour',     description: 'Slow cooks & weekend feasts' },
];

export default function CookingTimeScreen() {
  const insets = useSafeAreaInsets();
  const { data, setCookingTimePref, setStep } = useOnboarding();
  const [selected, setSelected] = useState<CookTimePref>(data.cooking_time_pref ?? '20_40');

  const handleContinue = () => {
    setCookingTimePref(selected);
    setStep(8);
    router.push('/onboarding/planning-style' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={7} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 7 of 11</Text>
        <Text style={styles.heading}>How much time do you usually have to cook?</Text>
        <Text style={styles.subheading}>
          We'll prioritise recipes that fit your schedule.
        </Text>

        <View style={styles.options}>
          {TIME_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                onPress={() => setSelected(option.value)}
                activeOpacity={0.7}
              >
                <Text style={styles.optionEmoji}>{option.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                    {option.label}
                  </Text>
                  <Text style={styles.optionDesc}>{option.description}</Text>
                </View>
                {isSelected && <View style={styles.checkDot} />}
              </TouchableOpacity>
            );
          })}
        </View>
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
    marginBottom: 8,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 28,
  },
  options: {
    gap: 10,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 14,
    width: 32,
    textAlign: 'center',
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: 12,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
