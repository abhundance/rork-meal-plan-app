import React, { useMemo, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Copy, MessageCircle, Send, MoreHorizontal } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import ProgressBar from '@/components/ProgressBar';
import PrimaryButton from '@/components/PrimaryButton';
import { useOnboarding } from '@/providers/OnboardingProvider';

export default function InviteMembersScreen() {
  const insets = useSafeAreaInsets();
  const { setStep } = useOnboarding();

  const inviteLink = useMemo(() => {
    const code = Math.random().toString(36).substring(2, 10).toUpperCase();
    return `https://mealplan.app/join/${code}`;
  }, []);

  const handleCopyLink = useCallback(async () => {
    console.log('[Invite] Link copied:', inviteLink);
  }, [inviteLink]);

  const handleShare = useCallback(async () => {
    if (Platform.OS !== 'web') {
      try {
        await Share.share({
          message: `Join our family meal plan! ${inviteLink}`,
        });
      } catch (e) {
        console.log('[Invite] Share error:', e);
      }
    }
  }, [inviteLink]);

  const handleContinue = () => {
    setStep(7);
    router.push('/onboarding/personal-dietary' as Href);
  };

  const handleSkip = () => {
    setStep(7);
    router.push('/onboarding/personal-dietary' as Href);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ProgressBar current={6} total={7} />

      <View style={styles.content}>
        <Text style={styles.stepLabel}>Step 6 of 7</Text>
        <Text style={styles.heading}>Invite your family to join</Text>

        <View style={styles.linkBox}>
          <Text style={styles.linkText} numberOfLines={1}>{inviteLink}</Text>
          <TouchableOpacity onPress={handleCopyLink} style={styles.copyIcon}>
            <Copy size={18} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <View style={styles.shareRow}>
          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: '#25D366' }]}>
              <MessageCircle size={20} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>WhatsApp</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: '#007AFF' }]}>
              <Send size={20} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>iMessage</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleCopyLink}>
            <View style={[styles.shareIcon, { backgroundColor: Colors.primary }]}>
              <Copy size={20} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>Copy Link</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
            <View style={[styles.shareIcon, { backgroundColor: Colors.text }]}>
              <MoreHorizontal size={20} color={Colors.white} strokeWidth={2} />
            </View>
            <Text style={styles.shareLabel}>More</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.helper}>
          Anyone with this link can join your family plan. The link expires after 7 days.
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <PrimaryButton
          label="Continue"
          onPress={handleContinue}
          testID="continue-btn"
        />
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip} testID="skip-btn">
          <Text style={styles.skipText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  stepLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  heading: {
    fontSize: 28,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 28,
    lineHeight: 36,
  },
  linkBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 28,
  },
  linkText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
  copyIcon: {
    marginLeft: 12,
    padding: 4,
  },
  shareRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  shareButton: {
    alignItems: 'center',
    gap: 8,
  },
  shareIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  helper: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 14,
  },
  skipText: {
    fontSize: 15,
    color: Colors.primary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
  },
});
