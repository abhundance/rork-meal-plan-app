/**
 * DiscoverCarouselCard — canonical carousel card for the Discover tab.
 *
 * Full-bleed image card with a dark gradient overlay and white text at the
 * bottom. Used in every horizontal recommendation carousel on the Discover tab.
 *
 * ⚠️  DESIGN CONTRACT — do not change these values without a deliberate
 *     design decision. Rork prompts must reference this file by name so
 *     changes are intentional and tracked.
 *
 * Canonical dimensions:
 *   Width:  CAROUSEL_CARD_WIDTH  = 110 px
 *   Height: CAROUSEL_CARD_HEIGHT = 148 px
 *
 * Visual spec:
 *   Border radius: 14 px
 *   Background fallback: #1C1C2E (dark navy, visible while image loads)
 *   Gradient: transparent → transparent → rgba(0,0,0,0.75) at 0 / 45% / 100%
 *   Name text: 10 px / 700 / #FFFFFF, 2-line max, lineHeight 13
 *   Time text:  9 px / 500 / rgba(255,255,255,0.75)
 *   Bottom padding: 7 px horizontal + 7 px bottom
 */

import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import { DiscoverMeal } from '@/types';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';

// ---------------------------------------------------------------------------
// Canonical card dimensions — import these wherever you render the card so
// the FlatList wrapper height stays in sync automatically.
// ---------------------------------------------------------------------------
export const CAROUSEL_CARD_WIDTH = 110;
export const CAROUSEL_CARD_HEIGHT = 148;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

type DiscoverCarouselCardProps = {
  meal: DiscoverMeal;
  onPress: () => void;
  onLongPress?: () => void;
  /** Defaults to CAROUSEL_CARD_WIDTH — override only for special layouts */
  width?: number;
  /** Defaults to CAROUSEL_CARD_HEIGHT — override only for special layouts */
  height?: number;
};

const DiscoverCarouselCard = React.memo(function DiscoverCarouselCard({
  meal,
  onPress,
  onLongPress,
  width = CAROUSEL_CARD_WIDTH,
  height = CAROUSEL_CARD_HEIGHT,
}: DiscoverCarouselCardProps) {
  const timeLabel = meal.cook_time
    ? `${meal.cook_time}m`
    : meal.prep_time
    ? `${meal.prep_time}m`
    : '?';

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, { width, height }]}
    >
      {/* Full-bleed background image */}
      <View style={StyleSheet.absoluteFill}>
        {meal.image_url ? (
          <Image
            source={{ uri: meal.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <MealImagePlaceholder
            size="thumbnail"
            mealType={meal.meal_type}
            cuisine={meal.cuisine}
            name={meal.name}
          />
        )}
      </View>

      {/* Dark gradient scrim — protects legibility of bottom text */}
      <LinearGradient
        style={StyleSheet.absoluteFill}
        colors={['transparent', 'transparent', 'rgba(0,0,0,0.75)']}
        locations={[0, 0.45, 1]}
        pointerEvents="none"
      />

      {/* Text overlay */}
      <View style={[styles.bottom, { width }]}>
        <Text style={styles.name} numberOfLines={2}>
          {meal.name}
        </Text>
        <Text style={styles.time}>{timeLabel}</Text>
      </View>
    </Pressable>
  );
});

export default DiscoverCarouselCard;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1C1C2E',
    elevation: 3,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 7,
    paddingBottom: 7,
  },
  name: {
    fontSize: 10,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.white,
    lineHeight: 13,
    marginBottom: 2,
  },
  time: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    fontFamily: FontFamily.semiBold,
    fontWeight: '500',
  },
});
