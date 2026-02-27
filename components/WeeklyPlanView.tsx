import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  PanResponder,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ChevronLeft, ChevronRight, Copy, Wand2, CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors, { SlotColors } from '@/constants/colors';
import { MealSlot, PlannedMeal } from '@/types';
import {
  getWeekDates,
  formatDateKey,
  isToday,
  getDayName,
  getDateNumber,
  getWeekLabel,
} from '@/utils/dates';

const SWIPE_THRESHOLD = 48;
const LEFT_CELL_W = 52;

interface WeeklyPlanViewProps {
  mealSlots: MealSlot[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  onDayPress: (date: Date) => void;
  onRepeatWeek: () => void;
  onSmartPlan: () => void;
  onClearWeek: () => void;
}

export default function WeeklyPlanView({
  mealSlots,
  weekOffset,
  onWeekChange,
  getMealsForSlot,
  onDayPress,
  onRepeatWeek,
  onSmartPlan,
  onClearWeek,
}: WeeklyPlanViewProps) {
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);

  const weekIsEmpty = useMemo(() => {
    return weekDates.every((date) =>
      mealSlots.every((slot) => getMealsForSlot(formatDateKey(date), slot.slot_id).length === 0)
    );
  }, [weekDates, mealSlots, getMealsForSlot]);

