import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
  PanResponder,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Plus } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Spacing, BorderRadius, Shadows } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { getWeekDates, formatDateKey, getDayName, getDateNumber, isToday, getWeekLabel } from '@/utils/dates';
import { getSlotCategory } from '@/utils/slotCategory';

interface SlotPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string, slotId: string) => void;
  mealSlots: MealSlot[];
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  mealName: string;
}

// Maps slot name → emoji icon via slot category
function getSlotEmoji(slotName: string): string {
  const cat = getSlotCategory(slotName);
  if (cat === 'breakfast') return '🌅';
  if (cat === 'lunch_dinner') return '🍽️';
  return '🍎';
}

// Maps slot name → pastel icon background
function getSlotIconBg(slotName: string): string {
  const cat = getSlotCategory(slotName);
  if (cat === 'breakfast') return '#FFF3E0';
  if (cat === 'lunch_dinner') return '#E3F2FD';
  return '#FFF8E1';
}

export default function SlotPickerModal({
  visible,
  onClose,
  onSelect,
  mealSlots,
  getMealsForSlot,
  mealName,
}: SlotPickerModalProps) {
  const insets = useSafeAreaInsets();
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);
  const selectedDateKey = useMemo(() => formatDateKey(selectedDate), [selectedDate]);

  const sortedSlots = useMemo(
    () => [...mealSlots].sort((a, b) => a.order - b.order),
    [mealSlots]
  );

  // Week navigation
  const goToPrevWeek = useCallback(() => {
    setWeekOffset((prev) => {
      const newOffset = prev - 1;
      const newWeek = getWeekDates(newOffset);
      // Select Monday of the new week
      setSelectedDate(newWeek[0]);
      return newOffset;
    });
  }, []);

  const goToNextWeek = useCallback(() => {
    setWeekOffset((prev) => {
      const newOffset = prev + 1;
      const newWeek = getWeekDates(newOffset);
      // If current week, select today; otherwise Monday
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayKey = formatDateKey(today);
      const todayInWeek = newWeek.find((d) => formatDateKey(d) === todayKey);
      setSelectedDate(todayInWeek ?? newWeek[0]);
      return newOffset;
    });
  }, []);

  // Day selection
  const handleDayPress = useCallback((date: Date) => {
    setSelectedDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  // Slot selection
  const handleSlotPress = useCallback(
    (date: string, slotId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(date, slotId);
    },
    [onSelect]
  );

  // Swipe gesture on the card area
  const panResponder = useMemo(() => {
    const SWIPE_THRESHOLD = 60;
    return PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        Math.abs(gestureState.dx) > 20 && Math.abs(gestureState.dy) < 40,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx < -SWIPE_THRESHOLD) {
          // Swipe left → next day
          const idx = weekDates.findIndex((d) => formatDateKey(d) === selectedDateKey);
          if (idx >= 0 && idx < 6) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedDate(weekDates[idx + 1]);
          } else {
            // At Sunday — go to next week Monday
            goToNextWeek();
          }
        } else if (gestureState.dx > SWIPE_THRESHOLD) {
          // Swipe right → prev day
          const idx = weekDates.findIndex((d) => formatDateKey(d) === selectedDateKey);
          if (idx > 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setSelectedDate(weekDates[idx - 1]);
          } else {
            // At Monday — go to prev week Sunday
            goToPrevWeek();
          }
        }
      },
    });
  }, [weekDates, selectedDateKey, goToNextWeek, goToPrevWeek]);

  // Compute full day name for the card header
  const selectedDayLabel = useMemo(() => {
    return getDayName(selectedDate, false); // "Wednesday"
  }, [selectedDate]);

  const selectedDateLabel = useMemo(() => {
    return selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); // "Mar 26"
  }, [selectedDate]);

  // Active dot index for swipe indicator
  const activeDotIndex = useMemo(() => {
    return weekDates.findIndex((d) => formatDateKey(d) === selectedDateKey);
  }, [weekDates, selectedDateKey]);

  // Reset state when modal opens
  const handleShow = useCallback(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    setSelectedDate(today);
    setWeekOffset(0);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      onShow={handleShow}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Add to plan</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{mealName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Week navigation bar */}
        <View style={styles.weekNav}>
          <TouchableOpacity onPress={goToPrevWeek} style={styles.weekNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronLeft size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.weekLabel}>{getWeekLabel(weekDates)}</Text>
          <TouchableOpacity onPress={goToNextWeek} style={styles.weekNavBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <ChevronRight size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Day pill strip */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStripContent}
          style={styles.dayStrip}
        >
          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const isSelected = dateKey === selectedDateKey;
            const isTodayDate = isToday(date);

            return (
              <TouchableOpacity
                key={dateKey}
                style={[
                  styles.dayPill,
                  isSelected && styles.dayPillSelected,
                  !isSelected && isTodayDate && styles.dayPillToday,
                ]}
                onPress={() => handleDayPress(date)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dayPillAbbr,
                  isSelected && styles.dayPillTextSelected,
                  !isSelected && isTodayDate && styles.dayPillTextToday,
                ]}>
                  {getDayName(date).slice(0, 3)}
                </Text>
                <Text style={[
                  styles.dayPillNum,
                  isSelected && styles.dayPillTextSelected,
                  !isSelected && isTodayDate && styles.dayPillTextToday,
                ]}>
                  {getDateNumber(date)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Day card */}
        <View style={styles.cardArea} {...panResponder.panHandlers}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardDayTitle}>{selectedDayLabel}</Text>
              <Text style={styles.cardDateLabel}>{selectedDateLabel}</Text>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: Spacing.sm }}
            >
              {sortedSlots.map((slot) => {
                const slotMeals = getMealsForSlot(selectedDateKey, slot.slot_id);
                const isFull = slotMeals.length >= 10;
                const isEmpty = slotMeals.length === 0;

                return (
                  <TouchableOpacity
                    key={slot.slot_id}
                    style={[styles.slotRow, isFull && { opacity: 0.45 }]}
                    onPress={() => handleSlotPress(selectedDateKey, slot.slot_id)}
                    disabled={isFull}
                    activeOpacity={0.7}
                  >
                    {/* Emoji icon */}
                    <View style={[styles.slotIcon, { backgroundColor: getSlotIconBg(slot.name) }]}>
                      <Text style={styles.slotEmoji}>{getSlotEmoji(slot.name)}</Text>
                    </View>

                    {/* Slot text */}
                    <View style={styles.slotText}>
                      <Text style={styles.slotTypeLabel}>{slot.name.toUpperCase()}</Text>
                      {isEmpty ? (
                        <Text style={styles.slotEmptyLabel}>Tap to add</Text>
                      ) : (
                        slotMeals.map((meal, idx) => (
                          <Text
                            key={meal.id}
                            style={[styles.slotMealName, idx > 0 && styles.slotMealNameSecondary]}
                            numberOfLines={1}
                          >
                            {meal.meal_name}
                          </Text>
                        ))
                      )}
                    </View>

                    {/* Add button — always shown unless full */}
                    {isFull ? (
                      <View style={styles.fullBadge}>
                        <Text style={styles.fullBadgeText}>FULL</Text>
                      </View>
                    ) : (
                      <View style={styles.addBtn}>
                        <Plus size={18} color={Colors.textSecondary} strokeWidth={2} />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>

        {/* Swipe indicator dots */}
        <View style={styles.dotsRow}>
          {weekDates.map((date, idx) => {
            const isActive = idx === activeDotIndex;
            return (
              <View
                key={formatDateKey(date)}
                style={[styles.dot, isActive && styles.dotActive]}
              />
            );
          })}
        </View>

        {/* Bottom safe area spacer */}
        <View style={{ height: insets.bottom }} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header — unchanged from original
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Week navigation
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    gap: Spacing.lg,
  },
  weekNavBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekLabel: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    minWidth: 130,
    textAlign: 'center',
  },

  // Day pill strip
  dayStrip: {
    height: 70,
    flexGrow: 0,
  },
  dayStripContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
    alignItems: 'center',
  },
  dayPill: {
    width: 44,
    height: 60,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  dayPillSelected: {
    backgroundColor: Colors.primary,
  },
  dayPillToday: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  dayPillAbbr: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  dayPillNum: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  dayPillTextSelected: {
    color: Colors.white,
  },
  dayPillTextToday: {
    color: Colors.primary,
  },

  // Card area
  cardArea: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card + 4,
    ...Shadows.card,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  cardDayTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  cardDateLabel: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Slot rows
  slotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderTopWidth: 1,
    borderTopColor: Colors.surface,
    gap: Spacing.md,
  },
  slotIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmoji: {
    fontSize: 22,
  },
  slotText: {
    flex: 1,
    minWidth: 0,
  },
  slotTypeLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
  },
  slotEmptyLabel: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.inactive,
    marginTop: 1,
  },
  slotMealName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 1,
  },
  slotMealNameSecondary: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },

  // Add button (always visible unless full)
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Full badge
  fullBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
  },
  fullBadgeText: {
    fontSize: 9,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },

  // Swipe dots
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  dotActive: {
    width: 24,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
});
