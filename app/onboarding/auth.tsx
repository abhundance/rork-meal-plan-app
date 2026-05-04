/**
 * Onboarding Screen 1 — Hero (v2)
 *
 * Edge-to-edge food photograph (top), with a tightly grouped title /
 * subtitle / CTA section below. Anonymous auth has already fired in
 * AuthProvider on app launch — this screen does NOT authenticate.
 *
 * Navigates to /onboarding/family (Stage 10 cutover complete).
 */
import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import PrimaryButton from '@/components/PrimaryButton';

const { height: SCREEN_H } = Dimensions.get('window');

// Image fills 62% of the screen, bleeding top + sides. Bottom edge has
// a 24px rounded corner so it reads as a confident "card cut-out".
const IMAGE_HEIGHT = Math.round(SCREEN_H * 0.62);
const HERO_PHOTO =
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&auto=format&fit=crop';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* ── Edge-to-edge hero image ──────────────────────────────────── */}
      <Image
        source={{ uri: HERO_PHOTO }}
        style={[styles.hero, { height: IMAGE_HEIGHT }]}
        contentFit="cover"
        transition={200}
      />

      {/* ── Bottom section: title + subtitle + CTA grouped tight ─────── */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.textBlock}>
          <Text style={styles.title}>
            Plan dinner.{'\n'}Effortlessly.
          </Text>
          <Text style={styles.subtitle}>Your week, sorted in minutes.</Text>
        </View>
        <PrimaryButton
          label="Let's plan your week"
          onPress={() => router.push('/onboarding/family' as Href)}
          testID="lets-go-btn"
        />
        <View style={styles.afterCta} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  hero: {
    width: '100%',
    backgroundColor: '#1a1410', // dark fallback while photo loads
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  bottom: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'flex-start',
  },
  textBlock: {
    marginBottom: 24,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1,
    color: Colors.text,
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
  },
  afterCta: {
    flex: 1,
  },
});
