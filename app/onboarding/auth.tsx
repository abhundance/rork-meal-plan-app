/**
 * Cover screen — full-screen cinematic splash
 *
 * The photo mosaic fills the entire screen with no white competing for
 * space. A dark gradient only at the very bottom gives the logo and a
 * single "Get Started" CTA enough contrast to read.
 *
 * Auth options (Google / Apple / Email) live on the next screen
 * (auth-options.tsx), which slides up as a modal so the cover image
 * remains visible behind it.
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

// ─── Photo sets ──────────────────────────────────────────────────────────────

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

// ─── ScrollingColumn ──────────────────────────────────────────────────────────

function ScrollingColumn({
  images,
  animY,
}: {
  images: string[];
  animY: Animated.Value;
}) {
  const doubled = [...images, ...images];
  return (
    <Animated.View style={{ transform: [{ translateY: animY }] }}>
      {doubled.map((uri, i) => (
        <Image
          key={i}
          source={{ uri }}
          style={{ width: COL_W, height: IMG_H }}
          contentFit="cover"
          recyclingKey={`col-img-${i}`}
        />
      ))}
    </Animated.View>
  );
}

// ─── Cover screen ─────────────────────────────────────────────────────────────

export default function AuthScreen() {
  const insets = useSafeAreaInsets();

  const animY0 = useRef(new Animated.Value(INITIAL_OFFSETS[0])).current;
  const animY1 = useRef(new Animated.Value(INITIAL_OFFSETS[1])).current;
  const animY2 = useRef(new Animated.Value(INITIAL_OFFSETS[2])).current;

  const columns = [
    { anim: animY0, images: COL_1, offset: INITIAL_OFFSETS[0], duration: SCROLL_DURATIONS[0] },
    { anim: animY1, images: COL_2, offset: INITIAL_OFFSETS[1], duration: SCROLL_DURATIONS[1] },
    { anim: animY2, images: COL_3, offset: INITIAL_OFFSETS[2], duration: SCROLL_DURATIONS[2] },
  ];

  useEffect(() => {
    columns.forEach(({ anim, offset, duration }) => {
      const loop = () => {
        anim.setValue(offset);
        Animated.timing(anim, {
          toValue: offset - CYCLE_H,
          duration,
          easing: Easing.linear,
          useNativeDriver: true,
        }).start(({ finished }) => {
          if (finished) loop();
        });
      };
      loop();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={styles.root}>

      {/* ── Full-screen photo grid ── */}
      <View style={StyleSheet.absoluteFill}>
        <View style={styles.grid}>
          {columns.map(({ anim, images }, idx) => (
            <View key={idx} style={styles.colClip}>
              <ScrollingColumn images={images} animY={anim} />
            </View>
          ))}
        </View>
      </View>

      {/* ── Gradient: fades in only at the bottom third ── */}
      <LinearGradient
        colors={[
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0)',
          'rgba(0,0,0,0.55)',
          'rgba(0,0,0,0.88)',
        ]}
        locations={[0, 0.45, 0.72, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* ── Minimal top dimmer so status bar is readable ── */}
      <LinearGradient
        colors={['rgba(0,0,0,0.30)', 'rgba(0,0,0,0)']}
        style={[styles.topDimmer, { height: insets.top + 48 }]}
        pointerEvents="none"
      />

      {/* ── Logo — top-left ── */}
      <View style={[styles.logoWrap, { top: insets.top + 16 }]}>
        <View style={styles.logoMark}>
          <UtensilsCrossed size={18} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.logoLabel}>Meal Plan</Text>
      </View>

      {/* ── Bottom CTA ── */}
      <View style={[styles.bottomContent, { paddingBottom: insets.bottom + 24 }]}>
        <Text style={styles.headline}>
          Beautiful meals,{'\n'}every week.
        </Text>
        <PrimaryButton
          label="Get Started"
          onPress={() => router.push('/onboarding/auth-options' as Href)}
          style={styles.ctaButton}
          testID="cover-get-started"
        />
        <Text
          style={styles.signInLink}
          onPress={() => router.push('/onboarding/auth-options' as Href)}
        >
          Already have an account?{' '}
          <Text style={styles.signInLinkBold}>Sign in</Text>
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#111',
  },

  // Grid
  grid: {
    flex: 1,
    flexDirection: 'row',
    gap: COL_GAP,
  },
  colClip: {
    width: COL_W,
    flex: 0,
    overflow: 'hidden',
    // Extra height so the bottom of the last image isn't visible while scrolling
    height: SCREEN_H + CYCLE_H,
  },

  // Overlays
  topDimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  // Logo
  logoWrap: {
    position: 'absolute',
    left: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoMark: {
    width: 34,
    height: 34,
    borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLabel: {
    fontSize: 17,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },

  // Bottom content
  bottomContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    gap: 12,
  },
  headline: {
    fontSize: 32,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: -0.8,
    lineHeight: 38,
    marginBottom: 4,
  },
  ctaButton: {
    borderRadius: BorderRadius.button,
  },
  signInLink: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: 'rgba(255,255,255,0.55)',
    textAlign: 'center',
    paddingVertical: 4,
  },
  signInLinkBold: {
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.80)',
  },
});
