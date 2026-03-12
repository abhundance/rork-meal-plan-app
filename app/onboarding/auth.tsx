/**
 * Auth screen — cinematic split-screen mosaic
 *
 * TOP ~52%  : 3-column photo grid. Each column scrolls upward independently
 *             at a different speed and starting offset, so the grid feels
 *             alive and organic rather than mechanical. No dark overlay —
 *             photos show at full, warm natural brightness.
 *
 * BOTTOM ~48%: Pure white brand + auth section. A soft gradient dissolves
 *              the photos into white at the seam, keeping the palette light.
 *
 * Auth flow: Email OTP (6-digit code, no deep-link required)
 *   Step 1 — Enter email → signInWithOtp() → Supabase sends 6-digit code
 *   Step 2 — Enter code  → verifyOtp()    → session created → navigate
 */
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
  Animated,
  Easing,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed, Mail, X, ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useAuth } from '@/providers/AuthProvider';

// ─── Layout constants ────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COL_GAP       = 3;
const COL_COUNT     = 3;
const COL_W         = (SCREEN_W - COL_GAP * (COL_COUNT - 1)) / COL_COUNT;
const IMG_H         = Math.round(COL_W * 1.38);   // slightly taller than wide
const IMGS_PER_COL  = 6;                           // images per column
const CYCLE_H       = IMGS_PER_COL * IMG_H;        // one full scroll cycle

// How much of the screen the photo mosaic occupies (rest is the white panel)
const PHOTO_SECTION_H = Math.round(SCREEN_H * 0.52);

// ─── Photo sets ──────────────────────────────────────────────────────────────
// Three independent sets so each column tells a different food story.
// Doubled arrays enable seamless infinite scroll (no visible seam on loop).

const COL_1 = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=480&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=480&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=480&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=480&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&q=80',
];

const COL_2 = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=480&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=480&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=480&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=480&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=480&q=80',
  'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=480&q=80',
];

const COL_3 = [
  'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=480&q=80',
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=480&q=80',
  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=480&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=480&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=480&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&q=80',
];

// Each column starts at a different vertical offset so they look staggered
const INITIAL_OFFSETS = [0, -IMG_H * 1.7, -IMG_H * 0.85] as const;
// Each column scrolls at a different speed for an organic, living feel
const SCROLL_DURATIONS = [24000, 30000, 19000] as const;

// ─── ScrollingColumn component ───────────────────────────────────────────────

interface ScrollingColumnProps {
  images: string[];
  animY: Animated.Value;
}

