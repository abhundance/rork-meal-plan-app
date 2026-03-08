import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  TextInput,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check, SlidersHorizontal, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import RecipeFilterSheet, {
  RecipeFilterState,
  RecipeFilterConfig,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
} from '@/components/RecipeFilterSheet';

// ─── Discover filter configuration ───────────────────────────────────────────
const DISCOVER_FILTER_CONFIG: RecipeFilterConfig = {
  showSort:          false,
  showMealType:      true,
  showDishType:      true,
  showCuisine:       true,
  showProtein:       true,
  showCookTime:      true,
  showDietary:       true,
  showIntolerances:  true,
  showOccasion:      true,
  showSpiceLevel:    true,
  showCalories:      true,
  // Full 32-cuisine list (mirrors CUISINE_OPTIONS in types/index.ts + Spoonacular keys)
  cuisineOptions: [
    { key: 'African',           label: 'African' },
    { key: 'American',          label: 'American' },
    { key: 'British',           label: 'British' },
    { key: 'Cajun',             label: 'Cajun' },
    { key: 'Caribbean',         label: 'Caribbean' },
    { key: 'Chinese',           label: 'Chinese' },
    { key: 'Colombian',         label: 'Colombian' },
    { key: 'Eastern European',  label: 'Eastern European' },
    { key: 'European',          label: 'European' },
    { key: 'Filipino',          label: 'Filipino' },
    { key: 'French',            label: 'French' },
    { key: 'German',            label: 'German' },
    { key: 'Greek',             label: 'Greek' },
    { key: 'Indian',            label: 'Indian' },
    { key: 'Irish',             label: 'Irish' },
    { key: 'Italian',           label: 'Italian' },
    { key: 'Japanese',          label: 'Japanese' },
    { key: 'Jewish',            label: 'Jewish' },
    { key: 'Korean',            label: 'Korean' },
    { key: 'Latin American',    label: 'Latin American' },
    { key: 'Malaysian',         label: 'Malaysian' },
    { key: 'Mediterranean',     label: 'Mediterranean' },
    { key: 'Mexican',           label: 'Mexican' },
    { key: 'Middle Eastern',    label: 'Middle Eastern' },
    { key: 'Native American',   label: 'Native American' },
    { key: 'Nordic',            label: 'Nordic' },
    { key: 'Singaporean',       label: 'Singaporean' },
    { key: 'Southern',          label: 'Southern' },
    { key: 'Spanish',           label: 'Spanish' },
    { key: 'Thai',              label: 'Thai' },
    { key: 'Vietnamese',        label: 'Vietnamese' },
  ],
};

// Maps dietary filter keys → DiscoverMeal field check (checks all three arrays)
function discoverMatchesDietary(
  m: { diet_labels: string[]; allergens: string[]; dietary_tags: string[] },
  key: string
): boolean {
  switch (key) {
    case 'vegan':        return m.diet_labels.includes('vegan')        || m.allergens.includes('vegan')        || m.dietary_tags.includes('Vegan');
    case 'vegetarian':   return m.diet_labels.includes('vegetarian')   || m.dietary_tags.includes('Vegetarian');
    case 'gluten_free':  return m.allergens.includes('gluten-free')    || m.diet_labels.includes('gluten-free') || m.dietary_tags.includes('Gluten-Free');
    case 'dairy_free':   return m.allergens.includes('dairy-free')     || m.diet_labels.includes('dairy-free')  || m.dietary_tags.includes('Dairy-Free');
    case 'high_protein': return m.diet_labels.includes('high-protein');
    case 'low_carb':     return m.diet_labels.includes('low-carb');
    case 'keto':         return m.diet_labels.includes('keto');
    case 'paleo':        return m.diet_labels.includes('paleo');
    case 'whole30':      return m.diet_labels.includes('whole30');
    case 'nut_free':     return m.allergens.includes('nut-free');
    default:             return true;
  }
}
import AppHeader from '@/components/AppHeader';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { useDiscoverRecommendations } from '@/hooks/useDiscoverRecommendations';
import { ShieldCheck, ChevronRight, Search, Compass, ArrowRight } from 'lucide-react-native';

const { width: screenWidth } = Dimensions.get('window');


import DiscoverCarouselCard, { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_HEIGHT } from '@/components/DiscoverCarouselCard';

