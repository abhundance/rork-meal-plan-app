import React, { useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { ChevronLeft, ChevronRight, Copy, Wand2, CalendarDays } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
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
const DAY_LABEL_W = 60;
const CELL_H = 44;
const HEADER_CELL_H = 32;

interface WeeklyPlanViewProps {
  mealSlots: MealSlot[];
  weekOffset: number;
  onWeekChange: (offset: number) => void;
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  onDayPress: (date: string) => void;
  onCopyLastWeek: () => void;
  onSmartPlan: () => void;
}

export default function WeeklyPlanView({
  mealSlots,
  weekOffset,
  onWeekChange,
  getMealsForSlot,
  onDayPress,
  onCopyLastWeek,
  onSmartPlan,
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

  const totalFilledCount = useMemo(() => {
    let count = 0;
    for (const date of weekDates) {
      const dateKey = formatDateKey(date);
      for (const slot of mealSlots) {
        if (getMealsForSlot(dateKey, slot.slot_id).length > 0) count++;
      }
    }
    return count;
  }, [weekDates, mealSlots, getMealsForSlot]);

  const totalSlots = weekDates.length * mealSlots.length;
  const coveragePercent = totalSlots > 0 ? Math.round((totalFilledCount / totalSlots) * 100) : 0;

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
        <View style={styles.gridWrap}>
          <View style={styles.coverageRow}>
            <Text style={styles.coverageLabel}>Coverage</Text>
            <View style={styles.coverageBarTrack}>
              <View
                style={[
                  styles.coverageBarFill,
                  {
                    width: `${coveragePercent}%` as any,
                    backgroundColor: coveragePercent === 100 ? Colors.success : Colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.coverageValue}>{coveragePercent}%</Text>
          </View>

          <View style={styles.columnHeaderRow}>
            <View style={styles.dayLabelSpacer} />
            {mealSlots.map((slot) => (
              <View key={slot.slot_id} style={styles.columnHeader}>
                <Text style={styles.columnHeaderText} numberOfLines={1}>
                  {getSlotShortName(slot.name)}
                </Text>
              </View>
            ))}
          </View>

          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const today = isToday(date);

            return (
              <TouchableOpacity
                key={dateKey}
                style={[styles.gridRow, today && styles.gridRowToday]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onDayPress(dateKey);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.dayLabel}>
                  <Text style={[styles.dayNameText, today && styles.dayNameToday]}>
                    {getDayName(date).slice(0, 3)}
                  </Text>
                  <View style={[styles.dateCircle, today && styles.dateCircleToday]}>
                    <Text style={[styles.dateNumText, today && styles.dateNumToday]}>
                      {getDateNumber(date)}
                    </Text>
                  </View>
                </View>

                {mealSlots.map((slot) => {
                  const meals = getMealsForSlot(dateKey, slot.slot_id);
                  const count = meals.length;
                  return (
                    <View key={slot.slot_id} style={styles.gridCell}>
                      {count === 0 ? (
                        <View style={styles.dotEmpty} />
                      ) : count === 1 ? (
                        <View style={styles.dotFilled} />
                      ) : (
                        <View style={styles.dotMulti}>
                          <Text style={styles.dotMultiText}>{count}</Text>
                        </View>
                      )}
                    </View>
                  );
                })}

                <View style={styles.rowChevron}>
                  <ChevronRight size={14} color={today ? Colors.primary : Colors.textSecondary} strokeWidth={2} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

function getSlotShortName(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('breakfast')) return 'Bkfst';
  if (lower.includes('lunch')) return 'Lunch';
  if (lower.includes('dinner')) return 'Dinner';
  if (lower.includes('snack')) return 'Snack';
  if (lower.includes('supper')) return 'Supper';
  if (name.length > 6) return name.slice(0, 5) + '.';
  return name;
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
          <Text style={emptyStyles.orText}>or switch to Day view to add manually</Text>
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
  gridWrap: {
    paddingHorizontal: 12,
    paddingBottom: 20,
  },
  coverageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
    gap: 10,
  },
  coverageLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  coverageBarTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.surface,
    overflow: 'hidden' as const,
  },
  coverageBarFill: {
    height: 6,
    borderRadius: 3,
  },
  coverageValue: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
    minWidth: 32,
    textAlign: 'right' as const,
  },
  columnHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dayLabelSpacer: {
    width: DAY_LABEL_W,
  },
  columnHeader: {
    flex: 1,
    alignItems: 'center',
    height: HEADER_CELL_H,
    justifyContent: 'center',
  },
  columnHeaderText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  gridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: CELL_H,
    borderRadius: 10,
    marginBottom: 2,
    paddingRight: 4,
  },
  gridRowToday: {
    backgroundColor: Colors.primaryLight,
  },
  dayLabel: {
    width: DAY_LABEL_W,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 4,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    width: 28,
  },
  dayNameToday: {
    color: Colors.primary,
    fontWeight: '700' as const,
  },
  dateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleToday: {
    backgroundColor: Colors.primary,
  },
  dateNumText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  dateNumToday: {
    color: Colors.white,
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotEmpty: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: Colors.divider,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  dotMulti: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotMultiText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  rowChevron: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
