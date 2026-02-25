import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  Plus,
  ChevronDown,
  Clock,
  Heart,
  CalendarPlus,
  Check,
  SlidersHorizontal,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import FilterPill from '@/components/FilterPill';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs, useFilteredFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { FavMeal, PlannedMeal } from '@/types';
import { CUISINE_OPTIONS } from '@/types';

const SORT_OPTIONS = [
  { key: 'recently_added', label: 'Recently Added' },
  { key: 'most_used', label: 'Most Used' },
  { key: 'recently_planned', label: 'Recently Planned' },
  { key: 'cooking_time', label: 'Cooking Time' },
  { key: 'a_to_z', label: 'A to Z' },
];

export default function FavsScreen() {
  const insets = useSafeAreaInsets();
  const { meals, recentSearches, isLoading, removeFav, addRecentSearch, clearRecentSearches, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot } = useMealPlan();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<string>('recently_added');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [activeMealTypeFilter, setActiveMealTypeFilter] = useState<string>('');
  const [activeCuisineFilter, setActiveCuisineFilter] = useState<string>('');
  const [activeCookTimeFilter, setActiveCookTimeFilter] = useState<string>('');
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<FavMeal | null>(null);

  const [showFilterSheet, setShowFilterSheet] = useState<boolean>(false);
  const [sheetSort, setSheetSort] = useState<string>(sortBy);
  const [sheetCuisine, setSheetCuisine] = useState<string>(activeCuisineFilter);
  const [sheetCookTime, setSheetCookTime] = useState<string>(activeCookTimeFilter);

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
    ...(activeMealTypeFilter ? { mealType: activeMealTypeFilter } : {}),
    ...(activeCuisineFilter   ? { cuisine: activeCuisineFilter }   : {}),
    ...(activeCookTimeFilter  ? { cookingTime: activeCookTimeFilter } : {}),
  }), [activeMealTypeFilter, activeCuisineFilter, activeCookTimeFilter]);

  const filteredMeals = useFilteredFavs(search, filters, sortBy);

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
    setSearch('');
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

  const handleSwipeRemove = useCallback((meal: FavMeal) => {
    Alert.alert('Remove from Favs?', `Remove "${meal.name}" from your favourites?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeFav(meal.id) },
    ]);
  }, [removeFav]);

  const hasFilters = !!activeMealTypeFilter || !!activeCuisineFilter ||
                     !!activeCookTimeFilter || search.trim().length > 0;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort';

  const renderGridItem = useCallback(({ item }: { item: FavMeal }) => (
    <FavMealGridCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onAddToPlan={() => handleAddToPlan(item)}
    />
  ), [handleMealPress, handleAddToPlan]);

  if (meals.length === 0 && !isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Favourites" />
        <ScrollView
          contentContainerStyle={styles.emptyScroll}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        >
          <EmptyState
            icon={<Heart size={36} color={Colors.primary} strokeWidth={1.5} />}
            title="Your Favs are empty"
            description="Start by saving meals from Discover or adding your own."
            actionLabel="Browse Discover"
            onAction={() => router.push('/(tabs)/discover' as Href)}
          />
          <TouchableOpacity
            style={styles.emptyAddBtn}
            onPress={() => router.push('/add-meal' as Href)}
          >
            <Plus size={16} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.emptyAddText}>Add a Meal</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

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
              setShowFilterSheet(true);
            }}
            testID="favs-filter-btn"
          >
            <SlidersHorizontal size={18} color={Colors.text} strokeWidth={2} />
            {hasFilters && <View style={styles.filterBadge} />}
          </TouchableOpacity>
        }
      />

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterRow}
        contentContainerStyle={styles.filterContent}
      >
        <FilterPill
          label="All"
          active={!activeMealTypeFilter}
          onPress={() => setActiveMealTypeFilter('')}
        />
        {sortedSlots.map((slot) => (
          <FilterPill
            key={slot.slot_id}
            label={slot.name}
            active={activeMealTypeFilter === slot.slot_id}
            onPress={() =>
              setActiveMealTypeFilter(
                activeMealTypeFilter === slot.slot_id ? '' : slot.slot_id
              )
            }
          />
        ))}
      </ScrollView>

      <View style={styles.sortRow}>
        <TouchableOpacity
          style={styles.sortBtn}
          onPress={() => setShowSortDropdown(!showSortDropdown)}
        >
          <Text style={styles.sortLabel}>{currentSortLabel}</Text>
          <ChevronDown size={14} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {showSortDropdown && (
        <View style={styles.sortDropdown}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortBy === opt.key && styles.sortOptionActive]}
              onPress={() => {
                setSortBy(opt.key);
                setShowSortDropdown(false);
              }}
            >
              <Text style={[styles.sortOptionText, sortBy === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
          data={filteredMeals}
          renderItem={renderGridItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.gridRow}
          contentContainerStyle={styles.gridContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Search size={28} color={Colors.textSecondary} strokeWidth={1.5} />}
              title="No meals match your search"
              description={search ? `No meals found with "${search}"` : "Try adjusting your filters"}
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          }
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
          </ScrollView>

          <View style={styles.sheetFooter}>
            <TouchableOpacity
              style={styles.sheetClearBtn}
              onPress={() => {
                setSheetSort('recently_added');
                setSheetCuisine('');
                setSheetCookTime('');
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
                setShowFilterSheet(false);
              }}
            >
              <Text style={styles.sheetApplyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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

interface FavMealGridCardProps {
  meal: FavMeal;
  onPress: () => void;
  onAddToPlan: () => void;
}

const FavMealGridCard = React.memo(function FavMealGridCard({ meal, onPress, onAddToPlan }: FavMealGridCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const totalTime = (meal.prep_time ?? 0) + (meal.cook_time ?? 0);

  return (
    <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
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
    marginHorizontal: 16,
    marginTop: 8,
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
    maxHeight: 44,
    marginTop: 8,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sortLabel: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  sortDropdown: {
    position: 'absolute' as const,
    top: 220,
    left: 16,
    right: 120,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    ...Shadows.card,
    zIndex: 100,
    elevation: 10,
  },
  sortOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  sortOptionActive: {
    backgroundColor: Colors.surface,
  },
  sortOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  sortOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600' as const,
  },
  gridRow: {
    paddingHorizontal: 12,
    gap: 10,
  },
  gridContent: {
    paddingTop: 4,
    paddingBottom: 100,
  },
  gridCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginBottom: 10,
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
  emptyScroll: {
    flexGrow: 1,
    alignItems: 'center',
  },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    marginTop: 8,
  },
  emptyAddText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  sheetContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  sheetHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0EEF9',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: '#2C2C2C',
  },
  sheetScroll: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheetSectionLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: '#8B7EA8',
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
    borderTopColor: '#F0EEF9',
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
    backgroundColor: '#7B68CC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center' as const,
    marginLeft: 12,
  },
  sheetApplyText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});
