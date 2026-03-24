/**
 * Add a Recipe — AI Chef screen (modal).
 *
 * Renders the AiChefChat component directly. Manual entry is accessed
 * via a separate button on the meal-picker screen (navigates to /add-recipe-manual).
 *
 * Route params:
 *   ?prompt=<text>   — pre-fills AI Chef with initial message
 *
 * All navigation to the AI Chef flow goes to /add-recipe-entry.
 * Exception: editing existing meal → /add-recipe-review?editId={id}
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/theme';
import AiChefChat from '@/components/AiChefChat';
import { peekPendingPlanSlot } from '@/services/pendingPlanSlot';
import type { PendingPlanSlot } from '@/components/AiChefChat';

export default function AddRecipeEntryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ prompt?: string }>();

  // Read pending plan slot (if navigating from Plan tab)
  const slot = peekPendingPlanSlot();
  const pendingPlanSlot: PendingPlanSlot | null = slot
    ? {
        slotId: slot.slotId,
        date: slot.date,
        slotName: slot.slotName,
        defaultServing: slot.defaultServing,
      }
    : null;

  const handleClose = useCallback(() => {
    router.back();
  }, []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
    >
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.headerTitle}>AI Chef</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* AI Chef Chat */}
      <View style={styles.chatContainer}>
        <AiChefChat
          initialPrompt={params.prompt}
          pendingPlanSlot={pendingPlanSlot}
        />
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },
  headerLeft: {
    width: 36,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatContainer: {
    flex: 1,
  },
});