  const handleWeekPrev = useCallback(() => {
    onWeekChange(weekOffset - 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, onWeekChange]);

  const handleWeekNext = useCallback(() => {
    onWeekChange(weekOffset + 1);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, onWeekChange]);

  const smartFillScale = useRef(new Animated.Value(1)).current;
  const copyScale = useRef(new Animated.Value(1)).current;

  const animatePressIn = useCallback((val: Animated.Value) => {
    Animated.timing(val, { toValue: 0.97, duration: 120, useNativeDriver: true }).start();
  }, []);

  const animatePressOut = useCallback((val: Animated.Value) => {
    Animated.timing(val, { toValue: 1, duration: 120, useNativeDriver: true }).start();
  }, []);

  const handleWeekPrevRef = useRef(handleWeekPrev);
  handleWeekPrevRef.current = handleWeekPrev;
  const handleWeekNextRef = useRef(handleWeekNext);
  handleWeekNextRef.current = handleWeekNext;

  const weekNavPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponderCapture: (_, gs) =>
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
    <View style={styles.container} {...weekNavPanResponder.panHandlers}>
      <View style={styles.weekNav}>
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
          onRepeatWeek={onRepeatWeek}
          onSmartPlan={onSmartPlan}
        />
      ) : (
        <>
          {weekOffset >= 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.actionStrip}
            contentContainerStyle={styles.actionStripContent}
          >
            <Pressable
              onPressIn={() => animatePressIn(smartFillScale)}
              onPressOut={() => animatePressOut(smartFillScale)}
              onPress={onSmartPlan}
            >
              <Animated.View
                style={[styles.smartFillBtn, { transform: [{ scale: smartFillScale }] }]}
              >
                <Text style={styles.smartFillText}>✨ Smart Fill</Text>
              </Animated.View>
            </Pressable>

            <Pressable
              onPressIn={() => animatePressIn(copyScale)}
              onPressOut={() => animatePressOut(copyScale)}
              onPress={onRepeatWeek}
            >
              <Animated.View
                style={[styles.copyBtn, { transform: [{ scale: copyScale }] }]}
              >
                <Ionicons name="time-outline" size={13} color={Colors.primary} />
                <Text style={styles.copyText}>Repeat</Text>
              </Animated.View>
            </Pressable>

            <TouchableOpacity onPress={onClearWeek} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear week</Text>
            </TouchableOpacity>
          </ScrollView>
          )}

          <View style={styles.gridContainer}>
          <View style={styles.gridHeader}>
            <View style={{ width: LEFT_CELL_W }} />
            {mealSlots.map((slot, slotIdx) => (
              <View key={slot.slot_id} style={styles.slotHeaderCell}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: SlotColors[slotIdx % SlotColors.length].dot, alignSelf: 'center', marginBottom: 2 }} />
                <Text style={styles.slotHeaderText} numberOfLines={1}>
                  {slot.name.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {weekDates.map((date, idx) => {
              const dateKey = formatDateKey(date);
              const today = isToday(date);
              return (
                <TouchableOpacity
                  key={dateKey}
                  style={[
                    styles.dayRow,
                    today && styles.dayRowToday,
                    idx === weekDates.length - 1 && styles.dayRowLast,
                  ]}
                  onPress={() => {
                    onDayPress(date);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.leftCell}>
                    <Text style={[styles.dayAbbrev, today && styles.dayAbbrevToday]}>
                      {getDayName(date).slice(0, 3).toUpperCase()}
                    </Text>
                    <View style={[styles.dateCircle, today && styles.dateCircleToday]}>
                      <Text style={[styles.dateNum, today && styles.dateNumToday]}>
                        {getDateNumber(date)}
                      </Text>
                    </View>
                  </View>

                  {mealSlots.map((slot, slotIdx) => {
                    const slotColor = SlotColors[slotIdx % SlotColors.length];
                    const meals = getMealsForSlot(dateKey, slot.slot_id);
                    return (
                      <View key={slot.slot_id} style={styles.slotCell}>
                        {meals.length > 0 ? (
                          <View style={{ width: '100%' }}>
                            {meals.map((meal, mealIdx) => (
                              <View
                                key={meal.id}
                                style={[
                                  styles.mealPill,
                                  { backgroundColor: slotColor.bg },
                                  mealIdx < meals.length - 1 && { marginBottom: 3 },
                                ]}
                              >
                                <Text style={[styles.mealPillText, { color: slotColor.text }]} numberOfLines={1}>
                                  {meal.meal_name}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : (
                          <View style={styles.emptyDash} />
                        )}
                      </View>
                    );
                  })}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        </>
      )}
    </View>
  );
}

interface EmptyWeekStateProps {
  weekOffset: number;
  onRepeatWeek: () => void;
  onSmartPlan: () => void;
}

function EmptyWeekState({ weekOffset, onRepeatWeek, onSmartPlan }: EmptyWeekStateProps) {
  if (weekOffset < 0) {
    return (
      <View style={emptyStyles.pastContainer}>
        <Ionicons name="calendar-outline" size={36} color={Colors.textSecondary} />
        <Text style={emptyStyles.pastTitle}>Nothing was planned</Text>
        <Text style={emptyStyles.pastSubtitle}>No meals were recorded for this week</Text>
      </View>
    );
  }

  const title = weekOffset === 0 ? 'Plan this week' : 'Plan ahead';
  const subtitle = weekOffset === 0 ? "What's on the menu?" : 'Get this week ready';

  return (
    <View style={emptyStyles.container}>
      <View style={emptyStyles.iconWrap}>
        <CalendarDays size={28} color={Colors.primary} strokeWidth={1.5} />
      </View>
      <Text style={emptyStyles.title}>{title}</Text>
      <Text style={emptyStyles.subtitle}>{subtitle}</Text>

      <View style={emptyStyles.optionsWrap}>
        <TouchableOpacity
          style={emptyStyles.optionCard}
          onPress={onRepeatWeek}
          activeOpacity={0.8}
        >
          <View style={[emptyStyles.optionIcon, emptyStyles.optionIconCopy]}>
            <Copy size={20} color={Colors.primary} strokeWidth={2} />
          </View>
          <View style={emptyStyles.optionText}>
            <Text style={emptyStyles.optionTitle}>Repeat a week</Text>
            <Text style={emptyStyles.optionDesc}>
              Pick any previous week and repeat its meals
            </Text>
          </View>
          <ChevronRight size={18} color={Colors.textSecondary} strokeWidth={2} />
        </TouchableOpacity>

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
  actionStrip: {
    height: 40,
    marginBottom: 4,
  },
  actionStripContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  smartFillBtn: {
    borderRadius: 9999,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  smartFillText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 9999,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  clearBtn: {
    borderRadius: 9999,
    backgroundColor: Colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  clearText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  gridContainer: {
    flex: 1,
    paddingHorizontal: 12,
  },
  gridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: 8,
  },
  slotHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  slotHeaderText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: 'row',
    minHeight: 54,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  dayRowToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayRowLast: {
    borderBottomWidth: 0,
  },
  leftCell: {
    width: LEFT_CELL_W,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayAbbrev: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.4,
  },
  dayAbbrevToday: {
    color: Colors.primary,
  },
  dateCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleToday: {
    backgroundColor: Colors.primary,
  },
  dateNum: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateNumToday: {
    color: Colors.white,
  },
  slotCell: {
    flex: 1,
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingVertical: 3,
    paddingHorizontal: 5,
    width: '100%',
  },
  mealPillText: {
    fontSize: 9,
    fontWeight: '600' as const,
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyDash: {
    width: 14,
    height: 2,
    backgroundColor: Colors.border,
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
  pastContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 48,
  },
  pastTitle: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  pastSubtitle: {
    marginTop: 6,
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
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
