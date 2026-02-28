import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface MealImagePlaceholderProps {
  mealType?: string;
  cuisine?: string;
  name?: string;
  size: 'card' | 'thumbnail' | 'hero';
  borderRadius?: number;
}

interface PlaceholderConfig {
  colors: [string, string, string];
  emoji: string;
}

const NAME_EMOJI_MAP: Array<[string[], string]> = [
  [['rice', 'biryani', 'pilaf', 'risotto'], '🍚'],
  [['pasta', 'spaghetti', 'penne', 'linguine', 'fettuccine', 'lasagna'], '🍝'],
  [['noodle', 'ramen', 'pho', 'udon', 'soba'], '🍜'],
  [['pizza'], '🍕'],
  [['burger'], '🍔'],
  [['sandwich', 'sub'], '🥪'],
  [['wrap', 'burrito', 'quesadilla'], '🌯'],
  [['taco'], '🌮'],
  [['salad'], '🥗'],
  [['soup', 'stew', 'broth', 'chowder'], '🍲'],
  [['curry'], '🍛'],
  [['egg', 'omelette', 'omelet', 'frittata'], '🍳'],
  [['pancake', 'waffle'], '🥞'],
  [['sushi', 'maki', 'sashimi'], '🍣'],
  [['bibimbap'], '🍱'],
  [['kimchi'], '🥬'],
  [['chicken', 'poultry'], '🍗'],
  [['fish', 'salmon', 'tuna', 'prawn', 'shrimp', 'seafood'], '🐟'],
  [['steak', 'beef', 'lamb', 'pork'], '🥩'],
  [['bread', 'toast', 'bagel'], '🍞'],
  [['cake', 'dessert', 'cookie', 'brownie', 'pudding'], '🍰'],
  [['smoothie', 'shake', 'juice'], '🥤'],
  [['coffee', 'latte', 'cappuccino'], '☕'],
  [['bowl', 'poke'], '🥣'],
  [['avocado', 'guacamole'], '🥑'],
  [['dal', 'dhal', 'lentil'], '🫘'],
  [['curd', 'yogurt', 'raita'], '🥛'],
  [['paneer', 'tikka', 'masala'], '🍛'],
  [['gyro', 'falafel', 'hummus', 'shawarma'], '🥙'],
];

const NAME_CUISINE_MAP: Array<[string[], [string, string, string]]> = [
  [['pizza', 'pasta', 'spaghetti', 'lasagna', 'risotto'], ['#FEE2E2', '#FECACA', '#FCA5A5']],
  [['ramen', 'sushi', 'miso', 'teriyaki', 'kimchi', 'bibimbap', 'pho', 'udon'], ['#DBEAFE', '#BFDBFE', '#93C5FD']],
  [['taco', 'burrito', 'enchilada', 'quesadilla', 'guacamole'], ['#FCE7F3', '#FBCFE8', '#F9A8D4']],
  [['curry', 'biryani', 'dal', 'dhal', 'samosa', 'tikka', 'masala', 'paneer', 'curd rice', 'curd'], ['#FEF9C3', '#FDE68A', '#FCD34D']],
  [['hummus', 'falafel', 'gyro', 'shawarma', 'pita', 'halloumi'], ['#CCFBF1', '#99F6E4', '#5EEAD4']],
];

function getEmojiFromName(n: string): string | null {
  for (const [keywords, emoji] of NAME_EMOJI_MAP) {
    if (keywords.some((kw) => n.includes(kw))) return emoji;
  }
  return null;
}

function getConfig(mealType?: string, cuisine?: string, name?: string): PlaceholderConfig {
  const c = cuisine?.toLowerCase() ?? '';
  const n = name?.toLowerCase() ?? '';

  if (c.length > 0) {
    let colors: [string, string, string];
    let baseEmoji: string;

    if (c.includes('italian')) {
      colors = ['#FEE2E2', '#FECACA', '#FCA5A5'];
      baseEmoji = '🍕';
    } else if (c.includes('japanese') || c.includes('asian') || c.includes('korean') || c.includes('thai')) {
      colors = ['#DBEAFE', '#BFDBFE', '#93C5FD'];
      baseEmoji = '🍜';
    } else if (c.includes('mexican')) {
      colors = ['#FCE7F3', '#FBCFE8', '#F9A8D4'];
      baseEmoji = '🌮';
    } else if (c.includes('indian')) {
      colors = ['#FEF9C3', '#FDE68A', '#FCD34D'];
      baseEmoji = '🍛';
    } else if (c.includes('mediterranean') || c.includes('middle eastern')) {
      colors = ['#CCFBF1', '#99F6E4', '#5EEAD4'];
      baseEmoji = '🥙';
    } else {
      colors = ['#EDE9FE', '#C4B5FD', '#DDD6FE'];
      baseEmoji = '🍴';
    }

    const nameEmoji = n.length > 0 ? getEmojiFromName(n) : null;
    return { colors, emoji: nameEmoji ?? baseEmoji };
  }

  if (n.length > 0) {
    for (const [keywords, colors] of NAME_CUISINE_MAP) {
      if (keywords.some((kw) => n.includes(kw))) {
        const nameEmoji = getEmojiFromName(n);
        return { colors, emoji: nameEmoji ?? '🍴' };
      }
    }
    const nameEmoji = getEmojiFromName(n);
    if (nameEmoji) {
      const m = mealType?.toLowerCase() ?? '';
      if (m === 'breakfast') {
        return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: nameEmoji };
      }
      if (m === 'lunch_dinner') {
        return { colors: ['#FEF3C7', '#FDE68A', '#FCD34D'], emoji: nameEmoji };
      }
      if (m === 'light_bites') {
        return { colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7'], emoji: nameEmoji };
      }
      return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: nameEmoji };
    }
  }

  const m = mealType?.toLowerCase() ?? '';
  if (m === 'breakfast') {
    return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: '🥞' };
  }
  if (m === 'lunch_dinner') {
    return { colors: ['#FEF3C7', '#FDE68A', '#FCD34D'], emoji: '🍽' };
  }
  if (m === 'light_bites') {
    return { colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7'], emoji: '🥗' };
  }

  return { colors: ['#EDE9FE', '#C4B5FD', '#DDD6FE'], emoji: '🍴' };
}

export default function MealImagePlaceholder({
  mealType,
  cuisine,
  name,
  size,
  borderRadius,
}: MealImagePlaceholderProps) {
  const config = getConfig(mealType, cuisine, name);

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
  const emojiFontSize = isThumbnail ? 26 : isCard ? 42 : 70;

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

});
