import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, RefreshControl, ScrollView, Alert, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
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
import { Recipe, PlannedMeal } from '@/types';
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

// Fallback name-based classifier — only used when a meal has no meal_type field set.
// Prefer the meal_type field directly wherever available.
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

// ─── Smart Fill — shared types & pure scoring functions ──────────────────────

type PoolEntry = {
  id?: string;
  name: string;
  image_url?: string;
  ingredients: PlannedMeal['ingredients'];
  recipe_serving_size: number;
  isNew: boolean;
  // Rich fields used for scoring and slot matching
  meal_type?: 'breakfast' | 'lunch_dinner' | 'light_bites';
  protein_source?: string;
  cuisines?: string[];
  rating?: string;             // 'disliked' | 'liked' | 'loved'
  add_to_plan_count?: number;
  last_cooked_at?: string;
  is_vegan?: boolean;
  is_vegetarian?: boolean;
  is_gluten_free?: boolean;
  is_dairy_free?: boolean;
};

type ScoringContext = {
  proteinsUsedToday: Set<string>;
  cuisinesUsedToday: Set<string>;
  proteinCountsThisWeek: Map<string, number>;
};

/**
 * Score a pool entry given the current pick context.
 * Higher = more likely to be picked. Can be negative (shifted up in weightedPick).
 *
 * Signals:
 *   Rating:          loved +60 / liked +30 / fav no-rating +15 / discover no-rating +5
 *   Planned before:  add_to_plan_count > 0 → +10
 *   Recency:         cooked ≤7 days ago → −30 / ≤14 days → −15
 *   Protein today:   same protein already used today → −40
 *   Protein week:    same protein used 3+ times this week → −20
 *   Cuisine today:   same cuisine already used today → −20
 */
function scoreCandidate(entry: PoolEntry, ctx: ScoringContext): number {
  let score = entry.rating === 'loved' ? 60
            : entry.rating === 'liked' ? 30
            : !entry.isNew ? 15    // fav, unrated — family has seen it before
            : 5;                   // discover-only, unrated

  if ((entry.add_to_plan_count ?? 0) > 0) score += 10;

  if (entry.last_cooked_at) {
    const daysSince = Math.floor(
      (Date.now() - new Date(entry.last_cooked_at).getTime()) / 86_400_000
    );
    if (daysSince <= 7) score -= 30;
    else if (daysSince <= 14) score -= 15;
  }

  if (entry.protein_source) {
    if (ctx.proteinsUsedToday.has(entry.protein_source)) score -= 40;
    else if ((ctx.proteinCountsThisWeek.get(entry.protein_source) ?? 0) >= 3) score -= 20;
  }

  if (entry.cuisines?.length) {
    if (entry.cuisines.some((c) => ctx.cuisinesUsedToday.has(c.toLowerCase()))) score -= 20;
  }

  return score;
}

/**
 * Probability-weighted random pick.
 * Scores are shifted so the minimum becomes 1 — no zero/negative weights —
 * then items are drawn proportionally to their shifted score.
 */
function weightedPick<T>(items: T[], scores: number[]): T {
  const min = Math.min(...scores);
  const shifted = scores.map((s) => s - min + 1);
  const total = shifted.reduce((a, b) => a + b, 0);
  let rand = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    rand -= shifted[i];
    if (rand <= 0) return items[i];
  }
  return items[items.length - 1];
}

