import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '@/constants/colors';

interface OnboardingProgressProps {
  total: number;
  current: number; // 1-based — current === total means last step
}

const DOT = 6;
const ACTIVE_WIDTH = 18;
const GAP = 8;

export default function OnboardingProgress({ total, current }: OnboardingProgressProps) {
  return (
    <View style={styles.row} accessibilityRole="progressbar" accessibilityLabel={`Step ${current} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <Dot key={i} active={i + 1 === current} />
      ))}
    </View>
  );
}

function Dot({ active }: { active: boolean }) {
  const widthAnim = useRef(new Animated.Value(active ? ACTIVE_WIDTH : DOT)).current;
  const colorAnim = useRef(new Animated.Value(active ? 1 : 0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(widthAnim, {
        toValue: active ? ACTIVE_WIDTH : DOT,
        duration: 220,
        useNativeDriver: false,
      }),
      Animated.timing(colorAnim, {
        toValue: active ? 1 : 0,
        duration: 220,
        useNativeDriver: false,
      }),
    ]).start();
  }, [active, widthAnim, colorAnim]);

  const backgroundColor = colorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.border, Colors.primary],
  });

  return (
    <Animated.View
      style={[
        styles.dot,
        { width: widthAnim, backgroundColor },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: GAP,
  },
  dot: {
    height: DOT,
    borderRadius: 999,
  },
});
