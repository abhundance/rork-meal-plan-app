import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { X, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { MealSlot, PlannedMeal } from '@/types';
import { getWeekDates, formatDateKey, getDayName, getDateNumber } from '@/utils/dates';

interface SlotPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (date: string, slotId: string) => void;
  mealSlots: MealSlot[];
  getMealForSlot: (date: string, slotId: string) => PlannedMeal | undefined;
  mealName: string;
}

export default function SlotPickerModal({
  visible,
  onClose,
  onSelect,
  mealSlots,
  getMealForSlot,
  mealName,
}: SlotPickerModalProps) {
  const [weekOffset] = useState<number>(0);

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const handleSlotPress = useCallback(
    (date: string, slotId: string) => {
      const existing = getMealForSlot(date, slotId);
      if (existing) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelect(date, slotId);
    },
    [getMealForSlot, onSelect]
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

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
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
                    const existing = getMealForSlot(dateKey, slot.slot_id);
                    const isFilled = !!existing;

                    return (
                      <TouchableOpacity
                        key={slot.slot_id}
                        style={[styles.slotCell, isFilled ? styles.slotFilled : styles.slotEmpty]}
                        onPress={() => handleSlotPress(dateKey, slot.slot_id)}
                        disabled={isFilled}
                        activeOpacity={0.7}
                      >
                        {isFilled ? (
                          <Check size={14} color={Colors.textSecondary} strokeWidth={2} />
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
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
    padding: 16,
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
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  dayNameToday: {
    color: Colors.primary,
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
    height: 40,
    marginHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotEmpty: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed' as const,
  },
  slotFilled: {
    backgroundColor: Colors.surface,
  },
  slotEmptyText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
