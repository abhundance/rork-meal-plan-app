/**
 * Meal Picker — choose screen (slot-aware).
 *
 * Phase 4 redesign: Carousel of saved recipes + SmartBar below.
 * Reached via router.push('/meal-picker') after setPendingPlanSlot().
 *
 * ⚠️ Never add "From My Recipes" to /add-to-recipes — this screen is
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
  FlatList,
  Alert,
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
  Pencil,
  Bike,
  Globe,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { Recipe, PlannedMeal } from '@/types';
import { useRecipes } from '@/providers/RecipesProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { peekPendingPlanSlot, consumePendingPlanSlot } from '@/services/pendingPlanSlot';
import { generateUUID } from '@/utils/uuid';
import SmartBar from '@/components/SmartBar';
import SmartBarResults from '@/components/SmartBarResults';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import { detectInputType, detectUrlSource, type InputType, type UrlSource } from '@/utils/inputDetection';

export default function MealPickerScreen() {
  const insets = useSafeAreaInsets();
  const { meals: favMeals, incrementPlanCount, addRecipe } = useRecipes();
  const { addMeal } = useMealPlan();
  const { familySettings } = useFamilySettings();

  const slot = peekPendingPlanSlot();
  const slotName = slot?.slotName ?? 'Meal';
  const date = slot?.date ?? '';
  const slotId = slot?.slotId ?? '';
  const defaultServing = slot?.defaultServing ?? 2;

  const [searchQuery, setSearchQuery] = useState('');
  const [smartBarValue, setSmartBarValue] = useState('');

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

  // Detect SmartBar input type and URL source
  const inputType = detectInputType(smartBarValue);
  const urlSource = inputType === 'url' ? detectUrlSource(smartBarValue) : undefined;

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
        recipe_serving_size: meal.recipe_serving_size ?? pendingSlot.defaultServing,
        meal_id: meal.id,
      };
      addMeal(planned);
      incrementPlanCount(meal.id);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    },
    [addMeal, incrementPlanCount]
  );

  const handleClose = useCallback(() => {
    consumePendingPlanSlot();
    router.back();
  }, []);

  const handleExtract = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);

  const handleGenerate = useCallback((name: string) => {
    // Navigate to add-recipe-entry which has the full generation flow
    router.push('/add-recipe-entry');
  }, []);

  const handleJustSaveName = useCallback((name: string) => {
    const pendingSlot = consumePendingPlanSlot();
    if (!pendingSlot || !name.trim()) return;

    // Create a name-only recipe
    const newRecipe: Recipe = {
      id: generateUUID(),
      name: name.trim(),
      source: 'family_created',
      ingredients: [],
      plan_count: 1,
    };

    // Add to recipes
    addRecipe(newRecipe);

    // Add to plan slot
    const planned: PlannedMeal = {
      id: generateUUID(),
      slot_id: pendingSlot.slotId,
      date: pendingSlot.date,
      meal_name: newRecipe.name,
      meal_image_url: undefined,
      serving_size: pendingSlot.defaultServing,
      ingredients: [],
      recipe_serving_size: pendingSlot.defaultServing,
      meal_id: newRecipe.id,
    };

    addMeal(planned);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.back();
  }, [addRecipe, addMeal]);

  const handleAiChef = useCallback((prompt?: string) => {
    router.push({ pathname: '/ai-chef', params: prompt ? { prompt } : {} });
  }, []);

  const handleManualEntry = useCallback(() => {
    router.push('/meal-picker/manual');
  }, []);

  const handlePhoto = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);

  const handleVoice = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);

  const handleDelivery = useCallback(() => {
    router.push('/meal-picker/delivery');
  }, []);

  const handleCameraPress = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);

  const handleMicPress = useCallback(() => {
    router.push('/add-recipe-entry');
  }, []);


  const familyName = familySettings?.family_name ?? '';

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

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

        {searchQuery.trim().length > 0 ? (
          /* ── Search results ── */
          <>
            <Text style={styles.sectionLabel}>FROM YOUR LIBRARY</Text>
            {filteredFavMeals.length === 0 ? (
              <View style={styles.searchEmptyState}>
                <Search size={36} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.searchEmptyText}>No saved meals match "{searchQuery}"</Text>
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
          /* ── Default: carousel + SmartBar + results ── */
          <>
            {/* Recipe carousel */}
            {favMeals.length > 0 ? (
              <View>
                <Text style={[styles.sectionLabel, { marginHorizontal: Spacing.lg, marginBottom: Spacing.md }]}>
                  QUICK ADD
                </Text>
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
                          resizeMode="cover"
                        />
                      ) : (
                        <MealImagePlaceholder
                          size="thumbnail"
                          borderRadius={BorderRadius.card}
                          name={recipe.name}
                          cuisine={recipe.cuisine}
                          mealType={recipe.meal_type}
                          familyInitials={!recipe.image_url && recipe.source === 'family_created' ? familyName : undefined}
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
            ) : (
              <View style={styles.noRecipesMessage}>
                <Heart size={24} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.noRecipesText}>No saved recipes yet</Text>
              </View>
            )}

            {/* SmartBar */}
            <View style={styles.smartBarSection}>
              <SmartBar
                value={smartBarValue}
                onChangeText={setSmartBarValue}
                onCameraPress={handleCameraPress}
                onMicPress={handleMicPress}
                inputType={inputType}
                urlSource={urlSource}
              />
            </View>

            {/* SmartBar Results */}
            <SmartBarResults
              inputType={inputType}
              inputValue={smartBarValue}
              urlSource={urlSource}
              onExtract={handleExtract}
              onGenerate={handleGenerate}
              onJustSaveName={handleJustSaveName}
              onAiChef={handleAiChef}
              onManualEntry={handleManualEntry}
              onPhoto={handlePhoto}
              onVoice={handleVoice}
              onDelivery={handleDelivery}
            />

            {/* Ordering in link */}
            <View style={styles.orderingLinkContainer}>
              <TouchableOpacity
                style={styles.orderingLink}
                onPress={handleDelivery}
                activeOpacity={0.7}
              >
                <Text style={styles.orderingLinkText}>Ordering in tonight?</Text>
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
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 11,
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
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  searchEmptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
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
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchOnlineStub: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  searchOnlineText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },

  /* Carousel styles */
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
  noRecipesMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  noRecipesText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },

  /* SmartBar section */
  smartBarSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },

  /* Ordering link */
  orderingLinkContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  orderingLink: {
    paddingVertical: Spacing.sm,
  },
  orderingLinkText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
});
