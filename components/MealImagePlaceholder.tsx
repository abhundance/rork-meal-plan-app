import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import Colors from '@/constants/colors';

interface MealImagePlaceholderProps {
  mealType?: string;
  cuisine?: string;
  name?: string;
  size: 'card' | 'thumbnail' | 'hero';
  borderRadius?: number;
  /** URI for the family profile photo — shown when the meal has no image */
  familyAvatarUrl?: string;
  /** 1-2 letter initials to show when no family photo is set (e.g. "SF" for Smith Family) */
  familyInitials?: string;
  /** Delivery platform key — when set, shows the platform logo instead of emoji/family identity */
  deliveryPlatform?: string;
}

interface PlaceholderConfig {
  colors: [string, string, string];
  emoji: string;
}

// ─── Delivery platform config ────────────────────────────────────────────────
// Logos served via Clearbit's free CDN (reliable for dev/staging).
// Gradients are subtle brand-tinted backgrounds.
interface DeliveryConfig {
  gradient: [string, string, string];
  logoUrl: string;
  label: string;
}

const DELIVERY_CONFIG: Record<string, DeliveryConfig> = {
  uber_eats: {
    gradient: ['#F7F7F7', '#EFEFEF', '#E5E5E5'],
    logoUrl: 'https://logo.clearbit.com/ubereats.com',
    label: 'Uber Eats',
  },
  doordash: {
    gradient: ['#FFF4F2', '#FFE4DC', '#FFD4C8'],
    logoUrl: 'https://logo.clearbit.com/doordash.com',
    label: 'DoorDash',
  },
  deliveroo: {
    gradient: ['#F0FDF8', '#D6F5EA', '#BDEADB'],
    logoUrl: 'https://logo.clearbit.com/deliveroo.com',
    label: 'Deliveroo',
  },
  zomato: {
    gradient: ['#FFF5F5', '#FFE0E0', '#FFCECE'],
    logoUrl: 'https://logo.clearbit.com/zomato.com',
    label: 'Zomato',
  },
  grab: {
    gradient: ['#F3FFF0', '#DCFAD4', '#C5F5B8'],
    logoUrl: 'https://logo.clearbit.com/grab.com',
    label: 'Grab',
  },
  swiggy: {
    gradient: ['#FFFAF0', '#FFECD4', '#FFDFB8'],
    logoUrl: 'https://logo.clearbit.com/swiggy.com',
    label: 'Swiggy',
  },
};

const DELIVERY_FALLBACK_GRADIENT: [string, string, string] = ['#F5F5F5', '#EBEBEB', '#E0E0E0'];
// ─────────────────────────────────────────────────────────────────────────────

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

// Family gradient for meals without a photo — sourced from the design system token.
// To update this gradient, change Colors.familyGradient in constants/colors.ts only.
const FAMILY_GRADIENT = Colors.familyGradient;

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
  deliveryPlatform,
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
        // borderRadius=0 means "fill parent" — drop the aspectRatio constraint
        return [styles.containerCard, { borderRadius, aspectRatio: undefined as any, width: '100%' as const, height: '100%' as const }] as any;
      }
      return styles.containerCard;
    }
    return styles.containerHero;
  })();

  const glowSize = isThumbnail ? 30 : isCard ? 56 : 100;
  const emojiFontSize = isThumbnail ? 26 : isCard ? 42 : 70;

  // ─── 1. Delivery platform logo ──────────────────────────────────────────────
  if (deliveryPlatform) {
    const dc = DELIVERY_CONFIG[deliveryPlatform];
    const gradient = dc?.gradient ?? DELIVERY_FALLBACK_GRADIENT;
    const logoUrl = dc?.logoUrl;
    const label = dc?.label ?? 'Delivery';

    // Logo container size scaled by size prop
    const logoSize = isThumbnail ? 26 : isCard ? 48 : 72;
    const logoRadius = isThumbnail ? 6 : isCard ? 10 : 14;

    return (
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        {logoUrl ? (
          <View style={[styles.logoContainer, { width: logoSize, height: logoSize, borderRadius: logoRadius }]}>
            <Image
              source={{ uri: `${logoUrl}?size=128` }}
              style={{ width: logoSize, height: logoSize, borderRadius: logoRadius }}
              contentFit="contain"
            />
          </View>
        ) : (
          // Fallback for unknown "other" platforms
          <Text style={{ fontSize: emojiFontSize }}>🛵</Text>
        )}
        {isHero && label && (
          <Text style={styles.deliveryLabel}>{label}</Text>
        )}
      </LinearGradient>
    );
  }

  // ─── 2. Family avatar photo or initials ─────────────────────────────────────
  const hasRealPhoto =
    !!familyAvatarUrl &&
    (familyAvatarUrl.startsWith('http') || familyAvatarUrl.startsWith('file://'));

  if (hasRealPhoto || familyInitials) {
    // Scale avatar dimensions by size
    const circleSize = isThumbnail ? 30 : isCard ? 64 : 100;
    const photoSize = isThumbnail ? 30 : isCard ? 64 : 94;
    const ringPad = isHero ? 3 : 0;          // white ring only on hero
    const fontSize = isThumbnail ? 13 : isCard ? 26 : 34;

    return (
      <LinearGradient
        colors={FAMILY_GRADIENT}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={containerStyle}
      >
        {hasRealPhoto ? (
          <View style={[
            styles.avatarRing,
            { width: circleSize, height: circleSize, borderRadius: circleSize / 2, padding: ringPad },
          ]}>
            <Image
              source={{ uri: familyAvatarUrl! }}
              style={{ width: photoSize, height: photoSize, borderRadius: photoSize / 2 }}
              contentFit="cover"
            />
          </View>
        ) : (
          <View style={[
            styles.initialsCircle,
            { width: circleSize, height: circleSize, borderRadius: circleSize / 2 },
          ]}>
            <Text style={[styles.initialsText, { fontSize, lineHeight: circleSize }]}>
              {familyInitials}
            </Text>
          </View>
        )}
      </LinearGradient>
    );
  }

  // ─── 3. Default emoji + colour gradient ────────────────────────────────────
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
  // Delivery platform logo container
  logoContainer: {
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  deliveryLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginTop: 10,
    letterSpacing: 0.2,
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
  // Family initials: primary-coloured circle with white letters
  initialsCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.primary,
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
