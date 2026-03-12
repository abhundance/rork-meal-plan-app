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

type HouseholdItem = {
  value: string;
  emoji: string;
  label: string;
  description: string;
};

const HOUSEHOLD_OPTIONS: HouseholdItem[] = [
  {
    value: 'young_family',
    emoji: '👶',
    label: 'Young family',
    description: 'Kids under 10 — mild flavours, familiar favourites',
  },
  {
    value: 'school_age',
    emoji: '🧒',
    label: 'School-age kids',
    description: 'Kids 10–17 — more adventurous, bigger portions',
  },
  {
    value: 'adults_only',
    emoji: '👫',
    label: 'Adults only',
    description: 'No kids at home — full flavour, any cuisine',
  },
  {
    value: 'seniors',
    emoji: '👴',
    label: 'Seniors at home',
    description: 'Softer textures, lighter portions, heart-friendly',
  },
  {
    value: 'mixed',
    emoji: '🌍',
    label: 'Mixed household',
    description: 'All ages — broad appeal, something for everyone',
  },
];

export default function HouseholdTypeScreen() {
  const insets = useSafeAreaInsets();
  const { data, setHouseholdType, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string | null>(data.household_type ?? null);

  const advance = () => {
    setStep(8);
    router.push('/onboarding/personal-goal' as Href);
  };

  const handleSelect = (value: string) => {
    setSelected(value);
  };

  const handleContinue = () => {
    setHouseholdType(selected ?? 'mixed');
    advance();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader current={7} total={14} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 7 of 14</Text>
        <Text style={styles.heading}>What's your household like?</Text>
        <Text style={styles.subheading}>
          This helps us tailor recipes to your family's age range and taste preferences.
        </Text>

        {HOUSEHOLD_OPTIONS.map((item) => {
          const isSelected = selected === item.value;
          return (
            <TouchableOpacity
              key={item.value}
              style={[styles.optionRow, isSelected && styles.optionRowSelected]}
              onPress={() => handleSelect(item.value)}
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
          label={selected ? 'Continue' : 'Skip for now'}
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
