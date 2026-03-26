/**
 * Onboarding Screen 4 — Feature Preview
 *
 * Shows the three core tabs (Plan / Recipes / Shopping) so users know what
 * they're about to unlock before they create their account.
 * This is the conversion moment — CTA leads directly to auth.
 *
 * Step 3 of 3.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

const FEATURES = [
  {
    emoji: '📅',
    title: 'Plan',
    description:
      'Build your week meal by meal. Drag, swap, repeat — your schedule, your way.',
    accentColor: '#E60023',
    bgColor: '#FDEBED',
  },
  {
    emoji: '🍳',
    title: 'Recipes',
    description:
      'One place for every meal you love. Save from YouTube, TikTok, your delivery app, or let AI Chef create something new.',
    accentColor: '#E67300',
    bgColor: '#FEF3E8',
  },
  {
    emoji: '🛒',
    title: 'Shopping',
    description:
      'Your grocery list writes itself — based on exactly what you\'ve planned for the week.',
    accentColor: '#2D7D46',
    bgColor: '#EAF5EE',
  },
];

export default function PreviewScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 16 }]}>

      {/* Progress — all 3 dots filled */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map(i => (
          <View
            key={i}
            style={[styles.progressDot, styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.stepLabel}>Step 3 of 3</Text>
        <Text style={styles.heading}>Here's what's waiting for you</Text>
        <Text style={styles.subheading}>
          Three tools that work together to make meal planning effortless.
        </Text>

        {/* Feature cards */}
        <View style={styles.cardList}>
          {FEATURES.map(feature => (
            <View key={feature.title} style={styles.card}>
              <View style={[styles.iconWrap, { backgroundColor: feature.bgColor }]}>
                <Text style={styles.cardEmoji}>{feature.emoji}</Text>
              </View>
              <View style={styles.cardBody}>
                <Text style={[styles.cardTitle, { color: feature.accentColor }]}>
                  {feature.title}
                </Text>
                <Text style={styles.cardDesc}>{feature.description}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Create my account"
          onPress={() => router.push('/onboarding/account' as Href)}
          testID="create-account-btn"
        />
        <Text style={styles.reassurance}>
          Free forever · Your data stays yours
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressDot: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressDotActive: {
    backgroundColor: Colors.primary,
  },

  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },

  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  cardList: {
    gap: 14,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 14,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardEmoji: {
    fontSize: 26,
  },
  cardBody: {
    flex: 1,
    paddingTop: 2,
  },
  cardTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 20,
  },

  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  reassurance: {
    textAlign: 'center',
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.inactive,
    marginTop: 10,
  },
});
