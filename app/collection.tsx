import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Alert,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack, Href } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Heart, CalendarPlus, Clock } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows } from '@/constants/theme';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import { DISCOVER_MEALS, COLLECTIONS } from '@/mocks/discover';

export default function CollectionScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { isFav, addFromDiscover } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot } = useMealPlan();

  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const collection = useMemo(() => COLLECTIONS.find((c) => c.id === params.id), [params.id]);

  const meals = useMemo(() => {
    if (params.id === 'all') return DISCOVER_MEALS;
    if (!collection) return [];
    return DISCOVER_MEALS.filter((m) => collection.meal_ids.includes(m.id));
  }, [params.id, collection]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const title = params.id === 'all' ? 'All Collections' : collection?.title ?? 'Collection';

  const handleSave = useCallback((meal: DiscoverMeal) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    addFromDiscover(meal);
    Alert.alert('Saved!', `${meal.name} added to your Favs`);
  }, [addFromDiscover]);

  const handleAddToPlan = useCallback((meal: DiscoverMeal) => {
    setSelectedMeal(meal);
    setSlotPickerVisible(true);
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

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      {collection && (
        <View style={styles.collectionHeader}>
          <Image source={{ uri: collection.cover_image_url }} style={styles.collectionImage} contentFit="cover" />
          <View style={styles.collectionOverlay}>
            <Text style={styles.collectionTitle}>{collection.title}</Text>
            {collection.subtitle && (
              <Text style={styles.collectionSubtitle}>{collection.subtitle}</Text>
            )}
            <Text style={styles.collectionCount}>{collection.meal_count} meals</Text>
          </View>
        </View>
      )}

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <CollectionMealCard
            meal={item}
            isSaved={isFav(item.id)}
            onPress={() => router.push(`/meal-detail?id=${item.id}&source=discover` as Href)}
            onSave={() => handleSave(item)}
            onAddToPlan={() => handleAddToPlan(item)}
          />
        )}
      />

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => { setSlotPickerVisible(false); setSelectedMeal(null); }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealForSlot={getMealForSlot}
        mealName={selectedMeal?.name ?? ''}
      />
    </View>
  );
}

interface CollectionMealCardProps {
  meal: DiscoverMeal;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  onAddToPlan: () => void;
}

const CollectionMealCard = React.memo(function CollectionMealCard({ meal, isSaved, onPress, onSave, onAddToPlan }: CollectionMealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: meal.image_url }} style={styles.cardImage} contentFit="cover" />
          <TouchableOpacity style={styles.savBtn} onPress={onSave}>
            <Heart size={14} color={isSaved ? '#EF4444' : Colors.white} fill={isSaved ? '#EF4444' : 'transparent'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{meal.name}</Text>
          <View style={styles.cardTags}>
            <View style={styles.miniTag}>
              <Clock size={9} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.miniTagText}>{meal.cooking_time_band}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity style={styles.planBtn} onPress={onAddToPlan}>
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
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  collectionHeader: {
    position: 'relative' as const,
    height: 160,
  },
  collectionImage: {
    width: '100%',
    height: '100%',
  },
  collectionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  collectionTitle: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  collectionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  collectionCount: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  gridRow: {
    paddingHorizontal: 12,
    gap: 10,
  },
  gridContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    marginBottom: 10,
    ...Shadows.card,
  },
  cardImageWrap: {
    aspectRatio: 4 / 3,
    position: 'relative' as const,
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  savBtn: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 2,
  },

  cardTags: {
    flexDirection: 'row',
    gap: 4,
  },
  miniTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  miniTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  planBtn: {
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
});
