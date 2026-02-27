import React, { useMemo, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
  PanResponder,
} from 'react-native';
import { ChevronLeft, ChevronRight, Plus, X, Copy, Wand2, CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Shadows } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import {
  getWeekDates,
  formatDateKey,
  isToday,
  getDayName,
  getDateNumber,
  getWeekLabel,
} from '@/utils/dates';

const SCREEN_WIDTH = Dimensions.get('window').width;
const H_PAD = 12;
const CARD_GAP = 8;
const PEEK = SCREEN_WIDTH * 0.15;
const DAY_CARD_WIDTH = (SCREEN_WIDTH - H_PAD - CARD_GAP - PEEK) / 2;
const SLOT_ROW_MIN_H = 82;
const HEADER_H = 62;
const SWIPE_THRESHOLD = 48;

interface WeeklyPlanViewProps {
  mealSlots: MealSlot[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  onEmptySlotPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
  onCopyLastWeek: () => void;
  onSmartPlan: () => void;
}

export default function WeeklyPlanView({
  mealSlots,
  weekOffset,
  onWeekChange,
  getMealsForSlot,
  onEmptySlotPress,
  onMealPress,
  onRemoveMeal,
  onCopyLastWeek,
  onSmartPlan,
}: WeeklyPlanViewProps) {
  const scrollRef = useRef<ScrollView>(null);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);

  const weekIsEmpty = useMemo(() => {
    return weekDates.every((date) =>
      mealSlots.every((slot) => getMealsForSlot(formatDateKey(date), slot.slot_id).length === 0)
    );
  }, [weekDates, mealSlots, getMealsForSlot]);

