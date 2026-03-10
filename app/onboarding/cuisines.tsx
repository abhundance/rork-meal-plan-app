import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { CUISINE_OPTIONS } from '@/types';

// Emoji map for cuisines
const CUISINE_EMOJIS: Record<string, string> = {
  'African': '🌍',
  'American': '🦅',
  'British': '🫖',
  'Cajun': '🦞',
  'Caribbean': '🌴',
  'Chinese': '🥟',
  'Colombian': '🌽',
  'Eastern European': '🥙',
  'European': '🥐',
  'Filipino': '🍚',
  'French': '🥖',
  'German': '🥨',
  'Greek': '🫒',
  'Indian': '🍛',
  'Irish': '🍀',
  'Italian': '🍝',
  'Japanese': '🍣',
  'Jewish': '🥯',
  'Korean': '🌶️',
  'Latin American': '🌮',
  'Malaysian': '🍜',
  'Mediterranean': '🫙',
  'Mexican': '🌯',
  'Middle Eastern': '🧆',
  'Native American': '🌾',
  'Nordic': '🐟',
  'Singaporean': '🦀',
  'Southern': '🍗',
  'Spanish': '🥘',
  'Thai': '🍲',
  'Vietnamese': '🥗',
};

export default function CuisinesScreen() {
  const insets = useSafeAreaInsets();
  const { data, setCuisinePreferences, setStep } = useOnboarding();
  const [selected, setSelected] = useState<string[]>(data.cuisine_preferences ?? []);

  const toggleCuisine = (cuisine: string) => {
    setSelected(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  const handleContinue = () => {
    setCuisinePreferences(selected);
    setStep(7);
    router.push('/onboarding/cooking-time' as Href);
  };

  const handleSkip = () => {
    setCuisinePreferences([]);
    setStep(7);
    router.push('/onboarding/cooking-time' as Href);
  };

  return (
    <View style={[styles.container]}>
      <OnboardingHeader current={6} total={11} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 6 of 11</Text>
        <Text style={styles.heading}>Which cuisines does your family love?</Text>
        <Text style={styles.subheading}>
          We'll use this to personalise your Discover feed. Pick as many as you like.
        </Text>

        <View style={styles.grid}>
          {[...CUISINE_OPTIONS].map((cuisine) => {
            const isSelected = selected.includes(cuisine);
            return (
              <TouchableOpacity
                key={cuisine}
                style={[styles.cuisineChip, isSelected && styles.cuisineChipSelected]}
                onPress={() => toggleCuisine(cuisine)}
                activeOpacity={0.7}
              >
                <Text style={styles.cuisineEmoji}>{CUISINE_EMOJIS[cuisine] ?? '🍽️'}</Text>
                <Text style={[styles.cuisineLabel, isSelected && styles.cuisineLabelSelected]}>
                  {cuisine}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={selected.length > 0 ? `Continue (${selected.length} selected)` : 'Continue'}
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
    marginBottom: 8,
    lineHeight: 36,
  },
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  cuisineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cuisineChipSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  cuisineEmoji: {
    fontSize: 16,
  },
  cuisineLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  cuisineLabelSelected: {
    color: Colors.primary,
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
    fontWeight: '500' as const,
  },
});
