import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Animated,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { searchFoodImages, UnsplashImage } from '@/services/imageSearch';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { X, Plus, Minus, Camera } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import FilterPill from '@/components/FilterPill';
import ServingStepper from '@/components/ServingStepper';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { consumePendingPlanSlot } from '@/services/pendingPlanSlot';
import { Meal, Ingredient, PlannedMeal, CUISINE_OPTIONS, DIETARY_OPTIONS, COOKING_TIME_BANDS } from '@/types';

export default function AddMealScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { meals, addFav, updateFav, isFavByName } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal } = useMealPlan();

  const editMeal = useMemo(() => {
    if (params.editId) {
      return meals.find((m) => m.id === params.editId) ?? null;
    }
    return null;
  }, [params.editId, meals]);

  const isEditing = !!editMeal;

  const [name, setName] = useState<string>(editMeal?.name ?? '');
  const [suggestedImages, setSuggestedImages] = useState<UnsplashImage[]>([]);
  const [imageIndex, setImageIndex] = useState(0);
  const [userImageUri, setUserImageUri] = useState<string | null>(
    editMeal?.image_url ?? null
  );
  const [imageLoading, setImageLoading] = useState(false);
  const [hasFetchedSuggestion, setHasFetchedSuggestion] = useState(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;
  const [cuisine, setCuisine] = useState<string>(editMeal?.cuisine ?? '');
  const [cookingTimeBand, setCookingTimeBand] = useState<string>(editMeal?.cooking_time_band ?? '');
  const [prepTime, setPrepTime] = useState<string>(editMeal?.prep_time != null ? String(editMeal.prep_time) : '');
  const [cookTime, setCookTime] = useState<string>(editMeal?.cook_time != null ? String(editMeal.cook_time) : '');
  const [dietaryTags, setDietaryTags] = useState<string[]>(editMeal?.dietary_tags ?? []);
  const [customTags, setCustomTags] = useState<string[]>(editMeal?.custom_tags ?? []);
  const [newTag, setNewTag] = useState<string>('');
  const [mealTypeSlotId, setMealTypeSlotId] = useState<string>(editMeal?.meal_type_slot_id ?? '');
  const [description, setDescription] = useState<string>(editMeal?.description ?? '');
  const [chefNotes, setChefNotes] = useState<string>(editMeal?.chef_notes ?? '');
  const [servingSize, setServingSize] = useState<number>(editMeal?.recipe_serving_size ?? familySettings.default_serving_size);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string; unit: string }[]>(
    editMeal?.ingredients?.length
      ? editMeal.ingredients.map((i) => ({
          name: i.name ?? '',
          quantity: i.quantity != null ? String(i.quantity) : '',
          unit: i.unit ?? '',
        }))
      : [{ name: '', quantity: '', unit: '' }]
  );
  const [deliveryUrl, setDeliveryUrl] = useState<string>(editMeal?.delivery_url ?? '');
  const [methodSteps, setMethodSteps] = useState<string[]>(
    editMeal?.method_steps?.length ? editMeal.method_steps : ['']
  );

  useEffect(() => {
    if (imageLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonAnim, { toValue: 1, duration: 600, useNativeDriver: false }),
          Animated.timing(skeletonAnim, { toValue: 0, duration: 600, useNativeDriver: false }),
        ])
      ).start();
    } else {
      skeletonAnim.stopAnimation();
    }
  }, [imageLoading, skeletonAnim]);

  const handleMealNameBlur = async () => {
    if (hasFetchedSuggestion || userImageUri) return;
    if (!name || name.trim().length < 3) return;
    setHasFetchedSuggestion(true);
    setImageLoading(true);
    const results = await searchFoodImages(name.trim());
    setImageLoading(false);
    if (results.length > 0) setSuggestedImages(results);
  };

  const handlePickImage = async (source: 'camera' | 'library') => {
    const permission = source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert(
        'Permission needed',
        source === 'camera'
          ? 'Camera access is needed to take a photo.'
          : 'Photo library access is needed to choose a photo.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return;
    }
    setImageLoading(true);
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, aspect: [16, 10] as [number, number], quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true, aspect: [16, 10] as [number, number], quality: 0.8,
        });
    setImageLoading(false);
    if (!result.canceled && result.assets[0]) {
      setUserImageUri(result.assets[0].uri);
    }
  };

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const toggleDietaryTag = useCallback((tag: string) => {
    if (tag === 'No Restrictions') {
      setDietaryTags([]);
      return;
    }
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev.filter((t) => t !== 'No Restrictions'), tag]
    );
  }, []);

  const addCustomTag = useCallback(() => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags((prev) => [...prev, newTag.trim()]);
      setNewTag('');
    }
  }, [newTag, customTags]);

  const removeCustomTag = useCallback((tag: string) => {
    setCustomTags((prev) => prev.filter((t) => t !== tag));
  }, []);

  const addIngredientRow = useCallback(() => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  }, []);

  const updateIngredient = useCallback((idx: number, field: string, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }, []);

  const removeIngredient = useCallback((idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const addStep = useCallback(() => {
    setMethodSteps((prev) => [...prev, '']);
  }, []);

  const updateStep = useCallback((idx: number, value: string) => {
    setMethodSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  }, []);

  const removeStep = useCallback((idx: number) => {
    setMethodSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  const handleSave = useCallback(() => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter a meal name.');
      return;
    }

    const validIngredients: Ingredient[] = ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({
        id: `ing_${Date.now()}_${idx}`,
        name: i.name.trim(),
        quantity: parseFloat(i.quantity) || 0,
        unit: i.unit.trim() || 'pc',
        category: 'Other',
      }));

    const validSteps = methodSteps.filter((s) => s.trim());

    if (isEditing && editMeal) {
      updateFav(editMeal.id, {
        name: name.trim(),
        image_url: userImageUri ?? (suggestedImages[imageIndex]?.regularUrl ?? undefined),
        cuisine: cuisine || undefined,
        cooking_time_band: cookingTimeBand as Meal['cooking_time_band'] || undefined,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        cook_time: cookTime ? parseInt(cookTime) : undefined,
        dietary_tags: dietaryTags,
        custom_tags: customTags,
        meal_type_slot_id: mealTypeSlotId || undefined,
        description: description || undefined,
        chef_notes: chefNotes || undefined,
        recipe_serving_size: servingSize,
        ingredients: validIngredients,
        method_steps: validSteps,
        is_ingredient_complete: validIngredients.length > 0,
        is_recipe_complete: validSteps.length > 0,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
      return;
    }

    if (!isEditing && isFavByName(name.trim())) {
      Alert.alert(
        'Duplicate found',
        `You already have "${name.trim()}" in your Favs.`,
        [
          { text: 'View it', onPress: () => router.back() },
          {
            text: 'Add Anyway',
            onPress: () => saveMeal(validIngredients, validSteps),
          },
        ]
      );
      return;
    }

    saveMeal(validIngredients, validSteps);
  }, [name, userImageUri, suggestedImages, imageIndex, cuisine, cookingTimeBand, prepTime, cookTime, dietaryTags, customTags, mealTypeSlotId, description, chefNotes, servingSize, ingredients, methodSteps, isEditing, editMeal, updateFav, isFavByName]);

  const saveMeal = useCallback((validIngredients: Ingredient[], validSteps: string[]) => {
    const newMeal: Meal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      image_url: userImageUri ?? (suggestedImages[imageIndex]?.regularUrl ?? undefined),
      cuisine: cuisine || undefined,
      cooking_time_band: cookingTimeBand as Meal['cooking_time_band'] || undefined,
      prep_time: prepTime ? parseInt(prepTime) : undefined,
      cook_time: cookTime ? parseInt(cookTime) : undefined,
      dietary_tags: dietaryTags,
      custom_tags: customTags,
      meal_type_slot_id: mealTypeSlotId || undefined,
      ingredients: validIngredients,
      recipe_serving_size: servingSize,
      method_steps: validSteps,
      description: description || undefined,
      chef_notes: chefNotes || undefined,
      source: 'family_created',
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: validIngredients.length > 0,
      is_recipe_complete: validSteps.length > 0,
      delivery_url: deliveryUrl.trim() || undefined,
      delivery_platform: deliveryUrl.trim() ? (detectPlatformFromUrl(deliveryUrl.trim()) ?? undefined) : undefined,
    };
    addFav(newMeal);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const pending = consumePendingPlanSlot();
    if (pending) {
      const plannedMeal: PlannedMeal = {
        id: `fav_plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: pending.slotId,
        date: pending.date,
        meal_name: newMeal.name,
        meal_image_url: newMeal.image_url,
        serving_size: pending.defaultServing,
        ingredients: newMeal.ingredients,
        recipe_serving_size: newMeal.recipe_serving_size,
        delivery_url: newMeal.delivery_url,
        delivery_platform: newMeal.delivery_platform,
        meal_id: newMeal.id,
      };
      addMeal(plannedMeal);
      console.log('[AddMeal] Auto-added to plan slot:', pending.slotId, pending.date);
      router.replace('/(tabs)' as never);
    } else {
      router.replace('/(tabs)/favs' as never);
    }
  }, [name, userImageUri, suggestedImages, imageIndex, cuisine, cookingTimeBand, prepTime, cookTime, dietaryTags, customTags, mealTypeSlotId, servingSize, description, chefNotes, deliveryUrl, addFav]);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditing ? 'Edit Meal' : 'Add a Meal'}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.label}>Meal name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mum's Chicken Pie"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            onBlur={handleMealNameBlur}
            autoCapitalize="words"
            testID="meal-name-input"
          />

          <Text style={styles.label}>Photo</Text>
          <View style={styles.imageZoneWrapper}>
            {imageLoading ? (
              <Animated.View style={[
                styles.imageZoneCard,
                { backgroundColor: skeletonAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Colors.border, Colors.background],
                  })
                }
              ]} />
            ) : (userImageUri || suggestedImages.length > 0) ? (
              <View>
                <View style={styles.imageZoneCard}>
                  <Image
                    source={{ uri: userImageUri ?? suggestedImages[imageIndex]?.regularUrl }}
                    style={styles.imageZoneFull}
                    resizeMode="cover"
                  />
                  <View style={styles.imageZoneGradient} />
                  {!userImageUri && suggestedImages.length > 0 && (
                    <View style={styles.imageZonePill}>
                      <Text style={styles.imageZonePillText}>Suggested</Text>
                    </View>
                  )}
                  <View style={styles.imageZoneActions}>
                    <TouchableOpacity style={styles.imageZoneBtn} onPress={() => handlePickImage('camera')}>
                      <Ionicons name="camera-outline" size={18} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageZoneBtn} onPress={() => handlePickImage('library')}>
                      <Ionicons name="image-outline" size={18} color={Colors.white} />
                    </TouchableOpacity>
                    {!userImageUri && suggestedImages.length > 1 && (
                      <TouchableOpacity
                        style={styles.imageZoneBtn}
                        onPress={() => setImageIndex((imageIndex + 1) % suggestedImages.length)}
                      >
                        <Ionicons name="refresh-outline" size={18} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                    {userImageUri && (
                      <TouchableOpacity style={styles.imageZoneBtn} onPress={() => setUserImageUri(null)}>
                        <Ionicons name="trash-outline" size={18} color={Colors.white} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                {!userImageUri && suggestedImages[imageIndex] && (
                  <Text style={styles.imageZoneAttribution}>
                    {'Photo by '}{suggestedImages[imageIndex].photographer}{' on Unsplash'}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.imageZoneEmpty}>
                <Ionicons name="image-outline" size={40} color={Colors.textSecondary} />
                <Text style={styles.imageZoneEmptyTitle}>Add a photo</Text>
                <Text style={styles.imageZoneEmptyHint}>
                  Take one or choose from your library
                </Text>
                <View style={styles.imageZoneEmptyBtns}>
                  <TouchableOpacity style={styles.imageZoneEmptyBtn} onPress={() => handlePickImage('camera')}>
                    <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                    <Text style={styles.imageZoneEmptyBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageZoneEmptyBtn} onPress={() => handlePickImage('library')}>
                    <Ionicons name="image-outline" size={18} color={Colors.primary} />
                    <Text style={styles.imageZoneEmptyBtnText}>Library</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <Text style={styles.label}>Meal type</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {sortedSlots.map((slot) => (
              <FilterPill
                key={slot.slot_id}
                label={slot.name}
                active={mealTypeSlotId === slot.slot_id}
                onPress={() => setMealTypeSlotId(mealTypeSlotId === slot.slot_id ? '' : slot.slot_id)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Cuisine</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {CUISINE_OPTIONS.map((c) => (
              <FilterPill
                key={c}
                label={c}
                active={cuisine === c}
                onPress={() => setCuisine(cuisine === c ? '' : c)}
              />
            ))}
          </ScrollView>

          <Text style={styles.label}>Cooking time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow}>
            {COOKING_TIME_BANDS.map((t) => (
              <FilterPill
                key={t}
                label={`${t} min`}
                active={cookingTimeBand === t}
                onPress={() => setCookingTimeBand(cookingTimeBand === t ? '' : t)}
              />
            ))}
          </ScrollView>

          <View style={styles.timeInputRow}>
            <View style={styles.timeInputWrap}>
              <Text style={styles.label}>Prep (min)</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="15"
                placeholderTextColor={Colors.textSecondary}
                value={prepTime}
                onChangeText={setPrepTime}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.timeInputWrap}>
              <Text style={styles.label}>Cook (min)</Text>
              <TextInput
                style={styles.timeInput}
                placeholder="30"
                placeholderTextColor={Colors.textSecondary}
                value={cookTime}
                onChangeText={setCookTime}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <Text style={styles.label}>Dietary tags</Text>
          <View style={styles.dietaryGrid}>
            {DIETARY_OPTIONS.filter((d) => d !== 'No Restrictions').map((tag) => (
              <FilterPill
                key={tag}
                label={tag}
                active={dietaryTags.includes(tag)}
                onPress={() => toggleDietaryTag(tag)}
              />
            ))}
          </View>

          <Text style={styles.label}>Custom tags</Text>
          <View style={styles.customTagRow}>
            <TextInput
              style={styles.customTagInput}
              placeholder="Add tag..."
              placeholderTextColor={Colors.textSecondary}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={addCustomTag}
              returnKeyType="done"
            />
            <TouchableOpacity style={styles.customTagAddBtn} onPress={addCustomTag}>
              <Plus size={16} color={Colors.primary} strokeWidth={2.5} />
            </TouchableOpacity>
          </View>
          {customTags.length > 0 && (
            <View style={styles.customTagList}>
              {customTags.map((tag) => (
                <TouchableOpacity key={tag} style={styles.customTag} onPress={() => removeCustomTag(tag)}>
                  <Text style={styles.customTagText}>{tag}</Text>
                  <X size={12} color={Colors.primary} strokeWidth={2} />
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={styles.label}>Default serving size</Text>
          <View style={styles.servingWrap}>
            <ServingStepper value={servingSize} onValueChange={setServingSize} />
          </View>

          <Text style={styles.label}>Description / notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Any notes about this meal..."
            placeholderTextColor={Colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.sectionHeader}>Ingredients</Text>
          {ingredients.map((ing, idx) => (
            <View key={idx} style={styles.ingredientInputRow}>
              <TextInput
                style={[styles.ingInput, styles.ingName]}
                placeholder="Ingredient"
                placeholderTextColor={Colors.textSecondary}
                value={ing.name}
                onChangeText={(v) => updateIngredient(idx, 'name', v)}
              />
              <TextInput
                style={[styles.ingInput, styles.ingQty]}
                placeholder="Qty"
                placeholderTextColor={Colors.textSecondary}
                value={ing.quantity}
                onChangeText={(v) => updateIngredient(idx, 'quantity', v)}
                keyboardType="decimal-pad"
              />
              <TextInput
                style={[styles.ingInput, styles.ingUnit]}
                placeholder="Unit"
                placeholderTextColor={Colors.textSecondary}
                value={ing.unit}
                onChangeText={(v) => updateIngredient(idx, 'unit', v)}
              />
              {ingredients.length > 1 && (
                <TouchableOpacity onPress={() => removeIngredient(idx)} style={styles.ingRemove}>
                  <Minus size={14} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addRowBtn} onPress={addIngredientRow}>
            <Plus size={14} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.addRowText}>Add ingredient</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Method steps</Text>
          {methodSteps.map((step, idx) => (
            <View key={idx} style={styles.stepInputRow}>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{idx + 1}</Text>
              </View>
              <TextInput
                style={[styles.input, styles.stepInput]}
                placeholder={`Step ${idx + 1}...`}
                placeholderTextColor={Colors.textSecondary}
                value={step}
                onChangeText={(v) => updateStep(idx, v)}
                multiline
              />
              {methodSteps.length > 1 && (
                <TouchableOpacity onPress={() => removeStep(idx)} style={styles.ingRemove}>
                  <Minus size={14} color={Colors.textSecondary} strokeWidth={2} />
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity style={styles.addRowBtn} onPress={addStep}>
            <Plus size={14} color={Colors.primary} strokeWidth={2.5} />
            <Text style={styles.addRowText}>Add step</Text>
          </TouchableOpacity>

          <Text style={styles.sectionHeader}>Ordering</Text>
          <Text style={styles.label}>Delivery link (optional)</Text>
          <View style={styles.deliveryRow}>
            <TextInput
              style={[styles.input, styles.deliveryInput]}
              placeholder="Paste Uber Eats, Zomato, Grab link..."
              placeholderTextColor={Colors.textSecondary}
              value={deliveryUrl}
              onChangeText={setDeliveryUrl}
              autoCapitalize="none"
              keyboardType="url"
            />
            <TouchableOpacity
              style={styles.clipboardBtn}
              onPress={async () => {
                const text = await Clipboard.getStringAsync();
                if (text) setDeliveryUrl(text);
              }}
            >
              <Ionicons name="clipboard-outline" size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          {deliveryUrl.trim().length > 0 && (() => {
            const platform = detectPlatformFromUrl(deliveryUrl.trim());
            return platform !== null ? (
              <View style={styles.platformChip}>
                <Ionicons name="checkmark-circle" size={14} color={Colors.primary} />
                <Text style={styles.platformChipText}>
                  {getPlatformLabel(platform)} detected
                </Text>
              </View>
            ) : (
              <View style={styles.platformChip}>
                <Ionicons name="link-outline" size={14} color="#6B7280" />
                <Text style={[styles.platformChipText, { color: '#6B7280' }]}>Link saved</Text>
              </View>
            );
          })()}

          <Text style={styles.label}>Chef notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Tips, tricks, or variations..."
            placeholderTextColor={Colors.textSecondary}
            value={chefNotes}
            onChangeText={setChefNotes}
            multiline
            numberOfLines={3}
          />

          <View style={{ height: 100 }} />
        </ScrollView>

        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <PrimaryButton
            label={isEditing ? 'Save Changes' : 'Save Meal'}
            onPress={handleSave}
            disabled={!name.trim()}
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
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
  closeBtn: {
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top' as const,
  },
  pillRow: {
    maxHeight: 44,
    flexDirection: 'row',
    gap: 6,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  timeInputWrap: {
    flex: 1,
  },
  timeInput: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  dietaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  customTagRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customTagInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.text,
  },
  customTagAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customTagList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  customTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  customTagText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  servingWrap: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  ingredientInputRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 8,
    alignItems: 'center',
  },
  ingInput: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
  },
  ingName: {
    flex: 3,
  },
  ingQty: {
    flex: 1,
  },
  ingUnit: {
    flex: 1,
  },
  ingRemove: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addRowText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  stepInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  stepInput: {
    flex: 1,
    minHeight: 48,
    textAlignVertical: 'top' as const,
  },
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  imageZoneWrapper: {
    marginBottom: 4,
  },
  imageZoneCard: {
    height: 200,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
    backgroundColor: Colors.border,
  },
  imageZoneFull: {
    width: '100%',
    height: 200,
  },
  imageZoneGradient: {
    position: 'absolute',
    bottom: 0, left: 0, right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  imageZonePill: {
    position: 'absolute',
    bottom: 10, left: 12,
    backgroundColor: 'rgba(123,104,204,0.85)',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 9999,
  },
  imageZonePillText: {
    fontSize: 12, fontWeight: '500' as const, color: Colors.white,
  },
  imageZoneActions: {
    position: 'absolute',
    bottom: 8, right: 10,
    flexDirection: 'row', gap: 8,
  },
  imageZoneBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center', justifyContent: 'center',
  },
  imageZoneAttribution: {
    fontSize: 12, fontWeight: '400' as const, color: Colors.textSecondary,
    marginTop: 4, marginBottom: 4,
  },
  imageZoneEmpty: {
    height: 200,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  imageZoneEmptyTitle: {
    fontSize: 16, fontWeight: '600' as const, color: Colors.text, marginTop: 8,
  },
  imageZoneEmptyHint: {
    fontSize: 13, fontWeight: '400' as const, color: Colors.textSecondary,
    marginTop: 4, textAlign: 'center',
  },
  imageZoneEmptyBtns: {
    flexDirection: 'row', gap: 12, marginTop: 14,
  },
  imageZoneEmptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.card,
    paddingVertical: 10, paddingHorizontal: 16,
    borderRadius: BorderRadius.button,
    borderWidth: 1, borderColor: Colors.border,
  },
  imageZoneEmptyBtnText: {
    fontSize: 14, fontWeight: '500' as const, color: Colors.text,
  },
  deliveryRow: {
    flexDirection: 'row' as const,
    gap: 8,
    alignItems: 'center' as const,
  },
  deliveryInput: {
    flex: 1,
  },
  clipboardBtn: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  platformChip: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 4,
    marginTop: 6,
  },
  platformChipText: {
    fontSize: 12,
    color: Colors.primary,
  },
});
