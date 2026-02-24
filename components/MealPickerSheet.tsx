import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { X, Search, Plus, Utensils, Heart, Star } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows } from '@/constants/theme';
import { PlannedMeal, FavMeal, DiscoverMeal, Ingredient } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { useFavs } from '@/providers/FavsProvider';
import PrimaryButton from './PrimaryButton';

interface MealPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal: (meal: PlannedMeal) => void;
  date: string;
  slotId: string;
  slotName: string;
  defaultServing: number;
}

interface PickerItem {
  id: string;
  name: string;
  image_url?: string;
  ingredients: Ingredient[];
  recipe_serving_size: number;
  source: 'fav' | 'discover';
  badge?: string;
  meta: string;
}

type ListRow =
  | { _type: 'section'; title: string; count: number }
  | { _type: 'meal'; item: PickerItem }
  | { _type: 'section_empty'; message: string }
  | { _type: 'manual' };

function getSlotCategory(slotName: string): 'breakfast' | 'lunch_dinner' | 'light_bites' {
  const lower = slotName.toLowerCase();
  if (lower.includes('breakfast') || lower.includes('morning') || lower.includes('brunch')) {
    return 'breakfast';
  }
  if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('supper') || lower.includes('evening meal')) {
    return 'lunch_dinner';
  }
  return 'light_bites';
}

function getMealCategoryByName(name: string): 'breakfast' | 'lunch_dinner' | 'light_bites' {
  const lower = name.toLowerCase();
  if (
    lower.includes('pancake') || lower.includes('oat') || lower.includes('shakshuka') ||
    lower.includes('breakfast') || lower.includes('granola') || lower.includes('smoothie') ||
    lower.includes('cereal') || lower.includes('porridge') || lower.includes('waffle') ||
    lower.includes('toast') || lower.includes('muesli') || lower.includes('french toast') ||
    lower.includes('eggs benedict') || lower.includes('frittata')
  ) {
    return 'breakfast';
  }
  if (
    lower.includes('salad') || lower.includes('soup') || lower.includes('wrap') ||
    lower.includes('sandwich') || lower.includes('snack') || lower.includes('dip') ||
    lower.includes('bruschetta') || lower.includes('antipasto')
  ) {
    return 'light_bites';
  }
  return 'lunch_dinner';
}

function favToPickerItem(fav: FavMeal): PickerItem {
  return {
    id: `fav_${fav.id}`,
    name: fav.name,
    image_url: fav.image_url,
    ingredients: fav.ingredients,
    recipe_serving_size: fav.recipe_serving_size,
    source: 'fav',
    badge: fav.cuisine,
    meta: `${fav.ingredients.length} ingredients · Serves ${fav.recipe_serving_size}`,
  };
}

function discoverToPickerItem(d: DiscoverMeal): PickerItem {
  return {
    id: `disc_${d.id}`,
    name: d.name,
    image_url: d.image_url,
    ingredients: d.ingredients,
    recipe_serving_size: d.recipe_serving_size,
    source: 'discover',
    badge: d.cuisine,
    meta: `${d.cook_time} min · Serves ${d.recipe_serving_size}`,
  };
}

