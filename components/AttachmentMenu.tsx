/**
 * AttachmentMenu — A beautiful, reusable overlay menu for selecting attachment options.
 *
 * Features:
 * - Semi-transparent overlay backdrop that dismisses the menu when tapped
 * - Smooth fade-in/slide-up animations for polished feel
 * - Horizontal row of options with circular icon containers + labels below
 * - Fully themeable with design system tokens
 *
 * Usage:
 * ```tsx
 * const [menuVisible, setMenuVisible] = useState(false);
 *
 * <AttachmentMenu
 *   visible={menuVisible}
 *   onClose={() => setMenuVisible(false)}
 *   options={[
 *     { key: 'camera', icon: <Camera .../>, label: 'Camera', bgColor: '#FF6B6B', onPress: () => {...} },
 *     { key: 'photo', icon: <Image .../>, label: 'Photos', bgColor: '#4ECDC4', onPress: () => {...} },
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
  Dimensions,
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
}

const SCREEN_H = Dimensions.get('window').height;
const ANIMATION_DURATION = 200;

export default function AttachmentMenu({ visible, onClose, options }: AttachmentMenuProps) {
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
          <View style={styles.optionsRow}>
            {options.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={styles.optionButton}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
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
    borderTopLeftRadius: BorderRadius.card,
    borderTopRightRadius: BorderRadius.card,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.md,
    ...Shadows.card,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.xl,
  },
  optionButton: {
    alignItems: 'center',
    gap: Spacing.sm,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,  // BorderRadius.full (999) is too large for a circle; use half of width/height
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.sm,
    color: Colors.text,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
});