  useEffect(() => {
    if (weekOffset === 0) {
      const todayIdx = weekDates.findIndex((d) => isToday(d));
      if (todayIdx > 0 && scrollRef.current) {
        const scrollX = Math.max(0, todayIdx * (DAY_CARD_WIDTH + CARD_GAP));
        setTimeout(() => {
          scrollRef.current?.scrollTo({ x: scrollX, animated: false });
        }, 100);
      }
    } else {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ x: 0, animated: false });
      }, 50);
    }
  }, [weekOffset, weekDates]);

  const handleWeekPrev = useCallback(() => {
    onWeekChange(weekOffset - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, onWeekChange]);

  const handleWeekNext = useCallback(() => {
    onWeekChange(weekOffset + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, onWeekChange]);

  const handleWeekPrevRef = useRef(handleWeekPrev);
  handleWeekPrevRef.current = handleWeekPrev;
  const handleWeekNextRef = useRef(handleWeekNext);
  handleWeekNextRef.current = handleWeekNext;

  const weekNavPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) && Math.abs(gs.dx) > 12,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -SWIPE_THRESHOLD) {
          handleWeekNextRef.current();
        } else if (gs.dx > SWIPE_THRESHOLD) {
          handleWeekPrevRef.current();
        }
      },
    })
  ).current;

  return (
    <View style={styles.container}>
      <View style={styles.weekNav} {...weekNavPanResponder.panHandlers}>
        <TouchableOpacity
          onPress={handleWeekPrev}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
        >
          <ChevronLeft size={20} color={Colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <TouchableOpacity
          onPress={handleWeekNext}
          style={styles.navBtn}
          hitSlop={{ top: 10, bottom: 10, left: 14, right: 14 }}
        >
          <ChevronRight size={20} color={Colors.primary} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {weekIsEmpty ? (
        <EmptyWeekState
          weekOffset={weekOffset}
          onCopyLastWeek={onCopyLastWeek}
          onSmartPlan={onSmartPlan}
        />
      ) : (
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={DAY_CARD_WIDTH + CARD_GAP}
          snapToAlignment="start"
        >
          {weekDates.map((date, idx) => {
            const dateKey = formatDateKey(date);
            const today = isToday(date);
            return (
              <View
                key={dateKey}
                style={[
                  styles.dayCard,
                  today && styles.dayCardToday,
                  idx === weekDates.length - 1 && { marginRight: H_PAD },
                ]}
              >
                <View style={[styles.dayHeader, today && styles.dayHeaderToday]}>
                  <Text style={[styles.dayName, today && styles.dayNameToday]}>
                    {getDayName(date)}
                  </Text>
                  <View style={[styles.dateCircle, today && styles.dateCircleToday]}>
                    <Text style={[styles.dateNum, today && styles.dateNumToday]}>
                      {getDateNumber(date)}
                    </Text>
                  </View>
                </View>

                {mealSlots.map((slot, slotIdx) => {
                  const meals = getMealsForSlot(dateKey, slot.slot_id);
                  return (
                    <SlotRow
                      key={slot.slot_id}
                      slot={slot}
                      meals={meals}
                      dateKey={dateKey}
                      isLast={slotIdx === mealSlots.length - 1}
                      onEmptyPress={onEmptySlotPress}
                      onMealPress={onMealPress}
                      onRemoveMeal={onRemoveMeal}
                    />
                  );
                })}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

interface EmptyWeekStateProps {
  weekOffset: number;
  onCopyLastWeek: () => void;
  onSmartPlan: () => void;
}

function EmptyWeekState({ weekOffset, onCopyLastWeek, onSmartPlan }: EmptyWeekStateProps) {
  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <CalendarDays size={28} color={Colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={emptyStyles.title}>No meals planned</Text>
      <Text style={emptyStyles.subtitle}>Fill this week in seconds</Text>

      <View style={emptyStyles.optionsWrap}>
        {weekOffset > 0 && (
          <TouchableOpacity
            style={emptyStyles.optionCard}
            onPress={onCopyLastWeek}
            activeOpacity={0.8}
          >
            <View style={[emptyStyles.optionIcon, emptyStyles.optionIconCopy]}>
              <Copy size={20} color={Colors.primary} strokeWidth={2} />
            </View>
            <View style={emptyStyles.optionText}>
              <Text style={emptyStyles.optionTitle}>Copy Last Week</Text>
              <Text style={emptyStyles.optionDesc}>
                Duplicate your previous week's meals into this week
              </Text>
            </View>
            <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={emptyStyles.optionCard}
          onPress={onSmartPlan}
          activeOpacity={0.8}
        >
          <View style={[emptyStyles.optionIcon, emptyStyles.optionIconSmart]}>
            <Wand2 size={20} color="#D97706" strokeWidth={2} />
          </View>
          <View style={emptyStyles.optionText}>
            <Text style={emptyStyles.optionTitle}>Smart Plan</Text>
            <Text style={emptyStyles.optionDesc}>
              Auto-fill the week using your favourites and Discover meals
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

        <View style={emptyStyles.orRow}>
          <View style={emptyStyles.orLine} />
          <Text style={emptyStyles.orText}>or tap any slot to add manually</Text>
          <View style={emptyStyles.orLine} />
        </View>
      </View>
    </View>
  );
}

interface SlotRowProps {
  slot: MealSlot;
  meals: PlannedMeal[];
  dateKey: string;
  isLast: boolean;
  onEmptyPress: (date: string, slotId: string) => void;
  onMealPress: (meal: PlannedMeal) => void;
  onRemoveMeal: (mealId: string) => void;
}

const SlotRow = React.memo(function SlotRow({
  slot,
  meals,
  dateKey,
  isLast,
  onEmptyPress,
  onMealPress,
  onRemoveMeal,
}: SlotRowProps) {
  const primaryMeal = meals[0];
  const extraCount = meals.length - 1;

  return (
    <View style={[styles.slotRow, isLast && styles.slotRowLast]}>
      <Text style={styles.slotLabel} numberOfLines={1}>{slot.name}</Text>

      {primaryMeal ? (
        <TouchableOpacity
          style={styles.mealContent}
          onPress={() => onMealPress(primaryMeal)}
          activeOpacity={0.82}
        >
          <Text style={styles.mealName} numberOfLines={2}>
            {primaryMeal.meal_name}
          </Text>
          <View style={styles.mealActions}>
            <TouchableOpacity
              onPress={() => onRemoveMeal(primaryMeal.id)}
              style={styles.actionBtn}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <X size={13} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
          {extraCount > 0 && (
            <View style={styles.extraBadge}>
              <Text style={styles.extraBadgeText}>+{extraCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.emptyContent}
          onPress={() => onEmptyPress(dateKey, slot.slot_id)}
          activeOpacity={0.7}
        >
          <Plus size={14} color={Colors.primary} strokeWidth={2.5} />
          <Text style={styles.addLabel}>Add</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 16,
  },
  navBtn: {
    padding: 4,
  },
  weekLabel: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    minWidth: 140,
    textAlign: 'center' as const,
  },
  scrollContent: {
    paddingLeft: H_PAD,
    paddingBottom: 20,
  },
  dayCard: {
    width: DAY_CARD_WIDTH,
    marginRight: CARD_GAP,
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden' as const,
    ...Shadows.card,
  },
  dayCardToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayHeader: {
    height: HEADER_H,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  dayHeaderToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
  dayNameToday: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  dateCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleToday: {
    backgroundColor: Colors.primary,
  },
  dateNum: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateNumToday: {
    color: Colors.white,
  },
  slotRow: {
    minHeight: SLOT_ROW_MIN_H,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    padding: 10,
  },
  slotRowLast: {
    borderBottomWidth: 0,
  },
  slotLabel: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.7,
    marginBottom: 6,
  },
  mealContent: {
    flex: 1,
  },
  mealName: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 16,
  },
  mealActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
    justifyContent: 'flex-end',
  },
  actionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 4,
    paddingVertical: 14,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    borderStyle: 'dashed' as const,
  },
  addLabel: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  extraBadge: {
    position: 'absolute' as const,
    bottom: 4,
    right: 4,
    backgroundColor: '#7B68CC',
    borderRadius: 9999,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  extraBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 24,
  },
  optionsWrap: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionIconCopy: {
    backgroundColor: Colors.primaryLight,
  },
  optionIconSmart: {
    backgroundColor: '#FEF3C7',
  },
  optionText: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 3,
  },
  optionDesc: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 17,
  },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider,
  },
  orText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
});
