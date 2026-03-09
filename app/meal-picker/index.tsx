/**
 * Meal Picker — choose screen (slot-aware).
 *
 * Reached via router.push('/meal-picker') after setPendingPlanSlot().
 * Shows search, browse cards (From My Favourites / Try Something New),
 * and option tiles (Add Without Recipe, Add with Recipe, Add from Delivery App).
 *
 * ⚠️ Never add "From My Favourites" to /add-to-favs — this screen is
 * only for the slot-aware plan-tab flow.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Utensils,
  Search,
  ChevronRight,
  Heart,
  Compass,
  Pencil,
  Sparkles,
  Bike,
  Globe,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { Recipe, PlannedMeal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { peekPendingPlanSlot, consumePendingPlanSlot } from '@/services/pendingPlanSlot';

export default function MealPickerScreen() {
  const insets = useSafeAreaInsets();
  const { meals: favMeals } = useFavs();
  const { addMeal } = useMealPlan();

  const slot = peekPendingPlanSlot();
  const slotName = slot?.slotName ?? 'Meal';
  const date = slot?.date ?? '';
  const slotId = slot?.slotId ?? '';
  const defaultServing = slot?.defaultServing ?? 2;

  const [searchQuery, setSearchQuery] = useState('');

  const formattedDate = useMemo(() => {
    if (!date) return '';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  const filteredFavMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return favMeals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.cuisine && m.cuisine.toLowerCase().includes(q)) ||
        m.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [searchQuery, favMeals]);

  const handleSelectFavMeal = useCallback(
    (meal: Recipe) => {
      const pendingSlot = consumePendingPlanSlot();
      if (!pendingSlot) return;
      const planned: PlannedMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: pendingSlot.slotId,
        date: pendingSlot.date,
        meal_name: meal.name,
        meal_image_url: meal.image_url,
        serving_size: pendingSlot.defaultServing,
        ingredients: meal.ingredients ?? [],
        recipe_serving_size: meal.recipe_serving_size ?? pendingSlot.defaultServing,
        meal_id: meal.id,
      };
      addMeal(planned);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    [addMeal]
  );

  const handleClose = useCallback(() => {
    consumePendingPlanSlot();
    router.back();
  }, []);

  const handleBrowseFavs = useCallback(() => {
    // Do NOT consume the slot here — the Favs tab reads it on focus
    // and uses it to add the meal directly to the correct slot.
    router.dismiss();
    router.push('/(tabs)/favs');
  }, []);

  const handleBrowseDiscover = useCallback(() => {
    // Do NOT consume the slot here — the Discover tab reads it on focus
    // and uses it to add the meal directly to the correct slot.
    router.dismiss();
    router.push('/(tabs)/discover');
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.handle} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.closeBtn} />
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{`Add to ${slotName}`}</Text>
          {!!formattedDate && <Text style={styles.headerSubtitle}>{formattedDate}</Text>}
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} testID="meal-picker-close-btn">
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Search bar */}
      <View style={styles.searchBar}>
        <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search your saved meals..."
          placeholderTextColor={Colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          testID="meal-picker-search"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <X size={16} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {searchQuery.trim().length > 0 ? (
          /* ── Search results ── */
          <>
            <Text style={styles.sectionLabel}>FROM YOUR LIBRARY</Text>
            {filteredFavMeals.length === 0 ? (
              <View style={styles.searchEmptyState}>
                <Search size={36} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.searchEmptyText}>No saved meals match "{searchQuery}"</Text>
                <TouchableOpacity onPress={handleBrowseDiscover} testID="browse-discover-from-search-btn">
                  <Text style={styles.searchEmptyDiscoverBtn}>Browse Discover meals</Text>
                </TouchableOpacity>
              </View>
            ) : (
              filteredFavMeals.map((meal, index) => (
                <TouchableOpacity
                  key={meal.id}
                  style={[
                    styles.searchResultRow,
                    index < filteredFavMeals.length - 1 && styles.searchResultRowBorder,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => handleSelectFavMeal(meal)}
                  testID={`search-result-${meal.id}`}
                >
                  <View style={styles.searchResultImage}>
                    {meal.image_url ? (
                      <Image
                        source={{ uri: meal.image_url }}
                        style={{ width: 40, height: 40, borderRadius: 20 }}
                        resizeMode="cover"
                      />
                    ) : (
                      <Utensils size={18} color={Colors.textSecondary} strokeWidth={2} />
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
                  <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
                </TouchableOpacity>
              ))
            )}

            <Text style={[styles.sectionLabel, { marginTop: 28 }]}>SEARCH ONLINE</Text>
            <View style={styles.searchOnlineStub}>
              <View style={styles.searchResultImage}>
                <Globe size={18} color={Colors.textSecondary} strokeWidth={2} />
              </View>
              <Text style={styles.searchOnlineText}>
                Search millions of recipes online — coming soon
              </Text>
            </View>
          </>
        ) : (
          /* ── Default: browse cards + option tiles ── */
          <>
            {/* Browse cards */}
            <View style={styles.browseCardsRow}>
              <TouchableOpacity
                style={styles.browseCardLeft}
                activeOpacity={0.8}
                onPress={handleBrowseFavs}
                testID="browse-favs-btn"
              >
                <Heart size={22} color={Colors.primary} fill={Colors.primary} strokeWidth={2} />
                <Text style={styles.browseCardTitle}>From My Favourites</Text>
                <Text style={styles.browseCardSubtitle}>
                  {favMeals.length > 0 ? `${favMeals.length} saved recipes` : 'Your saved recipes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.browseCardRight}
                activeOpacity={0.8}
                onPress={handleBrowseDiscover}
                testID="browse-discover-btn"
              >
                <Compass size={22} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.browseCardTitle}>Try Something New</Text>
                <Text style={styles.browseCardSubtitle}>
                  {DISCOVER_MEALS.length} curated recipes
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or create new</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Option tiles */}
            <View testID="option-rows">
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.8}
                onPress={() => router.push('/meal-picker/manual')}
                testID="add-without-recipe-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
                  <Pencil size={16} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add without Recipe</Text>
                  <Text style={styles.optionSubtitle}>Just a name - add steps later</Text>
                </View>
                <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
              </TouchableOpacity>

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.8}
                onPress={() => router.push('/add-recipe-entry')}
                testID="add-with-recipe-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
                  <Sparkles size={16} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add with Recipe</Text>
                  <Text style={styles.optionSubtitle}>AI mode, manual entry & more</Text>
                </View>
                <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
              </TouchableOpacity>

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.8}
                onPress={() => router.push('/meal-picker/delivery')}
                testID="add-delivery-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: Colors.primaryLight }]}>
                  <Bike size={16} color={Colors.primary} strokeWidth={2} />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add from Delivery App</Text>
                  <Text style={styles.optionSubtitle}>Paste a delivery link</Text>
                </View>
                <ChevronRight size={16} color={Colors.border} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </>
        )}
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 11,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
  },
  searchEmptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchEmptyDiscoverBtn: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
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
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchOnlineStub: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  searchOnlineText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  browseCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  browseCardLeft: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  browseCardRight: {
    flex: 1,
    backgroundColor: Colors.primaryLight,
    borderRadius: 14,
    padding: 14,
  },
  browseCardTitle: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 8,
  },
  browseCardSubtitle: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    paddingHorizontal: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: Colors.surface,
    marginLeft: 66,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  optionSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
});
