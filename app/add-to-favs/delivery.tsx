/**
 * Add to Favs — Add from Delivery App (library-only).
 *
 * Saves a delivery meal directly to the Favs library (family_created source).
 * No slot context. ‹ back returns to /add-to-favs/index natively.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Bike, ClipboardIcon as ClipboardPasteIcon, CheckCircle2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Recipe } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import PrimaryButton from '@/components/PrimaryButton';

export default function AddToFavsDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const { addFav } = useFavs();

  const [mealName, setMealName] = useState('');
  const [deliveryUrl, setDeliveryUrl] = useState('');

  const handleSave = useCallback(() => {
    if (!mealName.trim()) return;
    const trimmedUrl = deliveryUrl.trim();

    const favMeal: Recipe = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: mealName.trim(),
      source: 'family_created',
      ingredients: [],
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: false,
      is_recipe_complete: false,
      ...(trimmedUrl ? {
        delivery_url: trimmedUrl,
        delivery_platform: detectPlatformFromUrl(trimmedUrl) ?? undefined,
      } : {}),
    };

    addFav(favMeal);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Came from add-to-favs/index — 2 screens in the modal stack.
    // router.back() pops delivery → index; router.dismiss() then closes index → Favs tab.
    router.back();
    router.dismiss();
  }, [mealName, deliveryUrl, addFav]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-to-choose-btn">
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>Add a Meal</Text>
        </View>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headingRow}>
          <Bike size={22} color={Colors.primary} strokeWidth={1.5} />
          <Text style={styles.heading}>Add from Delivery App</Text>
        </View>

        <Text style={styles.sectionLabel}>MEAL NAME</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Butter Chicken from Spice Garden"
          placeholderTextColor={Colors.textSecondary}
          value={mealName}
          onChangeText={setMealName}
          autoCapitalize="words"
          autoFocus
          testID="delivery-name-input"
        />

        <Text style={[styles.sectionLabel, { marginTop: 20 }]}>DELIVERY LINK (OPTIONAL)</Text>
        <View style={styles.linkRow}>
          <TextInput
            style={styles.linkInput}
            placeholder="Paste Uber Eats, Zomato, Grab link..."
            placeholderTextColor={Colors.textSecondary}
            value={deliveryUrl}
            onChangeText={setDeliveryUrl}
            keyboardType="url"
            autoCapitalize="none"
            autoCorrect={false}
            testID="delivery-url-input"
          />
          <TouchableOpacity
            style={styles.clipboardBtn}
            onPress={async () => {
              const text = await Clipboard.getStringAsync();
              if (text) setDeliveryUrl(text);
            }}
            testID="delivery-clipboard-btn"
          >
            <ClipboardPasteIcon size={20} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {deliveryUrl.trim().length > 0 && (
          <View style={styles.platformChip}>
            <CheckCircle2 size={14} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.platformChipText}>
              {getPlatformLabel(detectPlatformFromUrl(deliveryUrl.trim()))} detected
            </Text>
          </View>
        )}

        <PrimaryButton
          label="Save Meal"
          onPress={handleSave}
          disabled={!mealName.trim()}
          style={{ marginTop: 24 }}
          testID="delivery-save-btn"
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  headingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  heading: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
  },
  linkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  linkInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
  },
  clipboardBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  platformChipText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
});
