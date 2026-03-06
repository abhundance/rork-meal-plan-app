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
import { Ionicons } from '@expo/vector-icons';
import { Check } from 'lucide-react-native';
import Colors from '@/constants/colors';
import AppHeader from '@/components/AppHeader';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { DiscoverMeal, PlannedMeal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';

const { width: screenWidth } = Dimensions.get('window');

const DIET_CHIPS = [
  { emoji: '🌱', label: 'Vegan', key: 'vegan' },
  { emoji: '🥦', label: 'Vegetarian', key: 'vegetarian' },
  { emoji: '🌾', label: 'Gluten-Free', key: 'gluten_free' },
];

const CAROUSEL_CARD_WIDTH = 110;
const CAROUSEL_CARD_HEIGHT = 148;
const GRID_CARD_WIDTH = (screenWidth - 48) / 3;

type CinemaCardProps = {
  meal: DiscoverMeal;
  onPress: () => void;
  onHeartPress: () => void;
  heartActive: boolean;
  width: number;
  height: number;
};

const CinemaCard = React.memo(function CinemaCard({ meal, onPress, onHeartPress, heartActive, width, height }: CinemaCardProps) {
  const timeLabel = meal.cook_time ? `${meal.cook_time}m` : meal.prep_time ? `${meal.prep_time}m` : '?';

  return (
    <Pressable
      onPress={onPress}
      style={[styles.cinemaCard, { width, height }]}
    >
      <View style={StyleSheet.absoluteFill}>
        {meal.image_url ? (
          <Image
            source={{ uri: meal.image_url }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <MealImagePlaceholder
            size="thumbnail"
            mealType={meal.meal_type}
            cuisine={meal.cuisine}
            name={meal.name}
          />
        )}
      </View>

      <View style={[styles.cinemaOverlay1, { width }]} />
      <View style={[styles.cinemaOverlay2, { width }]} />

      <View style={[styles.cinemaBottom, { width }]}>
        <Text style={styles.cinemaName} numberOfLines={2}>{meal.name}</Text>
        <Text style={styles.cinemaTime}>{timeLabel}</Text>
      </View>

      <Pressable
        onPress={onHeartPress}
        hitSlop={8}
        style={styles.cinemaHeart}
      >
        <Ionicons
          name={heartActive ? 'heart' : 'heart-outline'}
          size={13}
          color={heartActive ? '#FF6B8A' : '#FFFFFF'}
        />
      </Pressable>
    </Pressable>
  );
});

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
  const [activeDietPrefs, setActiveDietPrefs] = useState<string[]>([]);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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

  const isExcluded = useCallback((meal: DiscoverMeal): boolean => {
    if (activeDietPrefs.length === 0) return false;
    if (activeDietPrefs.includes('vegan') && !meal.is_vegan) return true;
    if (activeDietPrefs.includes('vegetarian') && !meal.is_vegetarian) return true;
    if (activeDietPrefs.includes('gluten_free') && !meal.is_gluten_free) return true;
    return false;
  }, [activeDietPrefs]);

  const filteredMeals = useCallback((meals: DiscoverMeal[]): DiscoverMeal[] => {
    return meals.filter(m =>
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.cuisine && m.cuisine.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [searchQuery]);

  const rows = useMemo(() => [
    {
      emoji: '⚡',
      label: 'Under 20 min',
      meals: filteredMeals(DISCOVER_MEALS.filter(m => m.cooking_time_band === 'Under 30')).filter(m => !isExcluded(m)),
    },
    {
      emoji: '🌅',
      label: 'Breakfast',
      meals: filteredMeals(DISCOVER_MEALS.filter(m => m.meal_type === 'breakfast')).filter(m => !isExcluded(m)),
    },
    {
      emoji: '🌏',
      label: 'Asian flavours',
      meals: filteredMeals(DISCOVER_MEALS.filter(m => ['Japanese', 'Thai', 'Korean'].includes(m.cuisine))).filter(m => !isExcluded(m)),
    },
    {
      emoji: '🌶',
      label: 'Indian kitchen',
      meals: filteredMeals(DISCOVER_MEALS.filter(m => m.cuisine === 'Indian')).filter(m => !isExcluded(m)),
    },
    {
      emoji: '🥗',
      label: 'Light bites',
      meals: filteredMeals(DISCOVER_MEALS.filter(m => m.meal_type === 'light_bites')).filter(m => !isExcluded(m)),
    },
  ], [filteredMeals, isExcluded]);

  const allFiltered = useMemo(() => filteredMeals(DISCOVER_MEALS).filter(m => !isExcluded(m)), [filteredMeals, isExcluded]);

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

  const renderCarouselItem = useCallback(({ item }: { item: DiscoverMeal }) => (
    <CinemaCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onHeartPress={() => handleSaveFav(item)}
      heartActive={isFav(item.id)}
      width={CAROUSEL_CARD_WIDTH}
      height={CAROUSEL_CARD_HEIGHT}
    />
  ), [handleMealPress, handleSaveFav, isFav]);

  const renderGridItem = useCallback(({ item }: { item: DiscoverMeal }) => (
    <CinemaCard
      meal={item}
      onPress={() => handleMealPress(item)}
      onHeartPress={() => handleSaveFav(item)}
      heartActive={isFav(item.id)}
      width={GRID_CARD_WIDTH}
      height={GRID_CARD_WIDTH * 1.28}
    />
  ), [handleMealPress, handleSaveFav, isFav]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="Discover" />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        testID="discover-scroll"
      >
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search recipes…"
            placeholderTextColor={Colors.textSecondary}
            style={{
              backgroundColor: '#F3F4F6',
              borderRadius: 12,
              height: 44,
              paddingHorizontal: 14,
              fontSize: 15,
              color: Colors.text,
            }}
          />
        </View>

        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.8, marginBottom: 8 }}>
            MY PREFERENCES
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ height: 40 }}>
            {DIET_CHIPS.map(chip => {
              const active = activeDietPrefs.includes(chip.key);
              return (
                <TouchableOpacity
                  key={chip.key}
                  onPress={() =>
                    setActiveDietPrefs(prev =>
                      prev.includes(chip.key) ? prev.filter(k => k !== chip.key) : [...prev, chip.key]
                    )
                  }
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 14,
                    paddingVertical: 8,
                    borderRadius: 20,
                    marginRight: 8,
                    backgroundColor: active ? Colors.primary : Colors.surface,
                  }}
                >
                  <Text style={{ fontSize: 13, color: active ? '#FFFFFF' : Colors.textSecondary }}>
                    {chip.emoji} {chip.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {searchQuery === '' ? (
          <>
            {rows.map(row => {
              if (row.meals.length === 0) return null;
              return (
                <View key={row.label} style={{ paddingHorizontal: 16, marginBottom: 24 }}>
                  <Text style={{ fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 10 }}>
                    {row.emoji} {row.label}
                  </Text>
                  <View style={{ height: 160 }}>
                    <FlatList
                      horizontal
                      data={row.meals}
                      keyExtractor={item => item.id}
                      renderItem={renderCarouselItem}
                      showsHorizontalScrollIndicator={false}
                      ItemSeparatorComponent={() => <View style={{ width: 8 }} />}
                    />
                  </View>
                </View>
              );
            })}

            <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 12 }}>
                ALL RECIPES
              </Text>
              <FlatList
                data={allFiltered}
                numColumns={3}
                columnWrapperStyle={{ gap: 8 }}
                keyExtractor={item => 'grid-' + item.id}
                renderItem={renderGridItem}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
              />
            </View>
          </>
        ) : (
          <View style={{ paddingHorizontal: 16, marginTop: 8, marginBottom: 24 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: Colors.textSecondary, letterSpacing: 0.5, marginBottom: 12 }}>
              {'RESULTS FOR "' + searchQuery + '"'}
            </Text>
            {allFiltered.length === 0 ? (
              <Text style={{ fontSize: 15, color: Colors.textSecondary, textAlign: 'center', marginTop: 40 }}>
                No recipes found
              </Text>
            ) : (
              <FlatList
                data={allFiltered}
                numColumns={3}
                columnWrapperStyle={{ gap: 8 }}
                keyExtractor={item => 'search-' + item.id}
                renderItem={renderGridItem}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                scrollEnabled={false}
              />
            )}
          </View>
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
  cinemaCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1C1C2E',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  cinemaOverlay1: {
    position: 'absolute',
    bottom: 0,
    height: 70,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  cinemaOverlay2: {
    position: 'absolute',
    bottom: 0,
    height: 44,
    backgroundColor: 'rgba(0,0,0,0.44)',
  },
  cinemaBottom: {
    position: 'absolute',
    bottom: 0,
    paddingHorizontal: 7,
    paddingBottom: 7,
  },
  cinemaName: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 13,
    marginBottom: 2,
  },
  cinemaTime: {
    fontSize: 9,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  cinemaHeart: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
