import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { PersonalGoal } from '@/types';

type GoalItem = {
  value: PersonalGoal;
  emoji: string;
  label: string;
  description: string;
};

type GoalGroup = {
  title: string;
  items: GoalItem[];
};

const GOAL_GROUPS: GoalGroup[] = [
  {
    title: 'Eat Well',
    items: [
      { value: 'balanced',      emoji: '🥗', label: 'Balanced',           description: 'No specific goal — just eating well' },
      { value: 'weight_loss',   emoji: '⚖️', label: 'Weight Loss',        description: 'Lighter meals, fewer calories' },
      { value: 'muscle_gain',   emoji: '💪', label: 'Muscle Gain',        description: 'High protein, serious fuel' },
      { value: 'recomposition', emoji: '🎯', label: 'Body Recomposition', description: 'Lean & strong, calorie-smart' },
    ],
  },
  {
    title: 'Diet Style',
    items: [
      { value: 'keto',      emoji: '🥩', label: 'Keto',     description: 'Very low carb, high fat' },
      { value: 'paleo',     emoji: '🌿', label: 'Paleo',    description: 'Whole foods, nothing processed' },
      { value: 'whole30',   emoji: '✅', label: 'Whole30',  description: 'Clean 30-day elimination protocol' },
      { value: 'carnivore', emoji: '🔪', label: 'Carnivore', description: 'Meat-forward, animal-based' },
    ],
  },
  {
    title: 'Life Stage',
    items: [
      { value: 'pregnancy',  emoji: '🤰', label: 'Pregnancy',  description: 'Nutrient-dense prenatal meals' },
      { value: 'postpartum', emoji: '🤱', label: 'Postpartum', description: 'Recovery & energy after birth' },
      { value: 'pcos',       emoji: '🩺', label: 'PCOS',       description: 'Low GI, anti-inflammatory meals' },
    ],
  },
  {
    title: 'Health Focus',
    items: [
      { value: 'diabetes_management', emoji: '🩸', label: 'Diabetes',          description: 'Blood sugar balance, low GI' },
      { value: 'heart_health',        emoji: '❤️', label: 'Heart Health',      description: 'Mediterranean & omega-3 rich' },
      { value: 'gut_health',          emoji: '🌱', label: 'Gut Health',        description: 'Fibre-rich, plant diversity' },
      { value: 'longevity',           emoji: '🧬', label: 'Longevity',         description: 'Antioxidant-rich, eat to thrive' },
      { value: 'anti_inflammatory',   emoji: '💊', label: 'Anti-Inflammatory', description: 'Omega-3s & polyphenol focus' },
    ],
  },
];

export default function PersonalGoalScreen() {
  const insets = useSafeAreaInsets();
  const { data, setPersonalGoal, setStep } = useOnboarding();
  const { updateUserSettings } = useFamilySettings();
  const [selected, setSelected] = useState<PersonalGoal>(data.personal_goal ?? 'balanced');

  const handleContinue = () => {
    setPersonalGoal(selected);
    // Also write directly to UserSettings so Discover carousels & Smart Fill
    // reflect the choice immediately without waiting for a full onboarding completion.
    updateUserSettings({ personal_goal: selected });
    setStep(6);
    router.push('/onboarding/invite-members' as Href);
  };

  const handleSkip = () => {
    // 'balanced' is the safe default — no carousel or scoring change
    setPersonalGoal('balanced');
    setStep(6);
    router.push('/onboarding/invite-members' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={5} total={7} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 5 of 7</Text>
        <Text style={styles.heading}>What's your main health goal?</Text>
        <Text style={styles.subheading}>
          We'll personalise your Discover feed to match. You can update this anytime in Settings.
        </Text>

        {GOAL_GROUPS.map((group) => (
          <View key={group.title} style={styles.group}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            {group.items.map((item) => {
              const isSelected = selected === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.goalRow, isSelected && styles.goalRowSelected]}
                  onPress={() => setSelected(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.goalEmoji}>{item.emoji}</Text>
                  <View style={styles.goalText}>
                    <Text style={[styles.goalLabel, isSelected && styles.goalLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.goalDesc}>{item.description}</Text>
                  </View>
                  {isSelected && <View style={styles.checkDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </ScrollView>

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
    marginBottom: 28,
  },
  group: {
    marginBottom: 24,
  },
  groupTitle: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 10,
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
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    marginLeft: 12,
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
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
});