function ScrollingColumn({ images, animY }: ScrollingColumnProps) {
  // Duplicate the array so the loop is seamless: when translateY resets to
  // the initial offset, the doubled images visually continue where they left off.
  const doubled = [...images, ...images];

  return (
    <Animated.View style={{ transform: [{ translateY: animY }] }}>
      {doubled.map((uri, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={{ width: COL_W, height: IMG_H }}
          contentFit="cover"
          recyclingKey={`col-img-${i}`}
        />
      ))}
    </Animated.View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

type OtpStep = 'email' | 'code';

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { setStep } = useOnboarding();
  const { signInWithOtp, verifyOtp } = useAuth();

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [otpStep, setOtpStep]               = useState<OtpStep>('email');
  const [email, setEmail]                   = useState('');
  const [code, setCode]                     = useState('');
  const [error, setError]                   = useState('');
  const [isLoading, setIsLoading]           = useState(false);

  // One Animated.Value per column, pre-set to its staggered starting offset
  const animY0 = useRef(new Animated.Value(INITIAL_OFFSETS[0])).current;
  const animY1 = useRef(new Animated.Value(INITIAL_OFFSETS[1])).current;
  const animY2 = useRef(new Animated.Value(INITIAL_OFFSETS[2])).current;
  const columns = [
    { anim: animY0, images: COL_1, offset: INITIAL_OFFSETS[0], duration: SCROLL_DURATIONS[0] },
    { anim: animY1, images: COL_2, offset: INITIAL_OFFSETS[1], duration: SCROLL_DURATIONS[1] },
    { anim: animY2, images: COL_3, offset: INITIAL_OFFSETS[2], duration: SCROLL_DURATIONS[2] },
  ];

  useEffect(() => {
    columns.forEach(({ anim, offset, duration }) => {
      const loop = () => {
        anim.setValue(offset);
        Animated.timing(anim, {
          toValue: offset - CYCLE_H,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) loop();
        });
      };
      loop();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetModal = useCallback(() => {
    setOtpStep('email');
    setEmail('');
    setCode('');
    setError('');
    setIsLoading(false);
  }, []);

  const handleCloseModal = useCallback(() => {
    setShowEmailModal(false);
    resetModal();
  }, [resetModal]);

  // Google / Apple — social OAuth wired in a future sprint; navigate directly for now
  const handleSocialAuth = useCallback((_provider: string) => {
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [setStep]);

  // ── Step 1: send OTP to email ─────────────────────────────────────────────
  const handleSendCode = useCallback(async () => {
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }
    setIsLoading(true);
    const { error: authErr } = await signInWithOtp(trimmed);
    setIsLoading(false);
    if (authErr) {
      setError(authErr.message ?? 'Failed to send code. Please try again.');
      return;
    }
    setOtpStep('code');
    setCode('');
  }, [email, signInWithOtp]);

  // ── Step 2: verify the 6-digit code ──────────────────────────────────────
  const handleVerifyCode = useCallback(async () => {
    setError('');
    const trimmedCode = code.trim();
    if (trimmedCode.length !== 6) {
      setError('Please enter the 6-digit code from your email');
      return;
    }
    setIsLoading(true);
    const { error: authErr } = await verifyOtp(email.trim().toLowerCase(), trimmedCode);
    setIsLoading(false);
    if (authErr) {
      setError(authErr.message ?? 'Invalid or expired code. Please try again.');
      return;
    }
    // ── Success: start onboarding flow ────────────────────────────────────
    setShowEmailModal(false);
    resetModal();
    setStep(1);
    router.push('/onboarding/region' as Href);
  }, [code, email, verifyOtp, resetModal, setStep]);

  return (
    <View style={styles.root}>

      {/* ── Photo mosaic — top section ─────────────────────────────────── */}
      <View style={[styles.photoSection, { paddingTop: insets.top }]}>

        {/* Status-bar dimmer — just the very top 40px so text stays readable */}
        <LinearGradient
          colors={['rgba(0,0,0,0.28)', 'rgba(0,0,0,0)']}
          style={styles.statusBarDim}
          pointerEvents="none"
        />

        {/* Three independently scrolling columns */}
        <View style={styles.grid}>
          {columns.map(({ anim, images }, idx) => (
            <View key={idx} style={styles.colClip}>
              <ScrollingColumn images={images} animY={anim} />
            </View>
          ))}
        </View>

        {/* Gentle fade from photos → white at the bottom of the photo section */}
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.6)', '#FFFFFF']}
          locations={[0, 0.55, 1]}
          style={styles.photoFade}
          pointerEvents="none"
        />
      </View>

      {/* ── Brand + auth panel — white section ────────────────────────── */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 16 }]}>

        {/* Logo + wordmark */}
        <View style={styles.brandRow}>
          <View style={styles.logoMark}>
            <UtensilsCrossed size={18} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={styles.wordmark}>Meal Plan</Text>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Dinner on the table,{'\n'}
          <Text style={styles.headlineAccent}>every single week.</Text>
        </Text>

        {/* Auth buttons */}
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
          <TouchableOpacity
            style={styles.emailLink}
            onPress={() => { resetModal(); setShowEmailModal(true); }}
            testID="auth-email"
          >
            <Mail size={14} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.emailLinkText}>Sign in with Email</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.terms}>
          By continuing you agree to our{' '}
          <Text style={styles.termsLink}>Terms</Text>
          {' '}and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>

      {/* ── Email OTP modal ────────────────────────────────────────────── */}
      <Modal
        visible={showEmailModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseModal}
      >
        <KeyboardAvoidingView
          style={styles.modalContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.modalHeader}>
            {otpStep === 'code' ? (
              <TouchableOpacity
                onPress={() => { setOtpStep('email'); setError(''); setCode(''); }}
                style={styles.backButton}
              >
                <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 36 }} />
            )}
            <Text style={styles.modalTitle}>
              {otpStep === 'email' ? 'Sign in' : 'Check your email'}
            </Text>
            <TouchableOpacity onPress={handleCloseModal} style={styles.closeButton}>
              <X size={20} color={Colors.text} strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {otpStep === 'email' ? (
              /* ── Step 1: enter email ─────────────────────────────────── */
              <>
                <Text style={styles.stepDescription}>
                  We'll send a 6-digit code to your email. No password needed.
                </Text>
                <Text style={styles.inputLabel}>Email address</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.inactive}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSendCode}
                  testID="email-input"
                />
                <PrimaryButton
                  label={isLoading ? 'Sending…' : 'Send Code'}
                  onPress={handleSendCode}
                  disabled={isLoading}
                  style={{ marginTop: 24 }}
                  testID="send-code"
                />
                {isLoading && (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
                )}
              </>
            ) : (
              /* ── Step 2: enter 6-digit code ──────────────────────────── */
              <>
                <Text style={styles.stepDescription}>
                  Enter the 6-digit code we sent to{'\n'}
                  <Text style={styles.emailHighlight}>{email}</Text>
                </Text>
                <Text style={styles.inputLabel}>Verification code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  placeholderTextColor={Colors.inactive}
                  keyboardType="number-pad"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyCode}
                  autoFocus
                  testID="otp-input"
                />
                <PrimaryButton
                  label={isLoading ? 'Verifying…' : 'Verify'}
                  onPress={handleVerifyCode}
                  disabled={isLoading || code.length !== 6}
                  style={{ marginTop: 24 }}
                  testID="verify-code"
                />
                {isLoading && (
                  <ActivityIndicator color={Colors.primary} style={{ marginTop: 16 }} />
                )}
                <TouchableOpacity
                  style={styles.resendLink}
                  onPress={() => { setOtpStep('email'); setError(''); setCode(''); }}
                >
                  <Text style={styles.resendText}>Didn't receive a code? Go back</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  // Root
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },

  // ── Photo section ──────────────────────────────────────────────────────────

  photoSection: {
    height: PHOTO_SECTION_H,
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    gap: COL_GAP,
    flex: 1,
  },
  colClip: {
    width: COL_W,
    overflow: 'hidden',
    flex: 0,
  },
  statusBarDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 64,
    zIndex: 1,
  },
  photoFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 96,
  },

  // ── Brand panel ────────────────────────────────────────────────────────────

  panel: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 4,
    justifyContent: 'space-between',
  },

  // Logo + wordmark row
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },

  // Headline
  headline: {
    fontSize: 24,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 32,
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headlineAccent: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },

  // Auth stack
  authStack: {
    gap: 0,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: 4,
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
    color: Colors.textSecondary,
  },

  // Terms
  terms: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    color: Colors.inactive,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
  },

  // ── Email OTP modal ────────────────────────────────────────────────────────

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
  backButton: {
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
  stepDescription: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 4,
  },
  emailHighlight: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
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
  codeInput: {
    fontSize: 28,
    letterSpacing: 8,
    textAlign: 'center',
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  resendLink: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 8,
  },
  resendText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
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
