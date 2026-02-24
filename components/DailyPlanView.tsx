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
import { ChevronLeft, ChevronRight, Plus, Users, Heart, X } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Shadows, BorderRadius } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { formatDateKey, getDateLabel, isToday } from '@/utils/dates';
import ServingStepper from './ServingStepper';
import Card from './Card';

const SWIPE_THRESHOLD = 50;

interface DailyPlanViewProps {
  mealSlots: MealSlot[];
  currentDate: Date;
  onDateChange: (date: Date) => void;
  getMealForSlot: (date: string, slotId: string) => PlannedMeal | undefined;
  onEmptySlotPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onServingChange: (mealId: string, serving: number) => void;
  onRemoveMeal: (mealId: string) => void;
  onToggleFav: (meal: PlannedMeal) => void;
  isFavByName: (name: string) => boolean;
}

export default function DailyPlanView({
  mealSlots,
  currentDate,
  onDateChange,
  getMealForSlot,
  onEmptySlotPress,
  onMealPress,
  onServingChange,
  onRemoveMeal,
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
        if (gs.dx < -SWIPE_THRESHOLD) {
          handleNextRef.current();
        } else if (gs.dx > SWIPE_THRESHOLD) {
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
          const meal = getMealForSlot(dateKey, slot.slot_id);
          return (
            <DailySlotCard
              key={slot.slot_id}
              slot={slot}
              meal={meal}
              dateKey={dateKey}
              onEmptyPress={onEmptySlotPress}
              onMealPress={onMealPress}
              onServingChange={onServingChange}
              onRemoveMeal={onRemoveMeal}
              onToggleFav={onToggleFav}
              isFav={meal ? isFavByName(meal.meal_name) : false}
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
  meal: PlannedMeal | undefined;
  dateKey: string;
  onEmptyPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onServingChange: (mealId: string, serving: number) => void;
  onRemoveMeal: (mealId: string) => void;
  onToggleFav: (meal: PlannedMeal) => void;
  isFav: boolean;
}

const DailySlotCard = React.memo(function DailySlotCard({
  slot,
  meal,
  dateKey,
  onEmptyPress,
  onMealPress,
  onServingChange,
  onRemoveMeal,
  onToggleFav,
  isFav,
}: DailySlotCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  if (!meal) {
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
      <TouchableOpacity
        onPress={() => onMealPress(meal)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        <Card style={styles.filledCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.slotName}>{slot.name}</Text>
            <View style={styles.inlineActions}>
              <TouchableOpacity
                onPress={() => onToggleFav(meal)}
                style={[styles.inlineActionBtn, isFav && styles.inlineActionBtnActive]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Heart
                  size={16}
                  color={isFav ? Colors.primary : Colors.textSecondary}
                  fill={isFav ? Colors.primary : 'none'}
                  strokeWidth={2}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => onRemoveMeal(meal.id)}
                style={styles.inlineActionBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <X size={16} color={Colors.textSecondary} strokeWidth={2} />
              </TouchableOpacity>
            </View>
          </View>

          {meal.meal_image_url ? (
            <Image
              source={{ uri: meal.meal_image_url }}
              style={styles.mealImage}
              contentFit="cover"
            />
          ) : null}
          <Text style={styles.mealName}>{meal.meal_name}</Text>
          <View style={styles.servingRow}>
            <View style={styles.servingLabel}>
              <Users size={14} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.servingLabelText}>Servings</Text>
            </View>
            <ServingStepper
              value={meal.serving_size}
              onValueChange={(v) => onServingChange(meal.id, v)}
              compact
            />
          </View>
        </Card>
      </TouchableOpacity>
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
  filledCard: {
    backgroundColor: Colors.white,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  slotName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  inlineActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineActionBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineActionBtnActive: {
    backgroundColor: Colors.primaryLight,
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
  mealImage: {
    width: '100%',
    height: 160,
    borderRadius: BorderRadius.button,
    marginBottom: 12,
  },
  mealName: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  servingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servingLabelText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
});
