import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

interface FilterPillProps {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}

export default function FilterPill({ label, active, onPress, testID }: FilterPillProps) {
  return (
    <Pressable
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.pill,
        active && styles.pillActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text
        style={[styles.label, active && styles.labelActive]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
    flexGrow: 0,
  },
  pillActive: {
    backgroundColor: '#7C3AED',
  },
  label: {
    fontSize: 14,
    lineHeight: 14,
    fontWeight: '500',
    color: '#111827',
  },
  labelActive: {
    color: '#FFFFFF',
  },
});
