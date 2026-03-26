/**
 * Onboarding Screen 1 — Launch Mosaic
 *
 * Full-screen cinematic food photo grid. Three independent columns scroll
 * upward at different speeds and starting offsets for an organic, living feel.
 * Single CTA: "Let's go" — no authentication on this screen.
 * Auth is the final step (account.tsx) after the user has seen the app's value.
 */
import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { UtensilsCrossed } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';

// ─── Layout constants ────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

const COL_GAP      = 3;
const COL_COUNT    = 3;
const COL_W        = (SCREEN_W - COL_GAP * (COL_COUNT - 1)) / COL_COUNT;
const IMG_H        = Math.round(COL_W * 1.38);
const IMGS_PER_COL = 6;
const CYCLE_H      = IMGS_PER_COL * IMG_H;
const PHOTO_H      = Math.round(SCREEN_H * 0.55);

// ─── Photo sets ───────────────────────────────────────────────────────────────

const COL_1 = [
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=480&q=80',
  'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=480&q=80',
  'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=480&q=80',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=480&q=80',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=480&q=80',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=480&q=80',
];
const COL_2 = [
  'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=480&q=80',
  'https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=480&q=80',
  'https://images.unsplash.com/photo-1547592180-85f173990554?w=480&q=80',
  'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=480&q=80',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=480&q=80',
  'https://images.unsplash.com/photo-1432139509613-5c4255815697?w=480&q=80',
];
const COL_3 = [
  'https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=480&q=80',
  'https://images.unsplash.com/photo-1543353071-873f17a7a088?w=480&q=80',
  'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=480&q=80',
  'https://images.unsplash.com/photo-1473093295043-cdd812d0e601?w=480&q=80',
  'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=480&q=80',
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=480&q=80',
];

const INITIAL_OFFSETS  = [0, -IMG_H * 1.7, -IMG_H * 0.85] as const;
const SCROLL_DURATIONS = [24000, 30000, 19000] as const;

function ScrollingColumn({ images, animY }: { images: string[]; animY: Animated.Value }) {
  const doubled = [...images, ...images];
  return (
    <Animated.View style={{ transform: [{ translateY: animY }] }}>
      {doubled.map((uri, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={{ width: COL_W, height: IMG_H }}
          contentFit="cover"
          recyclingKey={`mosaic-${i}`}
        />
      ))}
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  const animY0 = useRef(new Animated.Value(INITIAL_OFFSETS[0])).current;
  const animY1 = useRef(new Animated.Value(INITIAL_OFFSETS[1])).current;
  const animY2 = useRef(new Animated.Value(INITIAL_OFFSETS[2])).current;

  const colDefs = [
    { anim: animY0, images: COL_1, offset: INITIAL_OFFSETS[0], duration: SCROLL_DURATIONS[0] },
    { anim: animY1, images: COL_2, offset: INITIAL_OFFSETS[1], duration: SCROLL_DURATIONS[1] },
    { anim: animY2, images: COL_3, offset: INITIAL_OFFSETS[2], duration: SCROLL_DURATIONS[2] },
  ];

  useEffect(() => {
    const timings: ReturnType<typeof Animated.timing>[] = [];
    colDefs.forEach(({ anim, offset, duration }) => {
      const loop = () => {
        anim.setValue(offset);
        const t = Animated.timing(anim, {
          toValue: offset - CYCLE_H,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        });
        timings.push(t);
        t.start(({ finished }) => { if (finished) loop(); });
      };
      loop();
    });
    return () => timings.forEach(t => t.stop());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>

      {/* ── Mosaic ───────────────────────────────────────────────────────── */}
      <View style={[styles.photoSection, { height: PHOTO_H + insets.top }]}>
        <LinearGradient
          colors={['rgba(0,0,0,0.25)', 'rgba(0,0,0,0)']}
          style={[styles.statusDim, { height: insets.top + 40 }]}
          pointerEvents="none"
        />
        <View style={styles.grid}>
          {colDefs.map(({ anim, images }, idx) => (
            <View key={idx} style={styles.colClip}>
              <ScrollingColumn images={images} animY={anim} />
            </View>
          ))}
        </View>
        <LinearGradient
          colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.7)', '#FFFFFF']}
          locations={[0, 0.6, 1]}
          style={styles.photoFade}
          pointerEvents="none"
        />
      </View>

      {/* ── Brand + CTA ──────────────────────────────────────────────────── */}
      <View style={[styles.panel, { paddingBottom: insets.bottom + 24 }]}>
        <View>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}>
              <UtensilsCrossed size={18} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.wordmark}>Meal Plan</Text>
          </View>
          <Text style={styles.headline}>
            Your whole week of meals,{'\n'}
            <Text style={styles.headlineAccent}>planned in minutes.</Text>
          </Text>

          {/* ── Feature summary ───────────────────────────────────────── */}
          <View style={styles.featuresBlock}>
            {[
              { emoji: '📅', text: 'Plan your whole week, meal by meal' },
              { emoji: '🛒', text: 'Shopping list built automatically' },
              { emoji: '🍳', text: 'All your recipes in one place' },
            ].map(({ emoji, text }) => (
              <View key={text} style={styles.featureRow}>
                <Text style={styles.featureEmoji}>{emoji}</Text>
                <Text style={styles.featureText}>{text}</Text>
              </View>
            ))}
          </View>
        </View>
        <PrimaryButton
          label="Let's go"
          onPress={() => router.push('/onboarding/setup' as Href)}
          testID="lets-go-btn"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  photoSection: {
    overflow: 'hidden',
  },
  grid: {
    flexDirection: 'row',
    gap: COL_GAP,
    flex: 1,
  },
  colClip: {
    width: COL_W,
    overflow: 'hidden',
    flex: 0,
  },
  statusDim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
  },
  photoFade: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
  },
  panel: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  logoMark: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: {
    fontSize: 22,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    letterSpacing: -0.4,
  },
  headline: {
    fontSize: 26,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
    lineHeight: 34,
    letterSpacing: -0.3,
  },
  headlineAccent: {
    color: Colors.text,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
  },
  featuresBlock: {
    marginTop: 20,
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureEmoji: {
    fontSize: 15,
    lineHeight: 20,
    width: 22,
    textAlign: 'center',
  },
  featureText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
