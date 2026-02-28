import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { X, Utensils, Heart, Search } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { BorderRadius } from '@/constants/theme';
import { PlannedMeal, Meal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import PrimaryButton from './PrimaryButton';

interface MealPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal: (meal: PlannedMeal) => void;
  onCreateNewRecipe: () => void;
  date: string;
  slotId: string;
  slotName: string;
  defaultServing: number;
  editingDeliveryMeal?: PlannedMeal;
}

export default function MealPickerSheet({
  visible,
  onClose,
  onSelectMeal,
  onCreateNewRecipe,
  date,
  slotId,
  slotName,
  defaultServing,
  editingDeliveryMeal,
}: MealPickerSheetProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'delivery'>('choose');
  const [manualName, setManualName] = useState<string>('');
  const [deliveryName, setDeliveryName] = useState<string>('');
  const [deliveryUrl, setDeliveryUrl] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [saveToMyMeals, setSaveToMyMeals] = useState<boolean>(false);
  const { meals: favMeals, addFav } = useFavs();
  const { updatePlannedMealDelivery } = useMealPlan();
  const router = useRouter();

  const isEditingDelivery = !!editingDeliveryMeal;

  useEffect(() => {
    if (editingDeliveryMeal) {
      setMode('delivery');
      setDeliveryName(editingDeliveryMeal.meal_name);
      setDeliveryUrl(editingDeliveryMeal.delivery_url ?? '');
    }
  }, [editingDeliveryMeal]);

  const formattedDate = useMemo(() => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  const filteredFavMeals = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return favMeals.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.cuisine && m.cuisine.toLowerCase().includes(q)) ||
        m.ingredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }, [searchQuery, favMeals]);

  const handleAddManual = useCallback(() => {
    if (!manualName.trim()) return;
    const newMealId = saveToMyMeals
      ? `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      : undefined;
    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: slotId,
      date,
      meal_name: manualName.trim(),
      serving_size: defaultServing,
      ingredients: [],
      recipe_serving_size: defaultServing,
      ...(newMealId ? { meal_id: newMealId } : {}),
    };
    onSelectMeal(planned);
    if (saveToMyMeals && newMealId) {
      const favMeal: Meal = {
        id: newMealId,
        name: manualName.trim(),
        source: 'family_created',
        ingredients: [],
        recipe_serving_size: defaultServing,
        is_ingredient_complete: false,
        is_recipe_complete: false,
        dietary_tags: [],
        custom_tags: [],
        method_steps: [],
        add_to_plan_count: 0,
        created_at: new Date().toISOString(),
      };
      addFav(favMeal);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  }, [manualName, slotId, date, defaultServing, onSelectMeal, saveToMyMeals, addFav]);

  const resetAndClose = useCallback(() => {
    setMode('choose');
    setManualName('');
    setDeliveryName('');
    setDeliveryUrl('');
    setSearchQuery('');
    setSaveToMyMeals(false);
    onClose();
  }, [onClose]);

  const handleDeliverySave = useCallback(() => {
    if (!deliveryName.trim()) return;
    const trimmedUrl = deliveryUrl.trim();
    if (isEditingDelivery) {
      updatePlannedMealDelivery(editingDeliveryMeal!.id, {
        meal_name: deliveryName.trim(),
        delivery_url: trimmedUrl || undefined,
        delivery_platform: trimmedUrl ? (detectPlatformFromUrl(trimmedUrl) ?? undefined) : undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetAndClose();
      return;
    }
    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: slotId,
      date,
      meal_name: deliveryName.trim(),
      serving_size: defaultServing,
      ingredients: [],
      recipe_serving_size: defaultServing,
      is_delivery: true,
      delivery_url: trimmedUrl || undefined,
      delivery_platform: trimmedUrl ? (detectPlatformFromUrl(trimmedUrl) ?? undefined) : undefined,
    };
    onSelectMeal(planned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  }, [deliveryName, deliveryUrl, slotId, date, defaultServing, onSelectMeal, resetAndClose, isEditingDelivery, editingDeliveryMeal, updatePlannedMealDelivery]);

  const handleSelectFavMeal = useCallback((meal: Meal) => {
    const planned: import('@/types').PlannedMeal = {
      id: 'meal_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      slot_id: slotId,
      date,
      meal_name: meal.name,
      meal_image_url: meal.image_url,
      serving_size: defaultServing,
      ingredients: meal.ingredients ?? [],
      recipe_serving_size: meal.recipe_serving_size ?? defaultServing,
      meal_id: meal.id,
    };
    onSelectMeal(planned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  }, [slotId, date, defaultServing, onSelectMeal, resetAndClose]);

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
          {mode === 'manual' || mode === 'delivery' ? (
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.closeBtn} testID="back-to-choose-btn">
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.closeBtn} />
          )}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>
              {mode === 'delivery' ? 'Add from Delivery App' : `Add to ${slotName}`}
            </Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {mode === 'delivery' ? (
          <ScrollView
            style={styles.chooseScroll}
            contentContainerStyle={styles.deliveryScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.deliverySectionLabel}>MEAL NAME</Text>
            <TextInput
              style={styles.deliveryInput}
              placeholder="e.g. Butter Chicken from Spice Garden"
              placeholderTextColor={Colors.textSecondary}
              value={deliveryName}
              onChangeText={setDeliveryName}
              autoCapitalize="words"
              autoFocus
              testID="delivery-name-input"
            />

            <Text style={[styles.deliverySectionLabel, { marginTop: 20 }]}>DELIVERY LINK (OPTIONAL)</Text>
            <View style={styles.deliveryLinkRow}>
              <TextInput
                style={styles.deliveryLinkInput}
                placeholder="Paste Uber Eats, Zomato, Grab link..."
                placeholderTextColor={Colors.textSecondary}
                value={deliveryUrl}
                onChangeText={setDeliveryUrl}
                keyboardType="url"
                autoCapitalize="none"
                autoCorrect={false}
                testID="delivery-url-input"
              />
              <TouchableOpacity
                style={styles.deliveryClipboardBtn}
                onPress={async () => {
                  const text = await Clipboard.getStringAsync();
                  if (text) setDeliveryUrl(text);
                }}
                testID="delivery-clipboard-btn"
              >
                <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>

            {deliveryUrl.trim().length > 0 && (
              <View style={styles.deliveryPlatformChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.deliveryPlatformText}>
                  {getPlatformLabel(detectPlatformFromUrl(deliveryUrl.trim()))} detected
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.deliverySaveBtn,
                { opacity: deliveryName.trim().length === 0 ? 0.4 : 1 },
              ]}
              onPress={handleDeliverySave}
              disabled={deliveryName.trim().length === 0}
              testID="delivery-save-btn"
            >
              <Text style={styles.deliverySaveBtnText}>Save to Meal Plan</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : mode === 'choose' ? (
          <>
            <View style={styles.searchBar}>
              <Search size={16} color={Colors.textSecondary} strokeWidth={2} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search your saved meals..."
                placeholderTextColor={Colors.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
                testID="meal-picker-search"
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <X size={16} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView
              style={styles.chooseScroll}
              contentContainerStyle={styles.chooseScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {searchQuery.trim().length > 0 ? (
                <>
                  <Text style={styles.searchSectionLabel}>FROM YOUR LIBRARY</Text>
                  {filteredFavMeals.length === 0 ? (
                    <View style={styles.searchEmptyState}>
                      <Search size={36} color={Colors.textSecondary} strokeWidth={1.5} />
                      <Text style={styles.searchEmptyText}>No saved meals match "{searchQuery}"</Text>
                      <TouchableOpacity onPress={() => { onClose(); router.push('/(tabs)/discover'); }} testID="browse-discover-from-search-btn">
                        <Text style={styles.searchEmptyDiscoverBtn}>Browse Discover meals</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    filteredFavMeals.map((meal, index) => (
                      <TouchableOpacity
                        key={meal.id}
                        style={[styles.searchResultRow, index < filteredFavMeals.length - 1 && styles.searchResultRowBorder]}
                        activeOpacity={0.82}
                        onPress={() => handleSelectFavMeal(meal)}
                        testID={'search-result-' + meal.id}
                      >
                        <View style={styles.searchResultImage}>
                          {meal.image_url ? (
                            <Image source={{ uri: meal.image_url }} style={{ width: 40, height: 40, borderRadius: 20 }} resizeMode="cover" />
                          ) : (
                            <Ionicons name="restaurant-outline" size={18} color={Colors.textSecondary} />
                          )}
                        </View>
                        <View style={styles.searchResultText}>
                          <Text style={styles.searchResultName} numberOfLines={1}>{meal.name}</Text>
                          {(meal.cuisine || meal.meal_type) && (
                            <Text style={styles.searchResultMeta} numberOfLines={1}>
                              {meal.cuisine || (meal.meal_type === 'breakfast' ? 'Breakfast' : meal.meal_type === 'lunch_dinner' ? 'Lunch & Dinner' : 'Light Bites')}
                            </Text>
                          )}
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                      </TouchableOpacity>
                    ))
                  )}

                  <Text style={[styles.searchSectionLabel, { marginTop: 28 }]}>SEARCH ONLINE</Text>
                  <View style={styles.searchOnlineStub}>
                    <View style={styles.searchResultImage}>
                      <Ionicons name="globe-outline" size={18} color="#9CA3AF" />
                    </View>
                    <Text style={styles.searchOnlineText}>Search millions of recipes online — coming soon</Text>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.browseCardsRow}>
                    <TouchableOpacity
                      style={styles.browseCardLeft}
                      activeOpacity={0.82}
                      onPress={() => { resetAndClose(); router.push('/(tabs)/favs'); }}
                      testID="browse-favs-btn"
                    >
                      <Heart size={22} color="#7B68CC" fill="#7B68CC" strokeWidth={2} />
                      <Text style={styles.browseCardTitle}>From My Favourites</Text>
                      <Text style={styles.browseCardSubtitle}>
                        {favMeals.length > 0 ? `${favMeals.length} saved recipes` : 'Your saved recipes'}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.browseCardRight}
                      activeOpacity={0.82}
                      onPress={() => { resetAndClose(); router.push('/(tabs)/discover'); }}
                      testID="browse-discover-btn"
                    >
                      <Ionicons name="compass-outline" size={22} color="#059669" />
                      <Text style={styles.browseCardTitle}>Try Something New</Text>
                      <Text style={styles.browseCardSubtitle}>
                        {DISCOVER_MEALS.length} curated recipes
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Text style={styles.dividerText}>or create new</Text>
                    <View style={styles.dividerLine} />
                  </View>

                  <View testID="option-rows">
                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.82}
                      onPress={() => setMode('manual')}
                      testID="add-without-recipe-btn"
                    >
                      <View style={[styles.optionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                        <Ionicons name="pencil-outline" size={16} color="#D97706" />
                      </View>
                      <View style={styles.optionTextBlock}>
                        <Text style={styles.optionTitle}>Add without Recipe</Text>
                        <Text style={styles.optionSubtitle}>Just a name - add steps later</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>

                    <View style={styles.optionSeparator} />

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.82}
                      onPress={() => { resetAndClose(); onCreateNewRecipe(); }}
                      testID="add-with-recipe-btn"
                    >
                      <View style={[styles.optionIconCircle, { backgroundColor: '#EDE9FE' }]}>
                        <Ionicons name="sparkles-outline" size={16} color="#7B68CC" />
                      </View>
                      <View style={styles.optionTextBlock}>
                        <Text style={styles.optionTitle}>Add with Recipe</Text>
                        <Text style={styles.optionSubtitle}>URL, camera, YouTube & more</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>

                    <View style={styles.optionSeparator} />

                    <TouchableOpacity
                      style={styles.optionRow}
                      activeOpacity={0.82}
                      onPress={() => setMode('delivery')}
                      testID="add-delivery-btn"
                    >
                      <View style={[styles.optionIconCircle, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
                      </View>
                      <View style={styles.optionTextBlock}>
                        <Text style={styles.optionTitle}>Add from Delivery App</Text>
                        <Text style={styles.optionSubtitle}>Paste a delivery link</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </ScrollView>
          </>
        ) : (
          <View style={styles.manualForm}>
            <View style={styles.manualIconWrap}>
              <Utensils size={32} color={Colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.manualFormHeading}>Add Without Recipe</Text>
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
            <TouchableOpacity
              style={styles.saveToMyMealsRow}
              onPress={() => setSaveToMyMeals((v) => !v)}
              activeOpacity={0.75}
              testID="save-to-my-meals-toggle"
            >
              <Ionicons
                name={saveToMyMeals ? 'heart' : 'heart-outline'}
                size={18}
                color={saveToMyMeals ? Colors.primary : Colors.textSecondary}
              />
              <Text style={styles.saveToMyMealsText}>Save to My Meals</Text>
            </TouchableOpacity>
            <Text style={styles.manualHint}>
              You can add ingredients later from the meal detail screen.
            </Text>
            <View style={styles.manualActions}>
              <PrimaryButton
                label="Add Meal"
                onPress={handleAddManual}
                disabled={!manualName.trim()}
              />
              <TouchableOpacity onPress={() => setMode('choose')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Browse meals instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

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
    alignItems: 'center',
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
  chooseScroll: {
    flex: 1,
  },
  chooseScrollContent: {
    paddingBottom: 48,
  },
  browseCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  browseCardLeft: {
    flex: 1,
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
  },
  browseCardRight: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 14,
  },
  browseCardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 8,
  },
  browseCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#9CA3AF',
    paddingHorizontal: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 66,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#6B7280',
    marginTop: 1,
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
    marginBottom: 16,
  },
  manualFormHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 20,
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
  saveToMyMealsRow: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  saveToMyMealsText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  deliveryScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  deliverySectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  deliveryInput: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
  },
  deliveryLinkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  deliveryLinkInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
  },
  deliveryClipboardBtn: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryPlatformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },
  deliveryPlatformText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  deliverySaveBtn: {
    marginTop: 24,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  deliverySaveBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    paddingVertical: 11,
  },
  searchSectionLabel: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: '#9CA3AF',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginBottom: 10,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  searchResultRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  searchResultImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  searchResultText: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  searchResultMeta: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  searchEmptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 20,
    gap: 10,
  },
  searchEmptyText: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  searchEmptyDiscoverBtn: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
    marginTop: 12,
    textAlign: 'center',
  },
  searchOnlineStub: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    gap: 12,
  },
  searchOnlineText: {
    fontSize: 14,
    color: '#9CA3AF',
  },
});
