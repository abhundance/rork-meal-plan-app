import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Check } from 'lucide-react-native';
import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { PersonalGoal } from '@/types';

type GoalItem = {
  value: PersonalGoal;
  emoji: string;
  label: string;
  description: string;
};

const DIET_STYLE_ITEMS: GoalItem[] = [
  { value: 'keto',      emoji: '🥩', label: 'Keto',      description: 'Very low carb, high fat' },
  { value: 'paleo',     emoji: '🌿', label: 'Paleo',     description: 'Whole foods, nothing processed' },
  { value: 'whole30',   emoji: '✅', label: 'Whole30',   description: 'Clean 30-day elimination protocol' },
  { value: 'carnivore', emoji: '🔪', label: 'Carnivore', description: 'Meat-forward, animal-based' },
];

const DIET_STYLE_VALUES: PersonalGoal[] = ['keto', 'paleo', 'whole30', 'carnivore'];

export default function PersonalGoalDietScreen() {
  const insets = useSafeAreaInsets();
  const { data, setPersonalGoal } = useOnboarding();
  const [selected, setSelected] = useState<PersonalGoal | null>(
    DIET_STYLE_VALUES.includes(data.personal_goal as PersonalGoal)
      ? (data.personal_goal as PersonalGoal)
      : null
  );

  const advance = () => router.push('/onboarding/personal-goal-life' as Href);

  const handleContinue = () => {
    if (selected) setPersonalGoal(selected);
    advance();
  };

  const handleSkip = () => advance();

  return (
    <View style={styles.container}>
      <OnboardingHeader current={5} total={11} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 5 of 11</Text>
        <Text style={styles.heading}>Do you follow a specific diet?</Text>
        <Text style={styles.subheading}>
          If you eat a particular way, select it here. We'll filter recipes accordingly.
        </Text>

        <Text style={styles.sectionLabel}>🥩 Diet Style</Text>

        {DIET_STYLE_ITEMS.map((item) => {
          const isSelected = selected === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.goalRow, isSelected && styles.goalRowSelected]}
              onPress={() => setSelected(isSelected ? null : item.value)}
              activeOpacity={0.7}
            >
              <Text style={styles.goalEmoji}>{item.emoji}</Text>
              <View style={styles.goalText}>
                <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                  {item.label}
                </Text>
                <Text style={styles.goalDesc}>{item.description}</Text>
              </View>
              {isSelected && (
                <View style={styles.checkDot}>
                  <Check size={12} color={Colors.white} strokeWidth={3} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-btn">
          <Text style={styles.skipText}>I don't follow a diet — skip</Text>
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
  scroll: {
    flex: 1,
  },
  content: {
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
    marginBottom: 10,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  goalRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  goalEmoji: {
    fontSize: 22,
    marginRight: 14,
    width: 28,
    textAlign: 'center',
  },
  goalText: {
    flex: 1,
  },
  goalLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  goalLabelSelected: {
    color: Colors.primary,
  },
  goalDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.primary,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 15,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
  },
});
