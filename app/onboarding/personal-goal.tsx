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
import NoneButton from '@/components/NoneButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useHouseholdCopy } from '@/hooks/useHouseholdCopy';

type GoalItem = {
  value: string;
  emoji: string;
  label: string;
  description: string;
};

type GoalSection = {
  sectionLabel: string;
  items: GoalItem[];
};

const GOAL_SECTIONS: GoalSection[] = [
  {
    sectionLabel: '🎯 Personal Goals',
    items: [
      { value: 'weight_loss',   emoji: '⚖️', label: 'Weight loss',         description: 'Lighter meals, lower calories, higher fibre' },
      { value: 'muscle_gain',   emoji: '💪', label: 'Muscle gain',          description: 'High protein, serious fuel for training' },
      { value: 'recomposition', emoji: '🎯', label: 'Body recomposition',   description: 'Lean and strong — calorie-smart with high protein' },
    ],
  },
  {
    sectionLabel: '🩺 Health Conditions',
    items: [
      { value: 'diabetes_management', emoji: '🩸', label: 'Blood sugar / Diabetes', description: 'Low GI, fibre-forward, blood sugar control' },
      { value: 'heart_health',        emoji: '❤️',  label: 'Heart health',            description: 'Mediterranean, omega-3 rich, low saturated fat' },
      { value: 'gut_health',          emoji: '🌱', label: 'Gut health',              description: 'High fibre, diverse plant foods, fermented options' },
      { value: 'anti_inflammatory',   emoji: '🔥', label: 'Anti-inflammatory',       description: 'Omega-3s, polyphenols, antioxidant-rich foods' },
      { value: 'longevity',           emoji: '🧬', label: 'Longevity',               description: 'Mediterranean and antioxidant-rich eating patterns' },
    ],
  },
  {
    sectionLabel: '🌸 Life Stage',
    items: [
      { value: 'pregnancy',  emoji: '🤰', label: 'Pregnancy',   description: 'Nutrient-dense meals to support mum and baby' },
      { value: 'postpartum', emoji: '🤱', label: 'Postpartum',  description: 'Recovery, energy, and nourishment after birth' },
      { value: 'pcos',       emoji: '🩺', label: 'PCOS',        description: 'Low GI, anti-inflammatory, hormone-friendly' },
    ],
  },
];

export default function PersonalGoalScreen() {
  const insets = useSafeAreaInsets();
  const { data, setHealthGoals, setStep } = useOnboarding();
  const { isSolo } = useHouseholdCopy();
  const [selected, setSelected] = useState<string[]>(data.health_goals ?? []);

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const advance = () => {
    setStep(9);
    router.push('/onboarding/cuisines' as Href);
  };

  const handleContinue = () => {
    setHealthGoals(selected);
    advance();
  };

  const handleNone = () => {
    setHealthGoals([]);
    advance();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader current={8} total={14} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 8 of 14</Text>
        <Text style={styles.heading}>Any personal health goals?</Text>
        <Text style={styles.subheading}>
          Select all that apply. Your Discover feed and Smart Fill will prioritise meals that support these goals.
        </Text>

        {GOAL_SECTIONS.map((section) => (
          <View key={section.sectionLabel}>
            <Text style={styles.sectionLabel}>{section.sectionLabel}</Text>
            {section.items.map((item) => {
              const isSelected = selected.includes(item.value);
              return (
                <TouchableOpacity
                  key={item.value}
                  style={[styles.optionRow, isSelected && styles.optionRowSelected]}
                  onPress={() => toggle(item.value)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.optionEmoji}>{item.emoji}</Text>
                  <View style={styles.optionText}>
                    <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                      {item.label}
                    </Text>
                    <Text style={styles.optionDesc}>{item.description}</Text>
                  </View>
                  {isSelected && (
                    <View style={styles.checkDot}>
                      <Check size={12} color={Colors.white} strokeWidth={3} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            <View style={styles.sectionGap} />
          </View>
        ))}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
        <NoneButton
          label={isSolo ? 'No specific goals for me' : 'No specific goals for us'}
          onPress={handleNone}
          testID="none-btn"
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
  sectionLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  sectionGap: {
    height: 16,
  },
  optionRow: {
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
  optionRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  optionEmoji: {
    fontSize: 22,
    marginRight: 14,
    width: 28,
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
});
