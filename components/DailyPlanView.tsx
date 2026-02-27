import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  PanResponder,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BorderRadius } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { formatDateKey, getDateLabel, isToday } from '@/utils/dates';
import ServingStepper from './ServingStepper';
import Card from './Card';

const DATE_SWIPE_THRESHOLD = 50;
const SWIPE_DELETE_WIDTH = 72;

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
  onToggleFav: (meal: PlannedMeal) => void;
  isFavByName: (name: string) => boolean;
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
  onToggleFav,
  isFavByName,
}: DailyPlanViewProps) {
  const dateKey = useMemo(() => formatDateKey(currentDate), [currentDate]);
  const dateLabel = useMemo(() => getDateLabel(currentDate), [currentDate]);
  const today = useMemo(() => isToday(currentDate), [currentDate]);

  const handlePrev = useCallback(() => {
    const prev = new Date(currentDate);
    prev.setDate(prev.getDate() - 1);
    onDateChange(prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentDate, onDateChange]);

  const handleNext = useCallback(() => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + 1);
    onDateChange(next);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [currentDate, onDateChange]);

  const handlePrevRef = useRef(handlePrev);
  handlePrevRef.current = handlePrev;
  const handleNextRef = useRef(handleNext);
  handleNextRef.current = handleNext;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 12,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -DATE_SWIPE_THRESHOLD) {
          handleNextRef.current();
        } else if (gs.dx > DATE_SWIPE_THRESHOLD) {
          handlePrevRef.current();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.dayNav}>
        <TouchableOpacity
          onPress={handlePrev}
          style={styles.navBtn}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <ChevronLeft size={20} color={Colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <View style={styles.dateLabelWrap}>
          {today && <View style={styles.todayDot} />}
          <Text style={[styles.dateLabel, today && styles.dateLabelToday]}>{dateLabel}</Text>
        </View>
        <TouchableOpacity
          onPress={handleNext}
          style={styles.navBtn}
          hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
        >
          <ChevronRight size={20} color={Colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

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
  );
}

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
          activeOpacity={0.7}
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
        {meals.length < 4 && (
          <TouchableOpacity
            style={styles.addItemBtn}
            onPress={() => onAddItemToSlot(dateKey, slot.slot_id, slot.name)}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            activeOpacity={0.7}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
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
  const translateX = useRef(new Animated.Value(0)).current;
  const rowOpacity = useRef(new Animated.Value(1)).current;
  const isSwipeOpen = useRef(false);

  const snapClose = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
    isSwipeOpen.current = false;
  }, [translateX]);

  const snapOpen = useCallback(() => {
    Animated.spring(translateX, {
      toValue: -SWIPE_DELETE_WIDTH,
      useNativeDriver: true,
      speed: 30,
      bounciness: 3,
    }).start();
    isSwipeOpen.current = true;
  }, [translateX]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 8,
      onPanResponderGrant: () => {
        translateX.setOffset(isSwipeOpen.current ? -SWIPE_DELETE_WIDTH : 0);
        translateX.setValue(0);
      },
      onPanResponderMove: (_, gs) => {
        const clamped = isSwipeOpen.current
          ? Math.max(-SWIPE_DELETE_WIDTH, Math.min(SWIPE_DELETE_WIDTH, gs.dx))
          : Math.max(-SWIPE_DELETE_WIDTH, Math.min(0, gs.dx));
        translateX.setValue(clamped);
      },
      onPanResponderRelease: (_, gs) => {
        translateX.flattenOffset();
        if (gs.dx < -30) {
          snapOpen();
        } else if (gs.dx > 30) {
          snapClose();
        } else {
          isSwipeOpen.current ? snapOpen() : snapClose();
        }
      },
    })
  ).current;

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.timing(rowOpacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onRemoveMealById(meal.id);
    });
  }, [rowOpacity, meal.id, onRemoveMealById]);

  const handlePress = useCallback(() => {
    if (isSwipeOpen.current) {
      snapClose();
    } else {
      onPress(meal);
    }
  }, [isSwipeOpen, snapClose, onPress, meal]);

  return (
    <Animated.View style={{ opacity: rowOpacity }}>
      <View style={styles.rowContainer}>
        <View style={styles.deleteAction}>
          <TouchableOpacity onPress={handleDelete} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Animated.View
          style={[styles.itemRow, { transform: [{ translateX }] }]}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.itemRowInner}
            onPress={handlePress}
            activeOpacity={0.7}
          >
            {meal.meal_image_url ? (
              <Image
                source={{ uri: meal.meal_image_url }}
                style={styles.itemThumb}
                contentFit="cover"
              />
            ) : (
              <View style={styles.itemThumbPlaceholder}>
                <Ionicons name="restaurant-outline" size={20} color={Colors.primary} />
              </View>
            )}
            <Text style={styles.itemName} numberOfLines={2}>
              {meal.meal_name}
            </Text>
          </TouchableOpacity>
          <ServingStepper
            value={meal.serving_size}
            onValueChange={(v) => onServingChange(meal.id, v)}
            compact
          />
        </Animated.View>
      </View>
      {!isLast && <View style={styles.itemDivider} />}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  dayNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  navBtn: {
    padding: 4,
  },
  dateLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minWidth: 200,
    justifyContent: 'center',
  },
  todayDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  dateLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  dateLabelToday: {
    color: Colors.primary,
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
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  filledCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    padding: 12,
    overflow: 'hidden',
  },
  filledSlotLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  rowContainer: {
    position: 'relative' as const,
    overflow: 'hidden' as const,
    minHeight: 56,
  },
  deleteAction: {
    position: 'absolute' as const,
    right: 0,
    top: 0,
    bottom: 0,
    width: SWIPE_DELETE_WIDTH,
    backgroundColor: '#FF3B30',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    backgroundColor: '#FFFFFF',
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
  itemThumbPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#2C2C2C',
    lineHeight: 20,
  },
  itemDivider: {
    height: 1,
    backgroundColor: '#F0EEF9',
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
    fontWeight: '500' as const,
    color: Colors.primary,
  },
});
