import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet, RefreshControl, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import AppHeader from '@/components/AppHeader';
import SegmentedControl from '@/components/SegmentedControl';
import WeeklyPlanView from '@/components/WeeklyPlanView';
import DailyPlanView from '@/components/DailyPlanView';
import MealPickerSheet from '@/components/MealPickerSheet';
import RepeatWeekSheet from '@/components/RepeatWeekSheet';
import RepeatDaySheet from '@/components/RepeatDaySheet';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useOnboarding } from '@/providers/OnboardingProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { FavMeal, PlannedMeal } from '@/types';
import { getWeekDates, formatDateKey, getDayName, isToday } from '@/utils/dates';
import { setPendingPlanSlot } from '@/services/pendingPlanSlot';
import { CalendarDays } from 'lucide-react-native';

function getSlotCategory(slotName: string): 'breakfast' | 'lunch_dinner' | 'light_bites' {
  const lower = slotName.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning') || lower.includes('brunch')) {
    return 'breakfast';
  }
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('supper') || lower.includes('evening meal')) {
    return 'lunch_dinner';
  }
  return 'light_bites';
}

function getMealCategoryByName(name: string): 'breakfast' | 'lunch_dinner' | 'light_bites' {
  const lower = name.toLowerCase();
  if (
    lower.includes('pancake') || lower.includes('oat') || lower.includes('shakshuka') ||
    lower.includes('breakfast') || lower.includes('granola') || lower.includes('smoothie') ||
    lower.includes('cereal') || lower.includes('porridge') || lower.includes('waffle') ||
    lower.includes('toast') || lower.includes('muesli') || lower.includes('frittata')
  ) {
    return 'breakfast';
  }
  if (
    lower.includes('salad') || lower.includes('soup') || lower.includes('wrap') ||
    lower.includes('sandwich') || lower.includes('snack') || lower.includes('dip')
  ) {
    return 'light_bites';
  }
  return 'lunch_dinner';
}

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboarding();
  const { familySettings } = useFamilySettings();
  const {
    viewMode,
    setViewMode,
    isLoading,
    addMeal,
    addMeals,
    removeMeal,
    removeMealById,
    updateMealServing,
    getMealForSlot,
    getMealsForSlot,
    getMealsForWeek,
    getMealsForDate,
    meals,
    clearDay,
    clearWeek,
  } = useMealPlan();
  const { meals: favMeals, addFav, removeFav, isFavByName } = useFavs();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerDate, setPickerDate] = useState<string>('');
  const [pickerSlotId, setPickerSlotId] = useState<string>('');
  const [pickerSlotName, setPickerSlotName] = useState<string>('');
  const [repeatWeekVisible, setRepeatWeekVisible] = useState<boolean>(false);
  const [repeatDayVisible, setRepeatDayVisible] = useState<boolean>(false);

  useEffect(() => {
    if (!onboardingLoading && !onboardingData.completed) {
      console.log('[MealPlan] Onboarding not completed, redirecting...');
      router.replace('/onboarding/auth' as Href);
    }
  }, [onboardingData.completed, onboardingLoading]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  }, []);

  const viewIndex = viewMode === 'day' ? 0 : 1;

  const handleViewChange = useCallback((idx: number) => {
    setViewMode(idx === 0 ? 'day' : 'week');
  }, [setViewMode]);

  const handleEmptySlotPress = useCallback(
    (date: string, slotId: string) => {
      const slot = familySettings.meal_slots.find((s) => s.slot_id === slotId);
      setPickerDate(date);
      setPickerSlotId(slotId);
      setPickerSlotName(slot?.name ?? 'Meal');
      setPickerVisible(true);
      console.log('[MealPlan] Opening picker for:', date, slotId);
    },
    [familySettings.meal_slots]
  );

  const handleMealPress = useCallback(
    (meal: PlannedMeal) => {
      console.log('[MealPlan] Navigating to meal detail:', meal.meal_name);
      router.push(`/recipe-detail?id=${meal.id}&source=plan` as Href);
    },
    []
  );

  const handleServingPress = useCallback(
    (meal: PlannedMeal) => {
      Alert.alert(
        'Adjust Servings',
        `Current: ${meal.serving_size} servings for ${meal.meal_name}`,
        [
          {
            text: '-1',
            onPress: () => {
              if (meal.serving_size > 1) updateMealServing(meal.id, meal.serving_size - 1);
            },
          },
          {
            text: '+1',
            onPress: () => {
              if (meal.serving_size < 20) updateMealServing(meal.id, meal.serving_size + 1);
            },
          },
          { text: 'Done', style: 'cancel' },
        ]
      );
    },
    [updateMealServing]
  );

  const favMealsRef = useRef(favMeals);
  favMealsRef.current = favMeals;

  const handleToggleFav = useCallback(
    (meal: PlannedMeal) => {
      const existing = favMealsRef.current.find(
        (f) => f.name.toLowerCase() === meal.meal_name.toLowerCase()
      );
      if (existing) {
        removeFav(existing.id);
        console.log('[MealPlan] Removed from favs:', meal.meal_name);
      } else {
        const favMeal: FavMeal = {
          id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: meal.meal_name,
          image_url: meal.meal_image_url,
          cuisine: undefined,
          cooking_time_band: undefined,
          prep_time: undefined,
          cook_time: undefined,
          dietary_tags: [],
          custom_tags: [],
          ingredients: meal.ingredients,
          recipe_serving_size: meal.recipe_serving_size,
          method_steps: [],
          description: undefined,
          chef_notes: undefined,
          source: 'family_created',
          source_chef_id: undefined,
          source_chef_name: undefined,
          add_to_plan_count: 0,
          created_at: new Date().toISOString(),
          is_ingredient_complete: meal.ingredients.length > 0,
          is_recipe_complete: false,
        };
        addFav(favMeal);
        console.log('[MealPlan] Added to favs:', meal.meal_name);
      }
    },
    [addFav, removeFav]
  );

  const handleRemoveMealById = useCallback((mealId: string) => {
    removeMealById(mealId);
  }, [removeMealById]);

  const handleAddItemToSlot = useCallback(
    (date: string, slotId: string, slotName: string) => {
      setPickerDate(date);
      setPickerSlotId(slotId);
      setPickerSlotName(slotName);
      setPickerVisible(true);
      console.log('[MealPlan] Adding item to slot:', date, slotId);
    },
    []
  );

  const handleSelectMeal = useCallback(
    (meal: PlannedMeal) => {
      addMeal(meal);
      setPickerVisible(false);
    },
    [addMeal]
  );

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const handleRepeatWeek = useCallback((sourceOffset: number) => {
    const sourceMeals = getMealsForWeek(sourceOffset);
    if (!sourceMeals.length) return;
    const currentWeekDates = getWeekDates(weekOffset);
    const sourceWeekDates = getWeekDates(sourceOffset);
    const mapped = sourceMeals.map(m => {
      const srcIdx = sourceWeekDates.findIndex(d => formatDateKey(d) === m.date);
      if (srcIdx === -1) return null;
      return { ...m, id: Date.now().toString() + Math.random().toString(36).slice(2), date: formatDateKey(currentWeekDates[srcIdx]) };
    }).filter(Boolean);
    addMeals(mapped as any);
  }, [getMealsForWeek, addMeals, weekOffset]);

  const handleRepeatDay = useCallback((sourceDateKey: string) => {
    const sourceMeals = getMealsForDate(sourceDateKey);
    if (!sourceMeals.length) return;
    const targetDateKey = formatDateKey(currentDate);
    const mapped = sourceMeals.map(m => ({
      ...m,
      id: Date.now().toString() + Math.random().toString(36).slice(2),
      date: targetDateKey,
    }));
    addMeals(mapped as any);
  }, [getMealsForDate, addMeals, currentDate]);

  const handleDayPress = useCallback((d: Date) => {
    setCurrentDate(d);
    setViewMode('day');
  }, [setViewMode]);

  const handleSmartPlan = useCallback(() => {
    const weekDates = getWeekDates(weekOffset);
    const defaultServing = familySettings.default_serving_size;
    const favNames = new Set(favMeals.map((f) => f.name.toLowerCase()));

    type PoolEntry = {
      name: string;
      image_url?: string;
      ingredients: PlannedMeal['ingredients'];
      recipe_serving_size: number;
    };

    const pool: PoolEntry[] = [
      ...favMeals.map((f) => ({
        name: f.name,
        image_url: f.image_url,
        ingredients: f.ingredients,
        recipe_serving_size: f.recipe_serving_size,
      })),
      ...DISCOVER_MEALS.filter((d) => !favNames.has(d.name.toLowerCase())).map((d) => ({
        name: d.name,
        image_url: d.image_url,
        ingredients: d.ingredients,
        recipe_serving_size: d.recipe_serving_size,
      })),
    ];

    if (pool.length === 0) {
      Alert.alert('No meals available', 'Add meals to your Favourites or explore Discover to use Smart Plan.');
      return;
    }

    const used = new Set<string>();
    const newMeals: PlannedMeal[] = [];

    for (const date of weekDates) {
      const dateKey = formatDateKey(date);
      for (const slot of sortedSlots) {
        const existing = getMealsForSlot(dateKey, slot.slot_id);
        if (existing.length > 0) continue;
        const slotCat = getSlotCategory(slot.name);
        const serving = slot.serving_size_override ?? defaultServing;

        const catMatches = pool.filter(
          (m) => getMealCategoryByName(m.name) === slotCat && !used.has(m.name.toLowerCase())
        );
        const fallback = pool.filter((m) => !used.has(m.name.toLowerCase()));
        const candidates = catMatches.length > 0 ? catMatches : fallback;

        if (candidates.length === 0) continue;

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        used.add(picked.name.toLowerCase());

        newMeals.push({
          id: `meal_${Date.now()}_${newMeals.length}_${Math.random().toString(36).slice(2, 7)}`,
          slot_id: slot.slot_id,
          date: dateKey,
          meal_name: picked.name,
          meal_image_url: picked.image_url,
          serving_size: serving,
          ingredients: picked.ingredients,
          recipe_serving_size: picked.recipe_serving_size,
        });
      }
    }

    if (newMeals.length > 0) {
      addMeals(newMeals);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[MealPlan] Smart plan generated', newMeals.length, 'meals');
    }
  }, [weekOffset, favMeals, sortedSlots, familySettings.default_serving_size, addMeals, getMealsForSlot]);

  const handleClearWeek = useCallback(() => {
    Alert.alert('Clear this week?', 'All meals for this week will be removed.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearWeek(weekOffset);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [clearWeek, weekOffset]);

  const handleClearDay = useCallback(() => {
    const dayLabel = isToday(currentDate) ? 'today' : getDayName(currentDate, false);
    Alert.alert('Clear this day?', `All meals for ${dayLabel} will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => {
          clearDay(formatDateKey(currentDate));
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        },
      },
    ]);
  }, [clearDay, currentDate]);

  const handleSmartPlanDay = useCallback(() => {
    const defaultServing = familySettings.default_serving_size;
    const favNames = new Set(favMeals.map((f) => f.name.toLowerCase()));

    type PoolEntry = {
      name: string;
      image_url?: string;
      ingredients: PlannedMeal['ingredients'];
      recipe_serving_size: number;
    };

    const pool: PoolEntry[] = [
      ...favMeals.map((f) => ({
        name: f.name,
        image_url: f.image_url,
        ingredients: f.ingredients,
        recipe_serving_size: f.recipe_serving_size,
      })),
      ...DISCOVER_MEALS.filter((d) => !favNames.has(d.name.toLowerCase())).map((d) => ({
        name: d.name,
        image_url: d.image_url,
        ingredients: d.ingredients,
        recipe_serving_size: d.recipe_serving_size,
      })),
    ];

    if (pool.length === 0) {
      Alert.alert('No meals available', 'Add meals to your Favourites or explore Discover to use Smart Plan.');
      return;
    }

    const used = new Set<string>();
    const newMeals: PlannedMeal[] = [];

    for (const date of [currentDate]) {
      const dateKey = formatDateKey(date);
      for (const slot of sortedSlots) {
        const existing = getMealsForSlot(dateKey, slot.slot_id);
        if (existing.length > 0) continue;
        const slotCat = getSlotCategory(slot.name);
        const serving = slot.serving_size_override ?? defaultServing;

        const catMatches = pool.filter(
          (m) => getMealCategoryByName(m.name) === slotCat && !used.has(m.name.toLowerCase())
        );
        const fallback = pool.filter((m) => !used.has(m.name.toLowerCase()));
        const candidates = catMatches.length > 0 ? catMatches : fallback;

        if (candidates.length === 0) continue;

        const picked = candidates[Math.floor(Math.random() * candidates.length)];
        used.add(picked.name.toLowerCase());

        newMeals.push({
          id: `meal_${Date.now()}_${newMeals.length}_${Math.random().toString(36).slice(2, 7)}`,
          slot_id: slot.slot_id,
          date: dateKey,
          meal_name: picked.name,
          meal_image_url: picked.image_url,
          serving_size: serving,
          ingredients: picked.ingredients,
          recipe_serving_size: picked.recipe_serving_size,
        });
      }
    }

    if (newMeals.length > 0) {
      addMeals(newMeals);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[MealPlan] Smart plan day generated', newMeals.length, 'meals');
    }
  }, [currentDate, favMeals, sortedSlots, familySettings.default_serving_size, addMeals, getMealsForSlot]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Meal Plan" />
        <View style={styles.skeletonWrap}>
          <SkeletonLoader height={36} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={200} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={200} borderRadius={12} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="Meal Plan" />

      <View style={styles.controlWrap}>
        <SegmentedControl
          segments={['Day', 'Week']}
          activeIndex={viewIndex}
          onChange={handleViewChange}
        />
      </View>

      {viewMode === 'week' ? (
        <ScrollView
          style={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          testID="mealplan-scroll"
        >
          {sortedSlots.length === 0 ? (
            <EmptyState
              icon={<CalendarDays size={36} color={Colors.primary} strokeWidth={1.5} />}
              title="No meal slots configured"
              description="Add meal slots in Family Settings to start planning."
              actionLabel="Go to Settings"
              onAction={() => router.push('/family-settings' as Href)}
            />
          ) : (
            <WeeklyPlanView
              mealSlots={sortedSlots}
              weekOffset={weekOffset}
              onWeekChange={setWeekOffset}
              getMealsForSlot={getMealsForSlot}
              onDayPress={handleDayPress}
              onRepeatWeek={() => setRepeatWeekVisible(true)}
              onSmartPlan={handleSmartPlan}
              onClearWeek={handleClearWeek}
            />
          )}
        </ScrollView>
      ) : (
        <DailyPlanView
          mealSlots={sortedSlots}
          currentDate={currentDate}
          onDateChange={setCurrentDate}
          getMealsForSlot={getMealsForSlot}
          onEmptySlotPress={handleEmptySlotPress}
          onMealPress={handleMealPress}
          onServingChange={updateMealServing}
          onRemoveMealById={handleRemoveMealById}
          onAddItemToSlot={handleAddItemToSlot}
          onToggleFav={handleToggleFav}
          isFavByName={isFavByName}
          onSmartPlan={handleSmartPlanDay}
          onClearDay={handleClearDay}
          onRepeatDay={() => setRepeatDayVisible(true)}
        />
      )}

      <MealPickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelectMeal={handleSelectMeal}
        onCreateNewRecipe={() => {
          setPickerVisible(false);
          setPendingPlanSlot({
            slotId: pickerSlotId,
            date: pickerDate,
            slotName: pickerSlotName,
            defaultServing: familySettings.default_serving_size,
          });
          router.push('/add-recipe-entry' as Href);
        }}
        date={pickerDate}
        slotId={pickerSlotId}
        slotName={pickerSlotName}
        defaultServing={familySettings.default_serving_size}
      />
      <RepeatWeekSheet
        visible={repeatWeekVisible}
        currentWeekOffset={weekOffset}
        getMealsForWeek={getMealsForWeek}
        onSelect={handleRepeatWeek}
        onClose={() => setRepeatWeekVisible(false)}
      />
      <RepeatDaySheet
        visible={repeatDayVisible}
        currentDate={currentDate}
        getMealsForDate={getMealsForDate}
        onSelect={handleRepeatDay}
        onClose={() => setRepeatDayVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  controlWrap: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  content: {
    flex: 1,
  },
  skeletonWrap: {
    padding: 16,
  },
});
