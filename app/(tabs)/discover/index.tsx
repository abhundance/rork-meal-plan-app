import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  FlatList,
  StyleSheet,
  Animated,
  Modal,
  Dimensions,
  TextInput,
  Image,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import AppHeader from '@/components/AppHeader';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import { useDiscoverRecommendations } from '@/hooks/useDiscoverRecommendations';
import { Ionicons } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');

// Occasion chips — tap to narrow carousels to a specific meal type.
// mealType maps directly to the meal_type field in DiscoverMeal.
// Lunch and Dinner share 'lunch_dinner' until the data model distinguishes them.
const OCCASION_CHIPS = [
  { emoji: '🍳', label: 'Breakfast',      mealType: 'breakfast'    },
  { emoji: '🥗', label: 'Lunch & Dinner', mealType: 'lunch_dinner' },
  { emoji: '🫙', label: 'Light Bites',    mealType: 'light_bites'  },
];

import DiscoverCarouselCard, { CAROUSEL_CARD_WIDTH, CAROUSEL_CARD_HEIGHT } from '@/components/DiscoverCarouselCard';

const _GRID_CARD_WIDTH = (screenWidth - 48) / 3;

export default function DiscoverScreen() {
  const insets = useSafeAreaInsets();
  const { isFav, addFromDiscover, removeFav } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal, getMealsForSlot } = useMealPlan();

  const [, setInitialLoading] = useState<boolean>(true);
  useEffect(() => {
    const t = setTimeout(() => setInitialLoading(false), 500);
    return () => clearTimeout(t);
  }, []);

  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [selectedMeal, setSelectedMeal] = useState<DiscoverMeal | null>(null);

  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const [searchQuery, setSearchQuery] = useState<string>('');
  // null = show all occasions; a mealType string = filter carousels to that type
  const [activeOccasion, setActiveOccasion] = useState<string | null>(null);
  const [actionMeal, setActionMeal] = useState<DiscoverMeal | null>(null);
  const [actionSheetVisible, setActionSheetVisible] = useState<boolean>(false);

  const showToast = useCallback((message: string) => {
    setToastMsg(message);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start(() => setToastMsg(null));
  }, [toastAnim]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const handleSaveFav = useCallback(
    (meal: DiscoverMeal) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isFav(meal.id)) {
        removeFav(meal.id);
      } else {
        addFromDiscover(meal);
        showToast(`${meal.name} added to Favs`);
      }
    },
    [isFav, addFromDiscover, removeFav, showToast]
  );

  const handleAddToPlan = useCallback((meal: DiscoverMeal) => {
    setSelectedMeal(meal);
    setSlotPickerVisible(true);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      showToast(`${selectedMeal?.name} added to your meal plan`);
    },
    [selectedMeal, addMeal, familySettings, showToast]
  );

  const handleMealPress = useCallback((meal: DiscoverMeal) => {
    router.push(`/recipe-detail?id=${meal.id}&source=discover` as Href);
  }, []);

  const handleCardPress = useCallback((meal: DiscoverMeal) => {
    setActionMeal(meal);
    setActionSheetVisible(true);
  }, []);

  const { carousels, recordInteraction, recordView } = useDiscoverRecommendations();

  // When an occasion is selected, narrow each carousel to matching meal_type
  // and drop carousels that end up empty. When null, show everything.
  const filteredCarousels = useMemo(() => {
    if (!activeOccasion) return carousels;
    return carousels
      .map(carousel => ({
        ...carousel,
        meals: carousel.meals.filter(m => m.meal_type === activeOccasion),
      }))
      .filter(carousel => carousel.meals.length > 0);
  }, [carousels, activeOccasion]);

  const MealActionSheet = useCallback(({ visible, meal, onClose }: { visible: boolean; meal: DiscoverMeal | null; onClose: () => void }) => {
    if (!meal) return null;
    const saved = isFav(meal.id);
    const timeLabel = meal.cook_time ? meal.cook_time + 'm' : meal.prep_time ? meal.prep_time + 'm' : '?';
    return (
      <Modal
        visible={visible}
        transparent
        animationType="slide"
        presentationStyle="overFullScreen"
        onRequestClose={onClose}
      >
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={onClose} />
        <View style={{ backgroundColor: Colors.card, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 32 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginTop: 12, marginBottom: 16 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', marginRight: 12 }}>
              {meal.image_url ? (
                <Image source={{ uri: meal.image_url }} style={{ width: 52, height: 52 }} resizeMode="cover" />
              ) : (
                <MealImagePlaceholder size="thumbnail" mealType={meal.meal_type} cuisine={meal.cuisine} name={meal.name} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 }} numberOfLines={2}>
                {meal.name}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {meal.cuisine && (
                  <View style={{ backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 }}>
                    <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>{meal.cuisine}</Text>
                  </View>
                )}
                <Text style={{ fontSize: 12, color: Colors.textSecondary }}>{timeLabel}</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => { handleAddToPlan(meal); onClose(); }}
            style={{ backgroundColor: Colors.primary, borderRadius: 12, height: 50, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>Add to Meal Plan</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={() => { handleSaveFav(meal); onClose(); }}
              style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6 }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: saved ? Colors.primary : Colors.textSecondary }}>
                {saved ? '♥ Saved' : '♡ Save'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { handleMealPress(meal); onClose(); }}
              style={{ flex: 1, backgroundColor: Colors.surface, borderRadius: 12, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.textSecondary }}>View recipe</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }, [isFav, handleAddToPlan, handleSaveFav, handleMealPress]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="Discover" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="discover-scroll"
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: '#F3F4F6',
            borderRadius: 12,
            height: 44,
            paddingHorizontal: 12,
          }}>
            <Ionicons name="search" size={17} color={Colors.textSecondary} style={{ marginRight: 7 }} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search recipes…"
              placeholderTextColor={Colors.textSecondary}
              style={{
                flex: 1,
                fontSize: 15,
                color: Colors.text,
              }}
            />
          </View>
        </View>

        {/* Household dietary indicator — shown when family prefs are set in Family Settings */}
        {(() => {
          const activePrefs = familySettings.dietary_preferences_family.filter(p => p !== 'No Restrictions');
          if (activePrefs.length === 0) return null;
          return (
            <TouchableOpacity
              onPress={() => router.push('/family-settings' as Href)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: 16,
                marginBottom: 10,
                backgroundColor: Colors.primaryLight,
                borderRadius: 10,
                paddingVertical: 8,
                paddingHorizontal: 12,
              }}
            >
              <Ionicons name="shield-checkmark" size={14} color={Colors.primary} style={{ marginRight: 6 }} />
              <Text style={{ flex: 1, fontSize: 13, color: Colors.textSecondary }} numberOfLines={1}>
                <Text style={{ fontWeight: '600', color: Colors.primary }}>Household filter: </Text>
                {activePrefs.join(' · ')}
              </Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary, marginLeft: 8 }}>Edit</Text>
              <Ionicons name="chevron-forward" size={13} color={Colors.primary} style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          );
        })()}

        <View style={{ paddingBottom: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ height: 46 }}
            contentContainerStyle={{ paddingHorizontal: 16, alignItems: 'center' }}
          >
            {OCCASION_CHIPS.map(chip => {
              const active = activeOccasion === chip.mealType;
              return (
                <TouchableOpacity
                  key={chip.mealType}
                  onPress={() =>
                    setActiveOccasion(prev => prev === chip.mealType ? null : chip.mealType)
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 16,
                    paddingVertical: 9,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: active ? Colors.primary : Colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 14, color: active ? '#FFFFFF' : Colors.textSecondary, fontWeight: active ? '600' : '400' }}>
                    {chip.emoji} {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {filteredCarousels.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="compass-outline" size={64} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>
              {activeOccasion
                ? `No ${OCCASION_CHIPS.find(c => c.mealType === activeOccasion)?.label ?? ''} recipes yet`
                : 'Discovering your taste'}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeOccasion
                ? 'Try a different occasion or clear the filter to see all recipes'
                : 'Add meals to your plan and we will personalise your picks'}
            </Text>
          </View>
        ) : (
          filteredCarousels.map((carousel, index) => (
            <View key={carousel.id} style={{ marginBottom: 16, ...(index === 0 ? { marginTop: 20 } : {}) }}>
              <View style={styles.carouselHeader}>
                <Text style={styles.carouselTitle}>{carousel.emoji} {carousel.title}</Text>
                <TouchableOpacity>
                  <Text style={styles.carouselSeeAll}>See all</Text>
                </TouchableOpacity>
              </View>
              {carousel.subtitle ? (
                <Text style={styles.carouselSubtitle}>{carousel.subtitle}</Text>
              ) : null}
              <View style={{ height: CAROUSEL_CARD_HEIGHT }}>
                <FlatList
                  horizontal
                  data={carousel.meals}
                  keyExtractor={item => `${carousel.id}-${item.id}`}
                  renderItem={({ item }) => (
                    <DiscoverCarouselCard
                      meal={item}
                      onPress={() => {
                        recordInteraction({ meal_id: item.id, event_type: 'carousel_tap', metadata: { carousel_id: carousel.id } });
                        recordView(item.id);
                        handleMealPress(item);
                      }}
                      onLongPress={() => handleCardPress(item)}
                      width={CAROUSEL_CARD_WIDTH}
                      height={CAROUSEL_CARD_HEIGHT}
                    />
                  )}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16, paddingRight: 16 }}
                  ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                />
              </View>
            </View>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <MealActionSheet
        visible={actionSheetVisible}
        meal={actionMeal}
        onClose={() => { setActionSheetVisible(false); setActionMeal(null); }}
      />

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => {
          setSlotPickerVisible(false);
          setSelectedMeal(null);
        }}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealsForSlot={getMealsForSlot}
        mealName={selectedMeal?.name ?? ''}
      />

      {toastMsg !== null && (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 90,
            alignSelf: 'center',
            opacity: toastAnim,
            transform: [{
              translateY: toastAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [10, 0],
              }),
            }],
            backgroundColor: '#111827',
            borderRadius: 12,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            maxWidth: 320,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.18,
            shadowRadius: 12,
            elevation: 8,
          }}
        >
          <Check size={15} color="#FFFFFF" />
          <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', flexShrink: 1 }}>
            {toastMsg}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  emptyContainer: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: '#111827',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: '#6B7280',
    textAlign: 'center' as const,
    marginTop: 8,
    lineHeight: 22,
  },
  carouselHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  carouselTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#111827',
  },
  carouselSeeAll: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: '#7C3AED',
  },
  carouselSubtitle: {
    fontSize: 14,
    fontWeight: '400' as const,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
});
