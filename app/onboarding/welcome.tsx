import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function WelcomeScreen() {
  const insets = useSafeAreaInsets();
  const { data } = useOnboarding();
  const logoScale = useRef(new Animated.Value(0.3)).current;
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

    const timer = setTimeout(() => {
      router.replace('/onboarding/walkthrough' as Href);
    }, 2500);

    return () => clearTimeout(timer);
  }, [logoScale, logoOpacity, textOpacity, textTranslate]);

  const familyName = data.family_name || 'Your Family';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.center}>
        <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }], opacity: logoOpacity }]}>
          <View style={styles.logoCircle}>
            <UtensilsCrossed size={48} color={Colors.primary} strokeWidth={2} />
          </View>
        </Animated.View>

        <Animated.View style={{ opacity: textOpacity, transform: [{ translateY: textTranslate }] }}>
          <Text style={styles.heading}>Welcome to Meal Plan,</Text>
          <Text style={styles.familyName}>{familyName}</Text>
          <Text style={styles.subtitle}>Your family meal planning starts here</Text>
        </Animated.View>
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
  heading: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 34,
  },
  familyName: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '800' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
});
