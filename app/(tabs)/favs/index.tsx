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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Search,
  X,
  Plus,
  Grid3x3,
  List,
  ChevronDown,
  Clock,
  Heart,
  CalendarPlus,
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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('recently_added');
  const [showSortDropdown, setShowSortDropdown] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<string>('');
  const [activeFilterValue, setActiveFilterValue] = useState<string>('');
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMealForPlan, setSelectedMealForPlan] = useState<FavMeal | null>(null);

  const filters = useMemo(() => {
    if (!activeFilter || !activeFilterValue) return {};
    switch (activeFilter) {
      case 'cuisine': return { cuisine: activeFilterValue };
      case 'cookingTime': return { cookingTime: activeFilterValue };
      case 'dietaryTag': return { dietaryTag: activeFilterValue };
      case 'source': return { source: activeFilterValue };
      default: return {};
    }
  }, [activeFilter, activeFilterValue]);

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

  const handleFilterPress = useCallback((filterKey: string, value: string) => {
    if (activeFilter === filterKey && activeFilterValue === value) {
      setActiveFilter('');
      setActiveFilterValue('');
    } else {
      setActiveFilter(filterKey);
      setActiveFilterValue(value);
    }
  }, [activeFilter, activeFilterValue]);

  const clearFilters = useCallback(() => {
    setActiveFilter('');
    setActiveFilterValue('');
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

      const slot = familySettings.meal_slots.find((s) => s.slot_id === slotId);
      Alert.alert('Added!', `${selectedMealForPlan.name} added to ${slot?.name ?? 'plan'}`);
    },
    [selectedMealForPlan, addMeal, incrementPlanCount, familySettings]
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

  const hasFilters = !!activeFilter || search.trim().length > 0;
  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortBy)?.label ?? 'Sort';

  const renderGridItem = useCallback(({ item }: { item: FavMeal }) => (
    <FavMealGridCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onAddToPlan={() => handleAddToPlan(item)}
    />
  ), [handleMealPress, handleAddToPlan]);

  const renderListItem = useCallback(({ item }: { item: FavMeal }) => (
    <FavMealListCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onAddToPlan={() => handleAddToPlan(item)}
      onRemove={() => handleSwipeRemove(item)}
    />
  ), [handleMealPress, handleAddToPlan, handleSwipeRemove]);

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
            style={styles.addBtn}
            onPress={() => router.push('/add-meal' as Href)}
            testID="add-fav-btn"
          >
            <Plus size={20} color={Colors.white} strokeWidth={2.5} />
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

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        {hasFilters && (
          <FilterPill label="Clear All" active={true} onPress={clearFilters} />
        )}
        {sortedSlots.map((slot) => (
          <FilterPill
            key={slot.slot_id}
            label={slot.name}
            active={activeFilter === 'mealType' && activeFilterValue === slot.slot_id}
            onPress={() => handleFilterPress('mealType', slot.slot_id)}
          />
        ))}
        {(['Italian', 'Mexican', 'Asian', 'Indian', 'Thai'] as string[]).map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={activeFilter === 'cuisine' && activeFilterValue === c}
            onPress={() => handleFilterPress('cuisine', c)}
          />
        ))}
        {(['Under 30', '30-60', 'Over 60'] as string[]).map((t) => (
          <FilterPill
            key={t}
            label={`${t} min`}
            active={activeFilter === 'cookingTime' && activeFilterValue === t}
            onPress={() => handleFilterPress('cookingTime', t)}
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
        <TouchableOpacity
          style={styles.viewToggle}
          onPress={() => {
            setViewMode(viewMode === 'grid' ? 'list' : 'grid');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
        >
          {viewMode === 'grid' ? (
            <List size={18} color={Colors.text} strokeWidth={2} />
          ) : (
            <Grid3x3 size={18} color={Colors.text} strokeWidth={2} />
          )}
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

      {viewMode === 'grid' ? (
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
      ) : (
        <FlatList
          data={filteredMeals}
          renderItem={renderListItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <EmptyState
              icon={<Search size={28} color={Colors.textSecondary} strokeWidth={1.5} />}
              title="No meals match your search"
              description="Try adjusting your filters"
              actionLabel="Clear Filters"
              onAction={clearFilters}
            />
          }
          testID="favs-list"
        />
      )}

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

  return (
    <Animated.View style={[styles.gridCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        <View style={styles.gridImageWrap}>
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={styles.gridImage} contentFit="cover" />
          ) : (
            <View style={styles.gridImagePlaceholder}>
              <Heart size={24} color={Colors.textSecondary} strokeWidth={1.5} />
            </View>
          )}
        </View>
        <View style={styles.gridCardBody}>
          <Text style={styles.gridMealName} numberOfLines={2}>{meal.name}</Text>
          <View style={styles.gridTags}>
            {meal.cuisine && (
              <View style={styles.miniTag}>
                <Text style={styles.miniTagText}>{meal.cuisine}</Text>
              </View>
            )}
            {meal.cooking_time_band && (
              <View style={styles.miniTag}>
                <Clock size={10} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.miniTagText}>{meal.cooking_time_band}</Text>
              </View>
            )}
          </View>
          {meal.last_planned_date && (
            <Text style={styles.gridMeta}>Last planned {meal.last_planned_date}</Text>
          )}
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.gridPlanBtn} onPress={onAddToPlan}>
        <CalendarPlus size={14} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
});

interface FavMealListCardProps {
  meal: FavMeal;
  onPress: () => void;
  onAddToPlan: () => void;
  onRemove: () => void;
}

const FavMealListCard = React.memo(function FavMealListCard({ meal, onPress, onAddToPlan, onRemove }: FavMealListCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.listCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.listCardInner}
        activeOpacity={0.85}
        onPress={onPress}
        onLongPress={onRemove}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        {meal.image_url ? (
          <Image source={{ uri: meal.image_url }} style={styles.listThumb} contentFit="cover" />
        ) : (
          <View style={[styles.listThumb, styles.listThumbPlaceholder]}>
            <Heart size={20} color={Colors.textSecondary} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.listInfo}>
          <Text style={styles.listMealName} numberOfLines={1}>{meal.name}</Text>
          <View style={styles.listTags}>
            {meal.cuisine && (
              <View style={styles.miniTag}>
                <Text style={styles.miniTagText}>{meal.cuisine}</Text>
              </View>
            )}
            {meal.dietary_tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.miniTag}>
                <Text style={styles.miniTagText}>{tag}</Text>
              </View>
            ))}
          </View>
          {meal.last_planned_date && (
            <Text style={styles.gridMeta}>Last planned {meal.last_planned_date}</Text>
          )}
        </View>
        <TouchableOpacity style={styles.listPlanBtn} onPress={onAddToPlan}>
          <CalendarPlus size={16} color={Colors.primary} strokeWidth={2} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
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
  viewToggle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
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
  gridTags: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  gridMeta: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  gridPlanBtn: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 100,
  },
  listCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    marginBottom: 8,
    overflow: 'hidden',
    ...Shadows.card,
  },
  listCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listThumb: {
    width: 80,
    height: 80,
  },
  listThumbPlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listInfo: {
    flex: 1,
    padding: 10,
  },
  listMealName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  listTags: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  listPlanBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
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
});
