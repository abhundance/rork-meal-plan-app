import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed, Mail, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { setStep } = useOnboarding();
  const [showEmailModal, setShowEmailModal] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSocialAuth = useCallback((provider: string) => {
    console.log('[Auth] Social auth with:', provider);
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [setStep]);

  const handleEmailSignup = useCallback(() => {
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    console.log('[Auth] Email signup:', email);
    setShowEmailModal(false);
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [email, password, confirmPassword, setStep]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <UtensilsCrossed size={40} color={Colors.primary} strokeWidth={2} />
          </View>
        </View>
        <Text style={styles.appName}>Meal Plan</Text>
        <Text style={styles.tagline}>Simple family meal planning</Text>
      </View>

      <View style={styles.authSection}>
        <PrimaryButton
          label="Continue with Google"
          onPress={() => handleSocialAuth('google')}
          testID="auth-google"
        />

        <PrimaryButton
          label="Continue with Apple"
          onPress={() => handleSocialAuth('apple')}
          variant="secondary"
          testID="auth-apple"
          style={{ marginTop: 12 }}
        />

        <TouchableOpacity
          style={styles.emailLink}
          onPress={() => setShowEmailModal(true)}
          testID="auth-email"
        >
          <Mail size={16} color={Colors.primary} strokeWidth={2} />
          <Text style={styles.emailLinkText}>Sign up with Email</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.terms}>
        By continuing, you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>

      <Modal
        visible={showEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Account</Text>
            <TouchableOpacity
              onPress={() => setShowEmailModal(false)}
              style={styles.closeButton}
            >
              <X size={20} color={Colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={Colors.inactive}
              keyboardType="email-address"
              autoCapitalize="none"
              testID="email-input"
            />

            <Text style={styles.inputLabel}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              placeholderTextColor={Colors.inactive}
              secureTextEntry
              testID="password-input"
            />

            <Text style={styles.inputLabel}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter your password"
              placeholderTextColor={Colors.inactive}
              secureTextEntry
              testID="confirm-password-input"
            />

            <PrimaryButton
              label="Create Account"
              onPress={handleEmailSignup}
              style={{ marginTop: 24 }}
              testID="create-account"
            />
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  heroSection: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logoContainer: {
    marginBottom: 20,
  },
  logoCircle: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 17,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  authSection: {
    paddingBottom: 24,
  },
  emailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    marginTop: 8,
  },
  emailLinkText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  terms: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    paddingBottom: 8,
  },
  termsLink: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flex: 1,
    padding: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 6,
    marginTop: 16,
  },
  input: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: Colors.text,
  },
  errorText: {
    fontSize: 14,
    color: Colors.danger,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.input,
    overflow: 'hidden',
    marginBottom: 4,
  },
});
