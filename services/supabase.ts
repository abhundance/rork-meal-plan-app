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

// Convenience default export — use getSupabase() in providers for testability
export const supabase = getSupabase();

// ── Type helpers ───────────────────────────────────────────────────────────────
// Re-export for convenience so consumers don't need to import from supabase-js
export type { SupabaseClient } from '@supabase/supabase-js';
