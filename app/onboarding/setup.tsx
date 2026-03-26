/**
 * Onboarding Screen 2 — Family Name
 *
 * One question. Optional. Sets the household name that personalises the app.
 * Step 1 of 5.
 */
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

const TOTAL_STEPS = 5;

export default function SetupScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyName } = useOnboarding();

  const [name, setName] = useState<string>(data.family_name ?? '');
  const inputRef = useRef<TextInput>(null);

  const handleContinue = () => {
    setFamilyName(name.trim());
    router.push('/onboarding/setup-size' as Href);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Progress */}
      <View style={styles.progressRow}>
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <View key={i} style={[styles.progressSeg, i === 0 && styles.progressSegActive]} />
        ))}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 1 of {TOTAL_STEPS}</Text>
        <Text style={styles.heading}>What do you call{'\n'}your household?</Text>
        <Text style={styles.subheading}>
          Optional — shows up throughout the app to make it feel like yours.
        </Text>

        <TextInput
          ref={inputRef}
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Johnsons, My Kitchen, Casa Garcia"
          placeholderTextColor={Colors.inactive}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleContinue}
          testID="family-name-input"
        />
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="setup-continue"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 24,
    marginBottom: 8,
  },
  progressSeg: {
    height: 4,
    flex: 1,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  progressSegActive: {
    backgroundColor: Colors.primary,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heading: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.6,
    lineHeight: 40,
    marginBottom: 10,
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 36,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 17,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
