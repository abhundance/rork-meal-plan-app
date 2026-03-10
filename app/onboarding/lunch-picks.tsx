import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Check } from 'lucide-react-native';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { LUNCH_MEALS_ALL, getRegionalMeals } from '@/constants/starterMeals';

export default function LunchPicksScreen() {
  const insets = useSafeAreaInsets();
  const { data, addStarterMeal, setStep } = useOnboarding();
  const selectedIds = new Set((data.starter_meals ?? []).map(m => m.id));

  const meals = useMemo(
    () => getRegionalMeals(LUNCH_MEALS_ALL, data.region ?? ''),
    [data.region],
  );

  const lunchIds = useMemo(() => new Set(LUNCH_MEALS_ALL.map(m => m.id)), []);
  const lunchSelectedCount = [...selectedIds].filter(id => lunchIds.has(id)).length;

  const navigateNext = () => {
    setStep(11);
    const enabled = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
    if (enabled.includes('dinner')) {
      router.push('/onboarding/dinner-picks' as Href);
    } else {
      router.push('/onboarding/welcome' as Href);
    }
  };

  const FOOTER_HEIGHT = insets.bottom + 120;

  return (
    <View style={styles.container}>
      <OnboardingHeader current={11} total={11} />

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: FOOTER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 11 of 11</Text>
            <Text style={styles.heading}>Pick some lunch favourites</Text>
            <Text style={styles.subheading}>
              These get added to your Favs so Smart Fill has meals to work with from day one.
            </Text>
          </View>
        }
        renderItem={({ item: meal }) => {
          const isSelected = selectedIds.has(meal.id);
          return (
            <TouchableOpacity
              style={[styles.mealRow, isSelected && styles.mealRowSelected]}
              onPress={() => addStarterMeal(meal)}
              activeOpacity={0.7}
            >
              <Text style={styles.mealEmoji}>{meal.emoji}</Text>
              <View style={styles.mealText}>
                <Text style={[styles.mealName, isSelected && styles.mealNameSelected]}>
                  {meal.name}
                </Text>
                <Text style={styles.mealMeta}>{meal.cuisine} · ~{meal.cook_time_mins} min</Text>
              </View>
              <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                {isSelected && <Check size={13} color={Colors.white} strokeWidth={3} />}
              </View>
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={lunchSelectedCount > 0 ? `Continue (${lunchSelectedCount} selected)` : 'Continue'}
          onPress={navigateNext}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={navigateNext} testID="skip-btn">
          <Text style={styles.skipText}>I'll add lunch meals later</Text>
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
  listContent: {
    paddingHorizontal: 24,
  },
  header: {
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
  subheading: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  mealRowSelected: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  mealEmoji: {
    fontSize: 28,
    marginRight: 14,
    width: 36,
    textAlign: 'center',
  },
  mealText: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 2,
    lineHeight: 20,
  },
  mealNameSelected: {
    color: Colors.primary,
  },
  mealMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    marginLeft: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  skipText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
  },
});
