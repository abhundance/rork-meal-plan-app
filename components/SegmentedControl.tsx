import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet, LayoutChangeEvent } from 'react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

interface SegmentedControlProps {
  segments: string[];
  activeIndex: number;
  onChange: (index: number) => void;
}

export default function SegmentedControl({ segments, activeIndex, onChange }: SegmentedControlProps) {
  const slideAnim = useRef(new Animated.Value(0)).current;
  const containerWidth = useRef(0);

  useEffect(() => {
    if (containerWidth.current > 0) {
      const segmentWidth = containerWidth.current / segments.length;
      Animated.spring(slideAnim, {
        toValue: activeIndex * segmentWidth,
        useNativeDriver: true,
        speed: 20,
        bounciness: 4,
      }).start();
    }
  }, [activeIndex, segments.length, slideAnim]);

  const onLayout = (e: LayoutChangeEvent) => {
    containerWidth.current = e.nativeEvent.layout.width;
    const segmentWidth = containerWidth.current / segments.length;
    slideAnim.setValue(activeIndex * segmentWidth);
  };

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Animated.View
        style={[
          styles.indicator,
          {
            width: `${100 / segments.length}%` as unknown as number,
            transform: [{ translateX: slideAnim }],
          },
        ]}
      />
      {segments.map((label, idx) => (
        <TouchableOpacity
          key={label}
          style={styles.segment}
          onPress={() => onChange(idx)}
          activeOpacity={0.8}
          testID={`segment-${label.toLowerCase().replace(/\s/g, '-')}`}
        >
          <Text style={[styles.label, activeIndex === idx && styles.labelActive]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.pill,
    padding: 3,
    position: 'relative' as const,
  },
  indicator: {
    position: 'absolute' as const,
    top: 3,
    bottom: 3,
    left: 3,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.pill - 2,
  },
  segment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  label: {
    fontFamily: FontFamily.semiBold,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  labelActive: {
    color: Colors.white,
  },
});
