import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MealImagePlaceholderProps {
  mealType?: string;
  cuisine?: string;
  size: 'card' | 'thumbnail' | 'hero';
  borderRadius?: number;
}

interface PlaceholderConfig {
  colors: [string, string, string];
  emoji: string;
  label: string;
}

function getConfig(mealType?: string, cuisine?: string): PlaceholderConfig {
  const c = cuisine?.toLowerCase() ?? '';

  if (c.includes('italian')) {
    return { colors: ['#FEE2E2', '#FECACA', '#FCA5A5'], emoji: '🍕', label: 'Italian' };
  }
  if (c.includes('japanese') || c.includes('asian') || c.includes('korean') || c.includes('thai')) {
    return { colors: ['#DBEAFE', '#BFDBFE', '#93C5FD'], emoji: '🍜', label: cuisine ?? '' };
  }
  if (c.includes('mexican')) {
    return { colors: ['#FCE7F3', '#FBCFE8', '#F9A8D4'], emoji: '🌮', label: 'Mexican' };
  }
  if (c.includes('indian')) {
    return { colors: ['#FEF9C3', '#FDE68A', '#FCD34D'], emoji: '🍛', label: 'Indian' };
  }
  if (c.includes('mediterranean') || c.includes('middle eastern')) {
    return { colors: ['#CCFBF1', '#99F6E4', '#5EEAD4'], emoji: '🥙', label: cuisine ?? '' };
  }

  const m = mealType?.toLowerCase() ?? '';

  if (m === 'breakfast') {
    return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: '🥞', label: 'Breakfast' };
  }
  if (m === 'lunch_dinner') {
    return { colors: ['#FEF3C7', '#FDE68A', '#FCD34D'], emoji: '🍽', label: 'Lunch & Dinner' };
  }
  if (m === 'light_bites') {
    return { colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7'], emoji: '🥗', label: 'Light Bites' };
  }

  return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: '🍴', label: '' };
}

export default function MealImagePlaceholder({
  mealType,
  cuisine,
  size,
  borderRadius,
}: MealImagePlaceholderProps) {
  const config = getConfig(mealType, cuisine);

  const isThumbnail = size === 'thumbnail';
  const isCard = size === 'card';
  const isHero = size === 'hero';

  const containerStyle = (() => {
    if (isThumbnail) {
      return styles.containerThumbnail;
    }
    if (isCard) {
      if (borderRadius !== undefined) {
        return [styles.containerCard, { borderRadius }];
      }
      return styles.containerCard;
    }
    return styles.containerHero;
  })();

  const glowSize = isThumbnail ? 30 : isCard ? 56 : 100;
  const emojiFontSize = isThumbnail ? 20 : isCard ? 30 : 52;
  const labelFontSize = isCard ? 9 : 11;
  const showLabel = !isThumbnail && config.label.length > 0;

  return (
    <LinearGradient
      colors={config.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={containerStyle}
    >
      <View
        style={[
          styles.glow,
          { width: glowSize, height: glowSize, borderRadius: 9999 },
        ]}
      />
      <Text style={{ fontSize: emojiFontSize }}>{config.emoji}</Text>
      {showLabel && (
        <Text
          style={[
            styles.label,
            { fontSize: labelFontSize },
          ]}
        >
          {config.label.toUpperCase()}
        </Text>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  containerThumbnail: {
    width: 42,
    height: 42,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  containerCard: {
    width: '100%',
    aspectRatio: 16 / 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  containerHero: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.28)',
  },
  label: {
    fontWeight: '700',
    letterSpacing: 1,
    opacity: 0.45,
    color: '#2C2C2C',
    marginTop: 4,
  },
});
