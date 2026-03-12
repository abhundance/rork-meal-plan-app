import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal,
  TextInput, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed, Mail, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

// Beautiful food photography from Unsplash — cycles with crossfade every 4.5 s
const BG_IMAGES = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1080&q=85',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1080&q=85',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=1080&q=85',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1080&q=85',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1080&q=85',
];

const SLIDE_INTERVAL_MS = 4500;
const CROSSFADE_MS = 1500;

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { setStep } = useOnboarding();

  const [imageIdx, setImageIdx]             = useState(0);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [email, setEmail]                   = useState('');
  const [password, setPassword]             = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError]                   = useState('');

  // Pre-load the next image so the crossfade is seamless
  useEffect(() => {
    const timer = setInterval(() => {
      setImageIdx(i => (i + 1) % BG_IMAGES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, []);

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
    <View style={styles.container}>

      {/* ── Cinematic background ── */}
      <Image
        source={{ uri: BG_IMAGES[imageIdx] }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        transition={CROSSFADE_MS}
        recyclingKey="auth-bg"
      />

      {/* ── Gradient overlay: light at top, dark at bottom ── */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0.08)',
          'rgba(0,0,0,0.25)',
          'rgba(0,0,0,0.72)',
          'rgba(0,0,0,0.90)',
        ]}
        locations={[0, 0.3, 0.7, 1]}
        style={StyleSheet.absoluteFill}
      />

      {/* ── Logo — top-centre, floating over the image ── */}
      <View style={[styles.logoWrap, { top: insets.top + 44 }]}>
        <View style={styles.logoCircle}>
          <UtensilsCrossed size={26} color="#FFFFFF" strokeWidth={2.5} />
        </View>
      </View>

      {/* ── Bottom content ── */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 28 }]}>

        <View style={styles.headline}>
          <Text style={styles.appName}>Meal Plan</Text>
          <Text style={styles.tagline}>Dinner on the table.{'\n'}Every single week.</Text>
        </View>

        <View style={styles.authButtons}>
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
          <TouchableOpacity
            style={styles.emailLink}
            onPress={() => setShowEmailModal(true)}
            testID="auth-email"
          >
            <Mail size={14} color="rgba(255,255,255,0.65)" strokeWidth={2} />
            <Text style={styles.emailLinkText}>Sign up with Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>

      {/* ── Email sign-up modal ── */}
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
    backgroundColor: '#111111', // dark fallback while images load
  },

  // Logo
  logoWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  logoCircle: {
    width: 60,
    height: 60,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle white glow so it reads on any image
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },

  // Bottom content block
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 20,
  },
  headline: {
    gap: 8,
  },
  appName: {
    fontSize: 42,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -1.2,
    lineHeight: 46,
  },
  tagline: {
    fontSize: 17,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.72)',
    lineHeight: 25,
  },

  // Auth buttons
  authButtons: {
    gap: 0,
  },
  emailLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 14,
    marginTop: 4,
  },
  emailLinkText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
  },

  // Terms
  terms: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.38)',
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: 'rgba(255,255,255,0.55)',
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
