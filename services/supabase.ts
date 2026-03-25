/**
 * Supabase client — single shared instance for the whole app.
 *
 * Uses the lazy-read pattern (functions, not module-level consts) so
 * Rork's bundler never caches a stale env value. See CLAUDE.md §Architectural Rules.
 *
 * SECURITY NOTES:
 *  - EXPO_PUBLIC_SUPABASE_ANON_KEY is intentionally public — it is safe to expose.
 *    All data access is protected by Row-Level Security policies in Postgres.
 *  - The service role key and all third-party API keys (OpenAI, YouTube, Spoonacular)
 *    live only in Supabase Edge Function secrets — never in this file or any client file.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ── Lazy env readers (never assign process.env to a module-level const) ────────
function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

// ── Singleton client ────────────────────────────────────────────────────────────
let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    _supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: {
        storage: AsyncStorage,      // persist session to device storage
        autoRefreshToken: true,     // silently refresh JWT before expiry
        persistSession: true,       // restore session on app restart
        detectSessionInUrl: false,  // required for React Native (no browser URL)
      },
    });
  }
  return _supabase;
}

// ── Edge Function helpers ─────────────────────────────────────────────────────

/** Standard headers for all Edge Function calls. Centralised so version bumps happen in one place. */
export const EDGE_FUNCTION_HEADERS: Record<string, string> = { 'X-API-Version': '1' };

/**
 * Build auth + version headers for an Edge Function call.
 * Pass the result of `supabase.auth.getSession()` to get the right auth header.
 */
export function buildEdgeFunctionHeaders(
  session: { access_token: string } | null | undefined,
): Record<string, string> {
  const headers: Record<string, string> = { ...EDGE_FUNCTION_HEADERS };
  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  } else {
    headers['apikey'] = getSupabaseAnonKey();
  }
  return headers;
}

// ── Type helpers ───────────────────────────────────────────────────────────────
// Re-export for convenience so consumers don't need to import from supabase-js
export type { SupabaseClient } from '@supabase/supabase-js';
