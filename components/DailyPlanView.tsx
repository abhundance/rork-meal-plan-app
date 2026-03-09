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
import { ChevronLeft, ChevronRight, Plus, PlusCircle, Bike } from 'lucide-react-native';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { formatDateKey, getDayName, getWeekLabel, isBefore } from '@/utils/dates';
import { openDeliveryLink } from '@/services/deliveryUtils';
import ServingStepper from './ServingStepper';
import Card from './Card';

interface DailyPlanViewProps {
  mealSlots: MealSlot[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  onEmptySlotPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onServingChange: (mealId: string, serving: number) => void;
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
  onServingChange,
  onRemoveMealById,
  onAddItemToSlot,
  onSmartPlan,
  onClearDay,
  onRepeatDay,
}: DailyPlanViewProps) {
  const dateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);

  const isPastDay = useMemo(() => isBefore(currentDate, new Date()), [currentDate]);

  // No useMemo — getMealsForSlot has a stable function reference ([] deps), so a memo over it
  // would never recompute after addMeals fires. Bare evaluation is cheap and always accurate.
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

  const swipeGesture = useMemo(() => Gesture.Pan().activeOffsetX([-60, 60]).failOffsetY([-25, 25]).runOnJS(true).onEnd((e) => {
    if (e.translationX < -60) {
      handleNextDayRef.current();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } else if (e.translationX > 60) {
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
              onServingChange={onServingChange}
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

interface DailySlotCardProps {
  slot: MealSlot;
  meals: PlannedMeal[];
  dateKey: string;
  onEmptyPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onServingChange: (mealId: string, serving: number) => void;
  onRemoveMealById: (mealId: string) => void;
  onAddItemToSlot: (date: string, slotId: string, slotName: string) => void;
}

const DailySlotCard = React.memo(function DailySlotCard({
  slot,
  meals,
  dateKey,
  onEmptyPress,
  onMealPress,
  onServingChange,
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
        {meals.map((meal, idx) => (
          <MealItemRow
            key={meal.id}
            meal={meal}
            isLast={idx === meals.length - 1}
            onServingChange={onServingChange}
            onRemoveMealById={onRemoveMealById}
            onPress={onMealPress}
          />
        ))}
        {meals.length < 10 && (
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => onAddItemToSlot(dateKey, slot.slot_id, slot.name)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.8}
          >
            <PlusCircle size={18} color={Colors.primary} strokeWidth={1.5} />
            <Text style={styles.addItemText}>Add item</Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
});

interface MealItemRowProps {
  meal: PlannedMeal;
  isLast: boolean;
  onServingChange: (mealId: string, serving: number) => void;
  onRemoveMealById: (mealId: string) => void;
  onPress: (meal: PlannedMeal) => void;
}

const MealItemRow = React.memo(function MealItemRow({
  meal,
  isLast,
  onServingChange,
  onRemoveMealById,
  onPress,
}: MealItemRowProps) {
  const { meals: favMeals } = useFavs();

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onRemoveMealById(meal.id);
  }, [meal.id, onRemoveMealById]);

  const handlePress = useCallback(() => {
    onPress(meal);
  }, [onPress, meal]);

  return (
    <View>
      <View style={styles.itemRow}>
        <TouchableOpacity
          style={styles.itemRowInner}
          onPress={handlePress}
          onLongPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert(meal.meal_name, undefined, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Remove from plan', style: 'destructive', onPress: () => handleDelete() },
            ]);
          }}
          activeOpacity={0.8}
        >
          {meal.meal_image_url ? (
            <Image source={{ uri: meal.meal_image_url }} style={{ width: 42, height: 42, borderRadius: 10 }} resizeMode="cover" />
          ) : (
            <MealImagePlaceholder
              size="thumbnail"
              mealType={meal.meal_type}
              cuisine={meal.cuisine}
              name={meal.meal_name}
              deliveryPlatform={meal.delivery_platform}
              familyInitials={
                !meal.delivery_platform &&
                meal.meal_id &&
                favMeals.find(m => m.id === meal.meal_id)?.source === 'family_created'
                  ? meal.meal_name
                  : undefined
              }
            />
          )}
          <View style={styles.itemNameCol}>
            <Text style={styles.itemName} numberOfLines={2}>
              {meal.meal_id ? (favMeals.find(m => m.id === meal.meal_id)?.name ?? meal.meal_name) : meal.meal_name}
            </Text>
            {!!meal.delivery_url && (
              <TouchableOpacity
                style={styles.orderPill}
                onPress={() => openDeliveryLink(meal.delivery_url!)}
                activeOpacity={0.8}
              >
                <Bike size={13} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.orderPillText}>Order</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
        <ServingStepper
          value={meal.serving_size}
          onValueChange={(v) => onServingChange(meal.id, v)}
          onRemoveAtMin={() => onRemoveMealById(meal.id)}
          compact
        />
      </View>
      {!isLast && <View style={styles.itemDivider} />}
    </View>
  );
});

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
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: Colors.white,
    paddingVertical: 8,
    gap: 10,
  },
  itemRowInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  itemNameCol: {
    flex: 1,
    flexDirection: 'column' as const,
    gap: 4,
  },
  itemName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  orderPill: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    alignSelf: 'flex-start' as const,
    backgroundColor: Colors.primaryLight,
    borderRadius: 9999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  orderPillText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  itemDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: 2,
  },
  addItemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
  },
  addItemText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  actionStrip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  smartFillBtn: {
    borderRadius: 9999,
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
    borderRadius: 9999,
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
