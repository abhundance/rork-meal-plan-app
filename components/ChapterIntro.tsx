/**
 * ChapterIntro
 *
 * Full-screen cinematic interstitial shown between onboarding chapters.
 * Displays a full-bleed food photo with a dark gradient, a chapter progress
 * indicator, a large headline, and a single CTA to advance.
 *
 * Usage: wrap in a thin screen file and pass the relevant props.
 */
import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

export interface ChapterIntroProps {
  /** 1-based chapter index shown to the user (e.g. 2 for "Chapter 2 of 4") */
  chapterNumber: number;
  totalChapters: number;
  /** Direct Unsplash / CDN image URI */
  imageUri: string;
  /** Large emoji displayed above the headline */
  icon: string;
  /** Main headline — keep to ~3 words */
  title: string;
  /** One-line supporting text */
  subtitle: string;
  /** Label for the CTA button */
  ctaLabel?: string;
  onContinue: () => void;
}

export default function ChapterIntro({
  chapterNumber,
  totalChapters,
  imageUri,
  icon,
  title,
  subtitle,
  ctaLabel = 'Continue',
  onContinue,
}: ChapterIntroProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>

      {/* ── Full-bleed background image ── */}
      <Image
        source={{ uri: imageUri }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={600}
      />

      {/* ── Gradient: almost transparent at top, deep dark at bottom ── */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.0)',
          'rgba(0,0,0,0.15)',
          'rgba(0,0,0,0.65)',
          'rgba(0,0,0,0.92)',
        ]}
        locations={[0, 0.25, 0.6, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Chapter progress indicator — top-centre ── */}
      <View style={[styles.topBar, { paddingTop: insets.top + 20 }]}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalChapters }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                i + 1 === chapterNumber
                  ? styles.progressActive
                  : i + 1 < chapterNumber
                  ? styles.progressDone
                  : styles.progressFuture,
              ]}
            />
          ))}
        </View>
      </View>

      {/* ── Bottom content ── */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 28 }]}>

        {/* Emoji icon */}
        <Text style={styles.icon}>{icon}</Text>

        {/* Chapter label */}
        <Text style={styles.chapterLabel}>
          CHAPTER {chapterNumber} OF {totalChapters}
        </Text>

        {/* Headline */}
        <Text style={styles.title}>{title}</Text>

        {/* Subtitle */}
        <Text style={styles.subtitle}>{subtitle}</Text>

        {/* CTA */}
        <PrimaryButton
          label={ctaLabel}
          onPress={onContinue}
          style={styles.cta}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111111',
  },

  // Top progress bar
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  progressSegment: {
    height: 4,
    borderRadius: 2,
  },
  progressActive: {
    width: 28,
    backgroundColor: '#FFFFFF',
  },
  progressDone: {
    width: 28,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  progressFuture: {
    width: 10,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },

  // Bottom content
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  chapterLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 2,
    marginBottom: 12,
  },
  title: {
    fontSize: 38,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1,
    lineHeight: 44,
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.68)',
    lineHeight: 24,
    marginBottom: 32,
  },
  cta: {
    borderRadius: BorderRadius.button,
  },
});
