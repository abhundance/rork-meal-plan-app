import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  RefreshControl,
  Animated,
  ImageBackground,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import {
  Search,
  Heart,
  CalendarPlus,
  Clock,
  ChevronRight,
  Sparkles,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import FilterPill from '@/components/FilterPill';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import {
  DISCOVER_MEALS,
  COLLECTIONS,
  CUISINE_CATEGORIES,
  CHEFS,
} from '@/mocks/discover';
import { DIETARY_OPTIONS } from '@/types';

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isFav, addFromDiscover, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot } = useMealPlan();

  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const suggestedMeals = useMemo(() => {
    return DISCOVER_MEALS.slice(0, 6);
  }, []);

  const newThisWeek = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return DISCOVER_MEALS.filter(
      (m) => new Date(m.created_at) >= weekAgo
    );
  }, []);

  const handleSaveFav = useCallback((meal: DiscoverMeal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addFromDiscover(meal);
    Alert.alert('Saved!', `${meal.name} added to your Favs`);
  }, [addFromDiscover]);

  const handleAddToPlan = useCallback((meal: DiscoverMeal) => {
    setSelectedMeal(meal);
    setSlotPickerVisible(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleSlotSelected = useCallback(
    (date: string, slotId: string) => {
      if (!selectedMeal) return;
      const planned: PlannedMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: slotId,
        date,
        meal_name: selectedMeal.name,
        meal_image_url: selectedMeal.image_url,
        serving_size: familySettings.default_serving_size,
        ingredients: selectedMeal.ingredients,
        recipe_serving_size: selectedMeal.recipe_serving_size,
      };
      addMeal(planned);
      setSlotPickerVisible(false);
      setSelectedMeal(null);
      const slot = familySettings.meal_slots.find((s) => s.slot_id === slotId);
      Alert.alert('Added!', `${selectedMeal.name} added to ${slot?.name ?? 'plan'}`);
    },
    [selectedMeal, addMeal, familySettings]
  );

  const handleMealPress = useCallback((meal: DiscoverMeal) => {
    router.push(`/meal-detail?id=${meal.id}&source=discover` as Href);
  }, []);

  const handleCollectionPress = useCallback((collectionId: string) => {
    router.push(`/collection?id=${collectionId}` as Href);
  }, []);

  const handleCuisinePress = useCallback((cuisine: string) => {
    router.push(`/filtered-meals?cuisine=${cuisine}` as Href);
  }, []);

  const handleDietaryPress = useCallback((tag: string) => {
    router.push(`/filtered-meals?dietary=${tag}` as Href);
  }, []);

  const handleChefPress = useCallback((chefId: string) => {
    router.push(`/chef-profile?id=${chefId}` as Href);
  }, []);

  const renderDiscoverCard = useCallback(
    (meal: DiscoverMeal, width: number) => {
      const saved = isFav(meal.id);
      return (
        <DiscoverMealCard
          key={meal.id}
          meal={meal}
          width={width}
          isSaved={saved}
          onPress={() => handleMealPress(meal)}
          onSave={() => handleSaveFav(meal)}
          onAddToPlan={() => handleAddToPlan(meal)}
        />
      );
    },
    [isFav, handleMealPress, handleSaveFav, handleAddToPlan]
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <AppHeader title="Discover" />
        </View>
        <TouchableOpacity
          style={styles.searchBtn}
          onPress={() => router.push('/discover-search' as Href)}
          testID="discover-search-btn"
        >
          <Search size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
        }
        testID="discover-scroll"
      >
        <TouchableOpacity
          style={styles.heroBanner}
          onPress={() => handleCollectionPress(COLLECTIONS[0].id)}
          activeOpacity={0.9}
        >
          <ImageBackground
            source={{ uri: COLLECTIONS[0].cover_image_url }}
            style={styles.heroImage}
            imageStyle={styles.heroImageStyle}
          >
            <View style={styles.heroOverlay}>
              <Text style={styles.heroTitle}>{COLLECTIONS[0].title}</Text>
              <Text style={styles.heroSubtitle}>{COLLECTIONS[0].subtitle}</Text>
            </View>
          </ImageBackground>
        </TouchableOpacity>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Suggested For You</Text>
              <Text style={styles.sectionSubtitle}>Based on your Favs</Text>
            </View>
          </View>
          <FlatList
            horizontal
            data={suggestedMeals}
            renderItem={({ item }) => renderDiscoverCard(item, 180)}
            keyExtractor={(item) => `sug_${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>What's Missing This Week</Text>
          </View>
          <TouchableOpacity
            style={styles.missingBanner}
            onPress={() => router.push('/(tabs)/(home)' as Href)}
          >
            <Sparkles size={20} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.missingText}>Start planning your week</Text>
            <ChevronRight size={16} color={Colors.primary} strokeWidth={2} />
          </TouchableOpacity>
          <FlatList
            horizontal
            data={DISCOVER_MEALS.slice(3, 7)}
            renderItem={({ item }) => renderDiscoverCard(item, 180)}
            keyExtractor={(item) => `miss_${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Collections</Text>
            <TouchableOpacity onPress={() => router.push('/collection?id=all' as Href)}>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            horizontal
            data={COLLECTIONS}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.collectionCard}
                onPress={() => handleCollectionPress(item.id)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.cover_image_url }} style={styles.collectionImage} contentFit="cover" />
                <View style={styles.collectionInfo}>
                  <Text style={styles.collectionTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.collectionCount}>{item.meal_count} meals</Text>
                </View>
                {item.is_new && (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New</Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Browse by Cuisine</Text>
          <FlatList
            horizontal
            data={CUISINE_CATEGORIES}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cuisineCard}
                onPress={() => handleCuisinePress(item.name)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image_url }} style={styles.cuisineImage} contentFit="cover" />
                <View style={styles.cuisineOverlay}>
                  <Text style={styles.cuisineName}>{item.name}</Text>
                </View>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dietary Preferences</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dietaryRow}>
            {DIETARY_OPTIONS.filter((d) => d !== 'No Restrictions').map((tag) => (
              <FilterPill
                key={tag}
                label={tag}
                active={false}
                onPress={() => handleDietaryPress(tag)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>New This Week</Text>
          <FlatList
            horizontal
            data={newThisWeek}
            renderItem={({ item }) => renderDiscoverCard(item, 180)}
            keyExtractor={(item) => `new_${item.id}`}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Chefs</Text>
            <TouchableOpacity onPress={() => router.push('/find-chefs' as Href)}>
              <Text style={styles.seeAll}>Find More</Text>
            </TouchableOpacity>
          </View>
          {CHEFS.slice(0, 3).map((chef) => (
            <TouchableOpacity
              key={chef.id}
              style={styles.chefRow}
              onPress={() => handleChefPress(chef.id)}
              activeOpacity={0.8}
            >
              <Image source={{ uri: chef.avatar_url }} style={styles.chefAvatar} contentFit="cover" />
              <View style={styles.chefInfo}>
                <Text style={styles.chefName}>{chef.name}</Text>
                <Text style={styles.chefMeta}>{chef.cuisine_focus} · {chef.recipe_count} recipes</Text>
              </View>
              <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => {
          setSlotPickerVisible(false);
          setSelectedMeal(null);
        }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealForSlot={getMealForSlot}
        mealName={selectedMeal?.name ?? ''}
      />
    </View>
  );
}

interface DiscoverMealCardProps {
  meal: DiscoverMeal;
  width: number;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  onAddToPlan: () => void;
}

const DiscoverMealCard = React.memo(function DiscoverMealCard({
  meal,
  width,
  isSaved,
  onPress,
  onSave,
  onAddToPlan,
}: DiscoverMealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isNew = useMemo(() => {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return new Date(meal.created_at) >= weekAgo;
  }, [meal.created_at]);

  return (
    <Animated.View style={[styles.mealCard, { width, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        <View style={styles.mealImageWrap}>
          <Image source={{ uri: meal.image_url }} style={styles.mealImage} contentFit="cover" />
          <TouchableOpacity style={styles.saveFavBtn} onPress={onSave}>
            <Heart
              size={16}
              color={isSaved ? Colors.primary : Colors.white}
              fill={isSaved ? Colors.primary : 'transparent'}
              strokeWidth={2}
            />
          </TouchableOpacity>
          {isNew && (
            <View style={styles.newTag}>
              <Text style={styles.newTagText}>New</Text>
            </View>
          )}
        </View>
        <View style={styles.mealCardBody}>
          <Text style={styles.mealCardName} numberOfLines={2}>{meal.name}</Text>
          <TouchableOpacity onPress={() => router.push(`/chef-profile?id=${meal.chef_id}` as Href)}>
            <Text style={styles.mealCardChef}>{meal.chef_name}</Text>
          </TouchableOpacity>
          <View style={styles.mealCardTags}>
            <View style={styles.mealMiniTag}>
              <Text style={styles.mealMiniTagText}>{meal.cuisine}</Text>
            </View>
            <View style={styles.mealMiniTag}>
              <Clock size={9} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.mealMiniTagText}>{meal.cooking_time_band}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.mealPlanBtn} onPress={onAddToPlan}>
        <CalendarPlus size={12} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  scroll: {
    flex: 1,
  },
  heroBanner: {
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 7,
    justifyContent: 'flex-end',
  },
  heroImageStyle: {
    borderRadius: BorderRadius.card,
  },
  heroOverlay: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
    borderBottomLeftRadius: BorderRadius.card,
    borderBottomRightRadius: BorderRadius.card,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  horizontalList: {
    paddingRight: 16,
    gap: 12,
  },
  missingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  missingText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mealCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealImageWrap: {
    aspectRatio: 4 / 3,
    position: 'relative' as const,
  },
  mealImage: {
    width: '100%',
    height: '100%',
  },
  saveFavBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newTag: {
    position: 'absolute' as const,
    top: 8,
    left: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newTagText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  mealCardBody: {
    padding: 10,
  },
  mealCardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },
  mealCardChef: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500' as const,
    marginBottom: 4,
  },
  mealCardTags: {
    flexDirection: 'row',
    gap: 4,
  },
  mealMiniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  mealMiniTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mealPlanBtn: {
    position: 'absolute' as const,
    bottom: 10,
    right: 10,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collectionCard: {
    width: 220,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  collectionImage: {
    width: '100%',
    aspectRatio: 3 / 2,
  },
  collectionInfo: {
    padding: 10,
  },
  collectionTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  collectionCount: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  newBadge: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  cuisineCard: {
    width: 140,
    height: 90,
    borderRadius: BorderRadius.button,
    overflow: 'hidden',
  },
  cuisineImage: {
    width: '100%',
    height: '100%',
  },
  cuisineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuisineName: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  dietaryRow: {
    gap: 8,
    paddingVertical: 8,
  },
  chefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    padding: 12,
    marginBottom: 8,
    ...Shadows.card,
  },
  chefAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  chefInfo: {
    flex: 1,
    marginLeft: 12,
  },
  chefName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  chefMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});
