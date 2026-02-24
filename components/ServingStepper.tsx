import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface ServingStepperProps {
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  compact?: boolean;
}

export default function ServingStepper({
  value,
  min = 1,
  max = 20,
  onValueChange,
  compact = false,
}: ServingStepperProps) {
  const decrement = useCallback(() => {
    if (value > min) {
      onValueChange(value - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [value, min, onValueChange]);

  const increment = useCallback(() => {
    if (value < max) {
      onValueChange(value + 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [value, max, onValueChange]);

  const btnSize = compact ? 28 : 34;
  const iconSize = compact ? 14 : 16;

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      <TouchableOpacity
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, value <= min && styles.btnDisabled]}
        onPress={decrement}
        disabled={value <= min}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Minus size={iconSize} color={value <= min ? Colors.inactive : Colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>
      <Text style={[styles.value, compact && styles.valueCompact]}>{value}</Text>
      <TouchableOpacity
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, value >= max && styles.btnDisabled]}
        onPress={increment}
        disabled={value >= max}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Plus size={iconSize} color={value >= max ? Colors.inactive : Colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  containerCompact: {
    gap: 8,
  },
  btn: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  value: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.primary,
    minWidth: 24,
    textAlign: 'center' as const,
  },
  valueCompact: {
    fontSize: 14,
    minWidth: 20,
  },
});
