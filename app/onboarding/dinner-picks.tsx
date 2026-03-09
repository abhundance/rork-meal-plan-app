import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { StarterMealPick } from '@/types';

const DINNER_MEALS: StarterMealPick[] = [
  { id: 'd1', name: 'Butter Chicken',                 emoji: '🍗', meal_type: 'lunch_dinner', cuisine: 'Indian',      cook_time_mins: 40 },
  { id: 'd2', name: 'Stir-Fried Vegetables & Rice',   emoji: '🥦', meal_type: 'lunch_dinner', cuisine: 'Chinese',     cook_time_mins: 20 },
  { id: 'd3', name: 'Grilled Salmon',                  emoji: '🐟', meal_type: 'lunch_dinner', cuisine: 'American',   cook_time_mins: 20 },
  { id: 'd4', name: 'Ramen',                           emoji: '🍜', meal_type: 'lunch_dinner', cuisine: 'Japanese',   cook_time_mins: 35 },
  { id: 'd5', name: 'Homemade Pizza',                  emoji: '🍕', meal_type: 'lunch_dinner', cuisine: 'Italian',    cook_time_mins: 45 },
  { id: 'd6', name: 'Beef Rendang',                    emoji: '🥩', meal_type: 'lunch_dinner', cuisine: 'Malaysian',  cook_time_mins: 90 },
  { id: 'd7', name: 'Fried Rice',                      emoji: '🍚', meal_type: 'lunch_dinner', cuisine: 'Chinese',    cook_time_mins: 20 },
  { id: 'd8', name: 'Spaghetti Bolognese',             emoji: '🍝', meal_type: 'lunch_dinner', cuisine: 'Italian',    cook_time_mins: 40 },
  { id: 'd9', name: 'Chicken Curry',                   emoji: '🍛', meal_type: 'lunch_dinner', cuisine: 'Indian',     cook_time_mins: 45 },
];

export default function DinnerPicksScreen() {
  const insets = useSafeAreaInsets();
  const { data, addStarterMeal } = useOnboarding();
  const selectedIds = new Set((data.starter_meals ?? []).map(m => m.id));

  const handleContinue = () => {
    router.push('/onboarding/welcome' as Href);
  };

  const handleSkip = () => {
    router.push('/onboarding/welcome' as Href);
  };

  const dinnerSelectedCount = [...selectedIds].filter(id => id.startsWith('d')).length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={11} total={11} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 140 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Almost done!</Text>
        <Text style={styles.heading}>Pick some dinner favourites</Text>
        <Text style={styles.subheading}>
          These get added straight to your Favs so Smart Fill has meals to work with from day one.
        </Text>

        <View style={styles.mealList}>
          {DINNER_MEALS.map((meal) => {
            const isSelected = selectedIds.has(meal.id);
            return (
              <TouchableOpacity
                key={meal.id}
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
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label={dinnerSelectedCount > 0 ? `Continue (${dinnerSelectedCount} selected)` : 'Continue'}
          onPress={handleContinue}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-btn">
          <Text style={styles.skipText}>Skip dinner</Text>
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
  mealList: {
    gap: 10,
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
  checkmark: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
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
