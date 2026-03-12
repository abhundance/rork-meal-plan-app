/**
 * DiscoverCollectionScreen
 *
 * Full-screen scrollable grid of recipes from a recommendation carousel.
 * Receives mealIds (comma-separated), title, and emoji as URL params.
 * Renders up to MAX_ITEMS recipes using DiscoverCarouselCard — the same
 * card component used in the Discover tab carousels. 3-column grid layout.
 */
import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack, Href } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { getCachedDiscoverMeal } from '@/services/discoverMealCache';
import DiscoverCarouselCard, {
  CAROUSEL_CARD_WIDTH,
  CAROUSEL_CARD_HEIGHT,
} from '@/components/DiscoverCarouselCard';
import { DiscoverMeal } from '@/types';

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------
const { width: screenWidth } = Dimensions.get('window');

const COLUMNS = 3;
const H_PAD = 16;   // horizontal padding on each side
const COL_GAP = 8;  // gap between columns

// Card is scaled up proportionally from the canonical carousel card size
export const COLLECTION_CARD_WIDTH = Math.floor(
  (screenWidth - H_PAD * 2 - COL_GAP * (COLUMNS - 1)) / COLUMNS
);
export const COLLECTION_CARD_HEIGHT = Math.round(
  COLLECTION_CARD_WIDTH * (CAROUSEL_CARD_HEIGHT / CAROUSEL_CARD_WIDTH)
);

const MAX_ITEMS = 30;

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------
export default function DiscoverCollectionScreen() {
  const insets = useSafeAreaInsets();
  const { mealIds, title, emoji } = useLocalSearchParams<{
    mealIds: string;
    title: string;
    emoji: string;
  }>();

  const meals = useMemo<DiscoverMeal[]>(() => {
    if (!mealIds) return [];
    const idList = mealIds.split(',');
    return idList
      .map(id => getCachedDiscoverMeal(id) ?? DISCOVER_MEALS.find(m => m.id === id))
      .filter((m): m is DiscoverMeal => m !== undefined)
      .slice(0, MAX_ITEMS);
  }, [mealIds]);

  const screenTitle = [emoji, title].filter(Boolean).join(' ') || 'Collection';

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {screenTitle}
        </Text>
        {/* Spacer to keep title visually centred */}
        <View style={{ width: 36 }} />
      </View>

      {/* ── 3-column recipe grid ── */}
      <FlatList
        data={meals}
        keyExtractor={item => item.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <DiscoverCarouselCard
            meal={item}
            onPress={() =>
              router.push(
                `/recipe-detail?id=${item.id}&source=discover` as Href
              )
            }
            width={COLLECTION_CARD_WIDTH}
            height={COLLECTION_CARD_HEIGHT}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyTitle}>No recipes here yet</Text>
            <Text style={styles.emptySubtitle}>
              Check back soon as we add more
            </Text>
          </View>
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  row: {
    paddingHorizontal: H_PAD,
    gap: COL_GAP,
    marginBottom: COL_GAP,
  },
  gridContent: {
    paddingTop: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  emptySubtitle: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
  },
});
