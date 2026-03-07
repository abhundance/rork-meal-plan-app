import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Animated,
  Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { getWeekDates, formatDateKey, getWeekLabel } from '@/utils/dates';

interface RepeatWeekSheetProps {
  visible: boolean;
  currentWeekOffset: number;
  getMealsForWeek: (offset: number) => any[];
  onSelect: (sourceOffset: number) => void;
  onClose: () => void;
}

interface WeekItem {
  offset: number;
  dateRange: string;
  mealCount: number;
}

export default function RepeatWeekSheet({
  visible,
  currentWeekOffset,
  getMealsForWeek,
  onSelect,
  onClose,
}: RepeatWeekSheetProps) {
  const items = useMemo<WeekItem[]>(() => {
    const result: WeekItem[] = [];
    for (let i = 1; i <= 8; i++) {
      const offset = currentWeekOffset - i;
      const meals = getMealsForWeek(offset);
      if (meals.length > 0) {
        const dates = getWeekDates(offset);
        result.push({
          offset,
          dateRange: getWeekLabel(dates),
          mealCount: meals.length,
        });
      }
    }
    return result;
  }, [currentWeekOffset, getMealsForWeek]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.handle} />

        <View style={styles.header}>
          <Text style={styles.headerTitle}>Repeat a previous week</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={40} color={Colors.textSecondary} />}
            title="No previous plans found"
            description="Meals planned in the last 8 weeks will appear here to copy."
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <WeekRow
                key={item.offset}
                item={item}
                onPress={() => {
                  onSelect(item.offset);
                  onClose();
                }}
              />
            ))}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

interface WeekRowProps {
  item: WeekItem;
  onPress: () => void;
}

function WeekRow({ item, onPress }: WeekRowProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
    }).start();
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
        style={styles.row}
      >
        <View style={styles.rowLeft}>
          <Text style={styles.dateRange}>{item.dateRange}</Text>
        </View>
        <View style={styles.mealCountPill}>
          <Text style={styles.mealCountText}>{item.mealCount} meals</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
    paddingBottom: 32,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  rowLeft: {
    flex: 1,
    marginRight: 12,
  },
  dateRange: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  mealCountPill: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  mealCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
});
