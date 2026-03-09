/**
 * Meal Picker — Add Without Recipe (slot-aware).
 *
 * Reached via router.push('/meal-picker/manual') from /meal-picker/index.
 * Reads slot context from pendingPlanSlot service.
 * ‹ back returns to /meal-picker/index natively.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { ChevronLeft, Heart, Utensils } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Recipe, PlannedMeal } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { peekPendingPlanSlot, consumePendingPlanSlot } from '@/services/pendingPlanSlot';
import PrimaryButton from '@/components/PrimaryButton';

export default function MealPickerManualScreen() {
  const insets = useSafeAreaInsets();
  const { addFav } = useFavs();
  const { addMeal } = useMealPlan();

  const slot = peekPendingPlanSlot();
  const slotName = slot?.slotName ?? 'Meal';
  const defaultServing = slot?.defaultServing ?? 2;

  const [name, setName] = useState('');
  const [saveToFavs, setSaveToFavs] = useState(false);

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    const pendingSlot = consumePendingPlanSlot();
    if (!pendingSlot) return;

    const newMealId = saveToFavs
      ? `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;

    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: pendingSlot.slotId,
      date: pendingSlot.date,
      meal_name: name.trim(),
      serving_size: pendingSlot.defaultServing,
      ingredients: [],
      recipe_serving_size: pendingSlot.defaultServing,
      ...(newMealId ? { meal_id: newMealId } : {}),
    };

    addMeal(planned);

    if (saveToFavs && newMealId) {
      const favMeal: Recipe = {
        id: newMealId,
        name: name.trim(),
        source: 'family_created',
        ingredients: [],
        recipe_serving_size: pendingSlot.defaultServing,
        is_ingredient_complete: false,
        is_recipe_complete: false,
        dietary_tags: [],
        custom_tags: [],
        method_steps: [],
        add_to_plan_count: 0,
        created_at: new Date().toISOString(),
      };
      addFav(favMeal);
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Dismiss the entire meal-picker stack back to the plan tab
    router.dismiss();
  }, [name, saveToFavs, addMeal, addFav]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} testID="back-to-choose-btn">
          <ChevronLeft size={22} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{`Add to ${slotName}`}</Text>
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
          <Utensils size={22} color={Colors.primary} strokeWidth={1.5} />
          <Text style={styles.heading}>Add Without Recipe</Text>
        </View>

        <Text style={styles.label}>Meal name</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Mum's Special Pasta"
          placeholderTextColor={Colors.textSecondary}
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoFocus
          testID="manual-meal-input"
        />

        <TouchableOpacity
          style={styles.saveToFavsRow}
          onPress={() => setSaveToFavs((v) => !v)}
          activeOpacity={0.8}
          testID="save-to-favs-toggle"
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

        <Text style={styles.hint}>
          You can add ingredients later from the meal detail screen.
        </Text>

        <PrimaryButton
          label="Add Meal"
          onPress={handleSave}
          disabled={!name.trim()}
          style={{ marginTop: 8 }}
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
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  input: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
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
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
  },
});
