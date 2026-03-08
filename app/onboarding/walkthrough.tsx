import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { CalendarDays, ShoppingBasket, Heart, Sparkles } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface WalkthroughStep {
  icon: React.ReactNode;
  tabName: string;
  description: string;
}

const STEPS: WalkthroughStep[] = [
  {
    icon: <CalendarDays size={44} color={Colors.primary} strokeWidth={1.8} />,
    tabName: 'Meal Plan',
    description: "Plan your family's meals day by day — all in one shared place",
  },
  {
    icon: <ShoppingBasket size={44} color={Colors.primary} strokeWidth={1.8} />,
    tabName: 'Shopping',
    description: 'Your shopping list builds itself automatically from your meal plan',
  },
  {
    icon: <Heart size={44} color={Colors.primary} strokeWidth={1.8} />,
    tabName: 'Favs',
    description: 'Save the meals your family loves and build your recipe collection',
  },
  {
    icon: <Sparkles size={44} color={Colors.primary} strokeWidth={1.8} />,
    tabName: 'Discover',
    description: "Find fresh meal inspiration curated for your family's taste",
  },
];

export default function WalkthroughScreen() {
  const insets = useSafeAreaInsets();
  const { data, completeOnboarding } = useOnboarding();
  const { updateFamilySettings, updateUserSettings } = useFamilySettings();
  const [currentStep, setCurrentStep] = useState<number>(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const finishOnboarding = useCallback(() => {
    console.log('[Walkthrough] Finishing onboarding, saving data...');
    updateFamilySettings({
      family_name: data.family_name,
      default_serving_size: data.household_size,
      meal_slots: data.meal_slots,
      dietary_preferences_family: data.dietary_preferences_family,
    });
    updateUserSettings({
      dietary_preferences_individual: data.dietary_preferences_individual,
      is_admin: true,
    });
    completeOnboarding();
    router.replace('/(tabs)/(home)' as Href);
  }, [data, updateFamilySettings, updateUserSettings, completeOnboarding]);

  const animateTransition = useCallback((nextStep: number) => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(nextStep);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 6 }),
      ]).start();
    });
  }, [fadeAnim, slideAnim]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      animateTransition(currentStep + 1);
    } else {
      finishOnboarding();
    }
  }, [currentStep, animateTransition, finishOnboarding]);

  const step = STEPS[currentStep];

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
      <TouchableOpacity style={styles.skipContainer} onPress={finishOnboarding} testID="skip-tour">
        <Text style={styles.skipText}>Skip Tour</Text>
      </TouchableOpacity>

      <View style={styles.contentArea}>
        <Animated.View
          style={[
            styles.cardContent,
            { opacity: fadeAnim, transform: [{ translateX: slideAnim }] },
          ]}
        >
          <View style={styles.spotlightGlow}>
            <View style={styles.iconCircle}>
              {step.icon}
            </View>
          </View>

          <Text style={styles.tabName}>{step.tabName}</Text>
          <Text style={styles.description}>{step.description}</Text>
        </Animated.View>
      </View>

      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === currentStep && styles.dotActive]}
            />
          ))}
        </View>

        <PrimaryButton
          label={currentStep < STEPS.length - 1 ? 'Next' : 'Get Started'}
          onPress={handleNext}
          testID="walkthrough-next"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
  },
  skipContainer: {
    alignSelf: 'flex-end',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  contentArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContent: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  spotlightGlow: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    shadowColor: Colors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 30,
    elevation: 8,
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabName: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 17,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 26,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    maxWidth: SCREEN_WIDTH * 0.75,
  },
  bottomArea: {
    gap: 20,
    paddingBottom: 8,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.surface,
  },
  dotActive: {
    backgroundColor: Colors.primary,
    width: 24,
  },
});
