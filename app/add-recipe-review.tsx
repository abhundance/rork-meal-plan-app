import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Camera, XCircle, PlusCircle, ChevronUp, ChevronDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { extractRecipeFromImage, extractRecipeFromText, detectVideoUrlType, extractRecipeFromVideoUrl, extractRecipeMetadata } from '@/services/recipeExtraction';
import { imageStore } from '@/services/imageStore';
import { useFavs } from '@/providers/FavsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { consumePendingPlanSlot, hasPendingPlanSlot, peekPendingPlanSlot } from '@/services/pendingPlanSlot';
import {
  Recipe,
  Ingredient,
  PlannedMeal,
  DISH_CATEGORY_OPTIONS,
  PROTEIN_SOURCE_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_LABEL_OPTIONS,
  OCCASION_OPTIONS,
} from '@/types';
import ServingStepper from '@/components/ServingStepper';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';

type Params = {
  inputMode: 'camera' | 'photos' | 'text' | 'voice' | 'manual' | 'url' | 'pdf';
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


export default function AddMealReviewScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { addFav } = useFavs();
  const { addMeal } = useMealPlan();

  const [isAddingToPlan] = useState<boolean>(() => hasPendingPlanSlot());
  const [pendingSlotName] = useState<string>(() => { const s = peekPendingPlanSlot(); return s ? s.slotName : ''; });

  const inputMode = params.inputMode ?? 'manual';
  // Whether this recipe was AI-extracted (vs manually entered)
  const isAiExtracted = inputMode === 'camera' || inputMode === 'photos' || inputMode === 'text' || inputMode === 'url';

  const [isLoading, setIsLoading] = useState<boolean>(isAiExtracted);
  const [loadingLabel, setLoadingLabel] = useState<string>(
    inputMode === 'url' ? 'Analysing video description…' : 'This takes about 5 seconds',
  );
  const [retryCount, setRetryCount] = useState<number>(0);

  // ── Selected image URI (persisted to image_url on save) ──────────────────────
  const [selectedImageUri, setSelectedImageUri] = useState<string>(params.imageUri ?? '');

  const handlePickImage = useCallback(() => {
    Alert.alert('Change Photo', 'Choose a source', [
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required.'); return; }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]?.uri) setSelectedImageUri(result.assets[0].uri);
        },
      },
      {
        text: 'Choose from Library',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') { Alert.alert('Permission needed', 'Photo library access is required.'); return; }
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
          if (!result.canceled && result.assets?.[0]?.uri) setSelectedImageUri(result.assets[0].uri);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, []);

  // ── Core recipe fields ───────────────────────────────────────────────────────
  const [name, setName] = useState<string>(params.prefillName ?? '');
  const [description, setDescription] = useState<string>(params.prefillDescription ?? '');
  const [servingSize, setServingSize] = useState<number>(() => {
    const n = parseInt(params.prefillServingSize ?? '', 10);
    return isNaN(n) ? 4 : n;
  });
  const [ingredients, setIngredients] = useState<Ingredient[]>(() => {
    if (params.prefillIngredients) {
      try { return JSON.parse(params.prefillIngredients) as Ingredient[]; }
      catch { return []; }
    }
    return [];
  });
  const [methodSteps, setMethodSteps] = useState<string[]>(() => {
    if (params.prefillMethodSteps) {
      try { return JSON.parse(params.prefillMethodSteps) as string[]; }
      catch { return []; }
    }
    return [];
  });
  const [isEditingIngredients, setIsEditingIngredients] = useState(false);
  const [isEditingMethod, setIsEditingMethod] = useState(false);

  // ── Time fields ──────────────────────────────────────────────────────────────
  const [cookTimeBand, setCookTimeBand] = useState<CookTimeBand | ''>(() => {
    const v = params.prefillCookingTimeBand ?? '';
    if (v === 'Under 30' || v === '30-60' || v === 'Over 60') return v;
    return '';
  });
  const [prepTime, setPrepTime] = useState<number>(0);
  const [cookTime, setCookTime] = useState<number>(0);

  // ── Recipe Details accordion fields ─────────────────────────────────────────
  const [accordionOpen, setAccordionOpen] = useState<boolean>(false);
  // hasAutoFilled: true once extractRecipeMetadata has run (either via useEffect extraction or on-demand)
  // Prevents re-triggering auto-fill on every accordion open.
  const [hasAutoFilled, setHasAutoFilled] = useState<boolean>(false);
  const [isAutoFillingDetails, setIsAutoFillingDetails] = useState<boolean>(false);
  const [mealType, setMealType] = useState<MealTypeValue | ''>(() => {
    const v = params.prefillMealType ?? '';
    if (v === 'breakfast' || v === 'lunch_dinner' || v === 'light_bites') return v;
    return '';
  });
  const [cuisine, setCuisine] = useState<string>(params.prefillCuisine ?? '');
  const [dishCategory, setDishCategory] = useState<string>('');
  const [proteinSource, setProteinSource] = useState<string>('');
  const [dietLabels, setDietLabels] = useState<string[]>(() => {
    if (params.prefillDietaryTags) {
      try { return JSON.parse(params.prefillDietaryTags) as string[]; }
      catch { return []; }
    }
    return [];
  });
  const [allergens, setAllergens] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [caloriesPerServing, setCaloriesPerServing] = useState<string>('');
  const [proteinPerServingG, setProteinPerServingG] = useState<string>('');
  const [carbsPerServingG, setCarbsPerServingG] = useState<string>('');

  // Show "AI filled" badge on accordion header when AI populated at least one detail field.
  // Covers both extraction-path (isAiExtracted) and on-demand auto-fill (hasAutoFilled).
  const accordionHasAiFill = (isAiExtracted || hasAutoFilled) && (
    !!mealType || !!cuisine || !!dishCategory || !!proteinSource ||
    dietLabels.length > 0 || allergens.length > 0 || occasions.length > 0 ||
    !!caloriesPerServing
  );

  // ── Extraction ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAiExtracted) return;

    const doExtract = async () => {
      setIsLoading(true);
      console.log('[Review] Starting extraction, mode:', inputMode);
      try {
        let result;
        if (inputMode === 'camera' || inputMode === 'photos') {
          const stored = imageStore.get();
          if (!stored?.base64) { setIsLoading(false); return; }
          result = await extractRecipeFromImage(stored.base64);
          if (stored.uri) setSelectedImageUri(stored.uri);
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

        // Core fields
        if (result.name) setName(result.name);
        if (result.description) setDescription(result.description);
        if (result.recipe_serving_size > 0) setServingSize(result.recipe_serving_size);
        if (result.ingredients?.length) {
          setIngredients(
            result.ingredients.map((ing, idx) => ({
              id: `ing_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`,
              name: ing.name,
              quantity: ing.quantity,
              unit: ing.unit,
              category: 'Other',
            })),
          );
        }
        if (result.method_steps?.length) setMethodSteps(result.method_steps);

        // Time fields
        if (result.cooking_time_band) setCookTimeBand(result.cooking_time_band);
        if (result.prep_time > 0) setPrepTime(result.prep_time);
        if (result.cook_time > 0) setCookTime(result.cook_time);

        // Accordion / details fields
        if (result.meal_type) setMealType(result.meal_type);
        if (result.cuisine) setCuisine(result.cuisine);
        if (result.dish_category) setDishCategory(result.dish_category);
        if (result.protein_source) setProteinSource(result.protein_source);
        if (result.diet_labels?.length) setDietLabels(result.diet_labels);
        if (result.allergens?.length) setAllergens(result.allergens);
        if (result.occasions?.length) setOccasions(result.occasions);
        if (result.calories_per_serving != null) setCaloriesPerServing(String(result.calories_per_serving));
        if (result.protein_per_serving_g != null) setProteinPerServingG(String(result.protein_per_serving_g));
        if (result.carbs_per_serving_g != null) setCarbsPerServingG(String(result.carbs_per_serving_g));

        // Auto-open accordion when AI populated at least one detail field
        if (result.dish_category || result.protein_source || result.diet_labels?.length || result.allergens?.length) {
          setAccordionOpen(true);
        }

        // Mark as already filled so the on-demand accordion auto-fill doesn't retrigger
        setHasAutoFilled(true);

        console.log('[Review] Extraction complete:', result.name);
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


  // ── Ingredient helpers ───────────────────────────────────────────────────────
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
      { id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, name: '', quantity: 0, unit: '', category: 'Other' }
    ]);
  };

  // ── Method step helpers ──────────────────────────────────────────────────────
  const updateStep = (idx: number, value: string) => {
    setMethodSteps(prev => prev.map((s, i) => i === idx ? value : s));
  };
  const removeStep = (idx: number) => {
    setMethodSteps(prev => prev.filter((_, i) => i !== idx));
  };
  const addStep = () => {
    setMethodSteps(prev => [...prev, '']);
  };

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggleDietLabel = useCallback((tag: string) => {
    setDietLabels(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);
  const toggleAllergen = useCallback((tag: string) => {
    setAllergens(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);
  const toggleOccasion = useCallback((tag: string) => {
    setOccasions(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  // ── Accordion auto-fill ───────────────────────────────────────────────────────
  // Mirrors the manual-mode accordion behaviour in add-recipe-entry.tsx.
  // Calls extractRecipeMetadata to populate detail fields (dish type, protein,
  // diet labels, allergens, occasions, nutrition) that aren't passed as params
  // from voice extraction or weren't fetched by the main extraction useEffect.
  const handleAutoFillDetails = useCallback(async () => {
    if (!name.trim()) return;
    setIsAutoFillingDetails(true);
    try {
      const validIngredients = ingredients.map((i) => ({
        name: i.name, quantity: i.quantity, unit: i.unit || 'pc',
      }));
      const result = await extractRecipeMetadata(name.trim(), validIngredients);
      if (result.dish_category) setDishCategory(result.dish_category);
      if (result.protein_source) setProteinSource(result.protein_source);
      if (result.diet_labels?.length) setDietLabels(result.diet_labels);
      if (result.allergens?.length) setAllergens(result.allergens);
      if (result.occasions?.length) setOccasions(result.occasions);
      if (result.calories_per_serving != null) setCaloriesPerServing(String(result.calories_per_serving));
      if (result.protein_per_serving_g != null) setProteinPerServingG(String(result.protein_per_serving_g));
      if (result.carbs_per_serving_g != null) setCarbsPerServingG(String(result.carbs_per_serving_g));
      // Fill meal_type / cuisine only if not already set from prefill or extraction
      if (!mealType && result.meal_type) setMealType(result.meal_type as MealTypeValue);
      if (!cuisine && result.cuisine) setCuisine(result.cuisine);
    } catch {
      // Silent fail — accordion remains open, user can fill manually
    } finally {
      setIsAutoFillingDetails(false);
    }
  }, [name, ingredients, mealType, cuisine]);

  const handleAccordionToggle = useCallback(() => {
    const opening = !accordionOpen;
    setAccordionOpen(opening);
    // Trigger auto-fill the first time the accordion is opened and details are empty
    if (opening && !hasAutoFilled && !isLoading && name.trim()) {
      setHasAutoFilled(true);
      void handleAutoFillDetails();
    }
  }, [accordionOpen, hasAutoFilled, isLoading, name, handleAutoFillDetails]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    // Derive legacy dietary_tags from new split fields for backward compat
    const derivedDietaryTags = [...new Set([...dietLabels, ...allergens])];

    const meal: Recipe = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
      image_url: selectedImageUri || undefined,
      description: description.trim() || undefined,
      // Time
      cooking_time_band: cookTimeBand ? cookTimeBand : undefined,
      prep_time: prepTime > 0 ? prepTime : undefined,
      cook_time: cookTime > 0 ? cookTime : undefined,
      // Classification
      meal_type: mealType ? mealType : undefined,
      cuisine: cuisine.trim() || undefined,
      dish_category: (dishCategory as Recipe['dish_category']) || undefined,
      protein_source: (proteinSource as Recipe['protein_source']) || undefined,
      occasions: occasions.length > 0 ? occasions : undefined,
      // Dietary
      diet_labels: dietLabels.length > 0 ? dietLabels : undefined,
      allergens: allergens.length > 0 ? allergens : undefined,
      // Nutrition
      calories_per_serving: caloriesPerServing ? parseFloat(caloriesPerServing) : undefined,
      protein_per_serving_g: proteinPerServingG ? parseFloat(proteinPerServingG) : undefined,
      carbs_per_serving_g: carbsPerServingG ? parseFloat(carbsPerServingG) : undefined,
      // Legacy / required fields
      dietary_tags: derivedDietaryTags,
      custom_tags: [],
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
      router.dismissAll();
    } else {
      router.dismissAll();
    }
  }, [
    name, description, cookTimeBand, prepTime, cookTime,
    mealType, cuisine, dishCategory, proteinSource, occasions,
    dietLabels, allergens,
    caloriesPerServing, proteinPerServingG, carbsPerServingG,
    ingredients, servingSize, methodSteps,
    addFav, addMeal, router,
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

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.headerSide}>
            <ChevronLeft size={24} color={Colors.text} strokeWidth={2} />
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
          <TouchableOpacity style={styles.heroZoneWrapper} onPress={handlePickImage} activeOpacity={0.8}>
            {selectedImageUri ? (
              <Image source={{ uri: selectedImageUri }} style={styles.heroImage} resizeMode="cover" />
            ) : (
              <MealImagePlaceholder size="hero" mealType={mealType || undefined} cuisine={cuisine || undefined} name={name} familyInitials={name || ' '} />
            )}
            <View style={styles.heroEditBadge}>
              <Camera size={16} color={Colors.white} strokeWidth={2} />
              <Text style={styles.heroEditBadgeText}>
                {selectedImageUri ? 'Change photo' : 'Add photo'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* BASICS — name + description */}
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>RECIPE NAME</Text>
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

          {/* INGREDIENTS */}
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
                      <XCircle size={20} color={Colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={addIngredient}>
                  <PlusCircle size={18} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.addRowText}>Add ingredient</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {ingredients.length === 0 ? (
                  <Text style={styles.emptyHint}>No ingredients yet — tap Edit to add</Text>
                ) : ingredients.map((ing, idx) => (
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

          {/* METHOD */}
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
                      <XCircle size={20} color={Colors.textSecondary} strokeWidth={2} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity style={styles.addRowBtn} onPress={addStep}>
                  <PlusCircle size={18} color={Colors.primary} strokeWidth={2} />
                  <Text style={styles.addRowText}>Add step</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                {methodSteps.length === 0 ? (
                  <Text style={styles.emptyHint}>No steps yet — tap Edit to add</Text>
                ) : methodSteps.map((step, idx) => (
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

          {/* SERVES */}
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

          {/* COOK TIME */}
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

          {/* RECIPE DETAILS ACCORDION */}
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.accordionHeader}
              onPress={handleAccordionToggle}
              activeOpacity={0.8}
            >
              <View style={styles.accordionHeaderLeft}>
                <Text style={styles.sectionLabel}>RECIPE DETAILS</Text>
                {accordionHasAiFill && (
                  <View style={styles.aiBadge}>
                    <Text style={styles.aiBadgeText}>AI filled</Text>
                  </View>
                )}
              </View>
              {accordionOpen
                ? <ChevronUp size={18} color={Colors.textSecondary} strokeWidth={2} />
                : <ChevronDown size={18} color={Colors.textSecondary} strokeWidth={2} />
              }
            </TouchableOpacity>

            {accordionOpen && (
              <View style={styles.accordionBody}>

                {/* Auto-fill loading state */}
                {isAutoFillingDetails && (
                  <View style={styles.autoFillStatus}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.autoFillStatusText}>Auto-filling details…</Text>
                  </View>
                )}

                {/* Meal Type */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Meal Type</Text>
                    {isAiExtracted && mealType ? <View style={styles.aiDot} /> : null}
                  </View>
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

                {/* Cuisine */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Cuisine</Text>
                    {isAiExtracted && cuisine ? <View style={styles.aiDot} /> : null}
                  </View>
                  <TextInput
                    style={[styles.fieldInput, styles.accordionTextInput]}
                    value={cuisine}
                    onChangeText={setCuisine}
                    placeholder="e.g. Italian, Mexican, Asian..."
                    placeholderTextColor={Colors.textSecondary}
                    testID="input-cuisine"
                  />
                </View>

                {/* Dish Category */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Dish Type</Text>
                    {isAiExtracted && dishCategory ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.chipWrap}>
                    {DISH_CATEGORY_OPTIONS.map((opt) => {
                      const active = dishCategory === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setDishCategory(active ? '' : opt.value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Protein Source */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Protein</Text>
                    {isAiExtracted && proteinSource ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.chipWrap}>
                    {PROTEIN_SOURCE_OPTIONS.map((opt) => {
                      const active = proteinSource === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => setProteinSource(active ? '' : opt.value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {opt.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Diet Labels */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Diet Labels</Text>
                    {isAiExtracted && dietLabels.length > 0 ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.chipWrap}>
                    {DIET_LABEL_OPTIONS.map((value) => {
                      const active = dietLabels.includes(value);
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleDietLabel(value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Allergens / Free From */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Free From</Text>
                    {isAiExtracted && allergens.length > 0 ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.chipWrap}>
                    {ALLERGEN_OPTIONS.map((value) => {
                      const active = allergens.includes(value);
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleAllergen(value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Occasions */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Occasions</Text>
                    {isAiExtracted && occasions.length > 0 ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.chipWrap}>
                    {OCCASION_OPTIONS.map((value) => {
                      const active = occasions.includes(value);
                      return (
                        <TouchableOpacity
                          key={value}
                          style={[styles.chip, active && styles.chipActive]}
                          onPress={() => toggleOccasion(value)}
                        >
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>
                            {value}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                {/* Nutrition */}
                <View style={styles.accordionSection}>
                  <View style={styles.accordionFieldHeader}>
                    <Text style={styles.accordionFieldLabel}>Nutrition (per serving)</Text>
                    {isAiExtracted && caloriesPerServing ? <View style={styles.aiDot} /> : null}
                  </View>
                  <View style={styles.nutritionRow}>
                    <View style={styles.nutritionField}>
                      <Text style={styles.nutritionLabel}>Calories</Text>
                      <TextInput
                        style={styles.nutritionInput}
                        value={caloriesPerServing}
                        onChangeText={setCaloriesPerServing}
                        placeholder="—"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.nutritionField}>
                      <Text style={styles.nutritionLabel}>Protein (g)</Text>
                      <TextInput
                        style={styles.nutritionInput}
                        value={proteinPerServingG}
                        onChangeText={setProteinPerServingG}
                        placeholder="—"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.nutritionField}>
                      <Text style={styles.nutritionLabel}>Carbs (g)</Text>
                      <TextInput
                        style={styles.nutritionInput}
                        value={carbsPerServingG}
                        onChangeText={setCarbsPerServingG}
                        placeholder="—"
                        placeholderTextColor={Colors.textSecondary}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </View>

              </View>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 12 }]}>
        <TouchableOpacity
          style={[styles.saveFullBtn, !canSave && styles.saveFullBtnDisabled]}
          onPress={handleSave}
          disabled={!canSave}
          activeOpacity={0.8}
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
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: Spacing.lg,
    textAlign: 'center',
  },
  loadingSubtitle: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
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
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
  },
  headerSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    textAlign: 'center',
    marginTop: 2,
  },
  headerSaveText: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
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
    overflow: 'hidden' as const,
  },
  heroImage: {
    width: '100%',
    height: 220,
  },
  heroEditBadge: {
    position: 'absolute' as const,
    bottom: 10,
    right: 12,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 5,
    backgroundColor: Colors.overlay,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  heroEditBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
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
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  fieldInput: {
    fontSize: 17,
    fontFamily: FontFamily.regular,
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
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  chipTextActive: {
    color: Colors.white,
  },
  servingRow: {
    marginTop: 4,
  },
  emptyHint: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    fontStyle: 'italic' as const,
    paddingVertical: Spacing.sm,
  },
  ingredientRow: {
    paddingVertical: Spacing.sm,
  },
  ingredientText: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
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
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 20,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
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
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  editLinkText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  // ── Accordion ─────────────────────────────────────────────────────────────
  accordionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  accordionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
  },
  aiBadge: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  aiBadgeText: {
    fontSize: 10,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
    letterSpacing: 0.3,
  },
  accordionBody: {
    marginTop: Spacing.md,
  },
  autoFillStatus: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  autoFillStatusText: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.primary,
  },
  accordionSection: {
    marginBottom: Spacing.lg,
  },
  accordionFieldHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginBottom: Spacing.sm,
  },
  accordionFieldLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
  aiDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  accordionTextInput: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingVertical: Spacing.xs,
  },
  // ── Nutrition row ─────────────────────────────────────────────────────────
  nutritionRow: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },
  nutritionField: {
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  nutritionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  // ── Footer ────────────────────────────────────────────────────────────────
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
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});
