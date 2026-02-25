import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  Animated,
  ImageBackground,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

type SkeletonBoxProps = {
  width?: number | string;
  height: number;
  borderRadius?: number;
  style?: object;
};
const SkeletonBox = ({ width = '100%', height, borderRadius = 12, style }: SkeletonBoxProps) => {
  const anim = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 750, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 750, useNativeDriver: true }),
      ])
    ).start();
  }, [anim]);
  return (
    <Animated.View
      style={[{ width, height, borderRadius, backgroundColor: '#E5E7EB', opacity: anim }, style]}
    />
  );
};
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Heart,
  CalendarPlus,
  Check,
  Clock,
  ChevronRight,
  Sparkles,
  SlidersHorizontal,
  X,
  Users,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import FilterPill from '@/components/FilterPill';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import {
  DISCOVER_MEALS,
  COLLECTIONS,
} from '@/mocks/discover';
import { DIETARY_OPTIONS } from '@/types';

type MealTypeFilter = 'all' | 'breakfast' | 'lunch_dinner' | 'light_bites';
type CookTimeFilter = 'any' | 'Under 30' | '30-60' | '60+';

const MEAL_TYPE_LABELS: Record<MealTypeFilter, string> = {
  all: 'All',
  breakfast: 'Breakfast',
  lunch_dinner: 'Lunch & Dinner',
  light_bites: 'Light Bites',
};

