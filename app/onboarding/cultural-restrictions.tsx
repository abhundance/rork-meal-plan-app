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

type RestrictionItem = {
  value: string;
  emoji: string;
  label: string;
  description: string;
};

const RESTRICTION_OPTIONS: RestrictionItem[] = [
  {
    value: 'no_beef',
    emoji: '🐄',
    label: 'No beef',
    description: 'Common in Hindu, Jain, and some Asian households',
  },
  {
    value: 'no_pork',
    emoji: '🐷',
    label: 'No pork',
    description: 'Common in Muslim and Jewish households',
  },
  {
    value: 'no_shellfish',
    emoji: '🦞',
    label: 'No shellfish',
    description: 'Common in Kosher and some religious practices',
  },
  {
    value: 'no_meat',
    emoji: '🥩',
    label: 'No meat',
    description: 'Vegetarian household — fish and dairy may still be included',
  },
  {
    value: 'vegan',
    emoji: '🌱',
    label: 'No animal products',
    description: 'Vegan household — no meat, dairy, eggs, or honey',
  },
  {
    value: 'halal',
    emoji: '☪️',
    label: 'Halal only',
    description: 'Meat must be halal-certified',
  },
  {
    value: 'kosher',
    emoji: '✡️',
    label: 'Kosher only',
    description: 'Follows kosher dietary laws',
  },
];

export default function CulturalRestrictionsScreen() {
  const insets = useSafeAreaInsets();
  const { data, setCulturalRestrictions, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.cultural_restrictions ?? []);

  const toggle = (value: string) => {
    setSelected(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const advance = () => {
    setStep(5);
    router.push('/onboarding/family-dietary' as Href);
  };

  const handleContinue = () => {
    setCulturalRestrictions(selected);
    advance();
  };

  const handleNone = () => {
    setCulturalRestrictions([]);
    advance();
  };

  return (
    <View style={styles.container}>
      <OnboardingHeader current={4} total={14} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 160 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 4 of 14</Text>
        <Text style={styles.heading}>Anything your household doesn't eat?</Text>
        <Text style={styles.subheading}>
          Select all that apply. We'll make sure Smart Fill and your Discover feed never suggest meals that don't fit.
        </Text>

        {RESTRICTION_OPTIONS.map((item) => {
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
          label="None of these apply to us"
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
