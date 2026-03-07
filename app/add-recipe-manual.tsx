import React, { useState, useCallback, useMemo } from 'react';
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
  Linking,
  ActivityIndicator,
} from 'react-native';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { X, Plus, Minus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { detectPlatformFromUrl, getPlatformLabel } from '@/services/deliveryUtils';
import { extractRecipeMetadata } from '@/services/recipeExtraction';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import FilterPill from '@/components/FilterPill';
import ServingStepper from '@/components/ServingStepper';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { consumePendingPlanSlot } from '@/services/pendingPlanSlot';
import {
  Recipe,
  Ingredient,
  PlannedMeal,
  CUISINE_OPTIONS,
  COOKING_TIME_BANDS,
  DISH_CATEGORY_OPTIONS,
  PROTEIN_SOURCE_OPTIONS,
  ALLERGEN_OPTIONS,
  DIET_LABEL_OPTIONS,
  OCCASION_OPTIONS,
} from '@/types';

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

  // ── Core recipe fields ───────────────────────────────────────────────────────
  const [name, setName] = useState<string>(editMeal?.name ?? '');
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
  const [methodSteps, setMethodSteps] = useState<string[]>(
    editMeal?.method_steps?.length ? editMeal.method_steps : ['']
  );
  const [deliveryUrl, setDeliveryUrl] = useState<string>(editMeal?.delivery_url ?? '');

  // ── Cook time (standalone) ───────────────────────────────────────────────────
  const [cookingTimeBand, setCookingTimeBand] = useState<string>(editMeal?.cooking_time_band ?? '');

  // ── Recipe Details accordion ─────────────────────────────────────────────────
  const [accordionOpen, setAccordionOpen] = useState<boolean>(false);
  const [isAiFillingMetadata, setIsAiFillingMetadata] = useState<boolean>(false);
  // Tracks whether AI fill has run at least once (for new meals — auto-fills on first open)
  const [hasAutoFilled, setHasAutoFilled] = useState<boolean>(false);
  // Meal type slot (plan integration)
  const [mealTypeSlotId, setMealTypeSlotId] = useState<string>(editMeal?.meal_type_slot_id ?? '');
  // Cuisine
  const [cuisine, setCuisine] = useState<string>(editMeal?.cuisine ?? '');
  // Classification
  const [dishCategory, setDishCategory] = useState<string>(editMeal?.dish_category ?? '');
  const [proteinSource, setProteinSource] = useState<string>(editMeal?.protein_source ?? '');
  // Dietary
  const [dietLabels, setDietLabels] = useState<string[]>(editMeal?.diet_labels ?? []);
  const [allergens, setAllergens] = useState<string[]>(editMeal?.allergens ?? []);
  const [occasions, setOccasions] = useState<string[]>(editMeal?.occasions ?? []);
  // Time (exact minutes)
  const [prepTime, setPrepTime] = useState<string>(editMeal?.prep_time != null ? String(editMeal.prep_time) : '');
  const [cookTime, setCookTime] = useState<string>(editMeal?.cook_time != null ? String(editMeal.cook_time) : '');
  // Nutrition
  const [caloriesPerServing, setCaloriesPerServing] = useState<string>(
    editMeal?.calories_per_serving != null ? String(editMeal.calories_per_serving) : ''
  );
  const [proteinPerServingG, setProteinPerServingG] = useState<string>(
    editMeal?.protein_per_serving_g != null ? String(editMeal.protein_per_serving_g) : ''
  );
  const [carbsPerServingG, setCarbsPerServingG] = useState<string>(
    editMeal?.carbs_per_serving_g != null ? String(editMeal.carbs_per_serving_g) : ''
  );
  // Description & custom tags
  const [description, setDescription] = useState<string>(editMeal?.description ?? '');
  const [customTags, setCustomTags] = useState<string[]>(editMeal?.custom_tags ?? []);
  const [newTag, setNewTag] = useState<string>('');

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  // ── AI fill ──────────────────────────────────────────────────────────────────
  const handleAiFill = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Name required', 'Add a meal name first so AI knows what to classify.');
      return;
    }
    setIsAiFillingMetadata(true);
    try {
      const validIngredients = ingredients
        .filter((i) => i.name.trim())
        .map((i) => ({
          name: i.name.trim(),
          quantity: parseFloat(i.quantity) || 0,
          unit: i.unit.trim() || 'pc',
        }));
      const result = await extractRecipeMetadata(name.trim(), validIngredients);
      if (result.cuisine) setCuisine(result.cuisine);
      if (result.meal_type) {
        const normalised = result.meal_type.toLowerCase();
        const match = sortedSlots.find(
          (slot) =>
            slot.name.toLowerCase().includes(normalised) ||
            normalised.includes(slot.name.toLowerCase())
        );
        if (match) setMealTypeSlotId(match.slot_id);
      }
      if (result.dish_category) setDishCategory(result.dish_category);
      if (result.protein_source) setProteinSource(result.protein_source);
      if (result.diet_labels?.length) setDietLabels(result.diet_labels);
      if (result.allergens?.length) setAllergens(result.allergens);
      if (result.occasions?.length) setOccasions(result.occasions);
      if (result.calories_per_serving != null) setCaloriesPerServing(String(result.calories_per_serving));
      if (result.protein_per_serving_g != null) setProteinPerServingG(String(result.protein_per_serving_g));
      if (result.carbs_per_serving_g != null) setCarbsPerServingG(String(result.carbs_per_serving_g));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.log('[AddMeal] AI fill failed:', e);
      Alert.alert('Could not auto-fill', "AI couldn't classify this recipe. Please fill in manually.");
    } finally {
      setIsAiFillingMetadata(false);
    }
  }, [name, ingredients, sortedSlots]);

  // Opening the accordion on a NEW meal auto-triggers AI fill on first open.
  // On edit mode the accordion just opens normally — details are already filled.
  const handleAccordionToggle = useCallback(() => {
    const opening = !accordionOpen;
    setAccordionOpen(opening);
    if (opening && !isEditing && !hasAutoFilled && name.trim()) {
      setHasAutoFilled(true);
      handleAiFill();
    }
  }, [accordionOpen, isEditing, hasAutoFilled, name, handleAiFill]);

  // ── Ingredient helpers ───────────────────────────────────────────────────────
  const addIngredientRow = useCallback(() => {
    setIngredients((prev) => [...prev, { name: '', quantity: '', unit: '' }]);
  }, []);

  const updateIngredient = useCallback((idx: number, field: string, value: string) => {
    setIngredients((prev) => prev.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }, []);

  const removeIngredient = useCallback((idx: number) => {
    setIngredients((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Method step helpers ──────────────────────────────────────────────────────
  const addStep = useCallback(() => {
    setMethodSteps((prev) => [...prev, '']);
  }, []);

  const updateStep = useCallback((idx: number, value: string) => {
    setMethodSteps((prev) => prev.map((s, i) => (i === idx ? value : s)));
  }, []);

  const removeStep = useCallback((idx: number) => {
    setMethodSteps((prev) => prev.filter((_, i) => i !== idx));
  }, []);

  // ── Toggle helpers ───────────────────────────────────────────────────────────
  const toggleDietLabel = useCallback((tag: string) => {
    setDietLabels((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }, []);

  const toggleAllergen = useCallback((tag: string) => {
    setAllergens((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  }, []);

  const toggleOccasion = useCallback((tag: string) => {
    setOccasions((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
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

  // ── Save ─────────────────────────────────────────────────────────────────────
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
    // Derive legacy dietary_tags for backward compat
    const derivedDietaryTags = [...new Set([...dietLabels, ...allergens])];

    if (isEditing && editMeal) {
      updateFav(editMeal.id, {
        name: name.trim(),
        image_url: undefined,
        // Time
        cooking_time_band: cookingTimeBand as Recipe['cooking_time_band'] || undefined,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        cook_time: cookTime ? parseInt(cookTime) : undefined,
        // Slot
        meal_type_slot_id: mealTypeSlotId || undefined,
        // Classification
        cuisine: cuisine || undefined,
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
        // Legacy
        dietary_tags: derivedDietaryTags,
        custom_tags: customTags,
        description: description || undefined,
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
          { text: 'Add Anyway', onPress: () => saveMeal(validIngredients, validSteps, derivedDietaryTags) },
        ]
      );
      return;
    }

    saveMeal(validIngredients, validSteps, derivedDietaryTags);
  }, [
    name, cookingTimeBand, prepTime, cookTime, mealTypeSlotId,
    cuisine, dishCategory, proteinSource, occasions,
    dietLabels, allergens,
    caloriesPerServing, proteinPerServingG, carbsPerServingG,
    customTags, description, servingSize, ingredients, methodSteps,
    isEditing, editMeal, updateFav, isFavByName,
  ]);

  const saveMeal = useCallback((
    validIngredients: Ingredient[],
    validSteps: string[],
    derivedDietaryTags: string[],
  ) => {
    const newMeal: Recipe = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      image_url: undefined,
      // Time
      cooking_time_band: cookingTimeBand as Recipe['cooking_time_band'] || undefined,
      prep_time: prepTime ? parseInt(prepTime) : undefined,
      cook_time: cookTime ? parseInt(cookTime) : undefined,
      // Slot
      meal_type_slot_id: mealTypeSlotId || undefined,
      // Classification
      cuisine: cuisine || undefined,
      dish_category: dishCategory || undefined,
      protein_source: proteinSource || undefined,
      occasions: occasions.length > 0 ? occasions : undefined,
      // Dietary
      diet_labels: dietLabels.length > 0 ? dietLabels : undefined,
      allergens: allergens.length > 0 ? allergens : undefined,
      // Nutrition
      calories_per_serving: caloriesPerServing ? parseFloat(caloriesPerServing) : undefined,
      protein_per_serving_g: proteinPerServingG ? parseFloat(proteinPerServingG) : undefined,
      carbs_per_serving_g: carbsPerServingG ? parseFloat(carbsPerServingG) : undefined,
      // Legacy / required
      dietary_tags: derivedDietaryTags,
      custom_tags: customTags,
      description: description || undefined,
      recipe_serving_size: servingSize,
      ingredients: validIngredients,
      method_steps: validSteps,
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
  }, [
    name, cookingTimeBand, prepTime, cookTime, mealTypeSlotId,
    cuisine, dishCategory, proteinSource, occasions,
    dietLabels, allergens,
    caloriesPerServing, proteinPerServingG, carbsPerServingG,
    customTags, description, servingSize, deliveryUrl, addFav,
  ]);

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

          {/* Hero image */}
          <MealImagePlaceholder size="hero" mealType={mealTypeSlotId} cuisine={cuisine} name={name} />

          {/* Name */}
          <Text style={styles.label}>Meal name *</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Mum's Chicken Pie"
            placeholderTextColor={Colors.textSecondary}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            testID="meal-name-input"
          />

          {/* INGREDIENTS */}
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

          {/* METHOD STEPS */}
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

          {/* SERVES */}
          <Text style={styles.label}>Default serving size</Text>
          <View style={styles.servingWrap}>
            <ServingStepper value={servingSize} onValueChange={setServingSize} />
          </View>

          {/* COOK TIME (standalone) */}
          <Text style={styles.label}>Cooking time</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillRowContent}>
            {COOKING_TIME_BANDS.map((t) => (
              <FilterPill
                key={t}
                label={`${t} min`}
                active={cookingTimeBand === t}
                onPress={() => setCookingTimeBand(cookingTimeBand === t ? '' : t)}
              />
            ))}
          </ScrollView>

          {/* RECIPE DETAILS ACCORDION */}
          <TouchableOpacity
            style={[styles.accordionHeader, accordionOpen && styles.accordionHeaderOpen]}
            onPress={handleAccordionToggle}
            activeOpacity={0.75}
          >
            <View style={styles.accordionHeaderLeft}>
              <Ionicons name="sparkles" size={17} color={Colors.primary} />
              <View style={styles.accordionHeaderTextBlock}>
                <Text style={styles.accordionHeaderTitle}>Recipe Details</Text>
                <Text style={styles.accordionHeaderSubtitle}>
                  {isEditing
                    ? 'Dish type · Protein · Dietary · Nutrition'
                    : 'Tap to open — AI fills this for you'}
                </Text>
              </View>
            </View>
            <Ionicons
              name={accordionOpen ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={Colors.primary}
            />
          </TouchableOpacity>

          {accordionOpen && (
            <View style={styles.accordionBody}>

              {/* AI Fill button */}
              <TouchableOpacity
                style={[styles.aiFillBtn, isAiFillingMetadata && styles.aiFillBtnLoading]}
                onPress={handleAiFill}
                disabled={isAiFillingMetadata}
                activeOpacity={0.8}
              >
                {isAiFillingMetadata ? (
                  <>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.aiFillBtnText}>Auto-filling…</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="sparkles" size={16} color={Colors.primary} />
                    <Text style={styles.aiFillBtnText}>
                      {hasAutoFilled ? 'Re-fill with AI' : 'Auto-fill with AI'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {/* Meal Slot */}
              <Text style={styles.accordionFieldLabel}>Meal type</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillRowContent}>
                {sortedSlots.map((slot) => (
                  <FilterPill
                    key={slot.slot_id}
                    label={slot.name}
                    active={mealTypeSlotId === slot.slot_id}
                    onPress={() => setMealTypeSlotId(mealTypeSlotId === slot.slot_id ? '' : slot.slot_id)}
                  />
                ))}
              </ScrollView>

              {/* Cuisine */}
              <Text style={styles.accordionFieldLabel}>Cuisine</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillRowContent}>
                {CUISINE_OPTIONS.map((c) => (
                  <FilterPill
                    key={c}
                    label={c}
                    active={cuisine === c}
                    onPress={() => setCuisine(cuisine === c ? '' : c)}
                  />
                ))}
              </ScrollView>

              {/* Dish Type */}
              <Text style={styles.accordionFieldLabel}>Dish Type</Text>
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

              {/* Protein Source */}
              <Text style={styles.accordionFieldLabel}>Protein</Text>
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

              {/* Diet Labels */}
              <Text style={styles.accordionFieldLabel}>Diet Labels</Text>
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

              {/* Allergens / Free From */}
              <Text style={styles.accordionFieldLabel}>Free From</Text>
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

              {/* Occasions */}
              <Text style={styles.accordionFieldLabel}>Occasions</Text>
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

              {/* Prep & Cook time */}
              <View style={styles.timeInputRow}>
                <View style={styles.timeInputWrap}>
                  <Text style={styles.accordionFieldLabel}>Prep (min)</Text>
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
                  <Text style={styles.accordionFieldLabel}>Cook (min)</Text>
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

              {/* Nutrition */}
              <Text style={styles.accordionFieldLabel}>Nutrition (per serving)</Text>
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

              {/* Description / notes */}
              <Text style={styles.accordionFieldLabel}>Description / notes</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Any notes about this meal..."
                placeholderTextColor={Colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />

              {/* Custom tags */}
              <Text style={styles.accordionFieldLabel}>Custom tags</Text>
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

            </View>
          )}

          {/* ORDERING / DELIVERY */}
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
  },
  pillRowContent: {
    gap: 6,
    paddingRight: 4,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700' as const,
    color: Colors.text,
    marginTop: 24,
    marginBottom: 12,
  },
  servingWrap: {
    alignItems: 'flex-start',
    paddingVertical: 4,
  },
  timeInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
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
  // ── Accordion ────────────────────────────────────────────────────────────────
  accordionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    marginTop: 24,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.card,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  accordionHeaderOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  accordionHeaderLeft: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    flex: 1,
  },
  accordionHeaderTextBlock: {
    flex: 1,
  },
  accordionHeaderTitle: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  accordionHeaderSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  accordionBody: {
    marginTop: 0,
    backgroundColor: Colors.card,
    borderBottomLeftRadius: BorderRadius.card,
    borderBottomRightRadius: BorderRadius.card,
    padding: 16,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderColor: Colors.primary,
  },
  accordionFieldLabel: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  // ── AI fill button ────────────────────────────────────────────────────────────
  aiFillBtn: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.button,
    borderWidth: 1,
    borderColor: Colors.primary,
    marginTop: 4,
  },
  aiFillBtnLoading: {
    opacity: 0.7,
  },
  aiFillBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  // ── Chips ─────────────────────────────────────────────────────────────────────
  chipWrap: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 6,
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
  // ── Nutrition row ─────────────────────────────────────────────────────────────
  nutritionRow: {
    flexDirection: 'row' as const,
    gap: Spacing.sm,
  },
  nutritionField: {
    flex: 1,
  },
  nutritionLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  nutritionInput: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.button,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
    textAlign: 'center' as const,
  },
  // ── Custom tags ───────────────────────────────────────────────────────────────
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
  // ── Bottom bar ────────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  // ── Delivery ──────────────────────────────────────────────────────────────────
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
