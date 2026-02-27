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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href, useFocusEffect } from 'expo-router';
import { Image } from 'expo-image';
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
import { FavMeal, PlannedMeal } from '@/types';

const SORT_OPTIONS = [
  { key: 'recently_added', label: 'Recently Added' },
  { key: 'most_used', label: 'Most Used' },
  { key: 'recently_planned', label: 'Recently Planned' },
  { key: 'cooking_time', label: 'Cooking Time' },
  { key: 'a_to_z', label: 'A to Z' },
];

export default function FavsScreen() {
  const insets = useSafeAreaInsets();
  const { meals, recentSearches, isLoading, removeFav, addFav, addRecentSearch, clearRecentSearches, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot } = useMealPlan();

  const [activeSegment, setActiveSegment] = useState<'my_recipes' | 'saved'>('my_recipes');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('recently_added');
  const [activeMealTypeFilter, setActiveMealTypeFilter] = useState<string>('');
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string>('');
  const [activeCookTimeFilter, setActiveCookTimeFilter] = useState<string>('');
  const [activeDietaryFilter, setActiveDietaryFilter] = useState<string>('');
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<FavMeal | null>(null);

  const [showAddMethodSheet, setShowAddMethodSheet] = useState<boolean>(false);
  const [addMethodMode, setAddMethodMode] = useState<'choose' | 'quick_add'>('choose');
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddDeliveryUrl, setQuickAddDeliveryUrl] = useState<string>('');
  const [quickAddSource, setQuickAddSource] = useState<'manual' | 'delivery'>('manual');

  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);
  const [sheetSort, setSheetSort] = useState<string>(sortBy);
  const [sheetCuisine, setSheetCuisine] = useState<string>(activeCuisineFilter);
  const [sheetCookTime, setSheetCookTime] = useState<string>(activeCookTimeFilter);
  const [sheetDietary, setSheetDietary] = useState<string>('');

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

  const filters = useMemo(() => ({
    ...(activeMealTypeFilter ? { mealType: activeMealTypeFilter }      : {}),
    ...(activeCuisineFilter   ? { cuisine: activeCuisineFilter }       : {}),
    ...(activeCookTimeFilter  ? { cookingTime: activeCookTimeFilter }  : {}),
    ...(activeDietaryFilter   ? { activeDietary: activeDietaryFilter } : {}),
  }), [activeMealTypeFilter, activeCuisineFilter, activeCookTimeFilter, activeDietaryFilter]);

  const allFilteredMeals = useFilteredFavs(search, filters, sortBy);

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
    setActiveMealTypeFilter('');
    setActiveCuisineFilter('');
    setActiveCookTimeFilter('');
    setActiveDietaryFilter('');
    setSearch('');
  }, []);

  const handleSegmentChange = useCallback((segment: 'my_recipes' | 'saved') => {
    setActiveSegment(segment);
    setSearch('');
    setActiveMealTypeFilter('');
    setActiveCuisineFilter('');
    setActiveCookTimeFilter('');
    setActiveDietaryFilter('');
  }, []);

  const handleAddToPlan = useCallback((meal: FavMeal) => {
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
      };
      addMeal(planned);
      incrementPlanCount(selectedMealForPlan.id);
      setSlotPickerVisible(false);
      setSelectedMealForPlan(null);
      showToast(`${selectedMealForPlan.name} added to your meal plan`);
    },
    [selectedMealForPlan, addMeal, incrementPlanCount, familySettings, showToast]
  );

  const handleMealPress = useCallback((meal: FavMeal) => {
    router.push(`/meal-detail?id=${meal.id}&source=favs` as Href);
  }, []);

  const handleDeleteMyRecipe = useCallback((meal: FavMeal) => {
    Alert.alert(
      'Delete recipe?',
      `"${meal.name}" will be permanently deleted. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => removeFav(meal.id) },
      ]
    );
  }, [removeFav]);

  const handleRemoveSaved = useCallback((meal: FavMeal) => {
    Alert.alert('Remove from Favs?', `Remove "${meal.name}" from your favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFav(meal.id) },
    ]);
  }, [removeFav]);

  const handleQuickAddSave = useCallback(() => {
    if (!quickAddName.trim()) return;
    const trimmedUrl = quickAddDeliveryUrl.trim();
    const newMeal: FavMeal = {
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

  const hasFilters = !!activeMealTypeFilter || !!activeCuisineFilter ||
                     !!activeCookTimeFilter || !!activeDietaryFilter ||
                     search.trim().length > 0;

  const renderMyRecipeItem = useCallback(({ item }: { item: any }) => {
    if (item._isAddTile) {
      return (
        <TouchableOpacity
          style={styles.addTileCard}
          onPress={openAddMethodSheet}
          activeOpacity={0.75}
          testID="add-recipe-tile"
        >
          <View style={styles.addTileImageArea}>
            <Ionicons name="add-circle-outline" size={28} color={Colors.textSecondary} />
          </View>
          <View style={styles.addTileBody}>
            <Text style={styles.addTileName}>Add Recipe</Text>
            <Text style={styles.addTileSubtitle}>Tap to add yours</Text>
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

  const renderSavedItem = useCallback(({ item }: { item: FavMeal }) => (
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
            onPress={() => {
              setSheetSort(sortBy);
              setSheetCuisine(activeCuisineFilter);
              setSheetCookTime(activeCookTimeFilter);
              setSheetDietary(activeDietaryFilter);
              setShowFilterSheet(true);
            }}
            testID="favs-filter-btn"
          >
            <SlidersHorizontal size={18} color={Colors.text} strokeWidth={2} />
            {hasFilters && <View style={styles.filterBadge} />}
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
            My Recipes
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

      {(activeCuisineFilter.length > 0 || activeCookTimeFilter.length > 0 || activeDietaryFilter.length > 0) && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.activeFilterRow}
          contentContainerStyle={styles.activeFilterContent}
        >
          {activeCuisineFilter ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setActiveCuisineFilter('')}
            >
              <Text style={styles.activeFilterChipText}>{activeCuisineFilter}</Text>
              <X size={12} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}
          {activeCookTimeFilter ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setActiveCookTimeFilter('')}
            >
              <Text style={styles.activeFilterChipText}>{activeCookTimeFilter} min</Text>
              <X size={12} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}
          {activeDietaryFilter ? (
            <TouchableOpacity
              style={styles.activeFilterChip}
              onPress={() => setActiveDietaryFilter('')}
            >
              <Text style={styles.activeFilterChipText}>
                {activeDietaryFilter === 'vegan'        ? 'Vegan'
               : activeDietaryFilter === 'vegetarian'   ? 'Vegetarian'
               : activeDietaryFilter === 'gluten_free'  ? 'Gluten-Free'
               : activeDietaryFilter === 'dairy_free'   ? 'Dairy-Free'
               : activeDietaryFilter === 'high_protein' ? 'High Protein'
               : activeDietaryFilter}
              </Text>
              <X size={12} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      )}

      <FlatList
        data={gridData}
        renderItem={activeSegment === 'my_recipes' ? renderMyRecipeItem : renderSavedItem}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
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
        getMealForSlot={getMealForSlot}
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
                    router.push('/add-meal-entry' as Href);
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

      <Modal
        visible={showFilterSheet}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowFilterSheet(false)}
      >
        <View style={styles.sheetContainer}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <TouchableOpacity onPress={() => setShowFilterSheet(false)}>
              <X size={22} color="#6B7280" strokeWidth={2} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.sheetSectionLabel}>SORT BY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sheetChipRow}>
              {SORT_OPTIONS.map((opt) => (
                <FilterPill
                  key={opt.key}
                  label={opt.label}
                  active={sheetSort === opt.key}
                  onPress={() => setSheetSort(opt.key)}
                />
              ))}
            </ScrollView>

            {uniqueCuisines.length > 0 && (
              <>
                <Text style={[styles.sheetSectionLabel, { marginTop: 24 }]}>CUISINE</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.sheetChipRow}>
                  {uniqueCuisines.map((c) => (
                    <FilterPill
                      key={c}
                      label={c}
                      active={sheetCuisine === c}
                      onPress={() => setSheetCuisine(sheetCuisine === c ? '' : c)}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            <Text style={[styles.sheetSectionLabel, { marginTop: 24 }]}>COOK TIME</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sheetChipRow}>
              {(['Under 30', '30-60', 'Over 60'] as const).map((t) => (
                <FilterPill
                  key={t}
                  label={`${t} min`}
                  active={sheetCookTime === t}
                  onPress={() => setSheetCookTime(sheetCookTime === t ? '' : t)}
                />
              ))}
            </ScrollView>

            <Text style={[styles.sheetSectionLabel, { marginTop: 24 }]}>DIETARY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.sheetChipRow}>
              {[
                { key: 'vegan',        label: 'Vegan' },
                { key: 'vegetarian',   label: 'Vegetarian' },
                { key: 'gluten_free',  label: 'Gluten-Free' },
                { key: 'dairy_free',   label: 'Dairy-Free' },
                { key: 'high_protein', label: 'High Protein' },
              ].map((opt) => (
                <FilterPill
                  key={opt.key}
                  label={opt.label}
                  active={sheetDietary === opt.key}
                  onPress={() => setSheetDietary(sheetDietary === opt.key ? '' : opt.key)}
                />
              ))}
            </ScrollView>
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.sheetClearBtn}
              onPress={() => {
                setSheetSort('recently_added');
                setSheetCuisine('');
                setSheetCookTime('');
                setSheetDietary('');
              }}
            >
              <Text style={styles.sheetClearText}>Clear All</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.sheetApplyBtn}
              onPress={() => {
                setSortBy(sheetSort);
                setActiveCuisineFilter(sheetCuisine);
                setActiveCookTimeFilter(sheetCookTime);
                setActiveDietaryFilter(sheetDietary);
                setShowFilterSheet(false);
              }}
            >
              <Text style={styles.sheetApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
  meal: FavMeal;
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
    <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
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
      >
        <View style={styles.gridImageWrap}>
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={styles.gridImage} contentFit="cover" />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Ionicons name="restaurant-outline" size={24} color={Colors.textSecondary} />
            </View>
          )}
          {totalTime > 0 && (
            <View style={styles.cookTimeBadge}>
              <Clock size={11} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.cookTimeBadgeText}>{totalTime} min</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cardEditBtn}
            onPress={() => router.push({ pathname: '/add-meal', params: { editId: meal.id } })}
            hitSlop={8}
          >
            <Ionicons name="create-outline" size={16} color={Colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.gridCardBody}>
          <Text style={styles.gridMealName} numberOfLines={2}>{meal.name}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.cardFooterTags}
        >
          {meal.cuisine ? (
            <View style={styles.mealMiniTag}>
              <Text style={styles.mealMiniTagText}>{meal.cuisine}</Text>
            </View>
          ) : null}
        </ScrollView>
        <TouchableOpacity style={styles.mealPlanBtn} onPress={onAddToPlan} activeOpacity={0.85}>
          <CalendarPlus size={16} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
});