const MEAL_TYPE_OPTIONS: MealTypeFilter[] = ['all', 'breakfast', 'lunch_dinner', 'light_bites'];
const COOK_TIME_OPTIONS: CookTimeFilter[] = ['any', 'Under 30', '30-60', '60+'];
const COOK_TIME_LABELS: Record<CookTimeFilter, string> = {
  any: 'Any',
  'Under 30': 'Under 30',
  '30-60': '30–60',
  '60+': '60+',
};
const DIET_OPTIONS = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Dairy-Free'];

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isFav, addFromDiscover } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot, meals } = useMealPlan();

  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [mealTypeFilter, setMealTypeFilter] = useState<MealTypeFilter>('all');
  const [cookTimeFilter, setCookTimeFilter] = useState<CookTimeFilter>('any');
  const [dietFilters, setDietFilters] = useState<string[]>([]);
  const [cuisineFilters, setCuisineFilters] = useState<string[]>([]);

  const [filterSheetVisible, setFilterSheetVisible] = useState<boolean>(false);
  const [tempCookTime, setTempCookTime] = useState<CookTimeFilter>('any');
  const [tempDietFilters, setTempDietFilters] = useState<string[]>([]);
  const [tempCuisineFilters, setTempCuisineFilters] = useState<string[]>([]);

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

  const uniqueCuisines = useMemo(() => {
    const set = new Set(DISCOVER_MEALS.map((m) => m.cuisine));
    return Array.from(set).sort();
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (cookTimeFilter !== 'any') count++;
    count += dietFilters.length;
    count += cuisineFilters.length;
    return count;
  }, [cookTimeFilter, dietFilters, cuisineFilters]);

  const applyFilters = useCallback(
    (meals: DiscoverMeal[]) => {
      return meals.filter((meal) => {
        if (mealTypeFilter !== 'all' && meal.meal_type !== mealTypeFilter) return false;
        if (cookTimeFilter !== 'any' && meal.cooking_time_band !== cookTimeFilter) return false;
        if (dietFilters.includes('Vegan') && !meal.is_vegan) return false;
        if (dietFilters.includes('Vegetarian') && !meal.is_vegetarian) return false;
        if (dietFilters.includes('Gluten-Free') && !meal.is_gluten_free) return false;
        if (dietFilters.includes('Dairy-Free') && !meal.is_dairy_free) return false;
        if (cuisineFilters.length > 0 && !cuisineFilters.includes(meal.cuisine)) return false;
        return true;
      });
    },
    [mealTypeFilter, cookTimeFilter, dietFilters, cuisineFilters]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const suggestedMeals = useMemo(
    () => applyFilters(DISCOVER_MEALS.slice(0, 6)),
    [applyFilters]
  );

  const missingMeals = useMemo(
    () => applyFilters(DISCOVER_MEALS.slice(3, 7)),
    [applyFilters]
  );

  const newThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recent = DISCOVER_MEALS.filter((m) => new Date(m.created_at) >= weekAgo);
    return applyFilters(recent);
  }, [applyFilters]);

  const hasActiveFilters =
    mealTypeFilter !== 'all' ||
    cookTimeFilter !== 'any' ||
    dietFilters.length > 0 ||
    cuisineFilters.length > 0;

  const noFilterResults =
    hasActiveFilters &&
    suggestedMeals.length === 0 &&
    missingMeals.length === 0 &&
    newThisWeek.length === 0;

  const openFilterSheet = useCallback(() => {
    setTempCookTime(cookTimeFilter);
    setTempDietFilters([...dietFilters]);
    setTempCuisineFilters([...cuisineFilters]);
    setFilterSheetVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [cookTimeFilter, dietFilters, cuisineFilters]);

  const closeFilterSheet = useCallback(() => {
    setFilterSheetVisible(false);
  }, []);

  const applyFilterSheet = useCallback(() => {
    setCookTimeFilter(tempCookTime);
    setDietFilters([...tempDietFilters]);
    setCuisineFilters([...tempCuisineFilters]);
    setFilterSheetVisible(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [tempCookTime, tempDietFilters, tempCuisineFilters]);

  const clearFilterSheet = useCallback(() => {
    setTempCookTime('any');
    setTempDietFilters([]);
    setTempCuisineFilters([]);
  }, []);

  const toggleTempDiet = useCallback((diet: string) => {
    setTempDietFilters((prev) =>
      prev.includes(diet) ? prev.filter((d) => d !== diet) : [...prev, diet]
    );
  }, []);

  const toggleTempCuisine = useCallback((cuisine: string) => {
    setTempCuisineFilters((prev) =>
      prev.includes(cuisine) ? prev.filter((c) => c !== cuisine) : [...prev, cuisine]
    );
  }, []);

  const handleSaveFav = useCallback(
    (meal: DiscoverMeal) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      addFromDiscover(meal);
      Alert.alert('Saved!', `${meal.name} added to your Favs`);
    },
    [addFromDiscover]
  );

  const handleAddToPlan = useCallback((meal: DiscoverMeal) => {
    setSelectedMeal(meal);
    setSlotPickerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
    router.push(`/meal-detail?id=${meal.id}&source=discover` as Href);
  }, []);

  const handleCollectionPress = useCallback((collectionId: string) => {
    router.push(`/collection?id=${collectionId}` as Href);
  }, []);

  const handleDietaryPress = useCallback((tag: string) => {
    router.push(`/filtered-meals?dietary=${tag}` as Href);
  }, []);

  const renderDiscoverCard = useCallback(
    (meal: DiscoverMeal, width: number) => {
      const saved = isFav(meal.id);
      const inPlan = meals.some((m) => m.meal_name === meal.name);
      return (
        <DiscoverMealCard
          key={meal.id}
          meal={meal}
          width={width}
          isSaved={saved}
          isInPlan={inPlan}
          onPress={() => handleMealPress(meal)}
          onSave={() => handleSaveFav(meal)}
          onAddToPlan={() => handleAddToPlan(meal)}
        />
      );
    },
    [isFav, meals, handleMealPress, handleSaveFav, handleAddToPlan]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader
        title="Discover"
        rightElement={
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={() => router.push('/discover-search' as Href)}
            testID="discover-search-btn"
          >
            <Search size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        }
      />

      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterBarContent}
        >
          {MEAL_TYPE_OPTIONS.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.mealTypeChip,
                mealTypeFilter === type && styles.mealTypeChipActive,
              ]}
              onPress={() => {
                setMealTypeFilter(type);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              activeOpacity={0.75}
              testID={`meal-type-chip-${type}`}
            >
              <Text
                style={[
                  styles.mealTypeChipText,
                  mealTypeFilter === type && styles.mealTypeChipTextActive,
                ]}
              >
                {MEAL_TYPE_LABELS[type]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        <TouchableOpacity
          style={[styles.filtersBtn, activeFilterCount > 0 && styles.filtersBtnActive]}
          onPress={openFilterSheet}
          activeOpacity={0.8}
          testID="filters-btn"
        >
          <SlidersHorizontal
            size={13}
            color={activeFilterCount > 0 ? Colors.white : Colors.text}
            strokeWidth={2}
          />
          <Text
            style={[
              styles.filtersBtnText,
              activeFilterCount > 0 && styles.filtersBtnTextActive,
            ]}
          >
            {activeFilterCount > 0 ? `Filters (${activeFilterCount})` : 'Filters'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
        testID="discover-scroll"
      >
        {(initialLoading || refreshing) ? (
          <ScrollView
            scrollEnabled={false}
            style={{ paddingHorizontal: 16, paddingTop: 16 }}
            showsVerticalScrollIndicator={false}
          >
            <SkeletonBox height={200} borderRadius={20} style={{ marginHorizontal: -16 }} />
            <SkeletonBox width={160} height={22} borderRadius={8} style={{ marginTop: 24 }} />
            <ScrollView
              horizontal
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 12, marginHorizontal: -16 }}
              contentContainerStyle={{ paddingLeft: 16, gap: 12, flexDirection: 'row' }}
            >
              <SkeletonBox width={140} height={170} borderRadius={16} />
              <SkeletonBox width={140} height={170} borderRadius={16} />
              <SkeletonBox width={140} height={170} borderRadius={16} />
            </ScrollView>
            <SkeletonBox width={180} height={22} borderRadius={8} style={{ marginTop: 28 }} />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
              <SkeletonBox width={(screenWidth - 44) / 2} height={190} borderRadius={16} />
              <SkeletonBox width={(screenWidth - 44) / 2} height={190} borderRadius={16} />
              <SkeletonBox width={(screenWidth - 44) / 2} height={190} borderRadius={16} />
              <SkeletonBox width={(screenWidth - 44) / 2} height={190} borderRadius={16} />
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        ) : (
          <>
        {COLLECTIONS.length > 0 && (
          <TouchableOpacity
            style={styles.heroBanner}
            onPress={() => handleCollectionPress(COLLECTIONS[0].id)}
            activeOpacity={0.9}
          >
            <ImageBackground
              source={{ uri: COLLECTIONS[0].cover_image_url }}
              style={styles.heroImage}
              imageStyle={styles.heroImageStyle}
            >
              <View style={styles.heroOverlay}>
                <Text style={styles.heroTitle}>{COLLECTIONS[0].title}</Text>
                <Text style={styles.heroSubtitle}>{COLLECTIONS[0].subtitle}</Text>
              </View>
            </ImageBackground>
          </TouchableOpacity>
        )}

        {noFilterResults ? (
          <View style={styles.noResultsContainer}>
            <Search size={64} color="#9CA3AF" strokeWidth={1.5} />
            <Text style={styles.noResultsTitle}>No recipes match your filters</Text>
            <Text style={styles.noResultsSubtitle}>Try adjusting or clearing your filters</Text>
            <TouchableOpacity
              style={styles.clearFiltersBtn}
              onPress={() => {
                setMealTypeFilter('all');
                setCookTimeFilter('any');
                setDietFilters([]);
                setCuisineFilters([]);
              }}
              activeOpacity={0.85}
            >
              <Text style={styles.clearFiltersBtnText}>Clear filters</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View>
                  <Text style={styles.sectionTitle}>Suggested For You</Text>
                  <Text style={styles.sectionSubtitle}>Based on your Favs</Text>
                </View>
              </View>
              {suggestedMeals.length > 0 ? (
                <FlatList
                  horizontal
                  data={suggestedMeals}
                  renderItem={({ item }) => renderDiscoverCard(item, 180)}
                  keyExtractor={(item) => `sug_${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              ) : (
                <Text style={styles.emptyFilterText}>No meals match your filters</Text>
              )}
            </View>

            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>What's Missing This Week</Text>
              </View>
              <TouchableOpacity
                style={styles.missingBanner}
                onPress={() => router.push('/(tabs)/(home)' as Href)}
              >
                <Sparkles size={20} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.missingText}>Start planning your week</Text>
                <ChevronRight size={16} color={Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
              {missingMeals.length > 0 ? (
                <FlatList
                  horizontal
                  data={missingMeals}
                  renderItem={({ item }) => renderDiscoverCard(item, 180)}
                  keyExtractor={(item) => `miss_${item.id}`}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              ) : (
                <Text style={styles.emptyFilterText}>No meals match your filters</Text>
              )}
            </View>
          </>
        )}

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <TouchableOpacity onPress={() => router.push('/collection?id=all' as Href)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={COLLECTIONS}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => handleCollectionPress(item.id)}
                activeOpacity={0.85}
              >
                <Image
                  source={{ uri: item.cover_image_url }}
                  style={styles.collectionImage}
                  contentFit="cover"
                />
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.collectionCount}>{item.meal_count} meals</Text>
                </View>
                {item.is_new && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.cuisineChipSection}>
          <View style={styles.cuisineChipHeader}>
            <Text style={styles.cuisineChipTitle}>Browse by Cuisine</Text>
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.cuisineChipRow}
          >
            <CuisineChipButton
              label="All"
              selected={cuisineFilters.length === 0}
              onPress={() => setCuisineFilters([])}
            />
            {uniqueCuisines.map((cuisine) => (
              <CuisineChipButton
                key={cuisine}
                label={cuisine}
                selected={cuisineFilters.includes(cuisine)}
                onPress={() => {
                  setCuisineFilters((prev) =>
                    prev.includes(cuisine)
                      ? prev.filter((c) => c !== cuisine)
                      : [...prev, cuisine]
                  );
                }}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dietaryRow}
          >
            {DIETARY_OPTIONS.filter((d) => d !== 'No Restrictions').map((tag) => (
              <FilterPill
                key={tag}
                label={tag}
                active={false}
                onPress={() => handleDietaryPress(tag)}
              />
            ))}
          </ScrollView>
        </View>

        {!noFilterResults && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>New This Week</Text>
            {newThisWeek.length > 0 ? (
              <FlatList
                horizontal
                data={newThisWeek}
                renderItem={({ item }) => renderDiscoverCard(item, 180)}
                keyExtractor={(item) => `new_${item.id}`}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.horizontalList}
              />
            ) : (
              <Text style={styles.emptyFilterText}>No meals match your filters</Text>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
          </>
        )}
      </ScrollView>

      <Modal
        visible={filterSheetVisible}
        transparent
        animationType="slide"
        onRequestClose={closeFilterSheet}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            onPress={closeFilterSheet}
            activeOpacity={1}
          />
          <View style={[styles.bottomSheet, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Filters</Text>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={closeFilterSheet}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={20} color={Colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.sheetScroll}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Cook Time</Text>
                <View style={styles.chipWrap}>
                  {COOK_TIME_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.sheetChip,
                        tempCookTime === opt && styles.sheetChipActive,
                      ]}
                      onPress={() => setTempCookTime(opt)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          tempCookTime === opt && styles.sheetChipTextActive,
                        ]}
                      >
                        {COOK_TIME_LABELS[opt]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sheetDivider} />

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Diet</Text>
                <View style={styles.chipWrap}>
                  {DIET_OPTIONS.map((diet) => (
                    <TouchableOpacity
                      key={diet}
                      style={[
                        styles.sheetChip,
                        tempDietFilters.includes(diet) && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleTempDiet(diet)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          tempDietFilters.includes(diet) && styles.sheetChipTextActive,
                        ]}
                      >
                        {diet}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.sheetDivider} />

              <View style={styles.sheetSection}>
                <Text style={styles.sheetSectionTitle}>Cuisine</Text>
                <View style={styles.chipWrap}>
                  {uniqueCuisines.map((cuisine) => (
                    <TouchableOpacity
                      key={cuisine}
                      style={[
                        styles.sheetChip,
                        tempCuisineFilters.includes(cuisine) && styles.sheetChipActive,
                      ]}
                      onPress={() => toggleTempCuisine(cuisine)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.sheetChipText,
                          tempCuisineFilters.includes(cuisine) && styles.sheetChipTextActive,
                        ]}
                      >
                        {cuisine}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={{ height: 8 }} />
            </ScrollView>

            <View style={styles.sheetFooter}>
              <TouchableOpacity
                style={styles.clearBtn}
                onPress={clearFilterSheet}
                activeOpacity={0.8}
              >
                <Text style={styles.clearBtnText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyBtn}
                onPress={applyFilterSheet}
                activeOpacity={0.85}
              >
                <Text style={styles.applyBtnText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
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

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => {
          setSlotPickerVisible(false);
          setSelectedMeal(null);
        }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealForSlot={getMealForSlot}
        mealName={selectedMeal?.name ?? ''}
      />
    </View>
  );
}

interface CuisineChipButtonProps {
  label: string;
  selected: boolean;
  onPress: () => void;
}

const CuisineChipButton = React.memo(function CuisineChipButton({
  label,
  selected,
  onPress,
}: CuisineChipButtonProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 0.96, duration: 150, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[styles.cuisineChip, selected && styles.cuisineChipSelected]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <Text style={[styles.cuisineChipText, selected && styles.cuisineChipTextSelected]}>
          {label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

interface DiscoverMealCardProps {
  meal: DiscoverMeal;
  width: number;
  isSaved: boolean;
  isInPlan?: boolean;
  onPress: () => void;
  onSave: () => void;
  onAddToPlan: () => void;
}

const DiscoverMealCard = React.memo(function DiscoverMealCard({
  meal,
  width,
  isSaved,
  isInPlan = false,
  onPress,
  onSave,
  onAddToPlan,
}: DiscoverMealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isNew = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(meal.created_at) >= weekAgo;
  }, [meal.created_at]);

  return (
    <Animated.View style={[styles.mealCard, { width, transform: [{ scale: scaleAnim }] }, isInPlan && styles.mealCardInPlan]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scaleAnim, {
            toValue: 0.97,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start()
        }
        onPressOut={() =>
          Animated.spring(scaleAnim, {
            toValue: 1,
            useNativeDriver: true,
            speed: 50,
            bounciness: 4,
          }).start()
        }
      >
        <View style={styles.mealImageWrap}>
          <Image
            source={{ uri: meal.image_url }}
            style={styles.mealImage}
            contentFit="cover"
          />
          <TouchableOpacity style={styles.saveFavBtn} onPress={onSave}>
            <Heart
              size={16}
              color={isSaved ? Colors.primary : Colors.white}
              fill={isSaved ? Colors.primary : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          {isNew && (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>New</Text>
            </View>
          )}
          <View style={styles.cookTimeBadge}>
            <Clock size={11} color="#FFFFFF" strokeWidth={2} />
            <Text style={styles.cookTimeBadgeText}>{meal.prep_time + meal.cook_time} min</Text>
          </View>
          {meal.nutrition?.calories !== undefined && (
            <View style={styles.calsBadge}>
              <Text style={styles.calsBadgeText}>{meal.nutrition.calories} cal</Text>
            </View>
          )}
        </View>
        <View style={styles.mealCardBody}>
          <Text style={styles.mealCardName} numberOfLines={2}>
            {meal.name}
          </Text>
          <TouchableOpacity
            onPress={() => router.push(`/chef-profile?id=${meal.chef_id}` as Href)}
          >
            <Text style={styles.mealCardChef}>{meal.chef_name}</Text>
          </TouchableOpacity>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.mealCardTags}
          >
            <View style={styles.mealMiniTag}>
              <Text style={styles.mealMiniTagText}>{meal.cuisine}</Text>
            </View>
            <View style={styles.mealMiniTag}>
              <Clock size={9} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.mealMiniTagText}>{meal.cooking_time_band}</Text>
            </View>
            <View style={styles.servingChip}>
              <Users size={12} color="#6B7280" strokeWidth={2} />
              <Text style={styles.servingChipText}>{meal.recipe_serving_size}</Text>
            </View>
          </ScrollView>
        </View>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.mealPlanBtn, isInPlan && styles.mealPlanBtnInPlan]}
        onPress={onAddToPlan}
      >
        {isInPlan ? (
          <Check size={16} color={Colors.white} strokeWidth={2.5} />
        ) : (
          <CalendarPlus size={16} color={Colors.white} strokeWidth={2.5} />
        )}
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  filterBarContent: {
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealTypeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  mealTypeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  mealTypeChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mealTypeChipTextActive: {
    color: Colors.white,
  },
  filtersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 12,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    flexShrink: 0,
  },
  filtersBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filtersBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  filtersBtnTextActive: {
    color: Colors.white,
  },
  scroll: {
    flex: 1,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 7,
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    borderRadius: BorderRadius.card,
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    borderBottomLeftRadius: BorderRadius.card,
    borderBottomRightRadius: BorderRadius.card,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  horizontalList: {
    paddingRight: 16,
    gap: 12,
  },
  missingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  missingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  noResultsContainer: {
    paddingVertical: 60,
    paddingHorizontal: 40,
    alignItems: 'center' as const,
  },
  noResultsTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#111827',
    textAlign: 'center' as const,
    marginTop: 16,
  },
  noResultsSubtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: '#6B7280',
    textAlign: 'center' as const,
    maxWidth: 240,
    marginTop: 8,
  },
  clearFiltersBtn: {
    backgroundColor: '#7C3AED',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  clearFiltersBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  emptyFilterText: {
    fontSize: 14,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    paddingVertical: 16,
  },
  mealCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealImageWrap: {
    aspectRatio: 4 / 3,
    position: 'relative' as const,
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  saveFavBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTag: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
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
  calsBadge: {
    position: 'absolute' as const,
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(124,58,237,0.75)',
    borderRadius: 9999,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  calsBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  mealCardBody: {
    padding: 10,
  },
  mealCardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  mealCardChef: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  mealCardTags: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  servingChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  servingChipText: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#6B7280',
  },
  mealMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealMiniTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mealPlanBtn: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPlanBtnInPlan: {
    backgroundColor: '#16A34A',
  },
  mealCardInPlan: {
    borderWidth: 1.5,
    borderColor: '#16A34A',
  },
  collectionCard: {
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  collectionImage: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
  collectionInfo: {
    padding: 10,
  },
  collectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  collectionCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  newBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  cuisineChipSection: {
    marginTop: 32,
  },
  cuisineChipHeader: {
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  cuisineChipTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  cuisineChipRow: {
    paddingHorizontal: 16,
    gap: 8,
    flexDirection: 'row',
  },
  cuisineChip: {
    borderRadius: 9999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  cuisineChipSelected: {
    borderColor: '#7C3AED',
    backgroundColor: '#EDE9FE',
  },
  cuisineChipText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#6B7280',
  },
  cuisineChipTextSelected: {
    color: '#7C3AED',
  },
  dietaryRow: {
    gap: 8,
    paddingVertical: 8,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '82%',
    paddingTop: 12,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sheetCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 4,
  },
  sheetSectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  sheetDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginHorizontal: 20,
    marginTop: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sheetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  sheetChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  sheetChipText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  sheetChipTextActive: {
    color: Colors.white,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
  },
  clearBtnText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  applyBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyBtnText: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
});