export default function MealPlanScreen() {
  const insets = useSafeAreaInsets();
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboarding();
  const { familySettings, userSettings } = useFamilySettings();
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
  const { meals: favMeals, addFav, removeFav } = useFavs();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [pickerDate, setPickerDate] = useState<string>('');
  const [pickerSlotId, setPickerSlotId] = useState<string>('');
  const [pickerSlotName, setPickerSlotName] = useState<string>('');
  const [repeatWeekVisible, setRepeatWeekVisible] = useState<boolean>(false);
  const [repeatDayVisible, setRepeatDayVisible] = useState<boolean>(false);
  const [smartPlanToast, setSmartPlanToast] = useState<string | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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


  const favMealsRef = useRef(favMeals);
  favMealsRef.current = favMeals;

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
    const filtered = (mapped as any[]).filter(m => getMealsForSlot(m.date, m.slot_id).length === 0);
    if (filtered.length === 0) {
      Alert.alert('Nothing to repeat', 'All slots this week are already planned.');
    } else {
      addMeals(filtered);
    }
  }, [getMealsForWeek, addMeals, getMealsForSlot, weekOffset]);

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

  const showSmartPlanToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setSmartPlanToast(message);
    toastOpacity.setValue(0);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setSmartPlanToast(null));
    toastTimer.current = setTimeout(() => setSmartPlanToast(null), 2700);
  }, [toastOpacity]);

  const handleSmartPlan = useCallback(() => {
    const weekDates = getWeekDates(weekOffset);
    const defaultServing = familySettings.default_serving_size;
    const noveltyPct = familySettings.smart_fill_novelty_pct ?? 30;
    const favNames = new Set(favMeals.map((f) => f.name.toLowerCase()));
    const weekWasEmpty = weekDates.every((date) =>
      sortedSlots.every((slot) => getMealsForSlot(formatDateKey(date), slot.slot_id).length === 0)
    );

    // ── Build pools ──────────────────────────────────────────────────────────
    // familiarPool = meals the family already knows (Favs), with full rich fields
    const familiarPool: PoolEntry[] = favMeals.map((f) => ({
      id: f.id,
      name: f.name,
      image_url: f.image_url,
      ingredients: f.ingredients,
      recipe_serving_size: f.recipe_serving_size,
      isNew: false,
      meal_type: f.meal_type,
      protein_source: f.protein_source,
      cuisines: f.cuisines ?? (f.cuisine ? [f.cuisine.toLowerCase()] : undefined),
      rating: f.rating,
      add_to_plan_count: f.add_to_plan_count,
      last_cooked_at: f.last_cooked_at,
      is_vegan: f.is_vegan,
      is_vegetarian: f.is_vegetarian,
      is_gluten_free: f.is_gluten_free,
      is_dairy_free: f.is_dairy_free,
    }));

    // newPool = discover meals not already in Favs
    const newPool: PoolEntry[] = DISCOVER_MEALS
      .filter((d) => !favNames.has(d.name.toLowerCase()))
      .map((d) => ({
        name: d.name,
        image_url: d.image_url,
        ingredients: d.ingredients,
        recipe_serving_size: d.recipe_serving_size,
        isNew: true,
        meal_type: d.meal_type,
        protein_source: d.protein_source,
        cuisines: d.cuisines,
        add_to_plan_count: d.add_to_plan_count,
        is_vegan: d.is_vegan,
        is_vegetarian: d.is_vegetarian,
        is_gluten_free: d.is_gluten_free,
        is_dairy_free: d.is_dairy_free,
      }));

    const fullPool = [...familiarPool, ...newPool];

    if (fullPool.length === 0) {
      Alert.alert('No meals available', 'Add meals to your Favourites or explore Discover to use Smart Plan.');
      return;
    }

    // ── Novelty quota ────────────────────────────────────────────────────────
    const totalSlotsToFill = weekDates.reduce((acc, date) => {
      const dateKey = formatDateKey(date);
      return acc + sortedSlots.filter((slot) => {
        const existing = getMealsForSlot(dateKey, slot.slot_id);
        return weekWasEmpty ? existing.length === 0 : true;
      }).length;
    }, 0);
    const targetNewCount = Math.round(totalSlotsToFill * noveltyPct / 100);

    // ── Eligibility helper ───────────────────────────────────────────────────
    // Hard filter: disliked meals, already-used meals, and dietary mismatches never appear.
    const combinedPrefs = [...(familySettings.dietary_preferences_family ?? []), ...(userSettings.dietary_preferences_individual ?? [])];
    const eligible = (pool: PoolEntry[], usedSet: Set<string>) =>
      pool.filter((m) => {
        if (m.rating === 'disliked') return false;
        if (usedSet.has(m.name.toLowerCase())) return false;
        if (combinedPrefs.includes('Vegan') && !m.is_vegan) return false;
        if (combinedPrefs.includes('Vegetarian') && !m.is_vegan && !m.is_vegetarian) return false;
        if (combinedPrefs.includes('Gluten-Free') && !m.is_gluten_free) return false;
        if (combinedPrefs.includes('Dairy-Free') && !m.is_dairy_free) return false;
        return true;
      });

    // Slot matcher: prefer meal_type field; fall back to name heuristic for older meals.
    const matchesSlot = (m: PoolEntry, slotCat: string) =>
      (m.meal_type ?? getMealCategoryByName(m.name)) === slotCat;

    // ── Scoring context ──────────────────────────────────────────────────────
    // proteinCountsThisWeek accumulates across all days; proteinsUsedToday and
    // cuisinesUsedToday reset for each new day so diversity is enforced per-day.
    const proteinCountsThisWeek = new Map<string, number>();

    const used = new Set<string>();
    const newMeals: PlannedMeal[] = [];
    let newPicksCount = 0;

    for (const date of weekDates) {
      const dateKey = formatDateKey(date);
      const proteinsUsedToday = new Set<string>();
      const cuisinesUsedToday = new Set<string>();

      for (const slot of sortedSlots) {
        const existing = getMealsForSlot(dateKey, slot.slot_id);
        // Smart Fill: skip occupied slots. Reshuffle: overwrite all.
        if (weekWasEmpty && existing.length > 0) continue;
        const slotCat = getSlotCategory(slot.name);
        const serving = slot.serving_size_override ?? defaultServing;

        // ── Novelty split ──────────────────────────────────────────────────
        const needsNewPick = newPicksCount < targetNewCount;
        const preferredPool = needsNewPick
          ? (newPool.length > 0 ? newPool : familiarPool)
          : (familiarPool.length > 0 ? familiarPool : newPool);
        const fallbackPool = needsNewPick ? familiarPool : newPool;

        const prefEligible  = eligible(preferredPool, used);
        const fallEligible  = eligible(fallbackPool, used);
        const fullEligible  = eligible(fullPool, used);

        // Priority: preferred slot-match → preferred any → fallback slot-match → fallback any → anything
        const candidates =
          prefEligible.filter((m) => matchesSlot(m, slotCat)).length > 0
            ? prefEligible.filter((m) => matchesSlot(m, slotCat))
          : prefEligible.length > 0
            ? prefEligible
          : fallEligible.filter((m) => matchesSlot(m, slotCat)).length > 0
            ? fallEligible.filter((m) => matchesSlot(m, slotCat))
          : fallEligible.length > 0
            ? fallEligible
          : fullEligible;

        if (candidates.length === 0) continue;

        // ── Score + weighted pick ──────────────────────────────────────────
        const ctx: ScoringContext = { proteinsUsedToday, cuisinesUsedToday, proteinCountsThisWeek };
        const scores = candidates.map((m) => scoreCandidate(m, ctx));
        const picked = weightedPick(candidates, scores);

        used.add(picked.name.toLowerCase());
        if (picked.isNew) newPicksCount++;

        // Update diversity context for subsequent picks
        if (picked.protein_source) {
          proteinsUsedToday.add(picked.protein_source);
          proteinCountsThisWeek.set(
            picked.protein_source,
            (proteinCountsThisWeek.get(picked.protein_source) ?? 0) + 1
          );
        }
        if (picked.cuisines?.length) {
          picked.cuisines.forEach((c) => cuisinesUsedToday.add(c.toLowerCase()));
        }

        newMeals.push({
          id: `meal_${Date.now()}_${newMeals.length}_${Math.random().toString(36).slice(2, 7)}`,
          slot_id: slot.slot_id,
          date: dateKey,
          meal_name: picked.name,
          meal_image_url: picked.image_url,
          serving_size: serving,
          ingredients: picked.ingredients,
          recipe_serving_size: picked.recipe_serving_size,
          ...(picked.id ? { meal_id: picked.id } : {}),
        });
      }
    }

    if (newMeals.length > 0) {
      addMeals(newMeals);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[MealPlan] Smart plan generated', newMeals.length, 'meals,', newPicksCount, 'new picks');
      showSmartPlanToast(weekWasEmpty
        ? `✨ Week planned! ${newMeals.length} meal${newMeals.length !== 1 ? 's' : ''} added`
        : `🔀 Reshuffled! ${newMeals.length} meal${newMeals.length !== 1 ? 's' : ''} swapped in`);
    } else {
      Alert.alert('Already fully planned! 🎉', 'All slots for this week already have meals. Clear some first to use Smart Fill.');
    }
  }, [weekOffset, favMeals, sortedSlots, familySettings.default_serving_size, familySettings.smart_fill_novelty_pct, familySettings.dietary_preferences_family, userSettings.dietary_preferences_individual, addMeals, getMealsForSlot, showSmartPlanToast]);

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
    const noveltyPct = familySettings.smart_fill_novelty_pct ?? 30;
    const favNames = new Set(favMeals.map((f) => f.name.toLowerCase()));
    const dateKey = formatDateKey(currentDate);
    const dayWasEmpty = sortedSlots.every((slot) => getMealsForSlot(dateKey, slot.slot_id).length === 0);

    // ── Build pools ──────────────────────────────────────────────────────────
    const familiarPool: PoolEntry[] = favMeals.map((f) => ({
      id: f.id,
      name: f.name,
      image_url: f.image_url,
      ingredients: f.ingredients,
      recipe_serving_size: f.recipe_serving_size,
      isNew: false,
      meal_type: f.meal_type,
      protein_source: f.protein_source,
      cuisines: f.cuisines ?? (f.cuisine ? [f.cuisine.toLowerCase()] : undefined),
      rating: f.rating,
      add_to_plan_count: f.add_to_plan_count,
      last_cooked_at: f.last_cooked_at,
      is_vegan: f.is_vegan,
      is_vegetarian: f.is_vegetarian,
      is_gluten_free: f.is_gluten_free,
      is_dairy_free: f.is_dairy_free,
    }));

    const newPool: PoolEntry[] = DISCOVER_MEALS
      .filter((d) => !favNames.has(d.name.toLowerCase()))
      .map((d) => ({
        name: d.name,
        image_url: d.image_url,
        ingredients: d.ingredients,
        recipe_serving_size: d.recipe_serving_size,
        isNew: true,
        meal_type: d.meal_type,
        protein_source: d.protein_source,
        cuisines: d.cuisines,
        add_to_plan_count: d.add_to_plan_count,
        is_vegan: d.is_vegan,
        is_vegetarian: d.is_vegetarian,
        is_gluten_free: d.is_gluten_free,
        is_dairy_free: d.is_dairy_free,
      }));

    const fullPool = [...familiarPool, ...newPool];

    if (fullPool.length === 0) {
      Alert.alert('No meals available', 'Add meals to your Favourites or explore Discover to use Smart Plan.');
      return;
    }

    // ── Novelty quota ────────────────────────────────────────────────────────
    const totalSlotsToFill = sortedSlots.filter((slot) => {
      const existing = getMealsForSlot(dateKey, slot.slot_id);
      return dayWasEmpty ? existing.length === 0 : true;
    }).length;
    const targetNewCount = Math.round(totalSlotsToFill * noveltyPct / 100);

    // ── Eligibility + slot match helpers ────────────────────────────────────
    const combinedPrefs = [...(familySettings.dietary_preferences_family ?? []), ...(userSettings.dietary_preferences_individual ?? [])];
    const eligible = (pool: PoolEntry[], usedSet: Set<string>) =>
      pool.filter((m) => {
        if (m.rating === 'disliked') return false;
        if (usedSet.has(m.name.toLowerCase())) return false;
        if (combinedPrefs.includes('Vegan') && !m.is_vegan) return false;
        if (combinedPrefs.includes('Vegetarian') && !m.is_vegan && !m.is_vegetarian) return false;
        if (combinedPrefs.includes('Gluten-Free') && !m.is_gluten_free) return false;
        if (combinedPrefs.includes('Dairy-Free') && !m.is_dairy_free) return false;
        return true;
      });

    const matchesSlot = (m: PoolEntry, slotCat: string) =>
      (m.meal_type ?? getMealCategoryByName(m.name)) === slotCat;

    // ── Scoring context (single day — no week-level counters needed here) ────
    const proteinsUsedToday = new Set<string>();
    const cuisinesUsedToday = new Set<string>();
    const proteinCountsThisWeek = new Map<string, number>(); // empty for single-day fill

    const used = new Set<string>();
    const newMeals: PlannedMeal[] = [];
    let newPicksCount = 0;

    for (const slot of sortedSlots) {
      const existing = getMealsForSlot(dateKey, slot.slot_id);
      // Smart Fill: skip occupied slots. Reshuffle: overwrite all.
      if (dayWasEmpty && existing.length > 0) continue;
      const slotCat = getSlotCategory(slot.name);
      const serving = slot.serving_size_override ?? defaultServing;

      // ── Novelty split ────────────────────────────────────────────────────
      const needsNewPick = newPicksCount < targetNewCount;
      const preferredPool = needsNewPick
        ? (newPool.length > 0 ? newPool : familiarPool)
        : (familiarPool.length > 0 ? familiarPool : newPool);
      const fallbackPool = needsNewPick ? familiarPool : newPool;

      const prefEligible = eligible(preferredPool, used);
      const fallEligible = eligible(fallbackPool, used);
      const fullEligible = eligible(fullPool, used);

      const candidates =
        prefEligible.filter((m) => matchesSlot(m, slotCat)).length > 0
          ? prefEligible.filter((m) => matchesSlot(m, slotCat))
        : prefEligible.length > 0
          ? prefEligible
        : fallEligible.filter((m) => matchesSlot(m, slotCat)).length > 0
          ? fallEligible.filter((m) => matchesSlot(m, slotCat))
        : fallEligible.length > 0
          ? fallEligible
        : fullEligible;

      if (candidates.length === 0) continue;

      // ── Score + weighted pick ────────────────────────────────────────────
      const ctx: ScoringContext = { proteinsUsedToday, cuisinesUsedToday, proteinCountsThisWeek };
      const scores = candidates.map((m) => scoreCandidate(m, ctx));
      const picked = weightedPick(candidates, scores);

      used.add(picked.name.toLowerCase());
      if (picked.isNew) newPicksCount++;

      if (picked.protein_source) {
        proteinsUsedToday.add(picked.protein_source);
        proteinCountsThisWeek.set(
          picked.protein_source,
          (proteinCountsThisWeek.get(picked.protein_source) ?? 0) + 1
        );
      }
      if (picked.cuisines?.length) {
        picked.cuisines.forEach((c) => cuisinesUsedToday.add(c.toLowerCase()));
      }

      newMeals.push({
        id: `meal_${Date.now()}_${newMeals.length}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: slot.slot_id,
        date: dateKey,
        meal_name: picked.name,
        meal_image_url: picked.image_url,
        serving_size: serving,
        ingredients: picked.ingredients,
        recipe_serving_size: picked.recipe_serving_size,
        ...(picked.id ? { meal_id: picked.id } : {}),
      });
    }

    if (newMeals.length > 0) {
      addMeals(newMeals);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      console.log('[MealPlan] Smart plan day generated', newMeals.length, 'meals,', newPicksCount, 'new picks');
      showSmartPlanToast(dayWasEmpty
        ? `✨ Day planned! ${newMeals.length} meal${newMeals.length !== 1 ? 's' : ''} added`
        : `🔀 Reshuffled! ${newMeals.length} meal${newMeals.length !== 1 ? 's' : ''} swapped in`);
    } else {
      Alert.alert('Already fully planned! 🎉', 'All slots for today already have meals. Clear some first to use Smart Fill.');
    }
  }, [currentDate, favMeals, sortedSlots, familySettings.default_serving_size, familySettings.smart_fill_novelty_pct, familySettings.dietary_preferences_family, userSettings.dietary_preferences_individual, addMeals, getMealsForSlot, showSmartPlanToast]);

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Plan" />
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
      <AppHeader title="Plan" />

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

      {smartPlanToast !== null && (
        <Animated.View style={[styles.smartPlanToast, { opacity: toastOpacity }]} pointerEvents="none">
          <Text style={styles.smartPlanToastText}>{smartPlanToast}</Text>
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
  smartPlanToast: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
  },
  smartPlanToastText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
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
