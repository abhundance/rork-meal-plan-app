/**
 * Join screen — opened when someone taps a family invite link.
 *
 * Deep link: rork-app://join/XXXXXXXX
 * Expo Router maps this to app/join/[code].tsx with params.code = 'XXXXXXXX'
 *
 * Flow:
 *  1. Resolve the invite code from Supabase
 *  2. Show "You've been invited" UI with family name + inviter
 *  3. User enters their display name
 *  4. Tap Join → acceptInvite → save family_id locally → navigate to main app
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Users, PartyPopper, AlertCircle } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  resolveInvite,
  acceptInvite,
  getGuestUserId,
  JOINED_FAMILY_ID_KEY,
  InviteInfo,
} from '@/services/inviteService';

type ScreenState = 'loading' | 'invite_found' | 'invalid' | 'network_error' | 'joining' | 'joined';

export default function JoinScreen() {
  const insets = useSafeAreaInsets();
  const rawCode = useLocalSearchParams<{ code: string }>().code;
  // NOTE-02: Expo Router can return string | string[] — always coerce to string
  const code = Array.isArray(rawCode) ? rawCode[0] : rawCode;

  const [state, setState]           = useState<ScreenState>('loading');
  const [invite, setInvite]         = useState<InviteInfo | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [nameError, setNameError]   = useState<string | null>(null);
  const [joinError, setJoinError]   = useState<string | null>(null);
  const navTimerRef                 = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up nav timer if component unmounts before it fires
  useEffect(() => {
    return () => {
      if (navTimerRef.current) clearTimeout(navTimerRef.current);
    };
  }, []);

  // ── Resolve the invite on mount ──────────────────────────────────────────

  useEffect(() => {
    if (!code) {
      setState('invalid');
      return;
    }
    resolveInvite(code)
      .then((info) => {
        if (info) {
          setInvite(info);
          setState('invite_found');
        } else {
          setState('invalid');
        }
      })
      .catch(() => setState('network_error'));
  }, [code]);

  // ── Handle join ──────────────────────────────────────────────────────────

  const handleJoin = useCallback(async () => {
    const name = displayName.trim();
    if (!name) {
      setNameError('Please enter your name so the family knows who you are.');
      return;
    }
    if (name.length > 40) {
      setNameError('Name must be 40 characters or less.');
      return;
    }
    setNameError(null);
    setJoinError(null);
    setState('joining');

    try {
      const userId = await getGuestUserId();
      const result = await acceptInvite(code!, userId, name);

      // Persist the joined family ID locally so the app knows which family to load
      await AsyncStorage.setItem(JOINED_FAMILY_ID_KEY, result.family_id);

      setState('joined');

      // Navigate to main app after a brief celebration pause
      navTimerRef.current = setTimeout(() => {
        router.replace('/(tabs)');
      }, 1800);
    } catch (e: unknown) {
      setJoinError(e instanceof Error ? e.message : 'Could not join the family. Please try again.');
      setState('invite_found');
    }
  }, [code, displayName]);

  // ── Render ────────────────────────────────────────────────────────────────

  const renderContent = () => {
    // ── Loading ──
    if (state === 'loading') {
      return (
        <View style={styles.centreWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Checking invite…</Text>
        </View>
      );
    }

    // ── Invalid / expired ──
    if (state === 'invalid') {
      return (
        <View style={styles.centreWrap}>
          <View style={styles.iconCircle}>
            <AlertCircle size={36} color={Colors.danger} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>Link Expired</Text>
          <Text style={styles.heroSubtitle}>
            This invite link is no longer valid. Ask the family admin to send you a fresh link.
          </Text>
          <TouchableOpacity
            style={styles.secondaryBtn}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.secondaryBtnText}>Go to App</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Network timeout / offline ──
    if (state === 'network_error') {
      const retryResolve = () => {
        setState('loading');
        resolveInvite(code ?? '')
          .then((info) => {
            if (info) { setInvite(info); setState('invite_found'); }
            else { setState('invalid'); }
          })
          .catch(() => setState('network_error'));
      };
      return (
        <View style={styles.centreWrap}>
          <View style={styles.iconCircle}>
            <AlertCircle size={36} color={Colors.warning} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>No Connection</Text>
          <Text style={styles.heroSubtitle}>
            Couldn't reach the server. Please check your internet connection and try again.
          </Text>
          <TouchableOpacity style={styles.joinBtn} onPress={retryResolve} activeOpacity={0.85}>
            <Text style={styles.joinBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // ── Joined celebration ──
    if (state === 'joined') {
      return (
        <View style={styles.centreWrap}>
          <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight }]}>
            <PartyPopper size={36} color={Colors.primary} strokeWidth={1.5} />
          </View>
          <Text style={styles.heroTitle}>You're in! 🎉</Text>
          <Text style={styles.heroSubtitle}>
            Welcome to {invite?.family_name}'s meal plan. Taking you there now…
          </Text>
          <ActivityIndicator color={Colors.primary} style={{ marginTop: 20 }} />
        </View>
      );
    }

    // ── invite_found + joining ──
    const isJoining = state === 'joining';
    return (
      <ScrollView
        contentContainerStyle={styles.formScroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={[styles.iconCircle, { backgroundColor: Colors.primaryLight, alignSelf: 'center', marginBottom: 20 }]}>
          <Users size={36} color={Colors.primary} strokeWidth={1.5} />
        </View>

        <Text style={styles.heroTitle}>You've been invited!</Text>
        <Text style={styles.heroSubtitle}>
          <Text style={styles.bold}>{invite?.inviter_name}</Text>
          {' '}has invited you to join{' '}
          <Text style={styles.bold}>{invite?.family_name}</Text>
          's meal plan.
        </Text>

        {/* Name input */}
        <Text style={styles.inputLabel}>What's your name?</Text>
        <TextInput
          style={[styles.textInput, nameError ? styles.textInputError : null]}
          placeholder="e.g. Mum, Alex, Dad…"
          placeholderTextColor={Colors.textSecondary}
          value={displayName}
          onChangeText={(t) => { setDisplayName(t); setNameError(null); }}
          maxLength={40}
          autoFocus
          returnKeyType="done"
          onSubmitEditing={handleJoin}
          editable={!isJoining}
        />
        {nameError ? (
          <Text style={styles.errorText}>{nameError}</Text>
        ) : null}

        {/* Join error */}
        {joinError ? (
          <View style={styles.joinErrorBox}>
            <AlertCircle size={15} color={Colors.danger} strokeWidth={2} />
            <Text style={styles.joinErrorText}>{joinError}</Text>
          </View>
        ) : null}

        {/* CTA */}
        <TouchableOpacity
          style={[styles.joinBtn, isJoining && styles.joinBtnDisabled]}
          onPress={handleJoin}
          disabled={isJoining}
          activeOpacity={0.85}
        >
          {isJoining ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.joinBtnText}>Join {invite?.family_name}</Text>
          )}
        </TouchableOpacity>

        {/* What they'll get */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What you'll get access to</Text>
          <Text style={styles.infoBody}>
            The shared weekly meal plan, saved family favourites, and the shopping list — all in one place.
          </Text>
        </View>
      </ScrollView>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom + 16 }]}>
        {renderContent()}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Centred states (loading / invalid / joined) ──
  centreWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },

  // ── Form ──
  formScroll: {
    paddingHorizontal: 28,
    paddingTop: 48,
    paddingBottom: 40,
  },

  // ── Shared hero bits ──
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  heroSubtitle: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  bold: {
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },

  // ── Input ──
  inputLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.text,
    marginBottom: 6,
  },
  textInputError: {
    borderColor: Colors.danger,
  },
  errorText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.danger,
    marginBottom: 12,
  },

  // ── Join error box ──
  joinErrorBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: BorderRadius.card,
    padding: 12,
    marginBottom: 16,
  },
  joinErrorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.danger,
    lineHeight: 18,
  },

  // ── Join button ──
  joinBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.xl,
    minHeight: 54,
  },
  joinBtnDisabled: {
    opacity: 0.6,
  },
  joinBtnText: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.white,
  },

  // ── Secondary button (invalid state) ──
  secondaryBtn: {
    marginTop: 24,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },

  // ── Info card ──
  infoCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.card,
    padding: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 19,
  },
});
