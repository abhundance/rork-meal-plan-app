import React, { useMemo, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import { ChevronLeft, ChevronRight, Copy, Wand2, CalendarDays, Bike } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors, { SlotColors } from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { useFavs } from '@/providers/FavsProvider';
import { useWeekRatings } from '@/hooks/useWeekRatings';
import { MealRating } from '@/types';
import {
  getWeekDates,
  formatDateKey,
  isToday,
  getDayName,
  getDateNumber,
  getWeekLabel,
} from '@/utils/dates';

const _SWIPE_THRESHOLD = 48;
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
  const { meals: favMeals } = useFavs();
  const { rateWeek, getWeekRating } = useWeekRatings();
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);

  // weekKey = ISO date of the Monday of the current week (used for rating storage)
  const weekKey = useMemo(() => {
    const mon = weekDates[0];
    return `${mon.getFullYear()}-${String(mon.getMonth() + 1).padStart(2, '0')}-${String(mon.getDate()).padStart(2, '0')}`;
  }, [weekDates]);

  // Post-week feedback: track dismissed state locally so banner hides immediately on tap
  const [dismissedWeekKey, setDismissedWeekKey] = useState<string | null>(null);
  const isPastWeek = weekOffset < 0;
  const weekRating = getWeekRating(weekKey);
  const showFeedbackBanner = isPastWeek && !weekRating && dismissedWeekKey !== weekKey;

  const handleWeekRating = useCallback((rating: MealRating) => {
    setDismissedWeekKey(weekKey);
    void rateWeek(weekKey, rating);
  }, [weekKey, rateWeek]);

  // Note: no useMemo here intentionally — getMealsForSlot reads mealsRef.current (always live)
  // but has a stable function reference ([] deps), so a useMemo over it would never recompute
  // after addMeals fires. Bare computation is cheap (7 days × N slots) and always accurate.
  const weekIsEmpty = weekDates.every((date) =>
    mealSlots.every((slot) => getMealsForSlot(formatDateKey(date), slot.slot_id).length === 0)
  );

  const handleWeekPrev = useCallback(() => {
    onWeekChange(weekOffset - 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [weekOffset, onWeekChange]);

  const handleWeekNext = useCallback(() => {
    onWeekChange(weekOffset + 1);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const swipeGesture = useMemo(() =>
    Gesture.Pan()
      .activeOffsetX([-30, 30])
      .failOffsetY([-20, 20])
      .runOnJS(true)
      .onEnd((e) => {
        if (e.translationX < -60) {
          handleWeekNextRef.current();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        } else if (e.translationX > 60) {
          handleWeekPrevRef.current();
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
      }),
  []);

  return (
    <GestureDetector gesture={swipeGesture}>
      <View style={styles.container}>
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
                <Text style={styles.smartFillText}>Reshuffle</Text>
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
                <Text style={styles.copyText}>Repeat</Text>
              </Animated.View>
            </Pressable>

            <TouchableOpacity onPress={onClearWeek} style={styles.clearBtn}>
              <Text style={styles.clearText}>Clear week</Text>
            </TouchableOpacity>
          </ScrollView>
          )}

          {/* Post-week micro-feedback banner — past weeks only, one tap to rate */}
          {showFeedbackBanner && (
            <View style={styles.feedbackBanner}>
              <Text style={styles.feedbackLabel}>How was this week's menu?</Text>
              <View style={styles.feedbackEmojis}>
                {([
                  { emoji: '😕', rating: 'disliked' as MealRating },
                  { emoji: '😊', rating: 'liked' as MealRating },
                  { emoji: '😍', rating: 'loved' as MealRating },
                ]).map(({ emoji, rating }) => (
                  <TouchableOpacity
                    key={rating}
                    style={styles.feedbackEmojiBtn}
                    onPress={() => handleWeekRating(rating)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.feedbackEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
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
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  activeOpacity={0.8}
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
                                  {meal.meal_id ? (favMeals.find(m => m.id === meal.meal_id)?.name ?? meal.meal_name) : meal.meal_name}
                                </Text>
                                {(!!meal.is_delivery || !!meal.delivery_url) && (
                                  <View style={styles.deliveryDot}>
                                    <Bike size={10} color={Colors.primary} strokeWidth={2} />
                                  </View>
                                )}
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
    </GestureDetector>
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
        <CalendarDays size={36} color={Colors.textSecondary} strokeWidth={1.5} />
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
          <Text style={emptyStyles.orText}>or tap a day to start adding</Text>
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
    fontFamily: FontFamily.bold,
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
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  smartFillText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  copyBtn: {
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  copyText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  clearBtn: {
    borderRadius: BorderRadius.pill,
    backgroundColor: Colors.surface,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  clearText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
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
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.bold,
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
    position: 'relative' as const,
    overflow: 'visible' as const,
  },
  deliveryDot: {
    position: 'absolute' as const,
    top: -3,
    right: -3,
    width: 16,
    height: 16,
    borderRadius: 4,
    backgroundColor: Colors.white,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  mealPillText: {
    fontSize: 9,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    textAlign: 'center',
  },
  emptyDash: {
    width: 14,
    height: 2,
    backgroundColor: Colors.border,
  },
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    marginHorizontal: 12,
    marginBottom: 8,
  },
  feedbackLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  feedbackEmojis: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  feedbackEmojiBtn: {
    padding: 4,
  },
  feedbackEmoji: {
    fontSize: 22,
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
    fontFamily: FontFamily.semiBold,
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
    fontFamily: FontFamily.bold,
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
    shadowColor: Colors.shadow,
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
    fontFamily: FontFamily.bold,
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginBottom: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: Colors.primaryLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  feedbackLabel: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    flex: 1,
  },
  feedbackEmojis: {
    flexDirection: 'row',
    gap: 8,
    marginLeft: 12,
  },
  feedbackEmojiBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedbackEmoji: {
    fontSize: 20,
  },
});
