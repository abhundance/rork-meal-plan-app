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

type DietItem = {
  value: string;
  emoji: string;
  label: string;
  description: string;
};

const DIET_OPTIONS: DietItem[] = [
  {
    value: 'high_protein',
    emoji: '💪',
    label: 'High protein',
    description: 'Prioritise protein-rich meals to build and maintain muscle',
  },
  {
    value: 'low_carb',
    emoji: '🥦',
    label: 'Low carb',
    description: 'Limit starchy foods, breads, and sugars',
  },
  {
    value: 'mediterranean',
    emoji: '🫒',
    label: 'Mediterranean',
    description: 'Heart-healthy, olive oil, fish, fresh vegetables',
  },
  {
    value: 'plant_forward',
    emoji: '🌱',
    label: 'Plant-forward',
    description: 'Mostly plants — some animal products are OK',
  },
  {
    value: 'keto',
    emoji: '🥑',
    label: 'Keto',
    description: 'Very low carb, high fat, moderate protein',
  },
  {
    value: 'paleo',
    emoji: '🦕',
    label: 'Paleo',
    description: 'Whole, unprocessed foods — ancestral eating',
  },
  {
    value: 'whole30',
    emoji: '🌿',
    label: 'Whole30',
    description: '30-day elimination protocol — clean reset',
  },
];

export default function DietPreferencesScreen() {
  const insets = useSafeAreaInsets();
  const { data, setDietPreferences, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.diet_preferences ?? []);

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const advance = () => {
    setStep(7);
    router.push('/onboarding/household-type' as Href);
  };

  const handleContinue = () => {
    setDietPreferences(selected);
    advance();
  };

  const handleNone = () => {
    setDietPreferences([]);
    advance();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader current={6} total={14} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 6 of 14</Text>
        <Text style={styles.heading}>How do you want your meal plan to lean?</Text>
        <Text style={styles.subheading}>
          Pick any that fit your household's eating style. These shape your Discover feed — you can always change them later.
        </Text>

        {DIET_OPTIONS.map((item) => {
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
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
        <NoneButton
          label="No specific preference — keep it balanced"
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