export default function MealPickerSheet({
  visible,
  onClose,
  onSelectMeal,
  date,
  slotId,
  slotName,
  defaultServing,
}: MealPickerSheetProps) {
  const [search, setSearch] = useState<string>('');
  const [mode, setMode] = useState<'browse' | 'manual'>('browse');
  const [manualName, setManualName] = useState<string>('');
  const { meals: favMeals } = useFavs();

  const slotCategory = useMemo(() => getSlotCategory(slotName), [slotName]);

  const slotCategoryLabel = useMemo(() => {
    switch (slotCategory) {
      case 'breakfast': return 'Breakfast';
      case 'lunch_dinner': return 'Lunch & Dinner';
      case 'light_bites': return 'Light Bites';
    }
  }, [slotCategory]);

  const { filteredFavs, filteredDiscover } = useMemo(() => {
    const q = search.toLowerCase().trim();

    const matchesSearch = (name: string) => !q || name.toLowerCase().includes(q);
    const matchesCategory = (name: string) => getMealCategoryByName(name) === slotCategory;

    const discoverExcludeNames = new Set(favMeals.map((f) => f.name.toLowerCase()));

    let favs = favMeals.filter((m) => matchesSearch(m.name));
    let discover = DISCOVER_MEALS.filter(
      (m) => matchesSearch(m.name) && !discoverExcludeNames.has(m.name.toLowerCase())
    );

    if (!q) {
      const catFavs = favs.filter((m) => matchesCategory(m.name));
      const catDiscover = discover.filter((m) => matchesCategory(m.name));
      if (catFavs.length > 0 || catDiscover.length > 0) {
        favs = catFavs;
        discover = catDiscover;
      }
    }

    return {
      filteredFavs: favs.map(favToPickerItem),
      filteredDiscover: discover.map(discoverToPickerItem),
    };
  }, [search, favMeals, slotCategory]);

  const listData = useMemo((): ListRow[] => {
    const rows: ListRow[] = [];

    rows.push({ _type: 'manual' });

    rows.push({ _type: 'section', title: 'Your Favourites', count: filteredFavs.length });
    if (filteredFavs.length === 0) {
      rows.push({
        _type: 'section_empty',
        message: 'Save meals from Discover to see them here',
      });
    } else {
      filteredFavs.forEach((item) => rows.push({ _type: 'meal', item }));
    }

    rows.push({ _type: 'section', title: 'From Discover', count: filteredDiscover.length });
    if (filteredDiscover.length === 0) {
      rows.push({ _type: 'section_empty', message: 'No matching meals found' });
    } else {
      filteredDiscover.forEach((item) => rows.push({ _type: 'meal', item }));
    }

    return rows;
  }, [filteredFavs, filteredDiscover]);

  const handleSelectItem = useCallback(
    (pickerItem: PickerItem) => {
      const planned: PlannedMeal = {
        id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: slotId,
        date,
        meal_name: pickerItem.name,
        meal_image_url: pickerItem.image_url,
        serving_size: defaultServing,
        ingredients: pickerItem.ingredients,
        recipe_serving_size: pickerItem.recipe_serving_size,
      };
      onSelectMeal(planned);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetAndClose();
    },
    [slotId, date, defaultServing, onSelectMeal]
  );

  const handleAddManual = useCallback(() => {
    if (!manualName.trim()) return;
    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: slotId,
      date,
      meal_name: manualName.trim(),
      serving_size: defaultServing,
      ingredients: [],
      recipe_serving_size: defaultServing,
    };
    onSelectMeal(planned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  }, [manualName, slotId, date, defaultServing, onSelectMeal]);

  const resetAndClose = useCallback(() => {
    setSearch('');
    setMode('browse');
    setManualName('');
    onClose();
  }, [onClose]);

  const renderRow = useCallback(
    ({ item }: { item: ListRow }) => {
      if (item._type === 'manual') {
        return (
          <TouchableOpacity
            style={styles.manualAddBtn}
            onPress={() => setMode('manual')}
            testID="manual-add-btn"
          >
            <View style={styles.manualAddIcon}>
              <Plus size={16} color={Colors.primary} strokeWidth={2.5} />
            </View>
            <Text style={styles.manualAddText}>Add a custom meal</Text>
          </TouchableOpacity>
        );
      }

      if (item._type === 'section') {
        return (
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              {item.title === 'Your Favourites' ? (
                <Heart size={13} color={Colors.primary} strokeWidth={2.5} fill={Colors.primary} />
              ) : (
                <Star size={13} color="#F59E0B" strokeWidth={2.5} fill="#F59E0B" />
              )}
              <Text style={styles.sectionTitle}>{item.title}</Text>
            </View>
            {!search.trim() && (
              <Text style={styles.sectionPill}>{slotCategoryLabel}</Text>
            )}
          </View>
        );
      }

      if (item._type === 'section_empty') {
        return (
          <View style={styles.sectionEmpty}>
            <Text style={styles.sectionEmptyText}>{item.message}</Text>
          </View>
        );
      }

      return <PickerMealRow item={item.item} onPress={() => handleSelectItem(item.item)} />;
    },
    [handleSelectItem, slotCategoryLabel, search]
  );

  const keyExtractor = useCallback((item: ListRow, idx: number) => {
    if (item._type === 'manual') return 'manual';
    if (item._type === 'section') return `section_${item.title}`;
    if (item._type === 'section_empty') return `empty_${idx}`;
    return item.item.id;
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Add to {slotName}</Text>
            <Text style={styles.headerSubtitle}>{date}</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {mode === 'browse' ? (
          <>
            <View style={styles.searchWrap}>
              <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search meals..."
                placeholderTextColor={Colors.textSecondary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                testID="meal-search-input"
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <X size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={listData}
              renderItem={renderRow}
              keyExtractor={keyExtractor}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            />
          </>
        ) : (
          <View style={styles.manualForm}>
            <View style={styles.manualIconWrap}>
              <Utensils size={32} color={Colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.manualLabel}>Meal name</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. Mum's Special Pasta"
              placeholderTextColor={Colors.textSecondary}
              value={manualName}
              onChangeText={setManualName}
              autoCapitalize="words"
              autoFocus
              testID="manual-meal-input"
            />
            <Text style={styles.manualHint}>
              You can add ingredients later from the meal detail screen.
            </Text>
            <View style={styles.manualActions}>
              <PrimaryButton
                label="Add Meal"
                onPress={handleAddManual}
                disabled={!manualName.trim()}
              />
              <TouchableOpacity onPress={() => setMode('browse')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Browse meals instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

interface PickerMealRowProps {
  item: PickerItem;
  onPress: () => void;
}

const PickerMealRow = React.memo(function PickerMealRow({ item, onPress }: PickerMealRowProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.mealItem}
        onPress={onPress}
        onPressIn={() => {
          Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        onPressOut={() => {
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
        }}
        activeOpacity={0.85}
      >
        {item.image_url ? (
          <Image source={{ uri: item.image_url }} style={styles.mealItemImage} contentFit="cover" />
        ) : (
          <View style={[styles.mealItemImage, styles.mealItemImagePlaceholder]}>
            <Utensils size={22} color={Colors.textSecondary} strokeWidth={1.5} />
          </View>
        )}
        <View style={styles.mealItemInfo}>
          <View style={styles.mealItemTopRow}>
            <Text style={styles.mealItemName} numberOfLines={2}>{item.name}</Text>
            {item.source === 'fav' && (
              <Heart size={12} color={Colors.primary} strokeWidth={2.5} fill={Colors.primary} />
            )}
          </View>
          <Text style={styles.mealItemMeta}>{item.meta}</Text>
          {item.badge && (
            <View style={[styles.badge, item.source === 'fav' && styles.badgeFav]}>
              <Text style={[styles.badgeText, item.source === 'fav' && styles.badgeTextFav]}>
                {item.badge}
              </Text>
            </View>
          )}
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
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 10,
  },
  listContent: {
    paddingBottom: 48,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 8,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  sectionPill: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.primary,
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  sectionEmpty: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sectionEmptyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
  },
  manualAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 10,
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  manualAddIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manualAddText: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  mealItem: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    marginHorizontal: 20,
    marginBottom: 8,
    overflow: 'hidden',
    ...Shadows.card,
  },
  mealItemImage: {
    width: 84,
    height: 84,
  },
  mealItemImagePlaceholder: {
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mealItemInfo: {
    flex: 1,
    padding: 10,
    justifyContent: 'center',
  },
  mealItemTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginBottom: 3,
  },
  mealItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 19,
  },
  mealItemMeta: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 5,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeFav: {
    backgroundColor: Colors.primaryLight,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  badgeTextFav: {
    color: Colors.primary,
  },
  manualForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: 'center',
  },
  manualIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  manualLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  manualInput: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  manualHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 18,
  },
  manualActions: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
