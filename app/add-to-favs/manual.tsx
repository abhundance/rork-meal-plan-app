/**
 * Add to Favs — Add Without Recipe (library-only).
 *
 * Saves a name-only meal directly to the Favs library (family_created source).
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
import { ChevronLeft, Utensils } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Recipe } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import PrimaryButton from '@/components/PrimaryButton';

export default function AddToFavsManualScreen() {
  const insets = useSafeAreaInsets();
  const { addFav } = useFavs();
  const { familySettings } = useFamilySettings();
  const defaultServing = familySettings.default_serving_size ?? 2;

  const [name, setName] = useState('');

  const handleSave = useCallback(() => {
    if (!name.trim()) return;

    const favMeal: Recipe = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      source: 'family_created',
      ingredients: [],
      recipe_serving_size: defaultServing,
      is_ingredient_complete: false,
      is_recipe_complete: false,
      dietary_tags: [],
      custom_tags: [],
      method_steps: [],
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
    };

    addFav(favMeal);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // Came from add-to-favs/index — 2 screens in the modal stack.
    // router.back() pops manual → index; router.dismiss() then closes index → Favs tab.
    router.back();
    router.dismiss();
  }, [name, addFav, defaultServing]);

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

        <Text style={styles.hint}>
          You can add ingredients and a recipe later from the meal detail screen.
        </Text>

        <PrimaryButton
          label="Save Meal"
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
  hint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 24,
    lineHeight: 18,
  },
});
