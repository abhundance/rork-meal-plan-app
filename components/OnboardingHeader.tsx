import React, { useRef, useEffect } from 'react';
import { View, Animated, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

interface OnboardingHeaderProps {
  current: number;
  total: number;
}

/**
 * Unified onboarding header: back button (left) + animated progress bar (right).
 *
 * Design contract:
 * - Back zone: 44px fixed width, contains ChevronLeft when navigation.canGoBack()
 * - Progress track: flex:1, height 4px, #E60023 fill, #F8F8F8 track, animated spring
 * - Safe area: handles paddingTop: insets.top internally — DO NOT add it to the parent
 * - Replaces both <OnboardingBackButton /> and <ProgressBar /> — use ONE component
 */
export default function OnboardingHeader({ current, total }: OnboardingHeaderProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const canGoBack = navigation.canGoBack();

  const animatedWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(animatedWidth, {
      toValue: current / total,
      useNativeDriver: false,
      speed: 12,
      bounciness: 2,
    }).start();
  }, [current, total, animatedWidth]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button zone — fixed width so progress bar is always aligned */}
      <View style={styles.backZone}>
        {canGoBack && (
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <ChevronLeft size={26} color={Colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Animated progress track */}
      <View style={styles.trackWrap}>
        <View style={styles.track}>
          <Animated.View
            style={[
              styles.fill,
              {
                width: animatedWidth.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0%', '100%'],
                }),
              },
            ]}
          />
        </View>
      </View>

      {/* Right padding spacer — keeps track visually centred */}
      <View style={styles.rightSpacer} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 8,
  },
  backZone: {
    width: 48,
    paddingLeft: 8,
    justifyContent: 'center',
  },
  backButton: {
    padding: 4,
  },
  trackWrap: {
    flex: 1,
  },
  track: {
    height: 4,
    backgroundColor: Colors.surface,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  rightSpacer: {
    width: 16,
  },
});
