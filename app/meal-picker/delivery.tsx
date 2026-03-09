/**
 * Meal Picker — Add from Delivery App (slot-aware).
 *
 * Reached via router.push('/meal-picker/delivery') from /meal-picker/index.
 * Also reached from recipe-detail via router.push('/meal-picker/delivery?editId=<plannedMealId>')
 * to edit an existing delivery meal's name/URL.
 *
 * Reads slot context from pendingPlanSlot service (for new meals).
 * ‹ back returns to /meal-picker/index natively.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { ChevronLeft, Heart, Bike, ClipboardIcon as ClipboardPasteIcon, CheckCircle2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Recipe, PlannedMeal } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { peekPendingPlanSlot, consumePendingPlanSlot } from '@/services/pendingPlanSlot';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import PrimaryButton from '@/components/PrimaryButton';

export default function MealPickerDeliveryScreen() {
  const insets = useSafeAreaInsets();
  const { editId } = useLocalSearchParams<{ editId?: string }>();
  const { addFav } = useFavs();
  const { addMeal, updatePlannedMealDelivery, meals: planMeals } = useMealPlan();

  const isEditing = !!editId;
  const editingMeal = isEditing && editId ? planMeals.find((m) => m.id === editId) : undefined;

  const slot = peekPendingPlanSlot();
  const slotName = slot?.slotName ?? 'Meal';

  const [mealName, setMealName] = useState('');
  const [deliveryUrl, setDeliveryUrl] = useState('');
  const [saveToFavs, setSaveToFavs] = useState(false);

  // Pre-fill when editing an existing delivery meal
  useEffect(() => {
    if (editingMeal) {
      setMealName(editingMeal.meal_name);
      setDeliveryUrl(editingMeal.delivery_url ?? '');
    }
  }, [editingMeal]);

  const handleSave = useCallback(() => {
    if (!mealName.trim()) return;
    const trimmedUrl = deliveryUrl.trim();

    if (isEditing && editId) {
      updatePlannedMealDelivery(editId, {
        meal_name: mealName.trim(),
        delivery_url: trimmedUrl || undefined,
        delivery_platform: trimmedUrl ? (detectPlatformFromUrl(trimmedUrl) ?? undefined) : undefined,
      });
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismiss();
      return;
    }

    const pendingSlot = consumePendingPlanSlot();
    if (!pendingSlot) return;

    const favId = saveToFavs
      ? `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: pendingSlot.slotId,
      date: pendingSlot.date,
      meal_name: mealName.trim(),
      serving_size: pendingSlot.defaultServing,
      ingredients: [],
      recipe_serving_size: pendingSlot.defaultServing,
      is_delivery: true,
      delivery_url: trimmedUrl || undefined,
      delivery_platform: trimmedUrl ? (detectPlatformFromUrl(trimmedUrl) ?? undefined) : undefined,
      ...(favId ? { fav_meal_id: favId } : {}),
    };

    if (saveToFavs && favId) {
      addFav({
        id: favId,
        name: mealName.trim(),
        source: 'family_created',
        ingredients: [],
        add_to_plan_count: 0,
        created_at: new Date().toISOString(),
        is_ingredient_complete: false,
        is_recipe_complete: false,
      });
    }

    addMeal(planned);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.dismiss();
  }, [mealName, deliveryUrl, saveToFavs, isEditing, editId, addMeal, addFav, updatePlannedMealDelivery]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-to-choose-btn">
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>
            {isEditing ? 'Edit Delivery Meal' : `Add to ${slotName}`}
          </Text>
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

        {!isEditing && (
          <TouchableOpacity
            style={styles.saveToFavsRow}
            onPress={() => setSaveToFavs((v) => !v)}
            activeOpacity={0.8}
          >
            <Heart
              size={20}
              color={saveToFavs ? Colors.primary : Colors.textSecondary}
              fill={saveToFavs ? Colors.primary : 'none'}
              strokeWidth={2}
            />
            <Text style={[styles.saveToFavsText, saveToFavs && styles.saveToFavsTextActive]}>
              Save to Favourites
            </Text>
          </TouchableOpacity>
        )}

        <PrimaryButton
          label={isEditing ? 'Save Changes' : 'Save to Meal Plan'}
          onPress={handleSave}
          disabled={!mealName.trim()}
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
  saveToFavsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 20,
  },
  saveToFavsText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  saveToFavsTextActive: {
    color: Colors.primary,
  },
});
