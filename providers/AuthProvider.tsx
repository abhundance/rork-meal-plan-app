/**
 * AuthProvider — Supabase authentication context for Meal Plan.
 *
 * Authentication strategy: Email OTP (6-digit code).
 * - No deep-link / magic-link setup needed (works in Expo Go and native builds).
 * - User enters email → receives 6-digit code → enters code → authenticated.
 *
 * Session is persisted to AsyncStorage by the Supabase client in services/supabase.ts
 * (autoRefreshToken: true, persistSession: true), so users stay signed in across restarts.
 *
 * Usage:
 *   const { session, user, isLoading, signInWithOtp, verifyOtp, signOut } = useAuth();
 */

import { useState, useEffect, useCallback } from 'react';
import { Session, User, AuthError } from '@supabase/supabase-js';
import createContextHook from '@nkzw/create-context-hook';
import { getSupabase } from '@/services/supabase';

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

    // Restore persisted session (AsyncStorage)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState({
        session,
        user: session?.user ?? null,
        isLoading: false,
      });
      console.log('[Auth] Session restored:', session ? 'yes' : 'none');
    });

    // Subscribe to future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log('[Auth] State changed:', _event);
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
   * Set shouldCreateUser: true so new accounts are auto-created on first sign-in.
   */
  const signInWithOtp = useCallback(async (email: string): Promise<SignInResult> => {
    const supabase = getSupabase();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.log('[Auth] signInWithOtp error:', error.message);
    } else {
      console.log('[Auth] OTP sent to:', email);
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
        console.log('[Auth] OTP verified, user:', data.user?.id);
      }
      return { error, session: data?.session ?? null };
    },
    []
  );

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
    signInWithOtp,
    verifyOtp,
    signOut,
  };
});
