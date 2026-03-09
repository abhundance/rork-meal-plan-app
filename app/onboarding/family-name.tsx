import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function FamilyNameScreen() {
  const insets = useSafeAreaInsets();
  const { data, setFamilyName, setStep } = useOnboarding();
  const [name, setName] = useState<string>(data.family_name);

  const handleContinue = () => {
    setFamilyName(name.trim());
    setStep(3);
    router.push('/onboarding/household-size' as Href);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ProgressBar current={2} total={11} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 2 of 11</Text>
        <Text style={styles.heading}>What's your family name?</Text>

        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. The Johnsons"
          placeholderTextColor={Colors.inactive}
          autoCapitalize="words"
          autoFocus
          testID="family-name-input"
        />

        <Text style={styles.helper}>
          This is how your family will appear across the app
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          disabled={!name.trim()}
          testID="continue-btn"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 32,
    lineHeight: 36,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 20,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
});