interface SavedMealGridCardProps {
  meal: FavMeal;
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
    <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
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
      >
        <View style={styles.gridImageWrap}>
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={styles.gridImage} contentFit="cover" />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Heart size={24} color={Colors.textSecondary} strokeWidth={1.5} />
            </View>
          )}
          {totalTime > 0 && (
            <View style={styles.cookTimeBadge}>
              <Clock size={11} color="#FFFFFF" strokeWidth={2} />
              <Text style={styles.cookTimeBadgeText}>{totalTime} min</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.cardHeartBtn}
            onPress={onRemove}
            hitSlop={8}
          >
            <Heart size={14} color={Colors.primary} fill={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.gridCardBody}>
          <Text style={styles.gridMealName} numberOfLines={2}>{meal.name}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.cardFooter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flex: 1 }}
          contentContainerStyle={styles.cardFooterTags}
        >
          {meal.cuisine ? (
            <View style={styles.mealMiniTag}>
              <Text style={styles.mealMiniTagText}>{meal.cuisine}</Text>
            </View>
          ) : null}
        </ScrollView>
        <TouchableOpacity style={styles.mealPlanBtn} onPress={onAddToPlan} activeOpacity={0.85}>
          <CalendarPlus size={16} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>
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
  filterBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
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
  gridRow: {
    paddingHorizontal: Spacing.lg,
    gap: 12,
  },
  gridContent: {
    paddingTop: 0,
    paddingBottom: 100,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginBottom: 12,
    ...Shadows.card,
  },
  gridImageWrap: {
    aspectRatio: 4 / 3,
    backgroundColor: Colors.surface,
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  gridCardBody: {
    padding: 10,
  },
  gridMealName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  cookTimeBadge: {
    position: 'absolute' as const,
    bottom: 8,
    left: 8,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  cookTimeBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  cardEditBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  cardHeartBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  cardFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 10,
    paddingBottom: 10,
    paddingTop: 2,
    gap: 8,
  },
  cardFooterTags: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  mealMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  mealMiniTagText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#6B7280',
  },
  mealPlanBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
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
  activeFilterRow: {
    maxHeight: 40,
    marginTop: 4,
  },
  activeFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center' as const,
  },
  activeFilterChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.primaryLight,
    borderRadius: 9999,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterChipText: {
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
  sheetContainer: {
    flex: 1,
    backgroundColor: Colors.card,
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
  sheetChipRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingBottom: 4,
  },
  sheetFooter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  sheetClearBtn: {
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  sheetClearText: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#6B7280',
  },
  sheetApplyBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginLeft: 12,
  },
  sheetApplyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
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
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.card,
  },
  addTileImageArea: {
    aspectRatio: 4 / 3,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileBody: {
    padding: 10,
  },
  addTileName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  addTileSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
});
