import React from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  ViewStyle,
} from 'react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

export interface CoachmarkTarget {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface CoachmarkOverlayProps {
  visible: boolean;
  step: number; // 1-based
  total: number;
  title: string;
  body: string;
  target: CoachmarkTarget;
  arrow: 'up' | 'down';
  onNext: () => void;
  onSkip: () => void;
  isLast?: boolean;
}

const SCREEN = Dimensions.get('window');
const DIM = 'rgba(0, 0, 0, 0.65)';
const SPOTLIGHT_PAD = 8;
const SPOTLIGHT_RADIUS = 16;
const BUBBLE_OFFSET = 16; // distance between spotlight edge and bubble

export default function CoachmarkOverlay({
  visible,
  step,
  total,
  title,
  body,
  target,
  arrow,
  onNext,
  onSkip,
  isLast = false,
}: CoachmarkOverlayProps) {
  // Spotlight rect (with padding)
  const sx = target.x - SPOTLIGHT_PAD;
  const sy = target.y - SPOTLIGHT_PAD;
  const sw = target.width + SPOTLIGHT_PAD * 2;
  const sh = target.height + SPOTLIGHT_PAD * 2;

  // Bubble position
  const bubbleStyle: ViewStyle =
    arrow === 'up'
      ? { top: sy + sh + BUBBLE_OFFSET, left: 24, right: 24 }
      : { bottom: SCREEN.height - sy + BUBBLE_OFFSET, left: 24, right: 24 };

  // Arrow horizontal position — point at the centre of the target
  const targetCentreX = target.x + target.width / 2;
  const arrowLeft = Math.max(24, Math.min(SCREEN.width - 40, targetCentreX)) - 24 - 8;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={StyleSheet.absoluteFill}>
        {/* 4-rect dim — top, left, right, bottom of the spotlight */}
        <Pressable style={[styles.dim, { top: 0, left: 0, right: 0, height: sy }]} onPress={onSkip} />
        <Pressable style={[styles.dim, { top: sy, left: 0, width: sx, height: sh }]} onPress={onSkip} />
        <Pressable style={[styles.dim, { top: sy, left: sx + sw, right: 0, height: sh }]} onPress={onSkip} />
        <Pressable style={[styles.dim, { top: sy + sh, left: 0, right: 0, bottom: 0 }]} onPress={onSkip} />

        {/* Spotlight border (thin red ring around the cutout) */}
        <View
          pointerEvents="none"
          style={[
            styles.spotlightRing,
            { top: sy, left: sx, width: sw, height: sh },
          ]}
        />

        {/* Bubble */}
        <View style={[styles.bubble, bubbleStyle]}>
          {/* Arrow */}
          <View
            style={[
              styles.arrow,
              arrow === 'up' ? { top: -8 } : { bottom: -8 },
              { left: arrowLeft },
            ]}
          />

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <View style={styles.row}>
            <Text style={styles.step}>{step} / {total}</Text>
            <View style={styles.actions}>
              <Pressable onPress={onSkip} hitSlop={12}>
                <Text style={styles.skip}>Skip tour</Text>
              </Pressable>
              <Pressable onPress={onNext} style={styles.nextBtn} hitSlop={4}>
                <Text style={styles.nextLabel}>{isLast ? 'Done' : 'Next'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dim: {
    position: 'absolute',
    backgroundColor: DIM,
  },
  spotlightRing: {
    position: 'absolute',
    borderRadius: SPOTLIGHT_RADIUS,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    paddingVertical: 16,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  arrow: {
    position: 'absolute',
    width: 16,
    height: 16,
    backgroundColor: Colors.white,
    transform: [{ rotate: '45deg' }],
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 17,
    color: Colors.text,
    marginBottom: 6,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  step: {
    fontFamily: FontFamily.bold,
    fontSize: 11,
    color: Colors.textSecondary,
    letterSpacing: 1.5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skip: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textSecondary,
  },
  nextBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
  },
  nextLabel: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.white,
  },
});
