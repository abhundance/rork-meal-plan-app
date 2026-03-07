import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  Animated,
  ActionSheetIOS,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Pressable,
} from 'react-native';

// Cross-platform action sheet — uses native ActionSheetIOS on iOS, falls back to Alert elsewhere (e.g. Rork web preview)
function showSheet(
  opts: {
    options: string[];
    cancelButtonIndex: number;
    destructiveButtonIndex?: number;
    title?: string;
    message?: string;
  },
  callback: (index: number) => void
) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(opts, callback);
  } else {
    const buttons = opts.options.map((label, i) => ({
      text: label,
      style: (
        i === opts.destructiveButtonIndex ? 'destructive' :
        i === opts.cancelButtonIndex      ? 'cancel'      : 'default'
      ) as 'destructive' | 'cancel' | 'default',
      onPress: () => callback(i),
    }));
    Alert.alert(opts.title ?? '', opts.message ?? '', buttons);
  }
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href, useFocusEffect } from 'expo-router';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  Plus,
  Check,
  SlidersHorizontal,
  ArrowUpDown,
  CalendarPlus,
  Utensils,
  FileText,
  ChevronRight,
  Pencil,
  Bike,
  ChevronLeft,
  Clipboard as ClipboardIcon,
  CheckCircle2,
} from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import { consumePendingDeliveryLink } from '@/services/pendingDeliveryLink';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs, useFilteredFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { Recipe, PlannedMeal } from '@/types';
import RecipeFilterSheet, {
  RecipeFilterState,
  RecipeFilterConfig,
  DEFAULT_FILTER_STATE,
  countActiveFilters,
} from '@/components/RecipeFilterSheet';


const SCREEN_W = Dimensions.get('window').width;
const COLS = 4;
const H_PAD = 12;
const COL_GAP = 6;
const CARD_W = Math.floor((SCREEN_W - H_PAD * 2 - COL_GAP * (COLS - 1)) / COLS);
const CARD_H = Math.round(CARD_W * 1.38);
const IMG_H = Math.round(CARD_H * 0.62);
const STRIP_H = CARD_H - IMG_H;

const FAVS_FILTER_CONFIG: RecipeFilterConfig = {
  showSort:        false,   // Sort is owned by the inline Sort pill, not the filter sheet
  showMealType:    true,
  showDishType:    true,
  showCuisine:     true,
  showProtein:     true,    // dual-presence: also in inline Protein pill
  showCookTime:    true,
  showDietary:     true,
  showCalories:    true,
  showSource:      true,
  showRating:      true,
};

// ─── Inline filter pill option lists ─────────────────────────────────────────
const SORT_OPTIONS = [
  { label: 'Most Used',      value: 'most_used'      },
  { label: 'Newest First',   value: 'recently_added' },
  { label: 'A–Z',            value: 'a_to_z'         },
  { label: 'Quickest First', value: 'cooking_time'   },
];
const MEAL_TYPE_OPTIONS = [
  { label: 'Any',            value: 'all'            },
  { label: 'Breakfast',      value: 'breakfast'      },
  { label: 'Lunch & Dinner', value: 'lunch_dinner'   },
  { label: 'Light Bites',    value: 'light_bites'    },
];
const DISH_TYPE_OPTIONS = [
  { label: 'Any',      value: 'all'     },
  { label: 'Mains',    value: 'main'    },
  { label: 'Salads',   value: 'salad'   },
  { label: 'Soups',    value: 'soup'    },
  { label: 'Desserts', value: 'dessert' },
  { label: 'Sides',    value: 'side'    },
  { label: 'Drinks',   value: 'drink'   },
];
const PROTEIN_OPTIONS = [
  { label: 'Any',          value: 'all'      },
  { label: 'Chicken',      value: 'chicken'  },
  { label: 'Beef',         value: 'beef'     },
  { label: 'Pork',         value: 'pork'     },
  { label: 'Lamb',         value: 'lamb'     },
  { label: 'Turkey',       value: 'turkey'   },
  { label: 'Seafood',      value: 'seafood'  },
  { label: 'Eggs',         value: 'egg'      },
  { label: 'Plant-Based',  value: 'plant'    },
  { label: 'Dairy',        value: 'dairy'    },
];
const DIET_OPTIONS = [
  { label: 'Any',          value: 'all'         },
  { label: 'Vegan',        value: 'vegan'        },
  { label: 'Vegetarian',   value: 'vegetarian'   },
  { label: 'High-Protein', value: 'high-protein' },
  { label: 'Gluten-Free',  value: 'gluten-free'  },
  { label: 'Dairy-Free',   value: 'dairy-free'   },
  { label: 'Keto',         value: 'keto'         },
  { label: 'Low-Carb',     value: 'low-carb'     },
];

