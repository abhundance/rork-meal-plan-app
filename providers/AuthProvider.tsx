/**
 * AuthProvider — Supabase authentication context for Meal Plan.
 *
 * Authentication strategy: Email OTP (6-digit code).
 * - No deep-link / magic-link setup needed (works in Expo Go and native builds).
 * - User enters email → receives 6-digit code → enters code → authenticated.
 *
 * Anonymous auth:
 * - If no persisted session exists, we call signInAnonymously() so every device
 *   has a real auth.uid() from first launch. This makes RLS work pre-onboarding
 *   and allows Supabase to be the single source of truth for recipes.
 * - Requires "Enable anonymous sign-ins" to be ON in Supabase Auth settings.
 * - When an anonymous user completes email OTP, signInWithOtp detects the anonymous
 *   session and omits shouldCreateUser — Supabase upgrades the session in-place,
 *   preserving the user's auth.uid() and all their data (no data loss).
 *
 * Session is persisted to AsyncStorage by the Supabase client in services/supabase.ts
 * (autoRefreshToken: true, persistSession: true), so users stay signed in across restarts.
 *
 * Usage:
 *   const { session, user, isAnonymous, isLoading, signInWithOtp, verifyOtp, signOut } = useAuth();
 */

import { useState, useEffect, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { getSupabase } from '@/services/supabase';
import { GoogleSignin, isSuccessResponse, statusCodes } from '@react-native-google-signin/google-signin';

// Configure Google Sign-In once at module load time.
// webClientId is the Web OAuth client ID from Google Cloud Console.
// iosClientId is set via the app.json plugin (iosUrlScheme), but passing
// it here explicitly ensures it works in Expo Go development builds too.
GoogleSignin.configure({
  webClientId: '260678473269-ee9isb1labak3i3dt4g93vvjggpeg3hu.apps.googleusercontent.com',
  iosClientId: '260678473269-0cr9n3t23ctuleebjs33h51spql1jgog.apps.googleusercontent.com',
});

// ── Types ───────────────────────────────────────────────────────────────────
interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

interface SignInResult {
  error: AuthError | null;
}

interface VerifyResult {
  error: AuthError | null;
  session: Session | null;
}

interface GoogleSignInResult {
  error: string | null;
  session: Session | null;
}

// ── Provider ─────────────────────────────────────────────────────────────────
export const [AuthProvider, useAuth] = createContextHook(() => {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true, // true until we resolve the persisted session
  });

  // ── Initialise from persisted session ────────────────────────────────────
  useEffect(() => {
    const supabase = getSupabase();

    // Restore persisted session, or sign in anonymously if none exists.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        console.log('[Auth] Session restored:', session.user.is_anonymous ? 'anonymous' : 'authenticated');
        setAuthState({ session, user: session.user, isLoading: false });
      } else {
        // No session — sign in anonymously so auth.uid() is always available.
        // This satisfies RLS policies (family_id = auth.uid()) from first launch.
        console.log('[Auth] No session — signing in anonymously');
        const { data: anonData, error: anonError } = await supabase.auth.signInAnonymously();
        if (!anonError && anonData.session) {
          console.log('[Auth] Anonymous sign-in OK:', anonData.session.user.id);
          // onAuthStateChange will fire and update state automatically
        } else {
          console.error('[Auth] Anonymous sign-in failed:', anonError?.message);
          setAuthState({ session: null, user: null, isLoading: false });
        }
      }
    });

    // Subscribe to future auth changes (sign-in, sign-out, token refresh, anonymous upgrade)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth] State changed:', _event);
        if (_event === 'USER_UPDATED') {
          // Fired when an anonymous user is upgraded to a permanent account via OTP.
          // The user ID remains the same — all existing data is preserved.
          console.log('[Auth] Anonymous user upgraded to permanent account:', session?.user?.id);
        }
        setAuthState({
          session,
          user: session?.user ?? null,
          isLoading: false,
        });
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ── Actions ──────────────────────────────────────────────────────────────

  /**
   * Step 1 — Request OTP: sends a 6-digit code to the user's email.
   *
   * Anonymous-aware: if the current user is anonymous, we omit shouldCreateUser
   * so Supabase upgrades the existing anonymous session rather than creating a
   * new account. This preserves the user's auth.uid() and all their data.
   *
   * If there is no session at all (edge case), shouldCreateUser: true ensures
   * a new account is created on first sign-in.
   */
  const signInWithOtp = useCallback(async (email: string): Promise<SignInResult> => {
    const supabase = getSupabase();
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    const isCurrentlyAnonymous = currentSession?.user?.is_anonymous === true;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        // Only set shouldCreateUser when there is no existing anonymous session.
        // When anonymous, omitting this lets Supabase upgrade the session in-place
        // (same user ID, same data, just no longer anonymous after verifyOtp).
        ...(!isCurrentlyAnonymous && { shouldCreateUser: true }),
      },
    });
    if (error) {
      console.log('[Auth] signInWithOtp error:', error.message);
    } else {
      console.log(
        '[Auth] OTP sent to:', email,
        '| mode:', isCurrentlyAnonymous ? 'upgrade anonymous' : 'new account'
      );
    }
    return { error };
  }, []);

  /**
   * Step 2 — Verify OTP: submits the 6-digit code the user received.
   * On success, onAuthStateChange fires and updates the session automatically.
   */
  const verifyOtp = useCallback(
    async (email: string, token: string): Promise<VerifyResult> => {
      const supabase = getSupabase();
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim().toLowerCase(),
        token: token.trim(),
        type: 'email',
      });
      if (error) {
        console.log('[Auth] verifyOtp error:', error.message);
      } else {
        const isNowPermanent = data.user && !data.user.is_anonymous;
        console.log(
          '[Auth] OTP verified, user:', data.user?.id,
          '| permanent:', isNowPermanent
        );
      }
      return { error, session: data?.session ?? null };
    },
    []
  );

  /**
   * Google Sign-In — native sheet, then Supabase session via ID token.
   *
   * Anonymous-aware: if the current user is anonymous, Supabase will upgrade
   * the session in-place (same auth.uid(), same data) when signInWithIdToken
   * is called. No data loss.
   */
  const googleSignIn = useCallback(async (): Promise<GoogleSignInResult> => {
    const supabase = getSupabase();
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (!isSuccessResponse(response)) {
        console.log('[Auth] Google Sign-In cancelled by user');
        return { error: null, session: null }; // user cancelled — not an error
      }

      const { idToken } = response.data;
      if (!idToken) {
        console.log('[Auth] Google Sign-In: no idToken returned');
        return { error: 'Google sign-in failed — no ID token returned.', session: null };
      }

      console.log('[Auth] Google ID token obtained, signing in with Supabase');
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: idToken,
      });

      if (error) {
        console.log('[Auth] Supabase Google sign-in error:', error.message);
        return { error: error.message, session: null };
      }

      console.log('[Auth] Google sign-in OK, user:', data.session?.user.id);
      return { error: null, session: data.session ?? null };
    } catch (err: any) {
      if (err?.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log('[Auth] Google Sign-In cancelled');
        return { error: null, session: null };
      }
      if (err?.code === statusCodes.IN_PROGRESS) {
        console.log('[Auth] Google Sign-In already in progress');
        return { error: null, session: null };
      }
      console.log('[Auth] Google Sign-In error:', err?.message ?? err);
      return { error: 'Google sign-in failed. Please try again.', session: null };
    }
  }, []);

  /**
   * Sign out — clears the session locally and on Supabase.
   */
  const signOut = useCallback(async (): Promise<void> => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.log('[Auth] signOut error:', error.message);
    } else {
      console.log('[Auth] Signed out');
    }
  }, []);

  // ── Expose ───────────────────────────────────────────────────────────────
  return {
    session: authState.session,
    user: authState.user,
    isLoading: authState.isLoading,
    isAuthenticated: authState.session !== null,
    isAnonymous: authState.user?.is_anonymous ?? true,
    signInWithOtp,
    verifyOtp,
    googleSignIn,
    signOut,
  };
});
