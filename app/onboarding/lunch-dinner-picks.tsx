import React, { useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Check } from 'lucide-react-native';

import OnboardingHeader from '@/components/OnboardingHeader';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useOnboardingMeals } from '@/hooks/useOnboardingMeals';

export default function LunchDinnerPicksScreen() {
  const insets = useSafeAreaInsets();
  const { data, addStarterMeal, setStep } = useOnboarding();
  const selectedIds = new Set((data.starter_meals ?? []).map(m => m.id));

  const { meals, loading, error } = useOnboardingMeals('lunch_dinner', {
    cultural: data.cultural_restrictions ?? [],
    intolerances: data.intolerances ?? [],
    cuisinePrefs: data.cuisine_preferences ?? [],
  });

  const selectedCount = useMemo(
    () => meals.filter(m => selectedIds.has(m.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [meals, data.starter_meals],
  );

  const navigateNext = () => {
    setStep(14);
    router.push('/onboarding/welcome' as Href);
  };

  const FOOTER_HEIGHT = insets.bottom + 120;

  return (
    <View style={styles.container}>
      <OnboardingHeader current={14} total={14} />

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.listContent, { paddingBottom: FOOTER_HEIGHT }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={styles.stepLabel}>Step 14 of 14</Text>
            <Text style={styles.heading}>Pick some lunch & dinner favourites</Text>
            <Text style={styles.subheading}>
              These get added to your Recipes so Smart Fill has meals to work with from day one.
            </Text>
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={Colors.primary} />
            </View>
          ) : error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : null
        }
        renderItem={({ item: meal }) => {
          const isSelected = selectedIds.has(meal.id);
          return (
            <TouchableOpacity
              style={[styles.mealRow, isSelected && styles.mealRowSelected]}
              onPress={() => addStarterMeal(meal)}
              activeOpacity={0.7}
            >
              {meal.image_url ? (
                <Image
                  source={{ uri: meal.image_url }}
                  style={styles.mealThumb}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.mealInitials}>
                  <Text style={styles.mealInitialsText}>
                    {meal.name.split(' ').slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.mealText}>
                <Text style={[styles.mealName, isSelected && styles.mealNameSelected]}>
                  {meal.name}
                </Text>
                <Text style={styles.mealMeta}>{meal.cuisine} · ~{meal.cook_time} min</Text>
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
          label={selectedCount > 0 ? `Continue (${selectedCount} selected)` : 'Continue'}
          onPress={navigateNext}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={navigateNext} testID="skip-btn">
          <Text style={styles.skipText}>I'll add meals later</Text>
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
  loadingWrap: {
    paddingTop: 60,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
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
  mealThumb: {
    width: 44,
    height: 44,
    borderRadius: 8,
    marginRight: 14,
  },
  mealInitials: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  mealInitialsText: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.primary,
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
