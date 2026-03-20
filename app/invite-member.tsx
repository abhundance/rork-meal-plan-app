/**
 * Invite Member screen — accessible from Family Settings.
 *
 * Generates (or retrieves) a persistent 7-day invite code for the current
 * family and surfaces real share options: native share sheet, WhatsApp,
 * iMessage, and clipboard copy.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Share,
  Platform,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import {
  Copy,
  MessageCircle,
  Send,
  MoreHorizontal,
  ChevronLeft,
  Check,
  RefreshCw,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateInvite, getGuestUserId, CACHED_INVITE_CODE_KEY } from '@/services/inviteService';

export default function InviteMemberScreen() {
  const insets = useSafeAreaInsets();
  const { familySettings, userSettings, familyId } = useFamilySettings();

  const [inviteCode, setInviteCode]   = useState<string | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [copied, setCopied]           = useState(false);

  const familyName  = familySettings.family_name || 'Our Family';
  const inviterName = userSettings.display_name  || 'Someone';

  // The deep-link the recipient taps — opens the join screen directly
  const inviteLink = inviteCode ? `rork-app://join/${inviteCode}` : '';
  // Human-friendly display version
  const displayLink = inviteCode ? `mealplan.app/join/${inviteCode}` : '';

  const loadInvite = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const effectiveFamilyId = familyId ?? await getGuestUserId();
      const effectiveUserId   = await getGuestUserId();

      if (forceRefresh) {
        // Clear cached code so a new one is generated
        await AsyncStorage.removeItem(CACHED_INVITE_CODE_KEY);
      }

      const code = await getOrCreateInvite(
        effectiveFamilyId,
        familyName,
        inviterName,
        effectiveUserId,
      );
      setInviteCode(code);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not generate invite link.');
    } finally {
      setLoading(false);
    }
  }, [familyId, familyName, inviterName]);

  useEffect(() => { void loadInvite(); }, [loadInvite]);

  // ── Share handlers ────────────────────────────────────────────────────────

  const shareMessage = `Join ${familyName}'s meal plan on the Meal Plan app!\n\nTap this link to join: ${inviteLink}\n\nThe invite expires in 7 days.`;

  const handleNativeShare = useCallback(async () => {
    if (!inviteCode) return;
    try {
      // Android ignores the `url` field in Share.share — the link must live
      // inside `message`. On iOS we pass `url` separately so the system can
      // render a rich link preview; the message text already contains the link
      // so Android gets it either way.
      await Share.share(
        Platform.OS === 'ios'
          ? { message: shareMessage, url: inviteLink }
          : { message: shareMessage },
      );
    } catch {
      // user cancelled — do nothing
    }
  }, [inviteCode, shareMessage, inviteLink]);

  const handleWhatsApp = useCallback(async () => {
    if (!inviteCode) return;
    const text  = encodeURIComponent(shareMessage);
    const url   = `whatsapp://send?text=${text}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // WhatsApp not installed — fall back to native share
      await handleNativeShare();
    }
  }, [inviteCode, shareMessage, handleNativeShare]);

  const handleiMessage = useCallback(async () => {
    if (!inviteCode) return;
    const text = encodeURIComponent(shareMessage);
    const url  = `sms:?body=${text}`;
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      await handleNativeShare();
    }
  }, [inviteCode, shareMessage, handleNativeShare]);

  const handleCopy = useCallback(async () => {
    if (!inviteCode) return;
    await Clipboard.setStringAsync(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [inviteCode, inviteLink]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.backBtn}
        >
          <ChevronLeft size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite a Member</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        <Text style={styles.heading}>
          Invite someone to join {familyName}
        </Text>
        <Text style={styles.subheading}>
          Share this link and they'll be added to your family plan. The link expires in 7 days.
        </Text>

        {/* Link box */}
        <View style={styles.linkBox}>
          {loading ? (
            <ActivityIndicator color={Colors.primary} style={{ flex: 1 }} />
          ) : error ? (
            <Text style={[styles.linkText, { color: Colors.danger, flex: 1 }]} numberOfLines={2}>
              {error}
            </Text>
          ) : (
            <Text style={styles.linkText} numberOfLines={1}>{displayLink}</Text>
          )}
          <TouchableOpacity
            onPress={handleCopy}
            style={styles.copyIcon}
            disabled={!inviteCode}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {copied
              ? <Check size={18} color={Colors.success} strokeWidth={2.5} />
              : <Copy  size={18} color={Colors.primary}  strokeWidth={2} />
            }
          </TouchableOpacity>
        </View>

        {/* Share buttons */}
        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleWhatsApp} disabled={!inviteCode}>
            <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
              <MessageCircle size={22} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleiMessage} disabled={!inviteCode}>
            <View style={[styles.shareIcon, { backgroundColor: '#007AFF' }]}>
              <Send size={22} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>iMessage</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleCopy} disabled={!inviteCode}>
            <View style={[styles.shareIcon, { backgroundColor: Colors.primary }]}>
              {copied
                ? <Check size={22} color={Colors.white} strokeWidth={2.5} />
                : <Copy  size={22} color={Colors.white} strokeWidth={2}   />
              }
            </View>
            <Text style={styles.shareLabel}>{copied ? 'Copied!' : 'Copy Link'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleNativeShare} disabled={!inviteCode}>
            <View style={[styles.shareIcon, { backgroundColor: Colors.text }]}>
              <MoreHorizontal size={22} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>More</Text>
          </TouchableOpacity>
        </View>

        {/* Refresh link */}
        {!loading && !error && (
          <TouchableOpacity
            style={styles.refreshRow}
            onPress={() => loadInvite(true)}
            hitSlop={{ top: 8, bottom: 8 }}
          >
            <RefreshCw size={13} color={Colors.textSecondary} strokeWidth={2} />
            <Text style={styles.refreshText}>Generate a new link</Text>
          </TouchableOpacity>
        )}

        {/* Info card */}
        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>How it works</Text>
          <Text style={styles.infoBody}>
            When someone taps your link and opens the app, they'll enter their name and be added to your family plan. They'll see your shared meal plan, favourites, and shopping list.
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
  },
  heading: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 30,
  },
  subheading: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 24,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 28,
    minHeight: 52,
  },
  linkText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  copyIcon: {
    marginLeft: 12,
    padding: 4,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  shareButton: {
    alignItems: 'center',
    gap: 8,
  },
  shareIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  refreshRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    marginBottom: 28,
  },
  refreshText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  infoCard: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.card,
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.primary,
    marginBottom: 6,
  },
  infoBody: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 19,
  },
});
