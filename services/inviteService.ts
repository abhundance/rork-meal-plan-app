/**
 * inviteService.ts
 *
 * Handles the full invite lifecycle:
 *   1. getOrCreateInvite  — idempotent: reuses a valid existing code, creates one only if needed
 *   2. resolveInvite      — look up an invite by code (used by the join screen)
 *   3. acceptInvite       — insert into family_members, mark invite used, return family_id
 *
 * Works without Supabase auth (pre-auth phase). Uses guest UUIDs stored in
 * AsyncStorage as the user identity. When real auth lands, guest IDs will be
 * migrated to auth.uid() on first sign-in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getSupabase } from './supabase';

// ── AsyncStorage keys ────────────────────────────────────────────────────────
export const GUEST_USER_ID_KEY    = '@mealplan/guest_user_id';
export const JOINED_FAMILY_ID_KEY = '@mealplan/joined_family_id';
export const CACHED_INVITE_CODE_KEY = '@mealplan/invite_code';

// ── Types ────────────────────────────────────────────────────────────────────

export interface InviteInfo {
  invite_code:          string;
  family_id:            string;
  family_name:          string;
  inviter_name:         string;
  expires_at:           string;
  is_active:            boolean;
  used_at:              string | null;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Generates a readable 8-char code — no 0/O/1/I to avoid confusion. */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}

/**
 * Returns a stable guest UUID for this device — generated once and persisted
 * in AsyncStorage. Used as the user identity when Supabase auth is not active.
 */
export async function getGuestUserId(): Promise<string> {
  const existing = await AsyncStorage.getItem(GUEST_USER_ID_KEY);
  if (existing) return existing;
  // Generate a v4-style UUID
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  await AsyncStorage.setItem(GUEST_USER_ID_KEY, uuid);
  return uuid;
}

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Get or create a persistent invite code for the given family.
 * - Checks AsyncStorage cache first (avoids a round-trip on every open)
 * - Falls back to Supabase to find an existing valid invite
 * - Creates a new one only if none exists or all have expired
 *
 * Also ensures the admin is listed in family_members (so the members list
 * shows the owner even before anyone joins).
 */
export async function getOrCreateInvite(
  familyId:    string,
  familyName:  string,
  inviterName: string,
  adminUserId: string,
): Promise<string> {
  const sb = getSupabase();

  // 1. Check locally cached code
  const cached = await AsyncStorage.getItem(CACHED_INVITE_CODE_KEY);
  if (cached) {
    const { data } = await sb
      .from('family_invites')
      .select('invite_code, expires_at, is_active')
      .eq('invite_code', cached)
      .maybeSingle();
    if (data && data.is_active && new Date(data.expires_at) > new Date()) {
      return cached;
    }
    await AsyncStorage.removeItem(CACHED_INVITE_CODE_KEY);
  }

  // 2. Ensure the families row exists (lazy create for pre-auth scenario)
  await sb.from('families').upsert(
    { id: familyId, family_name: familyName },
    { onConflict: 'id', ignoreDuplicates: true }
  );

  // 3. Ensure the admin is in family_members
  await sb.from('family_members').upsert(
    {
      family_id:   familyId,
      user_id:     adminUserId,
      display_name: inviterName,
      is_admin:    true,
    },
    { onConflict: 'family_id,user_id' }
  );

  // 4. Look for an existing valid invite in Supabase.
  // Note: we do NOT filter by used_at IS NULL — invites are multi-use so
  // the whole family can join with the same link. used_at only records
  // who joined first (audit log), it does not expire the code.
  const { data: existing } = await sb
    .from('family_invites')
    .select('invite_code')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.invite_code) {
    await AsyncStorage.setItem(CACHED_INVITE_CODE_KEY, existing.invite_code);
    return existing.invite_code;
  }

  // 5. Create a fresh invite
  const code      = generateCode();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await sb.from('family_invites').insert({
    invite_code:  code,
    family_id:    familyId,
    family_name:  familyName,
    inviter_name: inviterName,
    expires_at:   expiresAt,
  });

  if (error) throw new Error(`Failed to create invite: ${error.message}`);

  await AsyncStorage.setItem(CACHED_INVITE_CODE_KEY, code);
  return code;
}

/**
 * Resolve an invite code → its details.
 * Returns null if not found, already used, or expired.
 * Throws with a user-facing message if the network is unreachable after 10 s.
 */
export async function resolveInvite(code: string): Promise<InviteInfo | null> {
  const sb = getSupabase();

  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Could not reach the server. Please check your internet connection and try again.')), 10_000)
  );

  const query = sb
    .from('family_invites')
    .select('*')
    .eq('invite_code', code.toUpperCase().trim())
    .eq('is_active', true)
    .maybeSingle();

  const { data, error } = await Promise.race([query, timeout]);

  if (error || !data) return null;
  if (new Date(data.expires_at) < new Date()) return null;
  return data as InviteInfo;
}

/**
 * Accept an invite — adds the user to family_members, marks the invite used,
 * and returns the family_id so the caller can store it locally.
 */
export async function acceptInvite(
  code:        string,
  userId:      string,
  displayName: string,
): Promise<{ family_id: string; family_name: string }> {
  const sb = getSupabase();

  const invite = await resolveInvite(code);
  if (!invite) throw new Error('This invite link is invalid or has expired.');

  // Add to family_members (upsert in case they tap twice)
  const { error: memErr } = await sb.from('family_members').upsert(
    {
      family_id:    invite.family_id,
      user_id:      userId,
      display_name: displayName,
      is_admin:     false,
    },
    { onConflict: 'family_id,user_id' }
  );
  if (memErr) throw new Error(`Could not join family: ${memErr.message}`);

  // Mark invite as used (fire-and-forget — don't block on this)
  sb.from('family_invites').update({
    used_at:              new Date().toISOString(),
    joined_user_id:       userId,
    joined_display_name:  displayName,
  }).eq('invite_code', code.toUpperCase()).then(() => {});

  return { family_id: invite.family_id, family_name: invite.family_name };
}
