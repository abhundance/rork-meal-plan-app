/**
 * AttachmentMenu — A polished bottom sheet for selecting attachment/action options.
 *
 * Features:
 * - Semi-transparent overlay backdrop that dismisses the menu when tapped
 * - Smooth fade-in/slide-up animations for polished feel
 * - Optional title + subtitle header for context
 * - Horizontal row of options with circular icon containers + labels below
 * - Fully themeable with design system tokens
 *
 * Usage:
 * ```tsx
 * <AttachmentMenu
 *   visible={menuVisible}
 *   onClose={() => setMenuVisible(false)}
 *   title="Add a Recipe"
 *   subtitle="Choose how you'd like to add a meal"
 *   options={[
 *     { key: 'camera', icon: <Camera .../>, label: 'Camera', bgColor: '#FF6B6B', onPress: () => {...} },
 *   ]}
 * />
 * ```
 */

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Animated,
  StyleSheet,
} from 'react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import { FontFamily, FontSize } from '@/constants/typography';

export interface AttachmentMenuOption {
  key: string;
  icon: React.ReactNode;
  label: string;
  bgColor: string;  // Circle background color
  onPress: () => void;
}

export interface AttachmentMenuProps {
  visible: boolean;
  onClose: () => void;
  options: AttachmentMenuOption[];
  title?: string;
  subtitle?: string;
}

const ANIMATION_DURATION = 200;

export default function AttachmentMenu({ visible, onClose, options, title, subtitle }: AttachmentMenuProps) {
  // Animation values
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(200)).current;

  // Animate in/out
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 200,
          duration: ANIMATION_DURATION,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropOpacity, cardTranslateY]);

  const handleOptionPress = (option: AttachmentMenuOption) => {
    // Close the modal FIRST, then fire the action after a brief delay.
    // Native pickers (camera, photo library, document) can fail to launch
    // if a Modal is still visible when they try to present.
    onClose();
    setTimeout(() => {
      option.onPress();
    }, 300);
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="none"
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: backdropOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>

      {/* Card */}
      <Animated.View
        style={[
          styles.cardContainer,
          {
            transform: [
              {
                translateY: cardTranslateY,
              },
            ],
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.card}>
          {/* Drag handle indicator */}
          <View style={styles.handleBar} />

          {/* Optional header */}
          {title && (
            <View style={styles.headerContainer}>
              <Text style={styles.headerTitle}>{title}</Text>
              {subtitle && (
                <Text style={styles.headerSubtitle}>{subtitle}</Text>
              )}
            </View>
          )}

          {/* Options row */}
          <View style={styles.optionsRow}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.optionButton}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.6}
              >
                {/* Circular icon container */}
                <View
                  style={[
                    styles.iconContainer,
                    {
                      backgroundColor: option.bgColor,
                    },
                  ]}
                >
                  {option.icon}
                </View>
                {/* Label below icon */}
                <Text style={styles.optionLabel}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.overlay,
  },
  backdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  card: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.xxxl + 8,  // 40px — generous bottom for safe area
    paddingHorizontal: Spacing.xl,
    ...Shadows.card,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginBottom: Spacing.lg,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xxl,
  },
  headerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xxxl + 8,  // 40px between options
    paddingHorizontal: Spacing.lg,
  },
  optionButton: {
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
