import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  SectionList,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, Href } from 'expo-router';
import { Image } from 'expo-image';
import { ArrowLeft, Search, X, Clock, ChevronRight } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows } from '@/constants/theme';
import { DISCOVER_MEALS, CHEFS, COLLECTIONS } from '@/mocks/discover';
import { DiscoverMeal, Chef, MealCollection } from '@/types';

export default function DiscoverSearchScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>('');

  const results = useMemo(() => {
    if (!query.trim()) return { meals: [], chefs: [], collections: [] };
    const q = query.toLowerCase();
    return {
      meals: DISCOVER_MEALS.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.cuisine.toLowerCase().includes(q) ||
          m.dietary_tags.some((t) => t.toLowerCase().includes(q))
      ),
      chefs: CHEFS.filter(
        (c) => c.name.toLowerCase().includes(q) || c.cuisine_focus.toLowerCase().includes(q)
      ),
      collections: COLLECTIONS.filter(
        (c) => c.title.toLowerCase().includes(q)
      ),
    };
  }, [query]);

  const hasResults = results.meals.length > 0 || results.chefs.length > 0 || results.collections.length > 0;

  const sections = useMemo(() => {
    const s: { title: string; data: any[] }[] = [];
    if (results.meals.length > 0) s.push({ title: 'Meals', data: results.meals });
    if (results.chefs.length > 0) s.push({ title: 'Chefs & Channels', data: results.chefs });
    if (results.collections.length > 0) s.push({ title: 'Collections', data: results.collections });
    return s;
  }, [results]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <View style={styles.searchWrap}>
          <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search meals, chefs, collections..."
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

      {!query.trim() ? (
        <View style={styles.emptyPrompt}>
          <Search size={40} color={Colors.surface} strokeWidth={1.5} />
          <Text style={styles.emptyText}>Search for meals, chefs, or collections</Text>
          <TouchableOpacity
            style={styles.findChefsLink}
            onPress={() => router.push('/find-chefs' as Href)}
          >
            <Text style={styles.findChefsText}>Find Chefs to Follow</Text>
            <ChevronRight size={14} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyPrompt}>
          <Text style={styles.noResultsText}>No results for "{query}"</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, idx) => item.id ?? `item_${idx}`}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionTitle}>{section.title}</Text>
          )}
          renderItem={({ item, section }) => {
            if (section.title === 'Meals') {
              const meal = item as DiscoverMeal;
              return (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => router.push(`/meal-detail?id=${meal.id}&source=discover` as Href)}
                >
                  <Image source={{ uri: meal.image_url }} style={styles.resultThumb} contentFit="cover" />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{meal.name}</Text>
                    <Text style={styles.resultMeta}>{meal.cuisine} · {meal.chef_name}</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            if (section.title === 'Chefs & Channels') {
              const chef = item as Chef;
              return (
                <TouchableOpacity
                  style={styles.resultRow}
                  onPress={() => router.push(`/chef-profile?id=${chef.id}` as Href)}
                >
                  <Image source={{ uri: chef.avatar_url }} style={styles.resultAvatar} contentFit="cover" />
                  <View style={styles.resultInfo}>
                    <Text style={styles.resultName} numberOfLines={1}>{chef.name}</Text>
                    <Text style={styles.resultMeta}>{chef.cuisine_focus} · {chef.recipe_count} recipes</Text>
                  </View>
                </TouchableOpacity>
              );
            }
            const col = item as MealCollection;
            return (
              <TouchableOpacity
                style={styles.resultRow}
                onPress={() => router.push(`/collection?id=${col.id}` as Href)}
              >
                <Image source={{ uri: col.cover_image_url }} style={styles.resultThumb} contentFit="cover" />
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName} numberOfLines={1}>{col.title}</Text>
                  <Text style={styles.resultMeta}>{col.meal_count} meals</Text>
                </View>
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  noResultsText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  findChefsLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  findChefsText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: Colors.background,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 12,
  },
  resultThumb: {
    width: 56,
    height: 56,
    borderRadius: 10,
  },
  resultAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  resultInfo: {
    flex: 1,
  },
  resultName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  resultMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
