import React from 'react';
import { Text, TouchableOpacity, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

export default function FilterPill({ label, active, onPress, testID }: FilterPillProps) {
  return (
    <TouchableOpacity
      style={[styles.pill, active && styles.pillActive]}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <Text style={[styles.label, active && styles.labelActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  pill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  pillActive: {
    backgroundColor: '#7C3AED',
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
