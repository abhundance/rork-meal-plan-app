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
import { useFavs } from '@/providers/FavsProvider';
import { Recipe } from '@/types';

const NOVELTY_MAP: Record<string, number> = {
  familiar:    10,
  balanced:    30,
  adventurous: 60,
};

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { data, completeOnboarding } = useOnboarding();
  const { updateFamilySettings, updateUserSettings } = useFamilySettings();
  const { addFav } = useFavs();

  const [isSeeding, setIsSeeding] = useState(false);

  const logoScale   = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
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

  const familyName = data.family_name || 'Your Family';
  const totalPicks = (data.starter_meals ?? []).length;

  const handleGetStarted = () => {
    if (isSeeding) return;
    setIsSeeding(true);

    // 1. Sync family settings from onboarding data
    updateFamilySettings({
      family_name:    data.family_name || 'My Family',
      region:         data.region ?? 'Singapore',
      measurement_units: data.measurement_units ?? 'metric',
      smart_fill_novelty_pct: NOVELTY_MAP[data.planning_style ?? 'balanced'] ?? 30,
      dietary_preferences_family: data.dietary_preferences_family,
    });

    // 2. Sync user settings from onboarding
    updateUserSettings({
      personal_goal: data.personal_goal ?? 'balanced',
      dietary_preferences_individual: data.dietary_preferences_individual,
    });

    // 3. Seed starter meals as Favs
    const picks = data.starter_meals ?? [];
    picks.forEach((pick) => {
      const recipe: Recipe = {
        id:                   `starter_${pick.id}`,
        name:                 pick.name,
        source:               'family_created',
        ingredients:          [],
        recipe_serving_size:  4,
        method_steps:         [],
        dietary_tags:         [],
        custom_tags:          [],
        add_to_plan_count:    0,
        created_at:           new Date().toISOString(),
        is_ingredient_complete: false,
        is_recipe_complete:     false,
        meal_type:            pick.meal_type,
        cuisine:              pick.cuisine,
        cook_time:            pick.cook_time_mins,
      };
      addFav(recipe);
    });

    // 4. Mark onboarding complete
    completeOnboarding();

    // 5. Navigate to main app
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

          {totalPicks > 0 && (
            <View style={styles.pillRow}>
              <View style={styles.pill}>
                <Text style={styles.pillText}>✅ {totalPicks} meal{totalPicks !== 1 ? 's' : ''} added to Favs</Text>
              </View>
            </View>
          )}

          <View style={styles.summaryCard}>
            {data.region ? (
              <Text style={styles.summaryLine}>📍 {data.region} · {data.measurement_units === 'imperial' ? 'Imperial' : 'Metric'}</Text>
            ) : null}
            {data.planning_style ? (
              <Text style={styles.summaryLine}>
                🎯 {data.planning_style === 'familiar' ? 'Familiar meals' : data.planning_style === 'adventurous' ? 'Adventurous picks' : 'Balanced mix'}
              </Text>
            ) : null}
            {data.personal_goal && data.personal_goal !== 'balanced' ? (
              <Text style={styles.summaryLine}>💪 Goal: {data.personal_goal.replace(/_/g, ' ')}</Text>
            ) : null}
          </View>
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
    fontWeight: '800' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    marginBottom: 24,
  },
  pillRow: {
    marginBottom: 20,
  },
  pill: {
    backgroundColor: '#E6F9F0',
    borderRadius: BorderRadius.pill,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pillText: {
    fontSize: 14,
    color: '#1A7A4A',
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
    fontWeight: '500' as const,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
