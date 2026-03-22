/**
 * Meal Picker — choose screen (slot-aware).
 *
 * Phase 4 redesign: Carousel of saved recipes + unified SmartBar below.
 * SmartBar handles both meal search and smart detection (URL/name/conversation).
 * Reached via router.push('/meal-picker') after setPendingPlanSlot().
 *
 * ⚠️ Never add "From My Recipes" to /add-to-recipes — this screen is
 * only for the slot-aware plan-tab flow.
 */
import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Image,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import {
  X,
  Utensils,
  ChevronRight,
  Heart,
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

  const [smartBarValue, setSmartBarValue] = useState('');

  const formattedDate = useMemo(() => {
    if (!date) return '';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  // Filter saved meals by SmartBar value (when 2+ chars and not a URL/conversation)
  const filteredFavMeals = useMemo(() => {
    const q = smartBarValue.trim().toLowerCase();
    if (q.length < 2) return [];
    // Only show search results if it looks like a meal name (not a URL or long text)
    const inputType = detectInputType(smartBarValue);
    if (inputType === 'url' || inputType === 'conversation') return [];
    return favMeals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.cuisine && m.cuisine.toLowerCase().includes(q)) ||
        m.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [smartBarValue, favMeals]);

  // Detect SmartBar input type and URL source
  const inputType = detectInputType(smartBarValue);
  const urlSource = inputType === 'url' ? detectUrlSource(smartBarValue) : undefined;
  const hasSearchResults = filteredFavMeals.length > 0;

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

      {/* Header — centered title, close X on right only */}
      <View style={styles.header}>
        <View style={styles.headerTitleWrap}>
          <Text style={styles.headerTitle}>{`Add to ${slotName}`}</Text>
          {!!formattedDate && <Text style={styles.headerSubtitle}>{formattedDate}</Text>}
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn} testID="meal-picker-close-btn">
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: 48 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Recipe carousel — only show if no SmartBar input */}
          {smartBarValue.trim().length === 0 && favMeals.length > 0 && (
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
          )}

          {/* SmartBar — unified for search + smart detection */}
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

          {/* Filtered search results — show when SmartBar matches saved meals */}
          {hasSearchResults && (
            <>
              <Text style={styles.sectionLabel}>FROM YOUR LIBRARY</Text>
              {filteredFavMeals.map((meal, index) => (
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
              ))}
            </>
          )}

          {/* SmartBar results — empty state, URL state, name state, or conversation state */}
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
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardAvoid: {
    flex: 1,
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
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
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

  /* SmartBar section */
  smartBarSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
});
