import React, { useRef, useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useRecipes } from '@/providers/RecipesProvider';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { Recipe, MealSlot } from '@/types';
import { resolveGoal } from '@/utils/goalUtils';

const NOVELTY_MAP: Record<string, number> = {
  familiar:    10,
  balanced:    30,
  adventurous: 60,
};

// The 4 available slot definitions with their display names
const SLOT_DEFINITIONS: MealSlot[] = [
  { slot_id: 'breakfast', name: 'Breakfast', order: 0 },
  { slot_id: 'lunch',     name: 'Lunch',     order: 1 },
  { slot_id: 'dinner',    name: 'Dinner',    order: 2 },
  { slot_id: 'snacks',    name: 'Snacks',    order: 3 },
];

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, completeOnboarding } = useOnboarding();
  const { updateFamilySettings, updateUserSettings } = useFamilySettings();
  const { addRecipe } = useRecipes();
  const { session } = useAuth();

  const [isSeeding, setIsSeeding] = useState(false);

  const logoScale    = useRef(new Animated.Value(0.3)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const textOpacity  = useRef(new Animated.Value(0)).current;
  const textTranslate = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 8,
          bounciness: 12,
        }),
        Animated.timing(logoOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(textOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.spring(textTranslate, {
          toValue: 0,
          useNativeDriver: true,
          speed: 10,
          bounciness: 6,
        }),
      ]),
    ]).start();
  }, [logoScale, logoOpacity, textOpacity, textTranslate]);

  const familyName  = data.family_name || 'Your Family';
  const totalPicks  = (data.starter_meals ?? []).length;

  // Summary items (only render card if at least one exists)
  const summaryItems = [
    data.region
      ? `📍 ${data.region} · ${data.measurement_units === 'imperial' ? 'Imperial' : 'Metric'}`
      : null,
    data.planning_style
      ? `🎯 ${data.planning_style === 'familiar' ? 'Familiar meals' : data.planning_style === 'adventurous' ? 'Adventurous picks' : 'Balanced mix'}`
      : null,
    (data.health_goals ?? []).length > 0
      ? `💪 ${data.health_goals!.map(g => g.replace(/_/g, ' ')).join(' · ')}`
      : null,
  ].filter(Boolean) as string[];

  const handleGetStarted = () => {
    if (isSeeding) return;
    setIsSeeding(true);

    // FIX 1: Build meal_slots from enabled_slots so the weekly planner reflects
    // what the user configured in configure-slots.tsx
    const enabledSlotIds = data.enabled_slots ?? ['breakfast', 'lunch', 'dinner'];
    const mealSlots: MealSlot[] = SLOT_DEFINITIONS
      .filter(slot => enabledSlotIds.includes(slot.slot_id))
      .map((slot, idx) => ({ ...slot, order: idx }));

    // Resolve a single PersonalGoal from health_goals + diet_preferences for the
    // recommendation engine and Smart Fill (which need a single scalar goal).
    const derivedPersonalGoal = resolveGoal(
      data.health_goals,
      data.diet_preferences,
    );

    // Sync all onboarding data → FamilySettings (AsyncStorage + Supabase via provider)
    updateFamilySettings({
      family_name:                data.family_name || 'My Family',
      region:                     data.region ?? 'Singapore',
      measurement_units:          data.measurement_units ?? 'metric',
      smart_fill_novelty_pct:     NOVELTY_MAP[data.planning_style ?? 'balanced'] ?? 30,
      dietary_preferences_family: data.dietary_preferences_family,
      meal_slots:                 mealSlots,
      default_serving_size:       data.household_size ?? 4,
      // Dietary constraint fields — these power Smart Fill eligibility filters
      // and the recommendation engine's hard dietary gates.
      cultural_restrictions:      data.cultural_restrictions ?? [],
      intolerances:               data.intolerances ?? [],
      diet_preferences:           data.diet_preferences ?? [],
      household_type:             data.household_type,
      // Cuisine / time prefs — used as cold-start seed for the recommendation
      // engine before the user has any meal history (Day 1).
      cuisine_preferences:        data.cuisine_preferences ?? [],
      cooking_time_pref:          data.cooking_time_pref,
    });

    // Sync user settings — health_goals is the canonical field.
    // resolveGoal() derives the single PersonalGoal for the engine at read-time.
    updateUserSettings({
      dietary_preferences_individual: data.dietary_preferences_individual,
      health_goals:                   data.health_goals ?? [],
    });

    // Mark onboarding as completed in Supabase (for multi-device support).
    // The local OnboardingProvider handles the in-app flag; this writes the
    // server-side flag so the families row reflects completion status.
    const userId = session?.user?.id;
    if (userId) {
      getSupabase()
        .from('families')
        .update({ onboarding_completed: true, onboarding_step: 99 })
        .eq('id', userId)
        .then(({ error }) => {
          if (error) console.warn('[Welcome] onboarding_completed sync error:', error.message);
        });
    }

    // Seed starter meals as Recipes — use real Supabase UUID and source='family_created'.
    const picks = data.starter_meals ?? [];
    picks.forEach((pick) => {
      const recipe: Recipe = {
        id:                     pick.id,          // real Supabase UUID
        name:                   pick.name,
        source:                 'family_created',
        image_url:              pick.image_url,
        cuisine:                pick.cuisine,
        cook_time:              pick.cook_time,
        ingredients:            [],
        recipe_serving_size:    data.household_size ?? 4,
        method_steps:           [],
        dietary_tags:           [],
        custom_tags:            [],
        add_to_plan_count:      0,
        created_at:             new Date().toISOString(),
        is_ingredient_complete: false,
        is_recipe_complete:     false,
        meal_type:              pick.meal_type,
      };
      addRecipe(recipe);
    });

    // Mark complete THEN navigate so the completed flag is in state before
    // the home screen's onboarding check runs
    completeOnboarding();
    router.replace('/(tabs)' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <View style={styles.logoCircle}>
            <UtensilsCrossed size={48} color={Colors.primary} strokeWidth={2} />
          </View>
        </Animated.View>

        <Animated.View style={[styles.textBlock, { opacity: textOpacity, transform: [{ translateY: textTranslate }] }]}>
          <Text style={styles.allSet}>🎉 You're all set!</Text>
          <Text style={styles.familyName}>Welcome, {familyName}</Text>
          <Text style={styles.subtitle}>Your personalised meal planner is ready.</Text>

          {/* FIX 3: Show picks count with accurate copy — "ready to add" not "added" */}
          {totalPicks > 0 && (
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>
                  🍽️ {totalPicks} meal{totalPicks !== 1 ? 's' : ''} ready to add to Recipes
                </Text>
              </View>
            </View>
          )}

          {/* FIX 4: Only render summary card if there's at least one item */}
          {summaryItems.length > 0 && (
            <View style={styles.summaryCard}>
              {summaryItems.map((line) => (
                <Text key={line} style={styles.summaryLine}>{line}</Text>
              ))}
            </View>
          )}
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <PrimaryButton
          label="Let's start planning"
          onPress={handleGetStarted}
          disabled={isSeeding}
          testID="get-started-btn"
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  logoWrap: {
    marginBottom: 32,
  },
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 32,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    alignItems: 'center',
    width: '100%',
  },
  allSet: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  familyName: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    marginBottom: 24,
  },
  pillRow: {
    marginBottom: 20,
  },
  pill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillText: {
    fontSize: 14,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
  },
  summaryCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    width: '100%',
    gap: 8,
  },
  summaryLine: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
