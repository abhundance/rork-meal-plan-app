import React, { useMemo, useRef, useCallback } from 'react';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { ChevronLeft, ChevronRight, Plus, Bike } from 'lucide-react-native';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { useRecipes } from '@/providers/RecipesProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { formatDateKey, getDayName, getWeekLabel, isBefore } from '@/utils/dates';
import Card from './Card';

/* ─── Constants ────────────────────────────────────────────── */
const CARD_WIDTH = 104;
const IMG_SIZE = 96;
const IMG_RADIUS = 14;
const CAROUSEL_GAP = 8;
const CAROUSEL_HEIGHT = IMG_SIZE + 6 + 30 + 4; // image + gap + 2-line name + padding

interface DailyPlanViewProps {
  mealSlots: MealSlot[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  onEmptySlotPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  /** @deprecated Serving adjustment moved to recipe detail screen. Kept for parent compatibility. */
  onServingChange?: (mealId: string, serving: number) => void;
  onRemoveMealById: (mealId: string) => void;
  onAddItemToSlot: (date: string, slotId: string, slotName: string) => void;
  onSmartPlan: () => void;
  onClearDay: () => void;
  onRepeatDay: () => void;
}

export default function DailyPlanView({
  mealSlots,
  currentDate,
  onDateChange,
  getMealsForSlot,
  onEmptySlotPress,
  onMealPress,
  // onServingChange — no longer used; serving adjustment moved to recipe detail
  onRemoveMealById,
  onAddItemToSlot,
  onSmartPlan,
  onClearDay,
  onRepeatDay,
}: DailyPlanViewProps) {
  const dateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  const isPastDay = useMemo(() => isBefore(currentDate, new Date()), [currentDate]);

  const dayIsEmpty = mealSlots.every((slot) => getMealsForSlot(dateKey, slot.slot_id).length === 0);

  const weekDates = useMemo(() => {
    const day = currentDate.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const monday = new Date(currentDate);
    monday.setDate(currentDate.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);

  const handlePrevWeek = useCallback(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 7);
    onDateChange(prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentDate, onDateChange]);

  const handleNextWeek = useCallback(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 7);
    onDateChange(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentDate, onDateChange]);

  const handlePrevDay = useCallback(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
  }, [currentDate, onDateChange]);

