/**
 * ExtractionLoadingOverlay — full-screen takeover shown while AI extracts a recipe.
 *
 * Design: dark backdrop, large pulsing food emoji, rotating food-themed copy.
 * Dismisses the keyboard automatically on mount so nothing competes for attention.
 *
 * Usage:
 *   <ExtractionLoadingOverlay visible={isExtracting} />
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  Animated,
  StyleSheet,
  Keyboard,
} from 'react-native';
import Colors from '@/constants/colors';
import { Spacing } from '@/constants/theme';

const PHRASES = [
  'Tasting the ingredients…',
  'Simmering the recipe…',
  'Chopping and dicing…',
  'Putting the apron on…',
  'Reading between the flavours…',
  'Almost ready to plate…',
];

interface Props {
  visible: boolean;
}

export default function ExtractionLoadingOverlay({ visible }: Props) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayedIdx, setDisplayedIdx] = useState(0);

  // ── Pulse animation on the emoji ────────────────────────────────────────────
  useEffect(() => {
    if (!visible) {
      scaleAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [visible, scaleAnim]);

  // ── Rotate phrases with a fade transition ───────────────────────────────────
  useEffect(() => {
    if (!visible) {
      setPhraseIdx(0);
      setDisplayedIdx(0);
      opacityAnim.setValue(1);
      return;
    }
    const interval = setInterval(() => {
      // Fade out → swap text → fade in
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        setPhraseIdx((i) => {
          const next = (i + 1) % PHRASES.length;
          setDisplayedIdx(next);
          return next;
        });
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }).start();
      });
    }, 2600);
    return () => clearInterval(interval);
  }, [visible, opacityAnim]);

  // ── Dismiss keyboard so the overlay has full stage ───────────────────────────
  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <View style={styles.content}>
          {/* Pulsing emoji */}
          <Animated.Text
            style={[styles.emoji, { transform: [{ scale: scaleAnim }] }]}
          >
            🍳
          </Animated.Text>

          {/* Rotating phrase */}
          <Animated.Text style={[styles.phrase, { opacity: opacityAnim }]}>
            {PHRASES[displayedIdx]}
          </Animated.Text>

          {/* Subtitle */}
          <Text style={styles.sub}>This may take up to 30 seconds</Text>

          {/* Subtle red accent bar */}
          <View style={styles.accentBar} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  emoji: {
    fontSize: 72,
    marginBottom: 28,
    lineHeight: 88,
  },
  phrase: {
    fontSize: 22,
    fontWeight: '600',
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
    letterSpacing: -0.3,
    lineHeight: 30,
  },
  sub: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.45)',
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: 28,
  },
  accentBar: {
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: Colors.primary,
    opacity: 0.8,
  },
});
