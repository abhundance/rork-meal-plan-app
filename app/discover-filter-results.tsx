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
import { DISCOVER_MEALS } from '@/mocks/discover';

export default function FilteredMealsScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ cuisine?: string; dietary?: string }>();
  const { isFav, addFromDiscover } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealsForSlot } = useMealPlan();

  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const title = params.cuisine ?? params.dietary ?? 'Meals';

  const meals = useMemo(() => {
    if (params.cuisine) {
      return DISCOVER_MEALS.filter((m) => m.cuisine === params.cuisine);
    }
    if (params.dietary) {
      return DISCOVER_MEALS.filter((m) => m.dietary_tags.includes(params.dietary!));
    }
    return DISCOVER_MEALS;
  }, [params.cuisine, params.dietary]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

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
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 36 }} />
      </View>

      <Text style={styles.resultCount}>{meals.length} meals</Text>

      <FlatList
        data={meals}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <FilteredMealCard
            meal={item}
            isSaved={isFav(item.id)}
            onPress={() => router.push(`/recipe-detail?id=${item.id}&source=discover` as Href)}
            onSave={() => handleSave(item)}
            onAddToPlan={() => handleAddToPlan(item)}
          />
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No meals found for {title}</Text>
          </View>
        }
      />

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => { setSlotPickerVisible(false); setSelectedMeal(null); }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealsForSlot={getMealsForSlot}
        mealName={selectedMeal?.name ?? ''}
      />
    </View>
  );
}

interface FilteredMealCardProps {
  meal: DiscoverMeal;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  onAddToPlan: () => void;
}

const FilteredMealCard = React.memo(function FilteredMealCard({ meal, isSaved, onPress, onSave, onAddToPlan }: FilteredMealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        <View style={styles.cardImageWrap}>
          <Image source={{ uri: meal.image_url }} style={styles.cardImage} contentFit="cover" />
          <TouchableOpacity style={styles.savBtn} onPress={onSave}>
            <View style={styles.heartStack}>
              <View style={styles.heartShadowLayer}>
                <Heart
                  size={16}
                  color="rgba(0,0,0,0.28)"
                  fill="transparent"
                  strokeWidth={3.5}
                />
              </View>
              <Heart
                size={14}
                color={isSaved ? '#EF4444' : '#FFFFFF'}
                fill={isSaved ? '#EF4444' : 'transparent'}
                strokeWidth={2}
              />
            </View>
          </TouchableOpacity>
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={2}>{meal.name}</Text>
          <View style={styles.cardTags}>
            <View style={styles.miniTag}>
              <Text style={styles.miniTagText}>{meal.cuisine}</Text>
            </View>
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
  resultCount: {
    fontSize: 13,
    color: Colors.textSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  gridRow: {
    paddingHorizontal: 12,
    gap: 10,
  },
  gridContent: {
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
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartStack: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartShadowLayer: {
    position: 'absolute' as const,
    top: 0,
    left: 0,
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
  empty: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
  },
});