  const handleNextDay = useCallback(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
  }, [currentDate, onDateChange]);

  const handlePrevDayRef = useRef(handlePrevDay);
  handlePrevDayRef.current = handlePrevDay;
  const handleNextDayRef = useRef(handleNextDay);
  handleNextDayRef.current = handleNextDay;

  /* Reduced activeOffsetX from [-60,60] to [-40,40] and raised the onEnd
     threshold to 70px so nested horizontal carousel ScrollViews can scroll
     freely without triggering the day-swipe gesture. */
  const swipeGesture = useMemo(() => Gesture.Pan().activeOffsetX([-40, 40]).failOffsetY([-25, 25]).runOnJS(true).onEnd((e) => {
    if (e.translationX < -70) {
      handleNextDayRef.current();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (e.translationX > 70) {
      handlePrevDayRef.current();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }), []);

  const todayKey = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return formatDateKey(t);
  }, []);

  return (
    <GestureDetector gesture={swipeGesture}>
    <View style={styles.container}>
      <View style={styles.weekNavRow}>
        <TouchableOpacity
          onPress={handlePrevWeek}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <ChevronLeft size={16} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity
          onPress={handleNextWeek}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <View style={styles.datePillRow}>
        {weekDates.map((date) => {
          const key = formatDateKey(date);
          const isSelected = key === dateKey;
          const isToday = key === todayKey;
          return (
            <DateCircle
              key={key}
              date={date}
              isSelected={isSelected}
              isToday={isToday}
              onPress={() => {
                onDateChange(date);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          );
        })}
      </View>

      {!isPastDay && <ActionStrip dayIsEmpty={dayIsEmpty} onSmartPlan={onSmartPlan} onClearDay={onClearDay} onRepeatDay={onRepeatDay} />}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {mealSlots.map((slot) => {
          const slotMeals = getMealsForSlot(dateKey, slot.slot_id);
          return (
            <DailySlotCard
              key={slot.slot_id}
              slot={slot}
              meals={slotMeals}
              dateKey={dateKey}
              onEmptyPress={onEmptySlotPress}
              onMealPress={onMealPress}
              onRemoveMealById={onRemoveMealById}
              onAddItemToSlot={onAddItemToSlot}
            />
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
    </GestureDetector>
  );
}

/* ─── ActionStrip ──────────────────────────────────────────── */

interface ActionStripProps {
  dayIsEmpty: boolean;
  onSmartPlan: () => void;
  onClearDay: () => void;
  onRepeatDay: () => void;
}

const ActionStrip = React.memo(function ActionStrip({ dayIsEmpty, onSmartPlan, onClearDay, onRepeatDay }: ActionStripProps) {
  const smartScale = useRef(new Animated.Value(1)).current;

  const handleSmartPressIn = useCallback(() => {
    Animated.timing(smartScale, { toValue: 0.97, duration: 120, useNativeDriver: true }).start();
  }, [smartScale]);

  const handleSmartPressOut = useCallback(() => {
    Animated.timing(smartScale, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, [smartScale]);

  return (
    <View style={styles.actionStrip}>
      <Pressable
        onPressIn={handleSmartPressIn}
        onPressOut={handleSmartPressOut}
        onPress={onSmartPlan}
      >
        <Animated.View style={[styles.smartFillBtn, { transform: [{ scale: smartScale }] }]}>
          <Text style={styles.smartFillLabel}>{dayIsEmpty ? 'Smart Fill' : 'Reshuffle'}</Text>
        </Animated.View>
      </Pressable>
      <TouchableOpacity onPress={onRepeatDay} style={styles.clearDayBtn} activeOpacity={0.8}>
        <Text style={styles.clearDayLabel}>Repeat day</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onClearDay} style={styles.clearDayBtn} activeOpacity={0.8}>
        <Text style={styles.clearDayLabel}>Clear day</Text>
      </TouchableOpacity>
    </View>
  );
});

/* ─── DailySlotCard ────────────────────────────────────────── */

interface DailySlotCardProps {
  slot: MealSlot;
  meals: PlannedMeal[];
  dateKey: string;
  onEmptyPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onRemoveMealById: (mealId: string) => void;
  onAddItemToSlot: (date: string, slotId: string, slotName: string) => void;
}

const DailySlotCard = React.memo(function DailySlotCard({
  slot,
  meals,
  dateKey,
  onEmptyPress,
  onMealPress,
  onRemoveMealById,
  onAddItemToSlot,
}: DailySlotCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  if (meals.length === 0) {
    return (
      <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
        <TouchableOpacity
          onPress={() => onEmptyPress(dateKey, slot.slot_id)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={0.8}
        >
          <Card style={styles.emptyCard}>
            <Text style={styles.slotName}>{slot.name}</Text>
            <View style={styles.addRow}>
              <View style={styles.addIcon}>
                <Plus size={18} color={Colors.primary} strokeWidth={2.5} />
              </View>
              <Text style={styles.addLabel}>Add Meal</Text>
            </View>
          </Card>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.cardWrap, { transform: [{ scale: scaleAnim }] }]}>
      <View style={styles.filledCard}>
        <Text style={styles.filledSlotLabel}>{slot.name.toUpperCase()}</Text>

        {/* Horizontal meal carousel */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.carouselContent}
          style={styles.carousel}
        >
          {meals.map((meal) => (
            <MealCarouselCard
              key={meal.id}
              meal={meal}
              onPress={onMealPress}
              onRemove={onRemoveMealById}
            />
          ))}
          {meals.length < 10 && (
            <CarouselAddButton
              onPress={() => onAddItemToSlot(dateKey, slot.slot_id, slot.name)}
            />
          )}
        </ScrollView>
      </View>
    </Animated.View>
  );
});

/* ─── MealCarouselCard ─────────────────────────────────────── */

interface MealCarouselCardProps {
  meal: PlannedMeal;
  onPress: (meal: PlannedMeal) => void;
  onRemove: (mealId: string) => void;
}

const MealCarouselCard = React.memo(function MealCarouselCard({
  meal,
  onPress,
  onRemove,
}: MealCarouselCardProps) {
  const { meals: savedRecipes } = useRecipes();
  const { familySettings } = useFamilySettings();
  const defaultServing = familySettings.default_serving_size || 4;
  const showBadge = meal.serving_size !== defaultServing;

  const liveRecipe = meal.meal_id ? savedRecipes.find((m) => m.id === meal.meal_id) : undefined;
  const imageUrl = liveRecipe?.image_url || meal.meal_image_url;
  const displayName = meal.meal_id
    ? (liveRecipe?.name ?? meal.meal_name)
    : meal.meal_name;

  const handlePress = useCallback(() => {
    onPress(meal);
  }, [onPress, meal]);

  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(meal.meal_name, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove from plan',
        style: 'destructive',
        onPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onRemove(meal.id);
        },
      },
    ]);
  }, [meal.meal_name, meal.id, onRemove]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={handleLongPress}
      activeOpacity={0.8}
      style={styles.carouselCard}
    >
      {/* Image */}
      <View style={styles.carouselImageWrap}>
        {imageUrl ? (
          <Image
            source={{ uri: imageUrl }}
            style={styles.carouselImage}
            resizeMode="cover"
          />
        ) : (
          <MealImagePlaceholder
            size="card"
            borderRadius={IMG_RADIUS}
            mealType={meal.meal_type}
            cuisine={meal.cuisine}
            name={meal.meal_name}
            deliveryPlatform={meal.delivery_platform}
            familyInitials={
              !meal.delivery_platform && !imageUrl
                ? meal.meal_name
                : undefined
            }
          />
        )}

        {/* Serving badge — only when ≠ family default */}
        {showBadge && (
          <View style={styles.servingBadge}>
            <Text style={styles.servingBadgeText}>×{meal.serving_size}</Text>
          </View>
        )}

        {/* Delivery badge */}
        {!!meal.delivery_url && (
          <View style={styles.deliveryBadge}>
            <Bike size={12} color={Colors.white} strokeWidth={2.5} />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.carouselName} numberOfLines={2}>
        {displayName}
      </Text>
    </TouchableOpacity>
  );
});

/* ─── CarouselAddButton ────────────────────────────────────── */

interface CarouselAddButtonProps {
  onPress: () => void;
}

const CarouselAddButton = React.memo(function CarouselAddButton({ onPress }: CarouselAddButtonProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.carouselCard}>
      <View style={styles.addCardImage}>
        <Plus size={24} color={Colors.primary} strokeWidth={2} />
      </View>
      <Text style={styles.addCardLabel}>Add meal</Text>
    </TouchableOpacity>
  );
});

