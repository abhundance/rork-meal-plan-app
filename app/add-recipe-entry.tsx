/**
 * Add a Recipe — toggle entry screen (modal).
 *
 * Two tabs via SegmentedControl:
 *   - AI Chef (default) → embedded AiChefChat component
 *   - Manual → navigates to /add-recipe-manual
 *
 * Route params:
 *   ?tab=ai|manual   — controls initial toggle state
 *   ?prompt=<text>   — pre-fills AI Chef with initial message
 *
 * All navigation to the Add a Recipe flow goes to /add-recipe-entry.
 * Exception: editing existing meal → /add-recipe-review?editId={id}
 */

import React, { useState, useCallback, useEffect } from 'react';
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
import SegmentedControl from '@/components/SegmentedControl';
import AiChefChat from '@/components/AiChefChat';
import { peekPendingPlanSlot } from '@/services/pendingPlanSlot';
import type { PendingPlanSlot } from '@/components/AiChefChat';

const TABS = ['✨ AI Chef', '✏️ Manual'];

export default function AddRecipeEntryScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ tab?: string; prompt?: string }>();

  const initialTab = params.tab === 'manual' ? 1 : 0;
  const [activeTab, setActiveTab] = useState(initialTab);

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

  // When Manual tab is selected, navigate to the full manual form
  useEffect(() => {
    if (activeTab === 1) {
      router.push('/add-recipe-manual');
      // Reset back to AI Chef tab so user returns to chat if they come back
      const timer = setTimeout(() => setActiveTab(0), 300);
      return () => clearTimeout(timer);
    }
  }, [activeTab]);

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
        <Text style={styles.headerTitle}>Add a Recipe</Text>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Toggle */}
      <View style={styles.toggleContainer}>
        <SegmentedControl
          segments={TABS}
          activeIndex={activeTab}
          onChange={setActiveTab}
        />
      </View>

      {/* AI Chef Chat (always mounted to preserve state) */}
      <View style={[styles.chatContainer, activeTab !== 0 && styles.hidden]}>
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
  toggleContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  chatContainer: {
    flex: 1,
  },
  hidden: {
    display: 'none',
  },
});
