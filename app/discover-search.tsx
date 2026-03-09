import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, Href } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Search, X } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';
import { DISCOVER_MEALS, COLLECTIONS } from '@/mocks/discover';
import { DiscoverMeal, MealCollection } from '@/types';
import DiscoverCarouselCard from '@/components/DiscoverCarouselCard';

const { width: screenWidth } = Dimensions.get('window');
const GRID_CARD_WIDTH = (screenWidth - 48) / 3;

export default function DiscoverSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>('');

  const results = useMemo(() => {
    if (!query.trim()) return { meals: [], collections: [] };
    const q = query.toLowerCase();
    return {
      meals: DISCOVER_MEALS.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          (m.cuisine ?? '').toLowerCase().includes(q) ||
          m.dietary_tags.some((t) => t.toLowerCase().includes(q))
      ),
      collections: COLLECTIONS.filter(
        (c) => c.title.toLowerCase().includes(q)
      ),
    };
  }, [query]);

  const hasResults = results.meals.length > 0 || results.collections.length > 0;
  const totalResults = results.meals.length + results.collections.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Search bar */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals and collections..."
            placeholderTextColor={Colors.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus
            returnKeyType="search"
            testID="discover-search-input"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <X size={16} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* States */}
      {!query.trim() ? (
        <View style={styles.emptyPrompt}>
          <Search size={40} color={Colors.surface} strokeWidth={1.5} />
          <Text style={styles.emptyText}>Search for meals or collections</Text>
        </View>
      ) : !hasResults ? (
        <View style={styles.noResultsContainer}>
          <Search size={64} color="#9CA3AF" strokeWidth={1.5} />
          <Text style={styles.noResultsPrimary}>No results for "{query}"</Text>
          <Text style={styles.noResultsSecondary}>Check the spelling or try a different search</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Result count */}
          <Text style={styles.resultsCountText}>
            {totalResults} result{totalResults !== 1 ? 's' : ''} for '{query}'
          </Text>

          {/* Meals — 3-column grid */}
          {results.meals.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Meals</Text>
              <View style={styles.grid}>
                {results.meals.map((meal: DiscoverMeal) => (
                  <DiscoverCarouselCard
                    key={meal.id}
                    meal={meal}
                    onPress={() => router.push(`/recipe-detail?id=${meal.id}&source=discover` as Href)}
                    width={GRID_CARD_WIDTH}
                    height={Math.round(GRID_CARD_WIDTH * 1.35)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Collections — horizontal rows */}
          {results.collections.length > 0 && (
            <View>
              <Text style={styles.sectionTitle}>Collections</Text>
              {results.collections.map((col: MealCollection) => (
                <TouchableOpacity
                  key={col.id}
                  style={styles.resultRow}
                  onPress={() => router.push(`/collection?id=${col.id}` as Href)}
                >
                  <Image source={{ uri: col.cover_image_url }} style={styles.resultThumb} contentFit="cover" />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{col.title}</Text>
                    <Text style={styles.resultMeta}>{col.meal_count} meals</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 10,
  },
  emptyPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  noResultsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 8,
  },
  noResultsPrimary: {
    fontSize: 17,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
    marginTop: 8,
  },
  noResultsSecondary: {
    fontSize: 16,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    maxWidth: 240,
    marginTop: 8,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
  },
  resultsCountText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingTop: 16,
    paddingBottom: 10,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 12,
  },
  resultThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
