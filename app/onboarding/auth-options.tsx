/**
 * Auth options screen — sign-up / sign-in methods
 *
 * Presented as a modal slide-up over the cover screen.
 *
 * Auth flow: Email OTP (6-digit code, no deep-link required)
 *   Step 1 — Enter email → signInWithOtp() → Supabase sends 6-digit code
 *   Step 2 — Enter code  → verifyOtp()    → session created → navigate
 */
import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Mail, ArrowLeft, UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useAuth } from '@/providers/AuthProvider';
import { useOnboarding } from '@/providers/OnboardingProvider';

// ── Screen ────────────────────────────────────────────────────────────────────

export default function AuthOptionsScreen() {
  const insets = useSafeAreaInsets();
  const { signInWithOtp, verifyOtp } = useAuth();
  const { setStep } = useOnboarding();

  // Step: 'options' | 'email' | 'otp'
  const [step, setScreenStep] = useState<'options' | 'email' | 'otp'>('options');

  const [email, setEmail]       = useState('');
  const [otp, setOtp]           = useState<string[]>(['', '', '', '', '', '']);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Refs for OTP digit inputs so we can auto-advance focus
  const otpRefs = useRef<Array<TextInput | null>>([null, null, null, null, null, null]);

  // ── Helpers ──────────────────────────────────────────────────────────────

  const handleSocialAuth = useCallback((_provider: string) => {
    // Social auth not yet implemented — skip to onboarding for now
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [setStep]);

  // Step 1 — send OTP
  const handleSendOtp = useCallback(async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    const { error: otpError } = await signInWithOtp(trimmed);
    setLoading(false);
    if (otpError) {
      setError(otpError.message ?? 'Failed to send code. Please try again.');
      return;
    }
    setScreenStep('otp');
  }, [email, signInWithOtp]);

  // Step 2 — verify OTP
  const handleVerifyOtp = useCallback(async () => {
    setError('');
    const token = otp.join('');
    if (token.length < 6) {
      setError('Please enter the full 6-digit code');
      return;
    }
    setLoading(true);
    const { error: verifyError, session } = await verifyOtp(email.trim().toLowerCase(), token);
    setLoading(false);
    if (verifyError || !session) {
      setError(verifyError?.message ?? 'Invalid code. Please try again.');
      // Clear OTP and refocus
      setOtp(['', '', '', '', '', '']);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
      return;
    }
    // Authenticated — proceed to onboarding
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [otp, email, verifyOtp, setStep]);

  // Handle individual OTP digit input
  const handleOtpChange = useCallback((value: string, index: number) => {
    // Accept only digits; take last character if somehow multiple pasted
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit when all 6 digits entered
    if (digit && index === 5 && next.every(d => d !== '')) {
      // Trigger verify with the new complete array
      const token = next.join('');
      setError('');
      setLoading(true);
      verifyOtp(email.trim().toLowerCase(), token).then(({ error: verifyError, session }) => {
        setLoading(false);
        if (verifyError || !session) {
          setError(verifyError?.message ?? 'Invalid code. Please try again.');
          setOtp(['', '', '', '', '', '']);
          setTimeout(() => otpRefs.current[0]?.focus(), 100);
          return;
        }
        setStep(1);
        router.push('/onboarding/region' as Href);
      });
    }
  }, [otp, email, verifyOtp, setStep]);

  const handleOtpKeyPress = useCallback((e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      const next = [...otp];
      next[index - 1] = '';
      setOtp(next);
      otpRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // ── Render: options ───────────────────────────────────────────────────────

  if (step === 'options') {
    return (
      <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.handle} />

        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <UtensilsCrossed size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.brandName}>Meal Plan</Text>
        </View>

        <Text style={styles.heading}>Create your account</Text>
        <Text style={styles.subheading}>
          Join to start planning meals you'll actually make.
        </Text>

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

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerLabel}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.emailButton}
            onPress={() => setScreenStep('email')}
            testID="auth-email"
            activeOpacity={0.7}
          >
            <Mail size={16} color={Colors.text} strokeWidth={2} />
            <Text style={styles.emailButtonText}>Continue with Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    );
  }

  // ── Render: email input ───────────────────────────────────────────────────

  if (step === 'email') {
    return (
      <KeyboardAvoidingView
        style={[styles.root, { paddingBottom: insets.bottom + 16 }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.handle} />

        <TouchableOpacity style={styles.backRow} onPress={() => { setError(''); setScreenStep('options'); }}>
          <ArrowLeft size={18} color={Colors.text} strokeWidth={2} />
          <Text style={styles.backLabel}>Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Enter your email</Text>
        <Text style={styles.subheading}>
          We'll send a 6-digit code to sign you in — no password needed.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={Colors.inactive}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          testID="email-input"
          onSubmitEditing={handleSendOtp}
          returnKeyType="done"
        />

        <PrimaryButton
          label={loading ? 'Sending…' : 'Send Code'}
          onPress={handleSendOtp}
          style={{ marginTop: 20 }}
          testID="send-otp"
          disabled={loading}
        />

        {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />}
      </KeyboardAvoidingView>
    );
  }

  // ── Render: OTP verification ──────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingBottom: insets.bottom + 16 }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.handle} />

      <TouchableOpacity style={styles.backRow} onPress={() => { setError(''); setOtp(['','','','','','']); setScreenStep('email'); }}>
        <ArrowLeft size={18} color={Colors.text} strokeWidth={2} />
        <Text style={styles.backLabel}>Back</Text>
      </TouchableOpacity>

      <Text style={styles.heading}>Check your email</Text>
      <Text style={styles.subheading}>
        We sent a 6-digit code to{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* OTP digit boxes */}
      <View style={styles.otpRow}>
        {otp.map((digit, i) => (
          <TextInput
            key={i}
            ref={ref => { otpRefs.current[i] = ref; }}
            style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
            value={digit}
            onChangeText={v => handleOtpChange(v, i)}
            onKeyPress={e => handleOtpKeyPress(e, i)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
            autoFocus={i === 0}
            testID={`otp-${i}`}
          />
        ))}
      </View>

      <PrimaryButton
        label={loading ? 'Verifying…' : 'Verify Code'}
        onPress={handleVerifyOtp}
        style={{ marginTop: 20 }}
        testID="verify-otp"
        disabled={loading || otp.some(d => !d)}
      />

      {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 12 }} />}

      <TouchableOpacity
        style={styles.resendRow}
        onPress={() => { setError(''); setOtp(['','','','','','']); handleSendOtp(); }}
        activeOpacity={0.7}
      >
        <Text style={styles.resendText}>Didn't get a code? <Text style={styles.resendLink}>Resend</Text></Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
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

  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 24,
  },

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
  emailHighlight: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },

  authStack: {
    gap: 0,
    flex: 1,
  },

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

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 20,
  },
  backLabel: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.text,
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

  otpRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
  },
  otpBox: {
    width: 46,
    height: 56,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    backgroundColor: Colors.white,
  },
  otpBoxFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },

  resendRow: {
    marginTop: 20,
    alignItems: 'center',
  },
  resendText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  resendLink: {
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
  },

  errorText: {
    fontSize: 14,
    color: Colors.danger,
    backgroundColor: Colors.primaryLight,
    padding: Spacing.md,
    borderRadius: BorderRadius.input,
    overflow: 'hidden',
    marginBottom: 12,
  },
});