export default function FavsScreen() {
  const insets = useSafeAreaInsets();
  const { meals, recentSearches, removeFav, addFav, addRecentSearch, clearRecentSearches, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealsForSlot } = useMealPlan();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [favFilters, setFavFilters] = useState<RecipeFilterState>({ ...DEFAULT_FILTER_STATE, sort: 'most_used' });
  const [mealTypeFilter, setMealTypeFilter] = useState<string>('all');
  const [dishTypeFilter, setDishTypeFilter] = useState<string>('all');
  const [proteinFilter,  setProteinFilter]  = useState<string>('all');
  const [dietFilter,     setDietFilter]     = useState<string>('all');
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<Recipe | null>(null);

  const [showAddMethodSheet, setShowAddMethodSheet] = useState<boolean>(false);
  const [addMethodMode, setAddMethodMode] = useState<'choose' | 'quick_add'>('choose');
  const [quickAddName, setQuickAddName] = useState<string>('');
  const [quickAddDeliveryUrl, setQuickAddDeliveryUrl] = useState<string>('');
  const [quickAddSource, setQuickAddSource] = useState<'manual' | 'delivery'>('manual');

  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);

  const uniqueCuisines = useMemo(() => {
    const seen = new Set<string>();
    meals.forEach((m) => { if (m.cuisine) seen.add(m.cuisine); });
    return [...seen].sort();
  }, [meals]);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const allFilteredMeals = useFilteredFavs(search, {
    ...favFilters,
    // Inline pill overrides (single-select, kept separate from sheet multi-select)
    inlineMealType:  mealTypeFilter,
    inlineDishType:  dishTypeFilter,
    inlineProtein:   proteinFilter,
    inlineDietLabel: dietFilter,
  });

  const filteredMeals = useMemo(() => {
    return allFilteredMeals;
  }, [allFilteredMeals]);

  const gridData = useMemo(() => {
    return [{ id: '__add_tile__', _isAddTile: true } as any, ...filteredMeals];
  }, [filteredMeals]);

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
    setFavFilters({ ...DEFAULT_FILTER_STATE, sort: 'most_used' });
    setSearch('');
    setMealTypeFilter('all');
    setDishTypeFilter('all');
    setProteinFilter('all');
    setDietFilter('all');
  }, []);

  // Scroll back to top whenever any filter/sort/search changes so the grid
  // never shows a phantom blank gap caused by a stale scroll offset.
  useEffect(() => {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, [search, mealTypeFilter, dishTypeFilter, proteinFilter, dietFilter, favFilters]);

  // Cycles to the next sort option on each tap — no sheet needed
  const cycleSortOption = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFavFilters(f => {
      const currentIndex = SORT_OPTIONS.findIndex(o => o.value === f.sort);
      const nextIndex = (currentIndex + 1) % SORT_OPTIONS.length;
      return { ...f, sort: SORT_OPTIONS[nextIndex].value };
    });
  }, []);

  const openMealTypeSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showSheet(
      { options: [...MEAL_TYPE_OPTIONS.map(o => o.label), 'Cancel'], cancelButtonIndex: MEAL_TYPE_OPTIONS.length },
      (i) => { if (i < MEAL_TYPE_OPTIONS.length) setMealTypeFilter(MEAL_TYPE_OPTIONS[i].value); }
    );
  }, []);

  const openDishTypeSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showSheet(
      { options: [...DISH_TYPE_OPTIONS.map(o => o.label), 'Cancel'], cancelButtonIndex: DISH_TYPE_OPTIONS.length },
      (i) => { if (i < DISH_TYPE_OPTIONS.length) setDishTypeFilter(DISH_TYPE_OPTIONS[i].value); }
    );
  }, []);

  const openProteinSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showSheet(
      { options: [...PROTEIN_OPTIONS.map(o => o.label), 'Cancel'], cancelButtonIndex: PROTEIN_OPTIONS.length },
      (i) => { if (i < PROTEIN_OPTIONS.length) setProteinFilter(PROTEIN_OPTIONS[i].value); }
    );
  }, []);

  const openDietSheet = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    showSheet(
      { options: [...DIET_OPTIONS.map(o => o.label), 'Cancel'], cancelButtonIndex: DIET_OPTIONS.length },
      (i) => { if (i < DIET_OPTIONS.length) setDietFilter(DIET_OPTIONS[i].value); }
    );
  }, []);

  const handleAddToPlan = useCallback((meal: Recipe) => {
    setSelectedMealForPlan(meal);
    setSlotPickerVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const handleMealPress = useCallback((meal: Recipe) => {
    router.push(`/recipe-detail?id=${meal.id}&source=favs` as Href);
  }, []);

  const handleDeleteMyRecipe = useCallback((meal: Recipe) => {
    showSheet(
      {
        options: ['Cancel', 'Delete'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
        title: 'Delete recipe?',
        message: meal.name + ' will be permanently deleted.',
      },
      (i) => {
        if (i === 1) removeFav(meal.id);
      }
    );
  }, [removeFav]);

  const handleRemoveSaved = useCallback((meal: Recipe) => {
    showSheet(
      {
        options: ['Cancel', 'Remove from Favs'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 0,
        title: meal.name,
        message: 'Remove from your favourites?',
      },
      (i) => {
        if (i === 1) removeFav(meal.id);
      }
    );
  }, [removeFav]);

  const handleQuickAddSave = useCallback(() => {
    if (!quickAddName.trim()) return;
    const trimmedUrl = quickAddDeliveryUrl.trim();
    const newMeal: Recipe = {
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
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
      // Reset scroll to top every time this tab is focused.
      flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
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
  const hasFilters = filterCount > 0 || search.trim().length > 0 || mealTypeFilter !== 'all' || dishTypeFilter !== 'all' || proteinFilter !== 'all' || dietFilter !== 'all';

  const renderGridItem = useCallback(({ item }: { item: Recipe }) => {
    if ((item as any)._isAddTile) {
      return (
        <TouchableOpacity
          style={{
            width: CARD_W,
            height: CARD_H,
            borderRadius: 12,
            backgroundColor: Colors.primaryLight,
            borderWidth: 1.5,
            borderColor: Colors.primary,
            borderStyle: 'dashed',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
          onPress={openAddMethodSheet}
          activeOpacity={0.8}
          testID="add-recipe-tile"
        >
          <View style={{
            width: 28,
            height: 28,
            borderRadius: 14,
            backgroundColor: Colors.primary,
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Plus size={16} color="#FFFFFF" strokeWidth={2.5} />
          </View>
          <Text style={{ fontSize: 9, fontWeight: '600', color: Colors.primary, textAlign: 'center', lineHeight: 12 }}>Add Meal</Text>
        </TouchableOpacity>
      );
    }
    return (
      <FavGridCard
        meal={item}
        onPress={() => handleMealPress(item)}
        onAddToPlan={() => handleAddToPlan(item)}
        onLongPress={() => item.source === 'family_created' ? handleDeleteMyRecipe(item) : handleRemoveSaved(item)}
      />
    );
  }, [handleMealPress, handleAddToPlan, handleDeleteMyRecipe, handleRemoveSaved, openAddMethodSheet]);

  const MyRecipesEmptyState = useMemo(() => (
    <View style={styles.segmentEmptyContainer}>
      <Utensils size={64} color={Colors.textSecondary} strokeWidth={1.5} />
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
  ), [openAddMethodSheet]);

  const SearchEmptyState = useMemo(() => (
    <View style={styles.segmentEmptyContainer}>
      <Search size={48} color={Colors.textSecondary} strokeWidth={1.5} />
      <Text style={styles.segmentEmptyTitle}>No meals found</Text>
      <Text style={styles.segmentEmptySubtitle}>
        {search ? `No results for "${search}"` : 'Try adjusting your filters'}
      </Text>
      <TouchableOpacity style={styles.clearFiltersBtn} onPress={clearFilters}>
        <Text style={styles.clearFiltersBtnText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  ), [search, clearFilters]);

  // Build a contextual filter empty state based on which filters are active
  const noResults = hasFilters && filteredMeals.length === 0;

  const filterEmptySubtitle = useMemo(() => {
    if (search.trim()) {
      return `No meals match "${search.trim()}". Try a different search or clear your filters.`;
    }
    const activeLabels: string[] = [];
    if (mealTypeFilter !== 'all') activeLabels.push(MEAL_TYPE_OPTIONS.find(o => o.value === mealTypeFilter)?.label ?? '');
    if (dishTypeFilter !== 'all') activeLabels.push(DISH_TYPE_OPTIONS.find(o => o.value === dishTypeFilter)?.label ?? '');
    if (proteinFilter   !== 'all') activeLabels.push(PROTEIN_OPTIONS.find(o => o.value === proteinFilter)?.label   ?? '');
    if (dietFilter      !== 'all') activeLabels.push(DIET_OPTIONS.find(o => o.value === dietFilter)?.label         ?? '');
    if (activeLabels.length === 1) {
      return `None of your saved meals match the ${activeLabels[0]} filter yet. Try a different filter or add a new meal.`;
    }
    return `None of your saved meals match the current filters. Try adjusting or clearing them.`;
  }, [search, mealTypeFilter, dishTypeFilter, proteinFilter, dietFilter]);

  const FilterEmptyState = (
    <View style={styles.filterEmptyContainer}>
      <View style={styles.filterEmptyIconWrap}>
        <SlidersHorizontal size={32} color={Colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.filterEmptyTitle}>No meals found</Text>
      <Text style={styles.filterEmptySubtitle}>{filterEmptySubtitle}</Text>
      <TouchableOpacity style={styles.filterEmptyClearBtn} onPress={clearFilters}>
        <Text style={styles.filterEmptyClearBtnText}>Clear Filters</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.filterEmptyAddBtn} onPress={openAddMethodSheet}>
        <Plus size={14} color={Colors.primary} strokeWidth={2.5} />
        <Text style={styles.filterEmptyAddBtnText}>Add a Meal</Text>
      </TouchableOpacity>
    </View>
  );

  const getEmptyComponent = useCallback(() => {
    if (hasFilters) return SearchEmptyState;
    return MyRecipesEmptyState;
  }, [hasFilters, MyRecipesEmptyState, SearchEmptyState]);

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

      {/* Single FlatList owns the entire scroll area — search bar, filter pills,
          and recipe grid are all inside one scroll container so there can be no
          phantom gap between sections caused by stale contentOffset. */}
      <FlatList
        ref={flatListRef}
        data={noResults ? [] : gridData}
        renderItem={renderGridItem}
        keyExtractor={(item: any) => item.id}
        numColumns={COLS}
        columnWrapperStyle={{ gap: COL_GAP, paddingHorizontal: H_PAD, marginBottom: 10 }}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        ListHeaderComponent={
          <View>
            {/* ── Search bar ─────────────────────────────────────── */}
            <View style={styles.searchWrap}>
              <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals or ingredients..."
                placeholderTextColor={Colors.textSecondary}
                value={search}
                onChangeText={handleSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
                onSubmitEditing={handleSearchSubmit}
                returnKeyType="search"
                testID="favs-search"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')} hitSlop={8}>
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

            {/* ── Inline filter pill row ─────────────────────────── */}
            {(() => {
              const sortLabel    = SORT_OPTIONS.find(o => o.value === favFilters.sort)?.label ?? 'Sort';
              const sortActive   = favFilters.sort !== 'most_used';
              const whenLabel    = MEAL_TYPE_OPTIONS.find(o => o.value === mealTypeFilter)?.label ?? 'When';
              const whenActive   = mealTypeFilter !== 'all';
              const typeLabel    = DISH_TYPE_OPTIONS.find(o => o.value === dishTypeFilter)?.label ?? 'Type';
              const typeActive   = dishTypeFilter !== 'all';
              const proteinLabel = PROTEIN_OPTIONS.find(o => o.value === proteinFilter)?.label ?? 'Protein';
              const proteinActive = proteinFilter !== 'all';
              const dietLabel    = DIET_OPTIONS.find(o => o.value === dietFilter)?.label ?? 'Diet';
              const dietActive   = dietFilter !== 'all';
              const handleWhenPress    = whenActive    ? () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setMealTypeFilter('all'); } : openMealTypeSheet;
              const handleTypePress    = typeActive    ? () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDishTypeFilter('all'); } : openDishTypeSheet;
              const handleProteinPress = proteinActive ? () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setProteinFilter('all');  } : openProteinSheet;
              const handleDietPress    = dietActive    ? () => { void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setDietFilter('all');     } : openDietSheet;
              return (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ height: 46 }}
                  contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 7 }}
                >
                  <TouchableOpacity onPress={cycleSortOption} activeOpacity={0.8} style={[styles.filterPill, sortActive && styles.filterPillActive]}>
                    <ArrowUpDown size={13} color={sortActive ? Colors.white : Colors.text} strokeWidth={2.5} />
                    <Text style={[styles.filterPillText, sortActive && styles.filterPillTextActive, { marginLeft: 5 }]}>{sortLabel}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleWhenPress} activeOpacity={0.8} style={[styles.filterPill, whenActive && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, whenActive && styles.filterPillTextActive]}>{whenActive ? whenLabel : 'When'}</Text>
                    <Text style={[styles.filterPillText, whenActive && styles.filterPillTextActive]}> {whenActive ? '✕' : '▾'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleTypePress} activeOpacity={0.8} style={[styles.filterPill, typeActive && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, typeActive && styles.filterPillTextActive]}>{typeActive ? typeLabel : 'Type'}</Text>
                    <Text style={[styles.filterPillText, typeActive && styles.filterPillTextActive]}> {typeActive ? '✕' : '▾'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleProteinPress} activeOpacity={0.8} style={[styles.filterPill, proteinActive && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, proteinActive && styles.filterPillTextActive]}>{proteinActive ? proteinLabel : 'Protein'}</Text>
                    <Text style={[styles.filterPillText, proteinActive && styles.filterPillTextActive]}> {proteinActive ? '✕' : '▾'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleDietPress} activeOpacity={0.8} style={[styles.filterPill, dietActive && styles.filterPillActive]}>
                    <Text style={[styles.filterPillText, dietActive && styles.filterPillTextActive]}>{dietActive ? dietLabel : 'Diet'}</Text>
                    <Text style={[styles.filterPillText, dietActive && styles.filterPillTextActive]}> {dietActive ? '✕' : '▾'}</Text>
                  </TouchableOpacity>
                </ScrollView>
              );
            })()}

            {filterCount > 0 && (
              <TouchableOpacity
                style={styles.activeFilterBar}
                onPress={clearFilters}
              >
                <Text style={styles.activeFilterBarText}>{filterCount} filter{filterCount > 1 ? 's' : ''} active</Text>
                <X size={12} color={Colors.primary} strokeWidth={2.5} />
              </TouchableOpacity>
            )}

            <View style={{ height: 12 }} />
          </View>
        }
        ListEmptyComponent={noResults ? FilterEmptyState : getEmptyComponent()}
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
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowAddMethodSheet(false);
                    router.push('/add-recipe-entry' as Href);
                  }}
                >
                  <View style={styles.addMethodOptionIcon}>
                    <FileText size={22} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add with Recipe</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>URL, camera, YouTube & more</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMethodOptionRow}
                  activeOpacity={0.8}
                  onPress={() => { setQuickAddSource('manual'); setAddMethodMode('quick_add'); }}
                >
                  <View style={styles.addMethodOptionIcon}>
                    <Pencil size={22} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add without Recipe</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>Just a name — add the recipe later</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.addMethodOptionRow}
                  activeOpacity={0.8}
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
                    <Bike size={22} color={Colors.primary} strokeWidth={2} />
                  </View>
                  <View style={styles.addMethodOptionTextBlock}>
                    <Text style={{ fontSize: 15, fontWeight: '700' as const, color: Colors.text }}>Add from Delivery App</Text>
                    <Text style={{ fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary, marginTop: 2 }}>Save a link from Uber Eats, Grab & more</Text>
                  </View>
                  <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
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
                  <ChevronLeft size={20} color={Colors.primary} strokeWidth={2} />
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
                      <ClipboardIcon size={20} color={Colors.primary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                  {quickAddDeliveryUrl.trim().length > 0 && (
                    <View style={styles.addMethodPlatformChip}>
                      <CheckCircle2 size={14} color={Colors.primary} strokeWidth={2} />
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

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={openAddMethodSheet}
        activeOpacity={0.8}
        testID="fab-add-meal"
      >
        <Plus size={20} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>

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

interface FavGridCardProps {
  meal: Recipe;
  onPress: () => void;
  onAddToPlan: () => void;
  onLongPress: () => void;
}

const FavGridCard = React.memo(function FavGridCard({
  meal, onPress, onAddToPlan, onLongPress,
}: FavGridCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <Pressable
        onPress={onPress}
        onLongPress={() => {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress();
        }}
        onPressIn={() =>
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
      >
        <View style={{
          width: CARD_W,
          height: CARD_H,
          borderRadius: 12,
          backgroundColor: Colors.card,
          overflow: 'hidden' as const,
          shadowColor: Colors.shadow,
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 3,
        }}>
          <View style={{
            width: CARD_W,
            height: IMG_H,
            overflow: 'hidden' as const,
            borderTopLeftRadius: 12,
            borderTopRightRadius: 12,
          }}>
            {meal.image_url ? (
              <Image source={{ uri: meal.image_url }} style={{ width: CARD_W, height: IMG_H }} resizeMode="cover" />
            ) : (
              <View style={{
                width: CARD_W,
                height: IMG_H,
                backgroundColor: Colors.primaryLight,
                alignItems: 'center' as const,
                justifyContent: 'center' as const,
              }}>
                <MealImagePlaceholder size="thumbnail" mealType={meal.meal_type} cuisine={meal.cuisine} name={meal.name} />
              </View>
            )}
          </View>
          <View style={{
            height: STRIP_H,
            backgroundColor: Colors.card,
            flexDirection: 'row' as const,
            alignItems: 'center' as const,
            paddingHorizontal: 5,
            gap: 3,
          }}>
            <Text style={{ fontSize: 10.5, fontWeight: '600' as const, color: Colors.text, flex: 1, lineHeight: 13 }} numberOfLines={2}>{meal.name}</Text>
            <TouchableOpacity
              hitSlop={8}
              onPress={(e) => {
                e.stopPropagation?.();
                onAddToPlan();
              }}
            >
              <CalendarPlus size={15} color={Colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
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
    shadowColor: Colors.shadow,
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
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    height: 44,
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
    shadowColor: Colors.shadow,
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
  pillRow: {
    flexDirection: 'row' as const,
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  filterPill: {
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: Colors.surface,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  filterPillActive: {
    backgroundColor: Colors.primary,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  filterPillTextActive: {
    color: Colors.white,
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
    shadowColor: Colors.shadow,
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
    shadowColor: Colors.shadow,
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
    shadowColor: Colors.shadow,
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
  // ── Filter empty state ───────────────────────────────────────────────────
  filterEmptyContainer: {
    flex: 1,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingHorizontal: 40,
    paddingBottom: 80,
  },
  filterEmptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    marginBottom: 20,
  },
  filterEmptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginBottom: 10,
  },
  filterEmptySubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    lineHeight: 20,
    marginBottom: 32,
  },
  filterEmptyClearBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 13,
    paddingHorizontal: 32,
    marginBottom: 14,
  },
  filterEmptyClearBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  filterEmptyAddBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  filterEmptyAddBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
