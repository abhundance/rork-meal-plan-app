import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Animated,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href, useFocusEffect } from 'expo-router';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import {
  Search,
  X,
  Plus,
  Clock,
  Heart,
  CalendarPlus,
  Check,
  SlidersHorizontal,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import { consumePendingDeliveryLink } from '@/services/pendingDeliveryLink';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import FilterPill from '@/components/FilterPill';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs, useFilteredFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { Meal, PlannedMeal } from '@/types';
import RecipeFilterSheet, {
  RecipeFilterState,
  RecipeFilterConfig,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
} from '@/components/RecipeFilterSheet';

const FAVS_FILTER_CONFIG: RecipeFilterConfig = {
  showSort:     true,
  showCuisine:  true,
  showCookTime: true,
  showDietary:  true,
  showProtein:  false,
  showCalories: false,
};

export default function FavsScreen() {
  const insets = useSafeAreaInsets();
  const { meals, recentSearches, isLoading, removeFav, addFav, addRecentSearch, clearRecentSearches, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealsForSlot } = useMealPlan();

  const [activeSegment, setActiveSegment] = useState<'my_recipes' | 'saved'>('my_recipes');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [favFilters, setFavFilters] = useState<RecipeFilterState>(DEFAULT_FILTER_STATE);
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<Meal | null>(null);

  const [showAddMethodSheet, setShowAddMethodSheet] = useState<boolean>(false);
  const [addMethodMode, setAddMethodMode] = useState<'choose' | 'quick_add'>('choose');
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddDeliveryUrl, setQuickAddDeliveryUrl] = useState<string>('');
  const [quickAddSource, setQuickAddSource] = useState<'manual' | 'delivery'>('manual');

  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);

  const myRecipesCount = useMemo(() => meals.filter(m => m.source === 'family_created').length, [meals]);
  const savedCount = useMemo(() => meals.filter(m => m.source !== 'family_created').length, [meals]);

  const uniqueCuisines = useMemo(() => {
    const seen = new Set<string>();
    meals.forEach((m) => { if (m.cuisine) seen.add(m.cuisine); });
    return [...seen].sort();
  }, [meals]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const allFilteredMeals = useFilteredFavs(search, favFilters);

  const filteredMeals = useMemo(() => {
    if (activeSegment === 'my_recipes') {
      return allFilteredMeals.filter(m => m.source === 'family_created');
    }
    return allFilteredMeals.filter(m => m.source !== 'family_created');
  }, [allFilteredMeals, activeSegment]);

  const gridData = useMemo(() => {
    if (activeSegment === 'my_recipes') {
      return [{ id: '__add_tile__', _isAddTile: true } as any, ...filteredMeals];
    }
    return filteredMeals;
  }, [activeSegment, filteredMeals]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
  }, []);

  const handleSearchSubmit = useCallback(() => {
    if (search.trim()) {
      addRecentSearch(search.trim());
    }
    setSearchFocused(false);
  }, [search, addRecentSearch]);

  const handleRecentSearchTap = useCallback((term: string) => {
    setSearch(term);
    setSearchFocused(false);
  }, []);

  const clearFilters = useCallback(() => {
    setFavFilters(DEFAULT_FILTER_STATE);
    setSearch('');
  }, []);

  const handleSegmentChange = useCallback((segment: 'my_recipes' | 'saved') => {
    setActiveSegment(segment);
    setSearch('');
    setFavFilters(DEFAULT_FILTER_STATE);
  }, []);

  const handleAddToPlan = useCallback((meal: Meal) => {
    setSelectedMealForPlan(meal);
    setSlotPickerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSlotSelected = useCallback(
    (date: string, slotId: string) => {
      if (!selectedMealForPlan) return;
      const planned: PlannedMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: slotId,
        date,
        meal_name: selectedMealForPlan.name,
        meal_image_url: selectedMealForPlan.image_url,
        serving_size: familySettings.default_serving_size,
        ingredients: selectedMealForPlan.ingredients,
        recipe_serving_size: selectedMealForPlan.recipe_serving_size,
        delivery_url: selectedMealForPlan.delivery_url,
        delivery_platform: selectedMealForPlan.delivery_platform,
        meal_id: selectedMealForPlan.id,
      };
      addMeal(planned);
      incrementPlanCount(selectedMealForPlan.id);
      setSlotPickerVisible(false);
      setSelectedMealForPlan(null);
      showToast(`${selectedMealForPlan.name} added to your meal plan`);
    },
    [selectedMealForPlan, addMeal, incrementPlanCount, familySettings, showToast]
  );

  const handleMealPress = useCallback((meal: Meal) => {
    router.push(`/recipe-detail?id=${meal.id}&source=favs` as Href);
  }, []);

  const handleDeleteMyRecipe = useCallback((meal: Meal) => {
    Alert.alert(
      'Delete recipe?',
      `"${meal.name}" will be permanently deleted. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFav(meal.id) },
      ]
    );
  }, [removeFav]);

  const handleRemoveSaved = useCallback((meal: Meal) => {
    Alert.alert('Remove from Favs?', `Remove "${meal.name}" from your favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFav(meal.id) },
    ]);
  }, [removeFav]);

  const handleQuickAddSave = useCallback(() => {
    if (!quickAddName.trim()) return;
    const trimmedUrl = quickAddDeliveryUrl.trim();
    const newMeal: Meal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      name: quickAddName.trim(),
      source: 'family_created',
      ingredients: [],
      recipe_serving_size: familySettings.default_serving_size,
      dietary_tags: [],
      custom_tags: [],
      method_steps: [],
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: false,
      is_recipe_complete: false,
      delivery_url: trimmedUrl || undefined,
      delivery_platform: trimmedUrl ? (detectPlatformFromUrl(trimmedUrl) ?? undefined) : undefined,
    };
    addFav(newMeal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setQuickAddName('');
    setQuickAddDeliveryUrl('');
    setShowAddMethodSheet(false);
    setAddMethodMode('choose');
  }, [quickAddName, quickAddDeliveryUrl, addFav, familySettings]);

  useFocusEffect(
    useCallback(() => {
      const pending = consumePendingDeliveryLink();
      if (pending) {
        setQuickAddDeliveryUrl(pending.url);
        setAddMethodMode('quick_add');
        setShowAddMethodSheet(true);
      }
    }, [])
  );

  const openAddMethodSheet = useCallback(() => {
    setAddMethodMode('choose');
    setQuickAddName('');
    setQuickAddDeliveryUrl('');
    setQuickAddSource('manual');
    setShowAddMethodSheet(true);
  }, []);

  const filterCount = countActiveFilters(favFilters, FAVS_FILTER_CONFIG);
  const hasFilters = filterCount > 0 || search.trim().length > 0;

  const renderMyRecipeItem = useCallback(({ item }: { item: any }) => {
    if (item._isAddTile) {
      return (
        <TouchableOpacity
          style={styles.addTileCard}
          onPress={openAddMethodSheet}
          activeOpacity={0.75}
          testID="add-recipe-tile"
        >
          <View style={styles.listAccentBand} />
          <View style={styles.addTileRow}>
            <View style={styles.addTileIcon}>
              <Ionicons name="add-circle-outline" size={26} color={Colors.textSecondary} />
            </View>
            <View style={styles.addTileTextBlock}>
              <Text style={styles.addTileName}>Add Recipe</Text>
              <Text style={styles.addTileSubtitle}>Tap to add yours</Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <MyRecipeGridCard
        meal={item}
        onPress={() => handleMealPress(item)}
        onAddToPlan={() => handleAddToPlan(item)}
        onDelete={() => handleDeleteMyRecipe(item)}
        onLongPress={() => handleDeleteMyRecipe(item)}
      />
    );
  }, [handleMealPress, handleAddToPlan, handleDeleteMyRecipe]);

  const renderSavedItem = useCallback(({ item }: { item: Meal }) => (
    <SavedMealGridCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onAddToPlan={() => handleAddToPlan(item)}
      onRemove={() => handleRemoveSaved(item)}
    />
  ), [handleMealPress, handleAddToPlan, handleRemoveSaved]);

  const MyRecipesEmptyState = useMemo(() => (
    <View style={styles.segmentEmptyContainer}>
      <Ionicons name="restaurant-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.segmentEmptyTitle}>No recipes yet</Text>
      <Text style={styles.segmentEmptySubtitle}>
        Add your family's favourite meals to keep them all in one place
      </Text>
      <TouchableOpacity
        style={styles.segmentEmptyCta}
        onPress={openAddMethodSheet}
      >
        <Text style={styles.segmentEmptyCtaText}>Add a Meal</Text>
      </TouchableOpacity>
    </View>
  ), []);

  const SavedEmptyState = useMemo(() => (
    <View style={styles.segmentEmptyContainer}>
      <Ionicons name="bookmark-outline" size={64} color={Colors.textSecondary} />
      <Text style={styles.segmentEmptyTitle}>Nothing saved yet</Text>
      <Text style={styles.segmentEmptySubtitle}>
        Browse Discover and tap ♡ on any recipe to save it here
      </Text>
    </View>
  ), []);

  const SearchEmptyState = useMemo(() => (
    <View style={styles.segmentEmptyContainer}>
      <Ionicons name="search-outline" size={48} color={Colors.textSecondary} />
      <Text style={styles.segmentEmptyTitle}>No meals found</Text>
      <Text style={styles.segmentEmptySubtitle}>
        {search ? `No results for "${search}"` : 'Try adjusting your filters'}
      </Text>
      <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
        <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  ), [search, clearFilters]);

  const getEmptyComponent = useCallback(() => {
    if (hasFilters) return SearchEmptyState;
    return activeSegment === 'my_recipes' ? MyRecipesEmptyState : SavedEmptyState;
  }, [hasFilters, activeSegment, MyRecipesEmptyState, SavedEmptyState, SearchEmptyState]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader
        title="Favourites"
        rightElement={
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => setShowFilterSheet(true)}
            testID="favs-filter-btn"
          >
            <SlidersHorizontal size={18} color={filterCount > 0 ? Colors.primary : Colors.text} strokeWidth={2} />
            {filterCount > 0 && (
              <View style={styles.filterBadgeCount}>
                <Text style={styles.filterBadgeCountText}>{filterCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      />

      <View style={styles.segmentedControl}>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'my_recipes' && styles.segmentBtnActive]}
          onPress={() => handleSegmentChange('my_recipes')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'my_recipes' && styles.segmentBtnTextActive]}>
            My Meals
          </Text>
          <View style={[styles.segmentBadge, activeSegment === 'my_recipes' && styles.segmentBadgeActive]}>
            <Text style={[styles.segmentBadgeText, activeSegment === 'my_recipes' && styles.segmentBadgeTextActive]}>
              {myRecipesCount}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, activeSegment === 'saved' && styles.segmentBtnActive]}
          onPress={() => handleSegmentChange('saved')}
          activeOpacity={0.8}
        >
          <Text style={[styles.segmentBtnText, activeSegment === 'saved' && styles.segmentBtnTextActive]}>
            Saved
          </Text>
          <View style={[styles.segmentBadge, activeSegment === 'saved' && styles.segmentBadgeActive]}>
            <Text style={[styles.segmentBadgeText, activeSegment === 'saved' && styles.segmentBadgeTextActive]}>
              {savedCount}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search meals or ingredients..."
          placeholderTextColor={Colors.textSecondary}
          value={search}
          onChangeText={handleSearch}
          onFocus={() => setSearchFocused(true)}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
          testID="favs-search"
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <X size={16} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      {searchFocused && search.length === 0 && recentSearches.length > 0 && (
        <View style={styles.recentSearches}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent searches</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
              <Text style={styles.recentClear}>Clear</Text>
            </TouchableOpacity>
          </View>
          {recentSearches.map((term) => (
            <TouchableOpacity
              key={term}
              style={styles.recentItem}
              onPress={() => handleRecentSearchTap(term)}
            >
              <Search size={14} color={Colors.textSecondary} strokeWidth={1.5} />
              <Text style={styles.recentItemText}>{term}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {filterCount > 0 && (
        <TouchableOpacity
          style={styles.activeFilterBar}
          onPress={clearFilters}
        >
          <Text style={styles.activeFilterBarText}>{filterCount} filter{filterCount > 1 ? 's' : ''} active</Text>
          <X size={12} color={Colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

      <FlatList
        data={gridData}
        renderItem={activeSegment === 'my_recipes' ? renderMyRecipeItem : renderSavedItem}
        keyExtractor={(item) => item.id}
        numColumns={1}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListEmptyComponent={getEmptyComponent()}
        testID="favs-grid"
      />

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => {
          setSlotPickerVisible(false);
          setSelectedMealForPlan(null);
        }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealsForSlot={getMealsForSlot}
        mealName={selectedMealForPlan?.name ?? ''}
      />

      <Modal
        visible={showAddMethodSheet}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowAddMethodSheet(false);
          setAddMethodMode('choose');
          setQuickAddName('');
          setQuickAddDeliveryUrl('');
          setQuickAddSource('manual');
        }}
      >
        <KeyboardAvoidingView style={styles.addMethodOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => {
              setShowAddMethodSheet(false);
              setAddMethodMode('choose');
              setQuickAddName('');
              setQuickAddDeliveryUrl('');
              setQuickAddSource('manual');
            }}
          />
          <View style={[styles.addMethodSheet, { paddingBottom: insets.bottom + 16 }]}>
          {addMethodMode === 'choose' ? (
            <>
              <View style={styles.addMethodHandle} />
              <Text style={styles.addMethodTitle}>How would you like to add?</Text>
              <View style={{ paddingHorizontal: 20, gap: 10, marginBottom: 24 }}>
                <TouchableOpacity
                  style={styles.addMethodOptionRow}
                  activeOpacity={0.82}
                  onPress={() => {
                    setShowAddMethodSheet(false);
                    router.push('/add-recipe-entry' as Href);
                  }}
                >
                  <View style={styles.addMethodOptionIcon}>
                    <Ionicons name="document-text-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add with Recipe</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>URL, camera, YouTube & more</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMethodOptionRow}
                  activeOpacity={0.82}
                  onPress={() => { setQuickAddSource('manual'); setAddMethodMode('quick_add'); }}
                >
                  <View style={styles.addMethodOptionIcon}>
                    <Ionicons name="pencil-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add without Recipe</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>Just a name — add the recipe later</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMethodOptionRow}
                  activeOpacity={0.82}
                  onPress={async () => {
                    const text = (await Clipboard.getStringAsync())?.trim() ?? '';
                    if (text && detectPlatformFromUrl(text)) {
                      setQuickAddDeliveryUrl(text);
                    }
                    setQuickAddSource('delivery');
                    setAddMethodMode('quick_add');
                  }}
                >
                  <View style={styles.addMethodOptionIcon}>
                    <Ionicons name="bicycle-outline" size={22} color={Colors.primary} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add from Delivery App</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>Save a link from Uber Eats, Grab & more</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.addMethodCancel}
                onPress={() => setShowAddMethodSheet(false)}
              >
                <Text style={styles.addMethodCancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <View style={styles.addMethodHandle} />
              <View style={styles.addMethodBackRow}>
                <TouchableOpacity onPress={() => { setAddMethodMode('choose'); setQuickAddSource('manual'); }}>
                  <Ionicons name="chevron-back" size={20} color={Colors.primary} />
                </TouchableOpacity>
                <Text style={styles.addMethodBackTitle}>{quickAddSource === 'delivery' ? 'Add from Delivery App' : 'Add without Recipe'}</Text>
              </View>
              <TextInput
                style={styles.addMethodInput}
                placeholder={quickAddSource === 'delivery' ? "e.g. Butter Chicken from Spice Garden" : "e.g. Mum's spaghetti bolognese"}
                placeholderTextColor={Colors.textSecondary}
                value={quickAddName}
                onChangeText={setQuickAddName}
                autoCapitalize="words"
                autoFocus
              />
              <Text style={styles.addMethodHint}>
                Recipe details can be added later from the meal screen.
              </Text>
              {quickAddSource === 'delivery' && (
                <>
                  <Text style={styles.addMethodDeliveryLabel}>Delivery link (optional)</Text>
                  <View style={styles.addMethodDeliveryRow}>
                    <TextInput
                      style={styles.addMethodDeliveryInput}
                      placeholder="Paste Uber Eats, Zomato, Grab link..."
                      placeholderTextColor={Colors.textSecondary}
                      value={quickAddDeliveryUrl}
                      onChangeText={setQuickAddDeliveryUrl}
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                    <TouchableOpacity
                      onPress={async () => {
                        const text = await Clipboard.getStringAsync();
                        if (text) setQuickAddDeliveryUrl(text);
                      }}
                      style={styles.addMethodClipboardBtn}
                    >
                      <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
                    </TouchableOpacity>
                  </View>
                  {quickAddDeliveryUrl.trim().length > 0 && (
                    <View style={styles.addMethodPlatformChip}>
                      <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                      <Text style={styles.addMethodPlatformChipText}>
                        {getPlatformLabel(detectPlatformFromUrl(quickAddDeliveryUrl.trim()))} detected
                      </Text>
                    </View>
                  )}
                </>
              )}
              <TouchableOpacity
                style={[styles.addMethodSaveBtn, !quickAddName.trim() && { opacity: 0.4 }]}
                onPress={handleQuickAddSave}
                disabled={!quickAddName.trim()}
              >
                <Text style={styles.addMethodSaveBtnText}>Save Meal</Text>
              </TouchableOpacity>
            </>
          )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <RecipeFilterSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        onApply={(state) => setFavFilters(state)}
        initialState={favFilters}
        config={{
          ...FAVS_FILTER_CONFIG,
          cuisineOptions: uniqueCuisines.map((c) => ({ key: c, label: c })),
        }}
      />

      {activeSegment === 'my_recipes' && (
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={openAddMethodSheet}
          activeOpacity={0.85}
          testID="fab-add-meal"
        >
          <Plus size={20} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      )}

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
            shadowColor: '#000',
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

interface MyRecipeGridCardProps {
  meal: Meal;
  onPress: () => void;
  onAddToPlan: () => void;
  onDelete: () => void;
  onLongPress: () => void;
}

const MyRecipeGridCard = React.memo(function MyRecipeGridCard({
  meal, onPress, onAddToPlan, onDelete, onLongPress,
}: MyRecipeGridCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const totalTime = (meal.prep_time ?? 0) + (meal.cook_time ?? 0);

  return (
    <Animated.View style={[styles.listCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.listAccentBand} />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        style={styles.listCardRow}
      >
        {meal.image_url ? (
          <Image source={{ uri: meal.image_url }} style={{ width: 42, height: 42, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <MealImagePlaceholder size="thumbnail" mealType={meal.meal_type} cuisine={meal.cuisine} name={meal.name} />
        )}
        <View style={styles.listCardContent}>
          <Text style={styles.listMealName} numberOfLines={1}>{meal.name}</Text>
          <View style={styles.listMeta}>
            {meal.cuisine ? (
              <View style={styles.cuisinePill}>
                <Text style={styles.cuisinePillText}>{meal.cuisine}</Text>
              </View>
            ) : null}
            {totalTime > 0 && (
              <>
                <Ionicons name="time-outline" size={11} color="#8B7EA8" />
                <Text style={styles.timeText}>{totalTime} min</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.listEditBtn}
            onPress={() => router.push({ pathname: '/add-recipe-manual', params: { editId: meal.id } })}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.listPlanBtn} onPress={onAddToPlan} activeOpacity={0.85}>
            <CalendarPlus size={15} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

interface SavedMealGridCardProps {
  meal: Meal;
  onPress: () => void;
  onAddToPlan: () => void;
  onRemove: () => void;
}

const SavedMealGridCard = React.memo(function SavedMealGridCard({
  meal, onPress, onAddToPlan, onRemove,
}: SavedMealGridCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const totalTime = (meal.prep_time ?? 0) + (meal.cook_time ?? 0);

  return (
    <Animated.View style={[styles.listCard, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.listAccentBand} />
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onRemove}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        style={styles.listCardRow}
      >
        {meal.image_url ? (
          <Image source={{ uri: meal.image_url }} style={{ width: 42, height: 42, borderRadius: 12 }} resizeMode="cover" />
        ) : (
          <MealImagePlaceholder size="thumbnail" mealType={meal.meal_type} cuisine={meal.cuisine} name={meal.name} />
        )}
        <View style={styles.listCardContent}>
          <Text style={styles.listMealName} numberOfLines={1}>{meal.name}</Text>
          <View style={styles.listMeta}>
            {meal.cuisine ? (
              <View style={styles.cuisinePill}>
                <Text style={styles.cuisinePillText}>{meal.cuisine}</Text>
              </View>
            ) : null}
            {totalTime > 0 && (
              <>
                <Ionicons name="time-outline" size={11} color="#8B7EA8" />
                <Text style={styles.timeText}>{totalTime} min</Text>
              </>
            )}
          </View>
        </View>
        <View style={styles.listActions}>
          <TouchableOpacity
            style={styles.listHeartBtn}
            onPress={onRemove}
            hitSlop={8}
          >
            <Heart size={14} color={Colors.primary} fill={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.listPlanBtn} onPress={onAddToPlan} activeOpacity={0.85}>
            <CalendarPlus size={15} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 3,
    marginHorizontal: Spacing.lg,
    marginTop: 16,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: Colors.card,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: Colors.primary,
  },
  segmentBadge: {
    backgroundColor: 'rgba(139,126,168,0.15)',
    borderRadius: 9999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  segmentBadgeActive: {
    backgroundColor: Colors.primaryLight,
  },
  segmentBadgeText: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
  },
  segmentBadgeTextActive: {
    color: Colors.primary,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  filterBadgeCount: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 3,
  },
  filterBadgeCountText: {
    fontSize: 9,
    fontWeight: '700' as const,
    color: '#FFFFFF',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: 0,
    marginBottom: 12,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 10,
  },
  recentSearches: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 4,
    borderRadius: BorderRadius.button,
    padding: 12,
    ...Shadows.card,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  recentClear: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  recentItemText: {
    fontSize: 14,
    color: Colors.text,
  },
  filterRow: {
    marginTop: 8,
    minHeight: 44,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    gap: 8,
    alignItems: 'center',
  },
  gridContent: {
    paddingTop: 0,
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  listCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  listAccentBand: {
    height: 4,
    backgroundColor: '#F0EEF9',
    width: '100%',
  },
  listCardRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  listCardContent: {
    flex: 1,
  },
  listMealName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#2C2C2C',
    marginBottom: 4,
  },
  listMeta: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  cuisinePill: {
    backgroundColor: '#F0EEF9',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  cuisinePillText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: '#7B68CC',
  },
  timeText: {
    fontSize: 11,
    color: '#8B7EA8',
  },
  listActions: {
    alignItems: 'center' as const,
    gap: 8,
  },
  listEditBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listHeartBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listPlanBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentEmptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 20,
  },
  segmentEmptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  segmentEmptySubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  segmentEmptyCta: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  segmentEmptyCtaText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  clearFiltersBtn: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  clearFiltersBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  cuisineFilterRow: {
    minHeight: 44,
    marginBottom: 8,
  },
  activeFilterBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingVertical: 7,
    paddingHorizontal: 12,
    alignSelf: 'flex-start' as const,
  },
  activeFilterBarText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  fab: {
    position: 'absolute' as const,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#5B21B6',
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
  addMethodOverlay: {
    flex: 1,
    justifyContent: 'flex-end' as const,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  addMethodSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  addMethodHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center' as const,
    marginTop: 10,
    marginBottom: 16,
  },
  addMethodTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  addMethodOptionRow: {
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  addMethodOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  addMethodOptionTextBlock: {
    flex: 1,
  },
  addMethodCancel: {
    paddingVertical: 12,
    alignItems: 'center' as const,
    marginBottom: 8,
  },
  addMethodCancelText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
  addMethodBackRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 8,
  },
  addMethodBackTitle: {
    fontSize: 17,
    fontWeight: '700' as const,
    color: Colors.text,
    flex: 1,
  },
  addMethodInput: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  addMethodHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  addMethodSaveBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginHorizontal: 20,
    marginBottom: 24,
    marginTop: 20,
  },
  addMethodSaveBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  addMethodDeliveryLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    alignSelf: 'flex-start' as const,
    marginBottom: 6,
    marginTop: 16,
    marginHorizontal: 20,
  },
  addMethodDeliveryRow: {
    flexDirection: 'row' as const,
    gap: 8,
    alignItems: 'center' as const,
    marginHorizontal: 20,
    marginBottom: 0,
  },
  addMethodDeliveryInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
  },
  addMethodClipboardBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  addMethodPlatformChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 6,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  addMethodPlatformChipText: {
    fontSize: 12,
    color: Colors.primary,
  },
  addTileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  addTileRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  addTileIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  addTileTextBlock: {
    flex: 1,
  },
  addTileName: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  addTileSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
});
