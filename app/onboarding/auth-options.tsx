/**
 * Auth options screen — sign-up / sign-in methods
 *
 * Presented as a modal slide-up over the cover screen so the food grid
 * remains visible as context. Pure white, no photography competing for
 * attention — just three clear auth paths and the brand mark.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Mail, X, UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function AuthOptionsScreen() {
  const insets = useSafeAreaInsets();
  const { setStep } = useOnboarding();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');

  const handleSocialAuth = useCallback((_provider: string) => {
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [setStep]);

  const handleEmailSignup = useCallback(() => {
    setError('');
    if (!email.trim()) { setError('Please enter your email'); return; }
    if (!password || password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    setShowEmailModal(false);
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [email, password, confirmPassword, setStep]);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>

      {/* Drag handle — indicates this is a bottom sheet */}
      <View style={styles.handle} />

      {/* Brand mark */}
      <View style={styles.brandRow}>
        <View style={styles.logoMark}>
          <UtensilsCrossed size={16} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.brandName}>Meal Plan</Text>
      </View>

      {/* Heading */}
      <Text style={styles.heading}>Create your account</Text>
      <Text style={styles.subheading}>
        Join to start planning meals you'll actually make.
      </Text>

      {/* Auth options */}
      <View style={styles.authStack}>
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
          style={{ marginTop: 10 }}
        />

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerLabel}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.emailButton}
          onPress={() => setShowEmailModal(true)}
          testID="auth-email"
          activeOpacity={0.7}
        >
          <Mail size={16} color={Colors.text} strokeWidth={2} />
          <Text style={styles.emailButtonText}>Sign up with Email</Text>
        </TouchableOpacity>
      </View>

      {/* Terms */}
      <Text style={styles.terms}>
        By continuing you agree to our{' '}
        <Text style={styles.termsLink}>Terms of Service</Text>
        {' '}and{' '}
        <Text style={styles.termsLink}>Privacy Policy</Text>
      </Text>

      {/* Email sign-up modal */}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingHorizontal: 24,
    paddingTop: 12,
  },

  // Drag handle
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 24,
  },

  // Brand row
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  logoMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.2,
  },

  // Heading
  heading: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  subheading: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 28,
  },

  // Auth stack
  authStack: {
    gap: 0,
    flex: 1,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerLabel: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Email button
  emailButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.white,
  },
  emailButtonText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },

  // Terms
  terms: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.inactive,
    textAlign: 'center',
    lineHeight: 16,
    paddingTop: 12,
  },
  termsLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // Email modal
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
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
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
    fontWeight: '600',
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
