/**
 * Onboarding Screen 3 — Dietary (v2)
 *
 * NEW screen — fills the gap in the active flow that previously
 * collected zero dietary information. Uses the existing DietaryPillGrid
 * component which handles "No Restrictions" exclusivity.
 *
 * Writes: dietary_preferences_family
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import PrimaryButton from '@/components/PrimaryButton';
import OnboardingProgress from '@/components/OnboardingProgress';
import DietaryPillGrid from '@/components/DietaryPillGrid';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function DietaryScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyDietary } = useOnboarding();

  const [selected, setSelected] = useState<string[]>(data.dietary_preferences_family ?? []);

  const handleContinue = useCallback(() => {
    setFamilyDietary(selected);
    router.push('/onboarding/slots' as Href);
  }, [selected, setFamilyDietary]);

  return (
    <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Back"
          hitSlop={12}
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
        </Pressable>
        <OnboardingProgress total={4} current={2} />
        <Text style={styles.counter}>02 / 04</Text>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
      >
        <Text style={styles.title}>Anything to avoid?</Text>
        <Text style={styles.subtitle}>Tap all that apply.</Text>

        <View style={styles.gridWrap}>
          <DietaryPillGrid selected={selected} onSelectionChange={setSelected} />
        </View>
      </ScrollView>

      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton label="Continue" onPress={handleContinue} testID="dietary-continue-btn" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 2,
  },
  scroll: {
    paddingHorizontal: 24,
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
    color: Colors.textSecondary,
    marginBottom: 28,
  },
  gridWrap: {
    marginTop: 8,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
