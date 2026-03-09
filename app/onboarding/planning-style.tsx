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

type PlanningStyle = 'familiar' | 'balanced' | 'adventurous';

const STYLE_OPTIONS: {
  value: PlanningStyle;
  emoji: string;
  label: string;
  tagline: string;
  description: string;
}[] = [
  {
    value: 'familiar',
    emoji: '🏠',
    label: 'Familiar',
    tagline: 'Stick to what we know',
    description: 'Mostly tried-and-true meals with occasional new dishes',
  },
  {
    value: 'balanced',
    emoji: '⚖️',
    label: 'Balanced',
    tagline: 'Mix of old and new',
    description: 'A healthy mix of family favourites and new recipes to try',
  },
  {
    value: 'adventurous',
    emoji: '🌏',
    label: 'Adventurous',
    tagline: 'Surprise us!',
    description: 'Mostly new recipes — great for expanding your family\'s palate',
  },
];

export default function PlanningStyleScreen() {
  const insets = useSafeAreaInsets();
  const { data, setPlanningStyle, setStep } = useOnboarding();
  const [selected, setSelected] = useState<PlanningStyle>(data.planning_style ?? 'balanced');

  const handleContinue = () => {
    setPlanningStyle(selected);
    setStep(9);
    router.push('/onboarding/configure-slots' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={8} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 8 of 11</Text>
        <Text style={styles.heading}>How do you like to plan meals?</Text>
        <Text style={styles.subheading}>
          This sets how often Smart Fill suggests new recipes versus your family favourites.
        </Text>

        <View style={styles.options}>
          {STYLE_OPTIONS.map((option) => {
            const isSelected = selected === option.value;
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionCard, isSelected && styles.optionCardSelected]}
                onPress={() => setSelected(option.value)}
                activeOpacity={0.7}
              >
                <View style={styles.optionTop}>
                  <Text style={styles.optionEmoji}>{option.emoji}</Text>
                  <View style={styles.optionLabels}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {option.label}
                    </Text>
                    <Text style={[styles.optionTagline, isSelected && styles.optionTaglineSelected]}>
                      {option.tagline}
                    </Text>
                  </View>
                  {isSelected && <View style={styles.checkDot} />}
                </View>
                <Text style={styles.optionDesc}>{option.description}</Text>
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
    gap: 12,
  },
  optionCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  optionCardSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  optionEmoji: {
    fontSize: 24,
    marginRight: 12,
    width: 32,
    textAlign: 'center',
  },
  optionLabels: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  optionLabelSelected: {
    color: Colors.primary,
  },
  optionTagline: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  optionTaglineSelected: {
    color: Colors.primary,
  },
  optionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingLeft: 44,
  },
  checkDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: 8,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
