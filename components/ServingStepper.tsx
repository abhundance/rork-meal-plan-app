import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Minus, Plus, Trash2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';

interface ServingStepperProps {
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
  compact?: boolean;
  onRemoveAtMin?: () => void;
}

export default function ServingStepper({
  value,
  min = 1,
  max = 20,
  onValueChange,
  compact = false,
  onRemoveAtMin,
}: ServingStepperProps) {
  const decrement = useCallback(() => {
    if (onRemoveAtMin && value <= min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      Alert.alert('Remove meal?', 'This will remove the meal from your plan.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: onRemoveAtMin }]);
    } else if (value > min) {
      onValueChange(value - 1);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [value, min, onValueChange, onRemoveAtMin]);

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
        style={[styles.btn, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, value <= min && !onRemoveAtMin && styles.btnDisabled]}
        onPress={decrement}
        disabled={value <= min && !onRemoveAtMin}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        {onRemoveAtMin && value <= min
          ? <Trash2 size={iconSize} color="#FF3B30" strokeWidth={2} />
          : <Minus size={iconSize} color={value <= min ? Colors.inactive : Colors.primary} strokeWidth={2.5} />}
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
