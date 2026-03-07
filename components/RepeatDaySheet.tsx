import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import EmptyState from '@/components/EmptyState';
import { formatDateKey } from '@/utils/dates';

interface RepeatDaySheetProps {
  visible: boolean;
  currentDate: Date;
  getMealsForDate: (dateKey: string) => any[];
  onSelect: (sourceDateKey: string) => void;
  onClose: () => void;
}

interface DayItem {
  dateKey: string;
  label: string;
  mealCount: number;
}

export default function RepeatDaySheet({
  visible,
  currentDate,
  getMealsForDate,
  onSelect,
  onClose,
}: RepeatDaySheetProps) {
  const items = useMemo<DayItem[]>(() => {
    const result: DayItem[] = [];
    for (let i = 1; i <= 30; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - i);
      const dateKey = formatDateKey(d);
      const meals = getMealsForDate(dateKey);
      if (meals.length > 0) {
        result.push({
          dateKey,
          label: d.toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          }),
          mealCount: meals.length,
        });
      }
    }
    return result;
  }, [currentDate, getMealsForDate]);

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
          <Text style={styles.headerTitle}>Repeat a previous day</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton} hitSlop={8}>
            <Ionicons name="close" size={22} color={Colors.text} />
          </TouchableOpacity>
        </View>

        {items.length === 0 ? (
          <EmptyState
            icon={<Ionicons name="calendar-outline" size={40} color={Colors.textSecondary} />}
            title="No meals found"
            description="Meals from the last 30 days will appear here to copy."
          />
        ) : (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {items.map((item) => (
              <DayRow
                key={item.dateKey}
                item={item}
                onPress={() => {
                  onSelect(item.dateKey);
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

interface DayRowProps {
  item: DayItem;
  onPress: () => void;
}

function DayRow({ item, onPress }: DayRowProps) {
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
          <Text style={styles.label}>{item.label}</Text>
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
  label: {
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
