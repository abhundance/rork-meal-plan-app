import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Stack, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Search, X, UserPlus, UserCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows } from '@/constants/theme';
import FilterPill from '@/components/FilterPill';
import { Chef } from '@/types';
import { CHEFS } from '@/mocks/discover';

export default function FindChefsScreen() {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>('');
  const [cuisineFilter, setCuisineFilter] = useState<string>('');
  const [following, setFollowing] = useState<Set<string>>(new Set());

  const cuisines = useMemo(() => {
    const set = new Set(CHEFS.map((c) => c.cuisine_focus));
    return Array.from(set);
  }, []);

  const filteredChefs = useMemo(() => {
    let result = [...CHEFS];
    if (query.trim()) {
      const q = query.toLowerCase();
      result = result.filter(
        (c) => c.name.toLowerCase().includes(q) || c.cuisine_focus.toLowerCase().includes(q)
      );
    }
    if (cuisineFilter) {
      result = result.filter((c) => c.cuisine_focus === cuisineFilter);
    }
    return result;
  }, [query, cuisineFilter]);

  const toggleFollow = useCallback((chefId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setFollowing((prev) => {
      const next = new Set(prev);
      if (next.has(chefId)) {
        next.delete(chefId);
      } else {
        next.add(chefId);
      }
      return next;
    });
  }, []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Find Chefs to Follow</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.searchWrap}>
        <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chefs..."
          placeholderTextColor={Colors.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X size={16} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={styles.filterContent}>
        <FilterPill
          label="All"
          active={!cuisineFilter}
          onPress={() => setCuisineFilter('')}
        />
        {cuisines.map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={cuisineFilter === c}
            onPress={() => setCuisineFilter(cuisineFilter === c ? '' : c)}
          />
        ))}
      </ScrollView>

      <FlatList
        data={filteredChefs}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const isFollowing = following.has(item.id);
          return (
            <TouchableOpacity
              style={styles.chefCard}
              onPress={() => router.push(`/chef-profile?id=${item.id}` as Href)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: item.avatar_url }} style={styles.avatar} contentFit="cover" />
              <View style={styles.chefInfo}>
                <Text style={styles.chefName}>{item.name}</Text>
                <Text style={styles.chefMeta}>{item.cuisine_focus} · {item.recipe_count} recipes</Text>
              </View>
              <TouchableOpacity
                style={[styles.followBtn, isFollowing && styles.followBtnActive]}
                onPress={() => toggleFollow(item.id)}
              >
                {isFollowing ? (
                  <UserCheck size={14} color={Colors.white} strokeWidth={2.5} />
                ) : (
                  <UserPlus size={14} color={Colors.primary} strokeWidth={2.5} />
                )}
                <Text style={[styles.followText, isFollowing && styles.followTextActive]}>
                  {isFollowing ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No chefs found</Text>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
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
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    marginHorizontal: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 10,
  },
  filterRow: {
    maxHeight: 44,
    marginTop: 10,
  },
  filterContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  chefCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: 14,
    marginBottom: 10,
    ...Shadows.card,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  chefInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chefName: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chefMeta: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
  },
  followBtnActive: {
    backgroundColor: Colors.primary,
  },
  followText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  followTextActive: {
    color: Colors.white,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
