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
import { ArrowLeft, Heart, CalendarPlus, Clock, UserPlus, UserCheck } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows } from '@/constants/theme';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import { CHEFS, DISCOVER_MEALS } from '@/mocks/discover';

export default function ChefProfileScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string }>();
  const { isFav, addFromDiscover } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealForSlot } = useMealPlan();

  const [following, setFollowing] = useState<boolean>(false);
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const chef = useMemo(() => CHEFS.find((c) => c.id === params.id), [params.id]);
  const chefMeals = useMemo(
    () => DISCOVER_MEALS.filter((m) => m.chef_id === params.id),
    [params.id]
  );

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const handleFollow = useCallback(() => {
    setFollowing((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

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

  if (!chef) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Chef not found</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />

      <FlatList
        data={chefMeals}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <View style={styles.bannerWrap}>
              {chef.banner_url ? (
                <Image source={{ uri: chef.banner_url }} style={styles.banner} contentFit="cover" />
              ) : (
                <View style={[styles.banner, { backgroundColor: Colors.surface }]} />
              )}
              <TouchableOpacity
                style={[styles.backBtn, { top: insets.top + 8 }]}
                onPress={() => router.back()}
              >
                <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
              </TouchableOpacity>
            </View>

            <View style={styles.profileSection}>
              <Image source={{ uri: chef.avatar_url }} style={styles.avatar} contentFit="cover" />
              <Text style={styles.chefName}>{chef.name}</Text>
              <Text style={styles.chefFocus}>{chef.cuisine_focus} · {chef.recipe_count} recipes</Text>
              <Text style={styles.chefBio}>{chef.bio}</Text>

              <TouchableOpacity
                style={[styles.followBtn, following && styles.followBtnActive]}
                onPress={handleFollow}
              >
                {following ? (
                  <UserCheck size={16} color={Colors.white} strokeWidth={2} />
                ) : (
                  <UserPlus size={16} color={Colors.primary} strokeWidth={2} />
                )}
                <Text style={[styles.followText, following && styles.followTextActive]}>
                  {following ? 'Following' : 'Follow'}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.recipesTitle}>Recipes</Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChefMealCard
            meal={item}
            isSaved={isFav(item.id)}
            onPress={() => router.push(`/recipe-detail?id=${item.id}&source=discover` as Href)}
            onSave={() => handleSave(item)}
            onAddToPlan={() => handleAddToPlan(item)}
          />
        )}
        contentContainerStyle={styles.listContent}
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

interface ChefMealCardProps {
  meal: DiscoverMeal;
  isSaved: boolean;
  onPress: () => void;
  onSave: () => void;
  onAddToPlan: () => void;
}

const ChefMealCard = React.memo(function ChefMealCard({ meal, isSaved, onPress, onSave, onAddToPlan }: ChefMealCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={[styles.mealCard, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.mealCardInner}
        activeOpacity={0.85}
        onPress={onPress}
        onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
        onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()}
      >
        <Image source={{ uri: meal.image_url }} style={styles.mealThumb} contentFit="cover" />
        <View style={styles.mealInfo}>
          <Text style={styles.mealName} numberOfLines={1}>{meal.name}</Text>
          <View style={styles.mealTags}>
            <View style={styles.miniTag}>
              <Text style={styles.miniTagText}>{meal.cuisine}</Text>
            </View>
            <View style={styles.miniTag}>
              <Clock size={10} color={Colors.primary} strokeWidth={2} />
              <Text style={styles.miniTagText}>{meal.cooking_time_band}</Text>
            </View>
          </View>
        </View>
        <View style={styles.mealActions}>
          <TouchableOpacity onPress={onSave} style={styles.actionBtn}>
            <Heart size={16} color={Colors.primary} fill={isSaved ? Colors.primary : 'transparent'} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onAddToPlan} style={styles.actionBtnPrimary}>
            <CalendarPlus size={14} color={Colors.white} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  bannerWrap: {
    position: 'relative' as const,
  },
  banner: {
    width: '100%',
    height: 180,
  },
  backBtn: {
    position: 'absolute' as const,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  profileSection: {
    alignItems: 'center',
    marginTop: -40,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: Colors.background,
  },
  chefName: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 10,
  },
  chefFocus: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  chefBio: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 21,
    textAlign: 'center' as const,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
  },
  followBtnActive: {
    backgroundColor: Colors.primary,
  },
  followText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  followTextActive: {
    color: Colors.white,
  },
  recipesTitle: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  listContent: {
    paddingBottom: 100,
  },
  mealCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealThumb: {
    width: 80,
    height: 80,
  },
  mealInfo: {
    flex: 1,
    padding: 10,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  mealTags: {
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
  mealActions: {
    flexDirection: 'row',
    gap: 6,
    paddingRight: 10,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnPrimary: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  backLink: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