const _GRID_CARD_WIDTH = (screenWidth - 48) / 3;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isFav, addFromDiscover, removeFav } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealsForSlot } = useMealPlan();

  const [, setInitialLoading] = useState<boolean>(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [discoverFilters, setDiscoverFilters] = useState<RecipeFilterState>(DEFAULT_FILTER_STATE);
  const [showDiscoverFilter, setShowDiscoverFilter] = useState<boolean>(false);
  const [actionMeal, setActionMeal] = useState<DiscoverMeal | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState<boolean>(false);

  const discoverFilterCount = countActiveFilters(discoverFilters, DISCOVER_FILTER_CONFIG);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const handleSaveFav = useCallback(
    (meal: DiscoverMeal) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isFav(meal.id)) {
        removeFav(meal.id);
      } else {
        addFromDiscover(meal);
        showToast(`${meal.name} added to Favs`);
      }
    },
    [isFav, addFromDiscover, removeFav, showToast]
  );

  const handleAddToPlan = useCallback((meal: DiscoverMeal) => {
    setSelectedMeal(meal);
    setSlotPickerVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSlotSelected = useCallback(
    (date: string, slotId: string) => {
      if (!selectedMeal) return;
      const planned: PlannedMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: slotId,
        date,
        meal_name: selectedMeal.name,
        meal_image_url: selectedMeal.image_url,
        serving_size: familySettings.default_serving_size,
        ingredients: selectedMeal.ingredients,
        recipe_serving_size: selectedMeal.recipe_serving_size,
      };
      addMeal(planned);
      setSlotPickerVisible(false);
      setSelectedMeal(null);
      showToast(`${selectedMeal?.name} added to your meal plan`);
    },
    [selectedMeal, addMeal, familySettings, showToast]
  );

  const handleMealPress = useCallback((meal: DiscoverMeal) => {
    router.push(`/recipe-detail?id=${meal.id}&source=discover` as Href);
  }, []);

  const handleCardPress = useCallback((meal: DiscoverMeal) => {
    setActionMeal(meal);
    setActionSheetVisible(true);
  }, []);

  const { carousels, recordInteraction, recordView } = useDiscoverRecommendations();

  // Filter carousels using the RecipeFilterSheet state.
  // Drop carousels that end up empty after filtering.
  const filteredCarousels = useMemo(() => {
    const {
      mealType, dishTypes, cuisines, protein, cookTime,
      dietary, intolerances, occasions, spiceLevel, calories,
    } = discoverFilters;

    const hasAdvancedFilter =
      !!mealType || dishTypes.length > 0 || cuisines.length > 0 ||
      protein.length > 0 || !!cookTime || dietary.length > 0 ||
      intolerances.length > 0 || occasions.length > 0 || !!spiceLevel || !!calories;

    return carousels
      .map(carousel => {
        let meals = carousel.meals;

        if (hasAdvancedFilter) {
          // Meal type (single-select)
          if (mealType) {
            meals = meals.filter(m => m.meal_type === mealType);
          }
          // Dish type (multi-select OR logic)
          if (dishTypes.length > 0) {
            meals = meals.filter(m => !!m.dish_category && dishTypes.includes(m.dish_category));
          }
          // Cuisine (OR logic — match any selected cuisine; check cuisines[] array)
          if (cuisines.length > 0) {
            meals = meals.filter(m =>
              m.cuisines.some(c => cuisines.includes(c)) ||
              (m.cuisine && cuisines.includes(m.cuisine))
            );
          }
          // Protein source (OR logic)
          if (protein.length > 0) {
            meals = meals.filter(m => !!m.protein_source && protein.includes(m.protein_source));
          }
          // Cook time
          if (cookTime) {
            meals = meals.filter(m => m.cooking_time_band === cookTime);
          }
          // Dietary (AND logic — meal must satisfy every selected tag)
          if (dietary.length > 0) {
            meals = meals.filter(m => dietary.every(key => discoverMatchesDietary(m, key)));
          }
          // Intolerances (OR logic — meal must be free from ALL selected allergens; each intolerance is AND)
          if (intolerances.length > 0) {
            meals = meals.filter(m =>
              intolerances.every(intol => (m.allergens ?? []).includes(intol))
            );
          }
          // Occasion (OR logic — meal must match at least one selected occasion)
          if (occasions.length > 0) {
            meals = meals.filter(m =>
              occasions.some(occ => (m.occasions ?? []).includes(occ))
            );
          }
          // Spice level (maps taste_spiciness 0-100: mild ≤15, medium 16-35, hot 36+)
          if (spiceLevel === 'mild') {
            meals = meals.filter(m => (m.taste_spiciness ?? 0) <= 15);
          } else if (spiceLevel === 'medium') {
            meals = meals.filter(m => {
              const s = m.taste_spiciness ?? 0;
              return s >= 16 && s <= 35;
            });
          } else if (spiceLevel === 'hot') {
            meals = meals.filter(m => (m.taste_spiciness ?? 0) >= 36);
          }
          // Calories per serving
          if (calories === 'under_400') {
            meals = meals.filter(m => m.calories_per_serving < 400);
          } else if (calories === '400_600') {
            meals = meals.filter(m => m.calories_per_serving >= 400 && m.calories_per_serving <= 600);
          } else if (calories === 'over_600') {
            meals = meals.filter(m => m.calories_per_serving > 600);
          }
        }

        return { ...carousel, meals };
      })
      .filter(carousel => carousel.meals.length > 0);
  }, [carousels, discoverFilters]);

  // Search: filter the full DISCOVER_MEALS list by name, cuisine, description, and ingredients.
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return DISCOVER_MEALS.filter(m =>
      m.name.toLowerCase().includes(q) ||
      (m.cuisine && m.cuisine.toLowerCase().includes(q)) ||
      (m.description && m.description.toLowerCase().includes(q)) ||
      m.ingredients.some(i => i.name.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  const MealActionSheet = useCallback(({ visible, meal, onClose }: { visible: boolean; meal: DiscoverMeal | null; onClose: () => void }) => {
    if (!meal) return null;
    const saved = isFav(meal.id);
    const timeLabel = meal.cook_time ? meal.cook_time + 'm' : meal.prep_time ? meal.prep_time + 'm' : '?';
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={onClose}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 32 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', marginRight: 12 }}>
              {meal.image_url ? (
                <Image source={{ uri: meal.image_url }} style={{ width: 52, height: 52 }} resizeMode="cover" />
              ) : (
                <MealImagePlaceholder size="thumbnail" mealType={meal.meal_type} cuisine={meal.cuisine} name={meal.name} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 }} numberOfLines={2}>
                {meal.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {meal.cuisine && (
                  <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>{meal.cuisine}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{timeLabel}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { handleAddToPlan(meal); onClose(); }}
            style={{ backgroundColor: Colors.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Add to Meal Plan</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { handleSaveFav(meal); onClose(); }}
              style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: saved ? Colors.primary : Colors.textSecondary }}>
                {saved ? '♥ Saved' : '♡ Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { handleMealPress(meal); onClose(); }}
              style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textSecondary }}>View recipe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [isFav, handleAddToPlan, handleSaveFav, handleMealPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader
        title="Discover"
        rightElement={
          <TouchableOpacity
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              backgroundColor: Colors.surface,
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 16,
            }}
            onPress={() => setShowDiscoverFilter(true)}
          >
            <SlidersHorizontal size={18} color={discoverFilterCount > 0 ? Colors.primary : Colors.text} strokeWidth={2} />
            {discoverFilterCount > 0 && (
              <View style={{
                position: 'absolute',
                top: 4,
                right: 4,
                minWidth: 16,
                height: 16,
                borderRadius: 8,
                backgroundColor: Colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
                paddingHorizontal: 3,
              }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: '#FFFFFF' }}>
                  {discoverFilterCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="discover-scroll"
      >
        <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: Colors.white,
            borderRadius: BorderRadius.button,
            borderWidth: 1,
            borderColor: Colors.surface,
            height: 44,
            paddingHorizontal: 12,
            gap: 8,
          }}>
            <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes…"
              placeholderTextColor={Colors.textSecondary}
              returnKeyType="search"
              style={{
                flex: 1,
                fontSize: 15,
                color: Colors.text,
              }}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                <X size={16} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Household dietary indicator — shown when family prefs are set in Family Settings */}
        {(() => {
          const activePrefs = familySettings.dietary_preferences_family.filter(p => p !== 'No Restrictions');
          if (activePrefs.length === 0) return null;
          return (
            <TouchableOpacity
              onPress={() => router.push('/family-settings' as Href)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: 16,
                marginBottom: 10,
                backgroundColor: Colors.primaryLight,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <ShieldCheck size={14} color={Colors.primary} strokeWidth={2} style={{ marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
                <Text style={{ fontWeight: '600', color: Colors.primary }}>Household filter: </Text>
                {activePrefs.join(' · ')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary, marginLeft: 8 }}>Edit</Text>
              <ChevronRight size={13} color={Colors.primary} strokeWidth={2} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          );
        })()}

        {/* Search results — shown only when a query is active */}
        {searchQuery.trim().length > 0 ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 8, paddingBottom: 100 }}>
            <Text style={{ fontSize: 13, color: Colors.textSecondary, marginBottom: 12 }}>
              {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &quot;{searchQuery.trim()}&quot;
            </Text>
            {searchResults.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Search size={56} color={Colors.textSecondary} strokeWidth={1.5} />
                <Text style={styles.emptyTitle}>No recipes found</Text>
                <Text style={styles.emptySubtitle}>Try searching by name, cuisine, or ingredient</Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                {searchResults.map(meal => (
                  <DiscoverCarouselCard
                    key={meal.id}
                    meal={meal}
                    onPress={() => handleMealPress(meal)}
                    style={{ width: _GRID_CARD_WIDTH, height: Math.round(_GRID_CARD_WIDTH * 1.35) }}
                  />
                ))}
              </View>
            )}
          </View>
        ) : (
        <>
        {filteredCarousels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Compass size={64} color={Colors.textSecondary} strokeWidth={1.5} />
            <Text style={styles.emptyTitle}>Discovering your taste</Text>
            <Text style={styles.emptySubtitle}>
              {discoverFilterCount > 0
                ? 'Try adjusting or clearing your filters to see more recipes'
                : 'Add meals to your plan and we will personalise your picks'}
            </Text>
          </View>
        ) : (
          filteredCarousels.map((carousel, index) => (
            <View key={carousel.id} style={{ marginBottom: 16, ...(index === 0 ? { marginTop: 20 } : {}) }}>
              <View style={styles.carouselHeader}>
                <Text style={styles.carouselTitle}>{carousel.emoji} {carousel.title}</Text>
              </View>
              {carousel.subtitle ? (
                <Text style={styles.carouselSubtitle}>{carousel.subtitle}</Text>
              ) : null}
              <View style={{ height: CAROUSEL_CARD_HEIGHT }}>
                <FlatList
                  horizontal
                  data={carousel.meals}
                  keyExtractor={item => `${carousel.id}-${item.id}`}
                  renderItem={({ item }) => (
                    <DiscoverCarouselCard
                      meal={item}
                      onPress={() => {
                        recordInteraction({ meal_id: item.id, event_type: 'carousel_tap', metadata: { carousel_id: carousel.id } });
                        recordView(item.id);
                        handleMealPress(item);
                      }}
                      onLongPress={() => handleCardPress(item)}
                      width={CAROUSEL_CARD_WIDTH}
                      height={CAROUSEL_CARD_HEIGHT}
                    />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                  ListFooterComponent={() => (
                    <TouchableOpacity
                      onPress={() =>
                        router.push(
                          `/discover-collection?mealIds=${encodeURIComponent(
                            carousel.meals.map(m => m.id).join(',')
                          )}&title=${encodeURIComponent(carousel.title)}&emoji=${encodeURIComponent(carousel.emoji)}` as Href
                        )
                      }
                      style={{
                        width: CAROUSEL_CARD_WIDTH,
                        height: CAROUSEL_CARD_HEIGHT,
                        borderRadius: 14,
                        backgroundColor: Colors.primaryLight,
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginLeft: 12,
                        gap: 8,
                      }}
                    >
                      <View style={{
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: Colors.primary,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <ArrowRight size={16} color={Colors.white} strokeWidth={2.5} />
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.primary, textAlign: 'center' }}>
                        See all
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
        </>
        )}
      </ScrollView>

      <MealActionSheet
        visible={actionSheetVisible}
        meal={actionMeal}
        onClose={() => { setActionSheetVisible(false); setActionMeal(null); }}
      />

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => {
          setSlotPickerVisible(false);
          setSelectedMeal(null);
        }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealsForSlot={getMealsForSlot}
        mealName={selectedMeal?.name ?? ''}
      />

      <RecipeFilterSheet
        visible={showDiscoverFilter}
        onClose={() => setShowDiscoverFilter(false)}
        onApply={(state) => setDiscoverFilters(state)}
        initialState={discoverFilters}
        config={DISCOVER_FILTER_CONFIG}
      />

      {toastMsg !== null && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 90,
            alignSelf: 'center',
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
            backgroundColor: '#111827',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            maxWidth: 320,
            shadowColor: Colors.shadow,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Check size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', flexShrink: 1 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 22,
  },
  carouselHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  carouselTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  carouselSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
