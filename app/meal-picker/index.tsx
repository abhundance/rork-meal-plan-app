/**
 * Meal Picker — choose screen (slot-aware).
 *
 * Simplified: Search bar + saved recipe carousel + 3 action buttons.
 * No SmartBar, no inline detection. AI Chef / Manual / Ordering In
 * are separate navigation targets.
 *
 * Reached via router.push('/meal-picker') after setPendingPlanSlot().
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  FlatList,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Utensils,
  ChevronRight,
  Search,
  Sparkles,
  PenLine,
  Truck,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Recipe, PlannedMeal } from '@/types';
import { useRecipes } from '@/providers/RecipesProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import {
  peekPendingPlanSlot,
  consumePendingPlanSlot,
} from '@/services/pendingPlanSlot';
import { generateUUID } from '@/utils/uuid';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';

export default function MealPickerScreen() {
  const insets = useSafeAreaInsets();
  const { meals: favMeals, incrementPlanCount } = useRecipes();
  const { addMeal } = useMealPlan();
  const { familySettings } = useFamilySettings();

  const slot = peekPendingPlanSlot();
  const slotName = slot?.slotName ?? 'Meal';
  const date = slot?.date ?? '';

  const [searchQuery, setSearchQuery] = useState('');

  const formattedDate = useMemo(() => {
    if (!date) return '';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  // Filter saved meals by search query
  const filteredMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (q.length < 2) return [];
    return favMeals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.cuisine && m.cuisine.toLowerCase().includes(q)) ||
        m.ingredients.some((i) => i.name.toLowerCase().includes(q)),
    );
  }, [searchQuery, favMeals]);

  const hasSearchResults = filteredMeals.length > 0;
  const familyName = familySettings?.family_name ?? '';

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleSelectFavMeal = useCallback(
    (meal: Recipe) => {
      const pendingSlot = consumePendingPlanSlot();
      if (!pendingSlot) return;
      const planned: PlannedMeal = {
        id: generateUUID(),
        slot_id: pendingSlot.slotId,
        date: pendingSlot.date,
        meal_name: meal.name,
        meal_image_url: meal.image_url,
        serving_size: pendingSlot.defaultServing,
        ingredients: meal.ingredients ?? [],
        recipe_serving_size:
          meal.recipe_serving_size ?? pendingSlot.defaultServing,
        meal_id: meal.id,
      };
      addMeal(planned);
      incrementPlanCount(meal.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    [addMeal, incrementPlanCount],
  );

  const handleClose = useCallback(() => {
    consumePendingPlanSlot();
    router.back();
  }, []);

  const handleAiChef = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);

  const handleManualEntry = useCallback(() => {
    router.push('/add-recipe-manual');
  }, []);

  const handleDelivery = useCallback(() => {
    router.push('/meal-picker/delivery');
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{`Add to ${slotName}`}</Text>
          {!!formattedDate && (
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          )}
        </View>
        <TouchableOpacity
          onPress={handleClose}
          style={styles.closeBtn}
          testID="meal-picker-close-btn"
        >
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: 48 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={18} color={Colors.textSecondary} strokeWidth={2} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search your recipes..."
              placeholderTextColor={Colors.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search results */}
        {hasSearchResults && (
          <View style={styles.searchResultsSection}>
            <Text style={styles.sectionLabel}>FROM YOUR LIBRARY</Text>
            {filteredMeals.map((meal, index) => (
              <TouchableOpacity
                key={meal.id}
                style={[
                  styles.searchResultRow,
                  index < filteredMeals.length - 1 && styles.searchResultRowBorder,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelectFavMeal(meal)}
              >
                <View style={styles.searchResultImage}>
                  {meal.image_url ? (
                    <Image
                      source={{ uri: meal.image_url }}
                      style={{ width: 40, height: 40, borderRadius: 20 }}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <Utensils
                      size={18}
                      color={Colors.textSecondary}
                      strokeWidth={2}
                    />
                  )}
                </View>
                <View style={styles.searchResultText}>
                  <Text style={styles.searchResultName} numberOfLines={1}>
                    {meal.name}
                  </Text>
                  {(meal.cuisine || meal.meal_type) && (
                    <Text style={styles.searchResultMeta} numberOfLines={1}>
                      {meal.cuisine ||
                        (meal.meal_type === 'breakfast'
                          ? 'Breakfast'
                          : meal.meal_type === 'lunch_dinner'
                            ? 'Lunch & Dinner'
                            : 'Light Bites')}
                    </Text>
                  )}
                </View>
                <ChevronRight
                  size={16}
                  color={Colors.border}
                  strokeWidth={2}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Recipe carousel — only show when not searching */}
        {searchQuery.trim().length === 0 && favMeals.length > 0 && (
          <View style={styles.carouselSection}>
            <Text style={styles.sectionLabel}>YOUR RECIPES</Text>
            <FlatList
              data={favMeals}
              renderItem={({ item: recipe }) => (
                <TouchableOpacity
                  style={styles.carouselCard}
                  onPress={() => handleSelectFavMeal(recipe)}
                  activeOpacity={0.8}
                >
                  {recipe.image_url ? (
                    <Image
                      source={{ uri: recipe.image_url }}
                      style={styles.carouselImage}
                      contentFit="cover"
                      cachePolicy="memory-disk"
                    />
                  ) : (
                    <MealImagePlaceholder
                      size="thumbnail"
                      borderRadius={BorderRadius.card}
                      name={recipe.name}
                      cuisine={recipe.cuisine}
                      mealType={recipe.meal_type}
                      familyInitials={
                        !recipe.image_url ? familyName : undefined
                      }
                    />
                  )}
                  <Text style={styles.carouselLabel} numberOfLines={1}>
                    {recipe.name}
                  </Text>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              horizontal
              scrollEventThrottle={16}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
            />
          </View>
        )}

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Or add something new</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Action buttons */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAiChef}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: Colors.primaryLight }]}>
              <Sparkles size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>AI Chef</Text>
              <Text style={styles.actionSubtitle}>
                Describe what you want or share a link, photo, or voice note
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleManualEntry}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#E8F0FE' }]}>
              <PenLine size={20} color="#1A73E8" strokeWidth={2} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Manual Entry</Text>
              <Text style={styles.actionSubtitle}>
                Type in your recipe details step by step
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonLast]}
            onPress={handleDelivery}
            activeOpacity={0.7}
          >
            <View style={[styles.actionIcon, { backgroundColor: '#FFF3E0' }]}>
              <Truck size={20} color="#E65100" strokeWidth={2} />
            </View>
            <View style={styles.actionTextWrap}>
              <Text style={styles.actionTitle}>Ordering In</Text>
              <Text style={styles.actionSubtitle}>
                Log a takeaway or delivery meal
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
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
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
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
    paddingBottom: 48,
  },

  // Search
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    height: 44,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },

  // Search results
  searchResultsSection: {
    paddingTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  searchResultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  searchResultMeta: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },

  // Carousel
  carouselSection: {
    paddingTop: Spacing.md,
  },
  carouselCard: {
    width: 100,
    marginRight: Spacing.md,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  carouselImage: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.card,
  },
  carouselLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center',
    width: '100%',
  },
  carouselContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },

  // Divider
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    gap: Spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Action buttons
  actionsSection: {
    paddingHorizontal: Spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  actionButtonLast: {
    borderBottomWidth: 0,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTextWrap: {
    flex: 1,
  },
  actionTitle: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  actionSubtitle: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
