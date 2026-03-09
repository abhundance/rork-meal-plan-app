import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

interface MealImagePlaceholderProps {
  mealType?: string;
  cuisine?: string;
  name?: string;
  size: 'card' | 'thumbnail' | 'hero';
  borderRadius?: number;
  /** URI for the family profile photo — shown in hero when the meal has no image */
  familyAvatarUrl?: string;
  /** 1-2 letter initials to show when no family photo is set (e.g. "SF" for Smith Family) */
  familyInitials?: string;
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

// Cucumber green gradient for family-created meals without a photo
const FAMILY_GRADIENT: [string, string, string] = ['#E2F5EE', '#C5E4D5', '#A8DECA'];

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
      colors = FAMILY_GRADIENT;
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
        return { colors: FAMILY_GRADIENT, emoji: nameEmoji };
      }
      if (m === 'lunch_dinner') {
        return { colors: ['#FEF3C7', '#FDE68A', '#FCD34D'], emoji: nameEmoji };
      }
      if (m === 'light_bites') {
        return { colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7'], emoji: nameEmoji };
      }
      return { colors: FAMILY_GRADIENT, emoji: nameEmoji };
    }
  }

  const m = mealType?.toLowerCase() ?? '';
  if (m === 'breakfast') {
    return { colors: FAMILY_GRADIENT, emoji: '🥞' };
  }
  if (m === 'lunch_dinner') {
    return { colors: ['#FEF3C7', '#FDE68A', '#FCD34D'], emoji: '🍽' };
  }
  if (m === 'light_bites') {
    return { colors: ['#D1FAE5', '#A7F3D0', '#6EE7B7'], emoji: '🥗' };
  }

  return { colors: FAMILY_GRADIENT, emoji: '🍴' };
}

export default function MealImagePlaceholder({
  mealType,
  cuisine,
  name,
  size,
  borderRadius,
  familyAvatarUrl,
  familyInitials,
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

  // Hero size: show family avatar photo or initials instead of emoji
  if (isHero && (familyAvatarUrl || familyInitials)) {
    return (
      <LinearGradient
        colors={FAMILY_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        {familyAvatarUrl ? (
          <View style={styles.avatarRing}>
            <Image
              source={{ uri: familyAvatarUrl }}
              style={styles.avatarImage}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={styles.initialsCircle}>
            <Text style={styles.initialsText}>{familyInitials}</Text>
          </View>
        )}
      </LinearGradient>
    );
  }

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
  // Family avatar: circular photo with white ring
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FFFFFF',
    padding: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  // Family initials: green circle with white letters
  initialsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2C845E',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  initialsText: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
});