/* ─── DateCircle ───────────────────────────────────────────── */

interface DateCircleProps {
  date: Date;
  isSelected: boolean;
  isToday: boolean;
  onPress: () => void;
}

const DateCircle = React.memo(function DateCircle({ date, isSelected, isToday, onPress }: DateCircleProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 0.9, duration: 150, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.timing(scaleAnim, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  }, [scaleAnim]);

  const dayAbbr = getDayName(date, true).slice(0, 3).toUpperCase();
  const dateNum = date.getDate();

  const circleStyle = isSelected
    ? { backgroundColor: Colors.primary, borderWidth: 0 }
    : isToday
    ? { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.primary }
    : { backgroundColor: 'transparent', borderWidth: 0 };

  const numColor = isSelected ? Colors.white : isToday ? Colors.primary : Colors.text;
  const dayColor = isSelected || isToday ? Colors.primary : Colors.textSecondary;

  return (
    <TouchableOpacity
      style={styles.dateCircleBtn}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
    >
      <Animated.View style={{ alignItems: 'center', transform: [{ scale: scaleAnim }] }}>
        <Text style={[styles.dayAbbr, { color: dayColor }]}>{dayAbbr}</Text>
        <View style={[styles.dateCircle, circleStyle]}>
          <Text style={[styles.dateNum, { color: numColor }]}>{dateNum}</Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
});

/* ─── Styles ───────────────────────────────────────────────── */

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNavRow: {
    height: 28,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  weekLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  datePillRow: {
    height: 64,
    paddingHorizontal: 8,
    flexDirection: 'row',
  },
  dateCircleBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayAbbr: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  dateCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateNum: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  cardWrap: {
    marginBottom: 12,
  },

  /* ── Empty slot ─────────────────────────── */
  emptyCard: {
    borderWidth: 1.5,
    borderColor: Colors.surface,
    borderStyle: 'dashed' as const,
    backgroundColor: Colors.background,
  },
  slotName: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },

  /* ── Filled slot ────────────────────────── */
  filledCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 12,
    overflow: 'hidden',
  },
  filledSlotLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },

  /* ── Carousel ───────────────────────────── */
  carousel: {
    height: CAROUSEL_HEIGHT,
  },
  carouselContent: {
    gap: CAROUSEL_GAP,
    alignItems: 'flex-start',
  },
  carouselCard: {
    width: CARD_WIDTH,
    alignItems: 'center',
  },
  carouselImageWrap: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: IMG_RADIUS,
    overflow: 'hidden',
    position: 'relative' as const,
  },
  carouselImage: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: IMG_RADIUS,
  },

  /* ── Serving badge (shown only when ≠ default) ─ */
  servingBadge: {
    position: 'absolute' as const,
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
  },
  servingBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.white,
  },

  /* ── Delivery badge ─────────────────────── */
  deliveryBadge: {
    position: 'absolute' as const,
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 10,
    padding: 4,
  },

  /* ── Card name ──────────────────────────── */
  carouselName: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    lineHeight: 15,
    marginTop: 6,
    maxWidth: IMG_SIZE,
  },

  /* ── Add card (carousel end) ────────────── */
  addCardImage: {
    width: IMG_SIZE,
    height: IMG_SIZE,
    borderRadius: IMG_RADIUS,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed' as const,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.primary,
    marginTop: 6,
  },

  /* ── Action strip ───────────────────────── */
  actionStrip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  smartFillBtn: {
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  smartFillLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  clearDayBtn: {
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  clearDayLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
});
