import React, { useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';

interface StepperProps {
  value: number;
  min?: number;
  max?: number;
  onValueChange: (value: number) => void;
}

export default function Stepper({ value, min = 1, max = 20, onValueChange }: StepperProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const bounce = useCallback(() => {
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, speed: 60, bounciness: 12 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 60, bounciness: 8 }),
    ]).start();
  }, [scaleAnim]);

  const decrement = useCallback(() => {
    if (value > min) {
      onValueChange(value - 1);
      bounce();
    }
  }, [value, min, onValueChange, bounce]);

  const increment = useCallback(() => {
    if (value < max) {
      onValueChange(value + 1);
      bounce();
    }
  }, [value, max, onValueChange, bounce]);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, value <= min && styles.buttonDisabled]}
        onPress={decrement}
        disabled={value <= min}
        testID="stepper-minus"
      >
        <Minus size={24} color={value <= min ? Colors.inactive : Colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>

      <Animated.View style={[styles.valueContainer, { transform: [{ scale: scaleAnim }] }]}>
        <Text style={styles.value}>{value}</Text>
      </Animated.View>

      <TouchableOpacity
        style={[styles.button, value >= max && styles.buttonDisabled]}
        onPress={increment}
        disabled={value >= max}
        testID="stepper-plus"
      >
        <Plus size={24} color={value >= max ? Colors.inactive : Colors.primary} strokeWidth={2.5} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.4,
  },
  valueContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 36,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.primary,
  },
});
