import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { extractRecipeFromImage, extractRecipeFromText, detectVideoUrlType, extractRecipeFromVideoUrl } from '@/services/recipeExtraction';
import { imageStore } from '@/services/imageStore';
import { searchFoodImages, UnsplashImage } from '@/services/imageSearch';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { consumePendingPlanSlot, hasPendingPlanSlot, peekPendingPlanSlot } from '@/services/pendingPlanSlot';
import { Meal, Ingredient, PlannedMeal } from '@/types';
import ServingStepper from '@/components/ServingStepper';

type Params = {
  inputMode: 'camera' | 'photos' | 'text' | 'voice' | 'manual' | 'url';
  imageBase64?: string;
  imageUri?: string;
  inputText?: string;
  inputUrl?: string;
  prefillName?: string;
  prefillCuisine?: string;
  prefillMealType?: string;
  prefillCookingTimeBand?: string;
  prefillDescription?: string;
  prefillDietaryTags?: string;
  prefillIngredients?: string;
  prefillMethodSteps?: string;
  prefillServingSize?: string;
};

type MealTypeValue = 'breakfast' | 'lunch_dinner' | 'light_bites';
type CookTimeBand = 'Under 30' | '30-60' | 'Over 60';

const MEAL_TYPE_OPTIONS: { label: string; value: MealTypeValue }[] = [
  { label: 'Breakfast', value: 'breakfast' },
  { label: 'Lunch & Dinner', value: 'lunch_dinner' },
  { label: 'Light Bites', value: 'light_bites' },
];

const COOK_TIME_OPTIONS: { label: string; value: CookTimeBand }[] = [
  { label: 'Under 30', value: 'Under 30' },
  { label: '30–60 min', value: '30-60' },
  { label: 'Over 60', value: 'Over 60' },
];

const DIETARY_CHIPS: { label: string; value: string }[] = [
  { label: 'Vegan', value: 'Vegan' },
  { label: 'Vegetarian', value: 'Vegetarian' },
  { label: 'Gluten-Free', value: 'Gluten-Free' },
  { label: 'Dairy-Free', value: 'Dairy-Free' },
  { label: 'High Protein', value: 'High Protein' },
];


