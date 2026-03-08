import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { getWeekDates, formatDateKey, getDayName, getDateNumber } from '@/utils/dates';

interface SlotPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string, slotId: string) => void;
  mealSlots: MealSlot[];
  getMealsForSlot: (date: string, slotId: string) => PlannedMeal[];
  mealName: string;
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
  const [weekOffset] = useState<number>(0);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const handleSlotPress = useCallback(
    (date: string, slotId: string) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(date, slotId);
    },
    [onSelect]
  );

  const sortedSlots = useMemo(
    () => [...mealSlots].sort((a, b) => a.order - b.order),
    [mealSlots]
  );

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Add to plan</Text>
            <Text style={styles.headerSubtitle} numberOfLines={1}>{mealName}</Text>
          </View>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingBottom: Spacing.lg + insets.bottom }]}>
          <View style={styles.grid}>
            <View style={styles.headerRow}>
              <View style={styles.dayLabelCell} />
              {sortedSlots.map((slot) => (
                <View key={slot.slot_id} style={styles.slotHeaderCell}>
                  <Text style={styles.slotHeaderText} numberOfLines={1}>{slot.name}</Text>
                </View>
              ))}
            </View>

            {weekDates.map((date) => {
              const dateKey = formatDateKey(date);
              const dayName = getDayName(date);
              const dateNum = getDateNumber(date);
              const isToday = formatDateKey(new Date()) === dateKey;

              return (
                <View key={dateKey} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                  <View style={styles.dayLabelCell}>
                    <Text style={[styles.dayName, isToday && styles.dayNameToday]}>{dayName}</Text>
                    <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{dateNum}</Text>
                  </View>
                  {sortedSlots.map((slot) => {
                    const slotMeals = getMealsForSlot(dateKey, slot.slot_id);
                    const count = slotMeals.length;
                    const isFull = count >= 10;
                    const isOccupied = count > 0 && !isFull;

                    const dotCount = Math.min(count, 5);
                    const hasExtra = count > 5;

                    return (
                      <TouchableOpacity
                        key={slot.slot_id}
                        style={[
                          styles.slotCell,
                          isFull && styles.slotFull,
                          isOccupied && styles.slotOccupied,
                          !isOccupied && !isFull && styles.slotEmpty,
                          isFull && { opacity: 0.45 },
                        ]}
                        onPress={() => handleSlotPress(dateKey, slot.slot_id)}
                        disabled={isFull}
                        activeOpacity={0.8}
                      >
                        {isFull ? (
                          <Text style={styles.slotFullText}>FULL</Text>
                        ) : isOccupied ? (
                          <>
                            <Text style={styles.slotOccupiedPlus}>+</Text>
                            <View style={styles.dotsRow}>
                              {Array.from({ length: dotCount }).map((_, i) => (
                                <View key={i} style={styles.dot} />
                              ))}
                              {hasExtra && (
                                <Text style={styles.extraPlus}>+</Text>
                              )}
                            </View>
                          </>
                        ) : (
                          <Text style={styles.slotEmptyText}>+</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  grid: {
    gap: 2,
  },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayLabelCell: {
    width: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotHeaderCell: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  slotHeaderText: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 4,
  },
  dayRowToday: {
    backgroundColor: Colors.surface,
  },
  dayName: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  dayNameToday: {
    color: Colors.primary,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
  },
  dayNum: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  dayNumToday: {
    color: Colors.primary,
  },
  slotCell: {
    flex: 1,
    width: 44,
    height: 44,
    marginHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  slotOccupied: {
    backgroundColor: Colors.primaryLight,
    borderWidth: 1.5,
    borderColor: 'rgba(123, 104, 204, 0.3)',
  },
  slotFull: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  slotEmptyText: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.border,
  },
  slotOccupiedPlus: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    lineHeight: 16,
  },
  slotFullText: {
    fontSize: 8,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.5,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(123, 104, 204, 0.7)',
  },
  extraPlus: {
    fontSize: 7,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: 'rgba(123, 104, 204, 0.7)',
  },
});
