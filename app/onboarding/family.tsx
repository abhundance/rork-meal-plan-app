/**
 * Onboarding Screen 2 — Family (v2)
 *
 * Combines family name + adults + kids steppers + age range chips
 * (revealed when kids >= 1). Replaces the old setup.tsx + setup-size.tsx
 * pair into a single moment.
 *
 * Writes: family_name, household_adults, household_kids, kids_ages
 * (household_size auto-syncs in the provider as adults + kids).
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import InputField from '@/components/InputField';
import ServingStepper from '@/components/ServingStepper';
import OnboardingProgress from '@/components/OnboardingProgress';
import { useOnboarding } from '@/providers/OnboardingProvider';

const AGE_RANGES = [
  { id: 'under_2', label: 'Under 2' },
  { id: '3_5',     label: '3–5' },
  { id: '6_10',    label: '6–10' },
  { id: '11_15',   label: '11–15' },
  { id: '16_plus', label: '16+' },
] as const;

export default function FamilyScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyName, setHouseholdAdults, setHouseholdKids, setKidsAges } = useOnboarding();

  const [name, setName] = useState<string>(data.family_name ?? '');
  const [adults, setAdults] = useState<number>(data.household_adults ?? 2);
  const [kids, setKids] = useState<number>(data.household_kids ?? 0);
  const [ages, setAges] = useState<Set<string>>(new Set(data.kids_ages ?? []));

  const toggleAge = useCallback((id: string) => {
    Haptics.selectionAsync();
    setAges(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleContinue = useCallback(() => {
    setFamilyName(name.trim());
    setHouseholdAdults(adults);
    setHouseholdKids(kids);
    setKidsAges(Array.from(ages));
    router.push('/onboarding/dietary' as Href);
  }, [name, adults, kids, ages, setFamilyName, setHouseholdAdults, setHouseholdKids, setKidsAges]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <View style={[styles.root, { paddingTop: insets.top + 12 }]}>
          {/* ── Top bar: back · dots · counter ─────────────────────────── */}
          <View style={styles.topBar}>
            <Pressable
              accessibilityLabel="Back"
              hitSlop={12}
              onPress={() => router.back()}
              style={styles.backBtn}
            >
              <ChevronLeft size={22} color={Colors.text} strokeWidth={2.5} />
            </Pressable>
            <OnboardingProgress total={4} current={1} />
            <Text style={styles.counter}>01 / 04</Text>
          </View>

          <ScrollView
            contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Who&apos;s eating?</Text>
            <Text style={styles.subtitle}>We&apos;ll size every recipe to fit.</Text>

            {/* ── Family name (optional) ────────────────────────────────── */}
            <InputField
              label="Family name (optional)"
              value={name}
              onChangeText={setName}
              placeholder="e.g. The Smiths"
              testID="family-name-input"
            />

            {/* ── Adults stepper ────────────────────────────────────────── */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Adults</Text>
              <ServingStepper value={adults} min={1} max={10} onValueChange={setAdults} compact />
            </View>

            {/* ── Kids stepper ──────────────────────────────────────────── */}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Kids</Text>
              <ServingStepper value={kids} min={0} max={10} onValueChange={setKids} compact />
            </View>

            {/* ── Age chips (revealed when kids >= 1) ───────────────────── */}
            {kids > 0 && (
              <View style={styles.chipsBlock}>
                <Text style={styles.chipsLabel}>Ages</Text>
                <View style={styles.chipsRow}>
                  {AGE_RANGES.map(range => {
                    const active = ages.has(range.id);
                    return (
                      <Pressable
                        key={range.id}
                        onPress={() => toggleAge(range.id)}
                        style={[styles.chip, active && styles.chipActive]}
                      >
                        <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>
                          {range.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>

          <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 16 }]}>
            <PrimaryButton label="Continue" onPress={handleContinue} testID="family-continue-btn" />
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  rowLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 17,
    color: Colors.text,
  },
  chipsBlock: {
    marginTop: 20,
  },
  chipsLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.text,
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    color: Colors.text,
  },
  chipLabelActive: {
    color: Colors.primary,
  },
  ctaWrap: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