export default function AddMealReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { addFav } = useFavs();
  const { addMeal } = useMealPlan();

  const [isAddingToPlan] = useState<boolean>(() => hasPendingPlanSlot());
  const [pendingSlotName] = useState<string>(() => { const s = peekPendingPlanSlot(); return s ? s.slotName : ''; });

  const inputMode = params.inputMode ?? 'manual';

  const [isLoading, setIsLoading] = useState<boolean>(
    inputMode === 'camera' || inputMode === 'photos' || inputMode === 'text' || inputMode === 'url',
  );
  const [loadingLabel, setLoadingLabel] = useState<string>(
    inputMode === 'url' ? 'Analysing video description…' : 'This takes about 5 seconds',
  );
  const [retryCount, setRetryCount] = useState<number>(0);

  const [name, setName] = useState<string>(params.prefillName ?? '');
  const [description, setDescription] = useState<string>(params.prefillDescription ?? '');
  const [mealType, setMealType] = useState<MealTypeValue | ''>(() => {
    const v = params.prefillMealType ?? '';
    if (v === 'breakfast' || v === 'lunch_dinner' || v === 'light_bites') return v;
    return '';
  });
  const [cookTimeBand, setCookTimeBand] = useState<CookTimeBand | ''>(() => {
    const v = params.prefillCookingTimeBand ?? '';
    if (v === 'Under 30' || v === '30-60' || v === 'Over 60') return v;
    return '';
  });
  const [cuisine, setCuisine] = useState<string>(params.prefillCuisine ?? '');
  const [dietaryTags, setDietaryTags] = useState<string[]>(() => {
    if (params.prefillDietaryTags) {
      try {
        return JSON.parse(params.prefillDietaryTags) as string[];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [servingSize, setServingSize] = useState<number>(() => {
    const n = parseInt(params.prefillServingSize ?? '', 10);
    return isNaN(n) ? 4 : n;
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (params.prefillIngredients) {
      try {
        return JSON.parse(params.prefillIngredients) as Ingredient[];
      } catch {
        return [];
      }
    }
    return [];
  });
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [isEditingMethod, setIsEditingMethod] = useState(false);

  const [methodSteps, setMethodSteps] = useState<string[]>(() => {
    if (params.prefillMethodSteps) {
      try {
        return JSON.parse(params.prefillMethodSteps) as string[];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [suggestedImages, setSuggestedImages] = useState<UnsplashImage[]>([]);
  const [imageIndex, setImageIndex] = useState<number>(0);
  const [userImageUri, setUserImageUri] = useState<string | null>(null);
  const [imageLoading, setImageLoading] = useState<boolean>(false);
  const skeletonAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (inputMode !== 'camera' && inputMode !== 'photos' && inputMode !== 'text' && inputMode !== 'url') return;

    const doExtract = async () => {
      setIsLoading(true);
      console.log('[Review] Starting extraction, mode:', inputMode);
      try {
        let result;
        if (inputMode === 'camera' || inputMode === 'photos') {
          const stored = imageStore.get();
          if (!stored?.base64) {
            setIsLoading(false);
            return;
          }
          result = await extractRecipeFromImage(stored.base64);
          imageStore.clear();
        } else if (inputMode === 'text' && params.inputText) {
          result = await extractRecipeFromText(params.inputText);
        } else if (inputMode === 'url' && params.inputUrl) {
          setLoadingLabel('Analysing video description…');
          result = await extractRecipeFromVideoUrl(params.inputUrl);
        } else {
          setIsLoading(false);
          return;
        }

        if (result.name) setName(result.name);
        if (result.description) setDescription(result.description);
        if (result.meal_type) setMealType(result.meal_type);
        if (result.cooking_time_band) setCookTimeBand(result.cooking_time_band);
        if (result.cuisine) setCuisine(result.cuisine);
        if (result.dietary_tags?.length) setDietaryTags(result.dietary_tags);
        if (result.recipe_serving_size > 0) setServingSize(result.recipe_serving_size);
        if (result.ingredients?.length) {
          setIngredients(
            result.ingredients.map((ing, idx) => ({
              id: String(idx + 1),
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: 'Other',
            })),
          );
        }
        if (result.method_steps?.length) setMethodSteps(result.method_steps);

        console.log('[Review] Extraction complete:', result.name);

        if (result.name && result.name.length >= 3) {
          searchFoodImages(result.name).then(results => {
            setSuggestedImages(results);
          });
        }
      } catch (e) {
        console.log('[Review] Extraction failed:', e);
        Alert.alert(
          "Couldn't extract recipe",
          inputMode === 'url'
            ? "We couldn't extract a recipe from that video. Fill in manually?"
            : "We couldn't read this image. Fill in manually?",
          [
            { text: 'Try Again', onPress: () => setRetryCount((c) => c + 1) },
            { text: 'Fill Manually', onPress: () => router.replace('/add-recipe-manual' as never) },
          ],
        );
      } finally {
        setIsLoading(false);
      }
    };

    doExtract();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

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
          allowsEditing: true,
          aspect: [16, 10] as [number, number],
          quality: 0.8,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [16, 10] as [number, number],
          quality: 0.8,
        });

    setImageLoading(false);
    if (!result.canceled && result.assets[0]) {
      setUserImageUri(result.assets[0].uri);
    }
  };

  const updateIngredient = (idx: number, field: 'name' | 'unit', value: string) => {
    setIngredients(prev => prev.map((ing, i) =>
      i === idx ? { ...ing, [field]: value } : ing
    ));
  };

  const updateIngredientQuantity = (idx: number, value: string) => {
    const num = parseFloat(value);
    setIngredients(prev => prev.map((ing, i) =>
      i === idx ? { ...ing, quantity: isNaN(num) ? 0 : num } : ing
    ));
  };

  const removeIngredient = (idx: number) => {
    setIngredients(prev => prev.filter((_, i) => i !== idx));
  };

  const addIngredient = () => {
    setIngredients(prev => [
      ...prev,
      { id: String(Date.now()), name: '', quantity: 0, unit: '', category: 'Other' }
    ]);
  };

  const updateStep = (idx: number, value: string) => {
    setMethodSteps(prev => prev.map((s, i) => i === idx ? value : s));
  };

  const removeStep = (idx: number) => {
    setMethodSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const addStep = () => {
    setMethodSteps(prev => [...prev, '']);
  };

  const toggleDietary = useCallback((tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const meal: Meal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      image_url: userImageUri ?? (suggestedImages[imageIndex]?.regularUrl ?? undefined),
      description: description.trim() || undefined,
      cuisine: cuisine.trim() || undefined,
      cooking_time_band: cookTimeBand ? cookTimeBand : undefined,
      dietary_tags: dietaryTags,
      custom_tags: [],
      meal_type: mealType ? mealType : undefined,
      ingredients,
      recipe_serving_size: servingSize,
      method_steps: methodSteps,
      source: 'family_created',
      add_to_plan_count: 0,
      created_at: new Date().toISOString(),
      is_ingredient_complete: ingredients.length > 0,
      is_recipe_complete: methodSteps.length > 0,
    };

    addFav(meal);
    console.log('[Review] Saved to favs:', meal.name);
    const pending = consumePendingPlanSlot();
    if (pending) {
      const plannedMeal: PlannedMeal = {
        id: `fav_plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: pending.slotId,
        date: pending.date,
        meal_name: meal.name,
        meal_image_url: meal.image_url,
        serving_size: pending.defaultServing,
        ingredients: meal.ingredients,
        recipe_serving_size: meal.recipe_serving_size,
        delivery_url: undefined,
        delivery_platform: undefined,
        meal_id: meal.id,
      };
      addMeal(plannedMeal);
      router.replace('/(tabs)' as never);
    } else {
      router.replace('/(tabs)/favs' as never);
    }
  }, [
    name,
    description,
    cuisine,
    cookTimeBand,
    dietaryTags,
    mealType,
    ingredients,
    servingSize,
    methodSteps,
    addFav,
    addMeal,
    router,
    userImageUri,
    suggestedImages,
    imageIndex,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingTitle}>Extracting recipe...</Text>
        <Text style={styles.loadingSubtitle}>{loadingLabel}</Text>
      </View>
    );
  }

  const canSave = name.trim().length > 0;

  const currentSuggestion = suggestedImages[imageIndex];
  const hasImage = userImageUri !== null || suggestedImages.length > 0;

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitleBlock}>
            <Text style={styles.headerTitle}>Review Recipe</Text>
            {isAddingToPlan && (
              <Text style={styles.headerSubtitle}>Adding to {pendingSlotName}</Text>
            )}
          </View>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.headerSide, styles.headerSideRight]}
          >
            <Text style={[styles.headerSaveText, !canSave && styles.headerSaveTextDisabled]}>
              {isAddingToPlan ? 'Add' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 110 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image Hero Zone */}
          <View style={styles.heroZoneWrapper}>
            {imageLoading ? (
              <Animated.View
                style={[
                  styles.heroCard,
                  {
                    backgroundColor: skeletonAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [Colors.border, Colors.background],
                    }),
                  },
                ]}
              />
            ) : hasImage ? (
              <View>
                <View style={styles.heroCard}>
                  <Image
                    source={{ uri: userImageUri ?? currentSuggestion?.regularUrl }}
                    style={styles.heroImageFull}
                    resizeMode="cover"
                  />
                  <View style={styles.heroGradientOverlay} />
                  {!userImageUri && suggestedImages.length > 0 && (
                    <View style={styles.suggestedPill}>
                      <Text style={styles.suggestedPillText}>Suggested</Text>
                    </View>
                  )}
                  <View style={styles.heroActions}>
                    {!userImageUri ? (
                      <>
                        <TouchableOpacity style={styles.heroActionBtn} onPress={() => handlePickImage('camera')}>
                          <Ionicons name="camera-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.heroActionBtn} onPress={() => handlePickImage('library')}>
                          <Ionicons name="image-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        {suggestedImages.length > 1 && (
                          <TouchableOpacity
                            style={styles.heroActionBtn}
                            onPress={() => setImageIndex((imageIndex + 1) % suggestedImages.length)}
                          >
                            <Ionicons name="refresh-outline" size={18} color={Colors.white} />
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      <>
                        <TouchableOpacity style={styles.heroActionBtn} onPress={() => handlePickImage('camera')}>
                          <Ionicons name="camera-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.heroActionBtn} onPress={() => handlePickImage('library')}>
                          <Ionicons name="image-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.heroActionBtn} onPress={() => setUserImageUri(null)}>
                          <Ionicons name="trash-outline" size={18} color={Colors.white} />
                        </TouchableOpacity>
                      </>
                    )}
                  </View>
                </View>
                {!userImageUri && currentSuggestion && (
                  <Text style={styles.attribution}>
                    {'Photo by '}{currentSuggestion.photographer}{' on Unsplash'}
                  </Text>
                )}
              </View>
            ) : (
              <View style={styles.heroCardEmpty}>
                <View style={styles.heroEmptyButtons}>
                  <TouchableOpacity style={styles.heroEmptyBtn} onPress={() => handlePickImage('camera')}>
                    <Ionicons name="camera-outline" size={18} color={Colors.primary} />
                    <Text style={styles.heroEmptyBtnText}>Camera</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.heroEmptyBtn} onPress={() => handlePickImage('library')}>
                    <Ionicons name="image-outline" size={18} color={Colors.primary} />
                    <Text style={styles.heroEmptyBtnText}>Library</Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.heroEmptyHint}>No image? That's fine — you can add one later</Text>
              </View>
            )}
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>BASICS</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Recipe name"
              placeholderTextColor={Colors.textSecondary}
              testID="input-name"
            />
            <View style={styles.fieldDivider} />
            <TextInput
              style={[styles.fieldInput, styles.descInput]}
              value={description}
              onChangeText={setDescription}
              placeholder="Add a short description..."
              placeholderTextColor={Colors.textSecondary}
              multiline
              testID="input-description"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>MEAL TYPE</Text>
            <View style={styles.chipRow}>
              {MEAL_TYPE_OPTIONS.map((opt) => {
                const active = mealType === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setMealType(active ? '' : opt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>COOK TIME</Text>
            <View style={styles.chipRow}>
              {COOK_TIME_OPTIONS.map((opt) => {
                const active = cookTimeBand === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setCookTimeBand(active ? '' : opt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>CUISINE</Text>
            <TextInput
              style={styles.fieldInput}
              value={cuisine}
              onChangeText={setCuisine}
              placeholder="e.g. Italian, Mexican, Asian..."
              placeholderTextColor={Colors.textSecondary}
              testID="input-cuisine"
            />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>DIETARY</Text>
            <View style={styles.chipWrap}>
              {DIETARY_CHIPS.map((opt) => {
                const active = dietaryTags.includes(opt.value);
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleDietary(opt.value)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>SERVES</Text>
            <View style={styles.servingRow}>
              <ServingStepper
                value={servingSize}
                min={1}
                max={12}
                onValueChange={setServingSize}
              />
            </View>
          </View>

          {(ingredients.length > 0 || isEditingIngredients) && (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>INGREDIENTS</Text>
                <TouchableOpacity onPress={() => setIsEditingIngredients(v => !v)}>
                  <Text style={styles.editLinkText}>
                    {isEditingIngredients ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingIngredients ? (
                <>
                  {ingredients.map((ing, idx) => (
                    <View key={ing.id ?? String(idx)} style={styles.editIngredientRow}>
                      <TextInput
                        style={[styles.editIngredientInput, styles.editIngredientQty]}
                        value={ing.quantity > 0 ? String(ing.quantity) : ''}
                        onChangeText={v => updateIngredientQuantity(idx, v)}
                        placeholder="Qty"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.editIngredientInput, styles.editIngredientUnit]}
                        value={ing.unit}
                        onChangeText={v => updateIngredient(idx, 'unit', v)}
                        placeholder="Unit"
                        placeholderTextColor={Colors.textSecondary}
                      />
                      <TextInput
                        style={[styles.editIngredientInput, styles.editIngredientName]}
                        value={ing.name}
                        onChangeText={v => updateIngredient(idx, 'name', v)}
                        placeholder="Ingredient"
                        placeholderTextColor={Colors.textSecondary}
                      />
                      <TouchableOpacity onPress={() => removeIngredient(idx)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addRowBtn} onPress={addIngredient}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addRowText}>Add ingredient</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {ingredients.map((ing, idx) => (
                    <View key={ing.id ?? String(idx)} style={[styles.ingredientRow, idx < ingredients.length - 1 && styles.rowDivider]}>
                      <Text style={styles.ingredientText}>
                        {ing.quantity > 0 ? `${ing.quantity} ` : ''}
                        {ing.unit ? `${ing.unit} ` : ''}
                        {ing.name}
                      </Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}

          {(methodSteps.length > 0 || isEditingMethod) && (
            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionLabel}>METHOD</Text>
                <TouchableOpacity onPress={() => setIsEditingMethod(v => !v)}>
                  <Text style={styles.editLinkText}>
                    {isEditingMethod ? 'Done' : 'Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {isEditingMethod ? (
                <>
                  {methodSteps.map((step, idx) => (
                    <View key={idx} style={styles.editStepRow}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                      </View>
                      <TextInput
                        style={styles.editStepInput}
                        value={step}
                        onChangeText={v => updateStep(idx, v)}
                        placeholder={`Step ${idx + 1}...`}
                        placeholderTextColor={Colors.textSecondary}
                        multiline
                      />
                      <TouchableOpacity onPress={() => removeStep(idx)} hitSlop={8}>
                        <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity style={styles.addRowBtn} onPress={addStep}>
                    <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                    <Text style={styles.addRowText}>Add step</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {methodSteps.map((step, idx) => (
                    <View key={idx} style={[styles.stepRow, idx < methodSteps.length - 1 && styles.rowDivider]}>
                      <View style={styles.stepBadge}>
                        <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                      </View>
                      <Text style={styles.stepText}>{step}</Text>
                    </View>
                  ))}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveFullBtn, !canSave && styles.saveFullBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.85}
          testID="btn-save-to-favs"
        >
          <Text style={styles.saveFullBtnText}>{isAddingToPlan ? 'Add to Meal Plan' : 'Save to Favourites'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxxl,
  },
  loadingTitle: {
    fontSize: 17,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 6,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  headerSide: {
    width: 56,
    alignItems: 'flex-start',
  },
  headerSideRight: {
    alignItems: 'flex-end',
  },
  headerTitleBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: '#7C3AED',
    textAlign: 'center',
    marginTop: 2,
  },
  headerSaveText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  headerSaveTextDisabled: {
    color: Colors.inactive,
  },
  scrollContent: {
    paddingTop: Spacing.lg,
    paddingHorizontal: 0,
  },
  heroZoneWrapper: {
    marginBottom: Spacing.sm,
  },
  heroCard: {
    height: 220,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.lg,
    overflow: 'hidden',
    backgroundColor: Colors.border,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  heroImageFull: {
    width: '100%',
    height: 220,
  },
  heroGradientOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  suggestedPill: {
    position: 'absolute',
    bottom: 10,
    left: 12,
    backgroundColor: 'rgba(123,104,204,0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
  },
  suggestedPillText: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.white,
  },
  heroActions: {
    position: 'absolute',
    bottom: 8,
    right: 10,
    flexDirection: 'row',
    gap: 8,
  },
  heroActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  attribution: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 4,
    marginHorizontal: Spacing.lg,
    marginBottom: 4,
  },
  heroCardEmpty: {
    height: 220,
    borderRadius: BorderRadius.card,
    marginHorizontal: Spacing.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEmptyButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  heroEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  heroEmptyBtnText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  heroEmptyHint: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    marginHorizontal: Spacing.lg,
    ...Shadows.card,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  fieldInput: {
    fontSize: 17,
    fontWeight: '400' as const,
    color: Colors.text,
    paddingVertical: Spacing.xs,
    minHeight: 36,
  },
  descInput: {
    fontSize: 15,
    color: Colors.textSecondary,
    minHeight: 60,
    textAlignVertical: 'top' as const,
  },
  fieldDivider: {
    height: 1,
    backgroundColor: Colors.divider,
    marginVertical: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 2,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: 2,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: Colors.primaryLight,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.primary,
  },
  servingRow: {
    marginTop: 4,
  },
  ingredientRow: {
    paddingVertical: Spacing.sm,
  },
  ingredientText: {
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.text,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  stepBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  editLink: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    alignItems: 'center' as const,
    marginBottom: Spacing.sm,
  },
  editIngredientRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  editIngredientInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text,
  },
  editIngredientQty: {
    width: 48,
    textAlign: 'center' as const,
  },
  editIngredientUnit: {
    width: 56,
  },
  editIngredientName: {
    flex: 1,
  },
  editStepRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  editStepInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    minHeight: 40,
    textAlignVertical: 'top' as const,
  },
  addRowBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  addRowText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  editLinkText: {
    fontSize: 14,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  stickyFooter: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
  },
  saveFullBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button + 2,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveFullBtnDisabled: {
    backgroundColor: Colors.inactive,
  },
  saveFullBtnText: {
    fontSize: 16,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
