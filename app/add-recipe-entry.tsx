/**
 * Add a Recipe — unified entry screen (modal).
 *
 * Two modes, toggled entirely via local state — no navigation:
 *   ✨ AI Mode  (left, default) — chat-style input
 *   ✏️ Manual   (right)        — full manual entry form
 *
 * All navigation to the Add a Recipe flow goes to /add-recipe-entry.
 */
import React, { useState, useCallback, useMemo, useRef } from 'react';
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
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import {
  X, Plus, Minus, Camera, Sparkles, ChevronUp, ChevronDown,
  Mic, Send,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  extractRecipeMetadata,
  extractRecipeFromVideoUrl,
  extractRecipeFromText,
  ExtractedRecipe,
} from '@/services/recipeExtraction';
import { imageStore } from '@/services/imageStore';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing, Shadows } from '@/constants/theme';
import PrimaryButton from '@/components/PrimaryButton';
import FilterPill from '@/components/FilterPill';
import ServingStepper from '@/components/ServingStepper';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
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

type Mode = 'ai' | 'manual';

const AI_BULLETS = [
  { emoji: '🔗', text: 'Paste a link from the web' },
  { emoji: '🎙️', text: 'Describe it by voice' },
  { emoji: '📷', text: 'Share a photo' },
  { emoji: '▶️', text: 'Paste a YouTube or TikTok link' },
];

export default function AddRecipeEntryScreen() {
  const insets = useSafeAreaInsets();
  const { meals, addFav, isFavByName } = useFavs();
  const { familySettings } = useFamilySettings();
  const { addMeal } = useMealPlan();

  // ── Mode toggle ──────────────────────────────────────────────────────────────
  const [mode, setMode] = useState<Mode>('ai');

  // ── AI Mode state ────────────────────────────────────────────────────────────
  const [aiInput, setAiInput] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);

  // ── Manual Mode state ────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [servingSize, setServingSize] = useState<number>(familySettings.default_serving_size);
  const [ingredients, setIngredients] = useState<{ name: string; quantity: string; unit: string }[]>([
    { name: '', quantity: '', unit: '' },
  ]);
  const [methodSteps, setMethodSteps] = useState<string[]>(['']);
  const [cookingTimeBand, setCookingTimeBand] = useState('');
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [isAiFillingMetadata, setIsAiFillingMetadata] = useState(false);
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [selectedImageUri, setSelectedImageUri] = useState('');
  const [mealType, setMealType] = useState('');
  const [cuisine, setCuisine] = useState('');
  const [dishCategory, setDishCategory] = useState('');
  const [proteinSource, setProteinSource] = useState('');
  const [dietLabels, setDietLabels] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [occasions, setOccasions] = useState<string[]>([]);
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [caloriesPerServing, setCaloriesPerServing] = useState('');
  const [proteinPerServingG, setProteinPerServingG] = useState('');
  const [carbsPerServingG, setCarbsPerServingG] = useState('');
  const [description, setDescription] = useState('');
  const [customTags, setCustomTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // ── AI Mode handlers ─────────────────────────────────────────────────────────
  const isUrl = (text: string) => {
    const lower = text.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://');
  };

  const handleAiSend = async () => {
    const input = aiInput.trim();
    if (!input || isExtracting) return;
    setIsExtracting(true);
    try {
      const result: ExtractedRecipe = isUrl(input)
        ? await extractRecipeFromVideoUrl(input)
        : await extractRecipeFromText(input);
      router.push({
        pathname: '/add-recipe-review' as never,
        params: {
          inputMode: isUrl(input) ? 'url' : 'text',
          inputUrl: isUrl(input) ? input : undefined,
          prefillName: result.name,
          prefillDescription: result.description,
          prefillCuisine: result.cuisine,
          prefillMealType: result.meal_type,
          prefillCookingTimeBand: result.cooking_time_band,
          prefillDietaryTags: JSON.stringify(result.dietary_tags),
          prefillIngredients: JSON.stringify(result.ingredients),
          prefillMethodSteps: JSON.stringify(result.method_steps),
          prefillServingSize: String(result.recipe_serving_size),
        },
      });
    } catch {
      Alert.alert(
        'Extraction Failed',
        isUrl(aiInput.trim())
          ? 'Could not extract a recipe from this link. Try copying the recipe text and typing it here instead.'
          : 'Could not extract a recipe from your description. Try adding more detail — ingredients, quantities, and cooking steps help.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        Platform.OS === 'ios'
          ? 'Meal Plan needs camera access to photograph recipes. Tap Open Settings and enable Camera under Meal Plan.'
          : 'Meal Plan needs camera access to photograph recipes. Tap Open Settings and enable the Camera permission.',
        [{ text: 'Not Now', style: 'cancel' }, { text: 'Open Settings', onPress: () => Linking.openSettings() }]
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, base64: true, quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    imageStore.set(asset.base64 ?? '', asset.uri);
    router.push({ pathname: '/add-recipe-review' as never, params: { inputMode: 'camera', imageUri: asset.uri } });
  };

  const handleVoiceExtracted = (result: ExtractedRecipe) => {
    setShowVoiceSheet(false);
    router.push({
      pathname: '/add-recipe-review' as never,
      params: {
        inputMode: 'voice',
        prefillName: result.name,
        prefillDescription: result.description,
        prefillCuisine: result.cuisine,
        prefillMealType: result.meal_type,
        prefillCookingTimeBand: result.cooking_time_band,
        prefillDietaryTags: JSON.stringify(result.dietary_tags),
        prefillIngredients: JSON.stringify(result.ingredients),
        prefillMethodSteps: JSON.stringify(result.method_steps),
        prefillServingSize: String(result.recipe_serving_size),
      },
    });
  };

  // ── Manual Mode handlers ─────────────────────────────────────────────────────
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
      ...(selectedImageUri ? [{ text: 'Remove Photo', style: 'destructive' as const, onPress: () => setSelectedImageUri('') }] : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  }, [selectedImageUri]);

  const handleAiFill = useCallback(async () => {
    if (!name.trim()) { Alert.alert('Name required', 'Add a meal name first so AI knows what to classify.'); return; }
    setIsAiFillingMetadata(true);
    try {
      const validIngredients = ingredients.filter((i) => i.name.trim()).map((i) => ({
        name: i.name.trim(), quantity: parseFloat(i.quantity) || 0, unit: i.unit.trim() || 'pc',
      }));
      const result = await extractRecipeMetadata(name.trim(), validIngredients);
      if (result.cuisine) setCuisine(result.cuisine);
      if (result.meal_type) {
        const t = result.meal_type.toLowerCase();
        if (t === 'breakfast') setMealType('breakfast');
        else if (t === 'lunch' || t === 'dinner' || t === 'lunch_dinner') setMealType('lunch_dinner');
        else if (t === 'snack' || t === 'light_bites' || t === 'dessert') setMealType('light_bites');
      }
      if (result.dish_category) setDishCategory(result.dish_category);
      if (result.protein_source) setProteinSource(result.protein_source);
      if (result.diet_labels?.length) setDietLabels(result.diet_labels);
      if (result.allergens?.length) setAllergens(result.allergens);
      if (result.occasions?.length) setOccasions(result.occasions);
      if (result.calories_per_serving != null) setCaloriesPerServing(String(result.calories_per_serving));
      if (result.protein_per_serving_g != null) setProteinPerServingG(String(result.protein_per_serving_g));
      if (result.carbs_per_serving_g != null) setCarbsPerServingG(String(result.carbs_per_serving_g));
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert('Could not auto-fill', "AI couldn't classify this recipe. Please fill in manually.");
    } finally {
      setIsAiFillingMetadata(false);
    }
  }, [name, ingredients]);

  const handleAccordionToggle = useCallback(() => {
    const opening = !accordionOpen;
    setAccordionOpen(opening);
    if (opening && !hasAutoFilled && name.trim()) {
      setHasAutoFilled(true);
      void handleAiFill();
    }
  }, [accordionOpen, hasAutoFilled, name, handleAiFill]);

  const addIngredientRow = useCallback(() => setIngredients((p) => [...p, { name: '', quantity: '', unit: '' }]), []);
  const updateIngredient = useCallback((idx: number, field: string, value: string) => {
    setIngredients((p) => p.map((ing, i) => (i === idx ? { ...ing, [field]: value } : ing)));
  }, []);
  const removeIngredient = useCallback((idx: number) => setIngredients((p) => p.filter((_, i) => i !== idx)), []);

  const addStep = useCallback(() => setMethodSteps((p) => [...p, '']), []);
  const updateStep = useCallback((idx: number, value: string) => setMethodSteps((p) => p.map((s, i) => (i === idx ? value : s))), []);
  const removeStep = useCallback((idx: number) => setMethodSteps((p) => p.filter((_, i) => i !== idx)), []);

  const toggleDietLabel = useCallback((tag: string) => setDietLabels((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]), []);
  const toggleAllergen = useCallback((tag: string) => setAllergens((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]), []);
  const toggleOccasion = useCallback((tag: string) => setOccasions((p) => p.includes(tag) ? p.filter((t) => t !== tag) : [...p, tag]), []);

  const addCustomTag = useCallback(() => {
    if (newTag.trim() && !customTags.includes(newTag.trim())) {
      setCustomTags((p) => [...p, newTag.trim()]); setNewTag('');
    }
  }, [newTag, customTags]);
  const removeCustomTag = useCallback((tag: string) => setCustomTags((p) => p.filter((t) => t !== tag)), []);

  const saveMeal = useCallback((validIngredients: Ingredient[], validSteps: string[], derivedDietaryTags: string[]) => {
    const newMeal: Recipe = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      image_url: selectedImageUri || undefined,
      cooking_time_band: cookingTimeBand as Recipe['cooking_time_band'] || undefined,
      prep_time: prepTime ? parseInt(prepTime) : undefined,
      cook_time: cookTime ? parseInt(cookTime) : undefined,
      meal_type: (mealType as Recipe['meal_type']) || undefined,
      cuisine: cuisine || undefined,
      dish_category: (dishCategory as Recipe['dish_category']) || undefined,
      protein_source: (proteinSource as Recipe['protein_source']) || undefined,
      occasions: occasions.length > 0 ? occasions : undefined,
      diet_labels: dietLabels.length > 0 ? dietLabels : undefined,
      allergens: allergens.length > 0 ? allergens : undefined,
      calories_per_serving: caloriesPerServing ? parseFloat(caloriesPerServing) : undefined,
      protein_per_serving_g: proteinPerServingG ? parseFloat(proteinPerServingG) : undefined,
      carbs_per_serving_g: carbsPerServingG ? parseFloat(carbsPerServingG) : undefined,
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
    };
    addFav(newMeal);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const pending = consumePendingPlanSlot();
    if (pending) {
      const plannedMeal: PlannedMeal = {
        id: `fav_plan_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        slot_id: pending.slotId, date: pending.date,
        meal_name: newMeal.name, meal_image_url: newMeal.image_url,
        serving_size: pending.defaultServing,
        ingredients: newMeal.ingredients,
        recipe_serving_size: newMeal.recipe_serving_size,
        meal_id: newMeal.id,
      };
      addMeal(plannedMeal);
      router.replace('/(tabs)' as never);
    } else {
      router.replace('/(tabs)/favs' as never);
    }
  }, [
    name, cookingTimeBand, prepTime, cookTime, mealType, selectedImageUri, cuisine,
    dishCategory, proteinSource, occasions, dietLabels, allergens, caloriesPerServing,
    proteinPerServingG, carbsPerServingG, customTags, description, servingSize,
    addFav, addMeal,
  ]);

  const handleSave = useCallback(() => {
    if (!name.trim()) { Alert.alert('Name required', 'Please enter a meal name.'); return; }
    const validIngredients: Ingredient[] = ingredients
      .filter((i) => i.name.trim())
      .map((i, idx) => ({
        id: `ing_${Date.now()}_${idx}`, name: i.name.trim(),
        quantity: parseFloat(i.quantity) || 0, unit: i.unit.trim() || 'pc', category: 'Other',
      }));
    const validSteps = methodSteps.filter((s) => s.trim());
    const derivedDietaryTags = [...new Set([...dietLabels, ...allergens])];
    if (isFavByName(name.trim())) {
      Alert.alert(
        'Duplicate found', `You already have "${name.trim()}" in your Favs.`,
        [
          { text: 'View it', onPress: () => router.back() },
          { text: 'Add Anyway', onPress: () => saveMeal(validIngredients, validSteps, derivedDietaryTags) },
        ]
      );
      return;
    }
    saveMeal(validIngredients, validSteps, derivedDietaryTags);
  }, [name, ingredients, methodSteps, dietLabels, allergens, isFavByName, saveMeal]);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ─── Header ───────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <X size={20} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a Recipe</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ─── Mode toggle ──────────────────────────────────── */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggleTrack}>
          <View style={[styles.togglePill, mode === 'ai' ? styles.togglePillLeft : styles.togglePillRight]} />
          <TouchableOpacity style={styles.toggleOption} onPress={() => setMode('ai')} activeOpacity={0.8}>
            <Text style={[styles.toggleLabel, mode === 'ai' && styles.toggleLabelActive]}>✨  AI Mode</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toggleOption} onPress={() => setMode('manual')} activeOpacity={0.8}>
            <Text style={[styles.toggleLabel, mode === 'manual' && styles.toggleLabelActive]}>✏️  Manual</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── AI Mode ──────────────────────────────────────── */}
      {mode === 'ai' && (
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.aiScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.aiBubble}>
              <View style={styles.aiBubbleIconRow}>
                <View style={styles.aiBubbleIconCircle}>
                  <Sparkles size={18} color={Colors.primary} strokeWidth={2} />
                </View>
                <Text style={styles.aiBubbleName}>Meal Plan AI</Text>
              </View>
              <Text style={styles.aiBubbleIntro}>Hi! Share your recipe any way you like:</Text>
              {AI_BULLETS.map((b) => (
                <View key={b.emoji} style={styles.aiBulletRow}>
                  <Text style={styles.aiBulletEmoji}>{b.emoji}</Text>
                  <Text style={styles.aiBulletText}>{b.text}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={[styles.aiInputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
            <TouchableOpacity style={styles.aiInputAction} onPress={handleCamera} hitSlop={8}>
              <Camera size={22} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.aiInputAction} onPress={() => setShowVoiceSheet(true)} hitSlop={8}>
              <Mic size={22} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
            <TextInput
              style={styles.aiTextInput}
              placeholder="Paste a link or describe a recipe…"
              placeholderTextColor={Colors.textSecondary}
              value={aiInput}
              onChangeText={setAiInput}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="send"
              onSubmitEditing={handleAiSend}
              multiline={false}
            />
            <TouchableOpacity
              style={[styles.aiSendBtn, (!aiInput.trim() || isExtracting) && styles.aiSendBtnDisabled]}
              onPress={handleAiSend}
              disabled={!aiInput.trim() || isExtracting}
              hitSlop={8}
            >
              {isExtracting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Send size={16} color="#fff" strokeWidth={2.5} />
              }
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ─── Manual Mode ──────────────────────────────────── */}
      {mode === 'manual' && (
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView style={styles.flex} contentContainerStyle={styles.manualScrollContent} showsVerticalScrollIndicator={false}>

            {/* Hero image */}
            <TouchableOpacity onPress={handlePickImage} activeOpacity={0.8} style={styles.heroTouchable}>
              {selectedImageUri ? (
                <Image source={{ uri: selectedImageUri }} style={styles.heroImage} resizeMode="cover" />
              ) : (
                <MealImagePlaceholder size="hero" mealType={mealType} cuisine={cuisine} name={name} />
              )}
              <View style={styles.heroEditBadge}>
                <Camera size={16} color="#FFFFFF" strokeWidth={2} />
                <Text style={styles.heroEditBadgeText}>{selectedImageUri ? 'Change photo' : 'Add photo'}</Text>
              </View>
            </TouchableOpacity>

            {/* Name */}
            <Text style={styles.label}>Meal name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Mum's Chicken Pie"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            {/* Ingredients */}
            <Text style={styles.sectionHeader}>Ingredients</Text>
            {ingredients.map((ing, idx) => (
              <View key={idx} style={styles.ingredientInputRow}>
                <TextInput style={[styles.ingInput, styles.ingName]} placeholder="Ingredient" placeholderTextColor={Colors.textSecondary} value={ing.name} onChangeText={(v) => updateIngredient(idx, 'name', v)} />
                <TextInput style={[styles.ingInput, styles.ingQty]} placeholder="Qty" placeholderTextColor={Colors.textSecondary} value={ing.quantity} onChangeText={(v) => updateIngredient(idx, 'quantity', v)} keyboardType="decimal-pad" />
                <TextInput style={[styles.ingInput, styles.ingUnit]} placeholder="Unit" placeholderTextColor={Colors.textSecondary} value={ing.unit} onChangeText={(v) => updateIngredient(idx, 'unit', v)} />
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

            {/* Method steps */}
            <Text style={styles.sectionHeader}>Method steps</Text>
            {methodSteps.map((step, idx) => (
              <View key={idx} style={styles.stepInputRow}>
                <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>{idx + 1}</Text></View>
                <TextInput style={[styles.input, styles.stepInput]} placeholder={`Step ${idx + 1}...`} placeholderTextColor={Colors.textSecondary} value={step} onChangeText={(v) => updateStep(idx, v)} multiline />
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

            {/* Serving size */}
            <Text style={styles.label}>Default serving size</Text>
            <View style={styles.servingWrap}>
              <ServingStepper value={servingSize} onValueChange={setServingSize} />
            </View>

            {/* Cooking time */}
            <Text style={styles.label}>Cooking time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillRow} contentContainerStyle={styles.pillRowContent}>
              {COOKING_TIME_BANDS.map((t) => (
                <FilterPill key={t} label={`${t} min`} active={cookingTimeBand === t} onPress={() => setCookingTimeBand(cookingTimeBand === t ? '' : t)} />
              ))}
            </ScrollView>

            {/* Recipe Details accordion */}
            <TouchableOpacity style={styles.accordionHeader} onPress={handleAccordionToggle} activeOpacity={0.7}>
              <Text style={styles.accordionHeaderTitle}>Recipe Details</Text>
              {accordionOpen ? <ChevronUp size={18} color={Colors.textSecondary} strokeWidth={2} /> : <ChevronDown size={18} color={Colors.textSecondary} strokeWidth={2} />}
            </TouchableOpacity>

            {accordionOpen && (
              <View style={styles.accordionBody}>
                {isAiFillingMetadata ? (
                  <View style={styles.aiFillStatus}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.aiFillStatusText}>Auto-filling…</Text>
                  </View>
                ) : hasAutoFilled ? (
                  <View style={styles.aiFillStatus}>
                    <Sparkles size={13} color={Colors.primary} strokeWidth={2} />
                    <Text style={styles.aiFillStatusText}>Auto-filled with AI</Text>
                    <TouchableOpacity onPress={handleAiFill} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Text style={styles.refillLinkText}>Re-fill</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <Text style={styles.accordionFieldLabel}>Meal type</Text>
                <View style={styles.chipWrap}>
                  {([{ value: 'breakfast', label: 'Breakfast' }, { value: 'lunch_dinner', label: 'Lunch / Dinner' }, { value: 'light_bites', label: 'Light Bites' }] as const).map(({ value, label }) => {
                    const active = mealType === value;
                    return <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => setMealType(active ? '' : value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text></TouchableOpacity>;
                  })}
                </View>

                <Text style={styles.accordionFieldLabel}>Cuisine</Text>
                <View style={styles.chipWrap}>
                  {CUISINE_OPTIONS.map((c) => { const active = cuisine === c; return <TouchableOpacity key={c} style={[styles.chip, active && styles.chipActive]} onPress={() => setCuisine(active ? '' : c)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{c}</Text></TouchableOpacity>; })}
                </View>

                <Text style={styles.accordionFieldLabel}>Dish Type</Text>
                <View style={styles.chipWrap}>
                  {DISH_CATEGORY_OPTIONS.map((opt) => { const active = dishCategory === opt.value; return <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]} onPress={() => setDishCategory(active ? '' : opt.value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text></TouchableOpacity>; })}
                </View>

                <Text style={styles.accordionFieldLabel}>Protein</Text>
                <View style={styles.chipWrap}>
                  {PROTEIN_SOURCE_OPTIONS.map((opt) => { const active = proteinSource === opt.value; return <TouchableOpacity key={opt.value} style={[styles.chip, active && styles.chipActive]} onPress={() => setProteinSource(active ? '' : opt.value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text></TouchableOpacity>; })}
                </View>

                <Text style={styles.accordionFieldLabel}>Diet Labels</Text>
                <View style={styles.chipWrap}>
                  {DIET_LABEL_OPTIONS.map((value) => { const active = dietLabels.includes(value); return <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleDietLabel(value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text></TouchableOpacity>; })}
                </View>

                <Text style={styles.accordionFieldLabel}>Free From</Text>
                <View style={styles.chipWrap}>
                  {ALLERGEN_OPTIONS.map((value) => { const active = allergens.includes(value); return <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleAllergen(value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text></TouchableOpacity>; })}
                </View>

                <Text style={styles.accordionFieldLabel}>Occasions</Text>
                <View style={styles.chipWrap}>
                  {OCCASION_OPTIONS.map((value) => { const active = occasions.includes(value); return <TouchableOpacity key={value} style={[styles.chip, active && styles.chipActive]} onPress={() => toggleOccasion(value)}><Text style={[styles.chipText, active && styles.chipTextActive]}>{value}</Text></TouchableOpacity>; })}
                </View>

                <View style={styles.timeInputRow}>
                  <View style={styles.timeInputWrap}>
                    <Text style={styles.accordionFieldLabel}>Prep (min)</Text>
                    <TextInput style={styles.timeInput} placeholder="15" placeholderTextColor={Colors.textSecondary} value={prepTime} onChangeText={setPrepTime} keyboardType="number-pad" />
                  </View>
                  <View style={styles.timeInputWrap}>
                    <Text style={styles.accordionFieldLabel}>Cook (min)</Text>
                    <TextInput style={styles.timeInput} placeholder="30" placeholderTextColor={Colors.textSecondary} value={cookTime} onChangeText={setCookTime} keyboardType="number-pad" />
                  </View>
                </View>

                <Text style={styles.accordionFieldLabel}>Nutrition (per serving)</Text>
                <View style={styles.nutritionRow}>
                  {[
                    { label: 'Calories', value: caloriesPerServing, set: setCaloriesPerServing },
                    { label: 'Protein (g)', value: proteinPerServingG, set: setProteinPerServingG },
                    { label: 'Carbs (g)', value: carbsPerServingG, set: setCarbsPerServingG },
                  ].map(({ label, value, set }) => (
                    <View key={label} style={styles.nutritionField}>
                      <Text style={styles.nutritionLabel}>{label}</Text>
                      <TextInput style={styles.nutritionInput} value={value} onChangeText={set} placeholder="—" placeholderTextColor={Colors.textSecondary} keyboardType="decimal-pad" />
                    </View>
                  ))}
                </View>

                <Text style={styles.accordionFieldLabel}>Description / notes</Text>
                <TextInput style={[styles.input, styles.textArea]} placeholder="Any notes about this meal..." placeholderTextColor={Colors.textSecondary} value={description} onChangeText={setDescription} multiline numberOfLines={3} />

                <Text style={styles.accordionFieldLabel}>Custom tags</Text>
                <View style={styles.customTagRow}>
                  <TextInput style={styles.customTagInput} placeholder="Add tag..." placeholderTextColor={Colors.textSecondary} value={newTag} onChangeText={setNewTag} onSubmitEditing={addCustomTag} returnKeyType="done" />
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

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
            <PrimaryButton label="Save Meal" onPress={handleSave} disabled={!name.trim()} />
          </View>
        </KeyboardAvoidingView>
      )}

      <VoiceRecordSheet
        visible={showVoiceSheet}
        onClose={() => setShowVoiceSheet(false)}
        onExtracted={handleVoiceExtracted}
        onError={() => setShowVoiceSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },

  // ── Header ──────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    backgroundColor: Colors.background,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18, fontFamily: FontFamily.bold, fontWeight: '700',
    color: Colors.text,
  },

  // ── Toggle ──────────────────────────────────────────────
  toggleWrap: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    padding: 3,
    position: 'relative',
  },
  togglePill: {
    position: 'absolute',
    top: 3, bottom: 3,
    width: '50%' as unknown as number,
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.input - 2,
    ...Shadows.card,
  },
  togglePillLeft: { left: 3 },
  togglePillRight: { left: '50%' as unknown as number },
  toggleOption: {
    flex: 1, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center',
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: 14, fontFamily: FontFamily.semiBold, fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleLabelActive: { color: Colors.primary },

  // ── AI Mode ─────────────────────────────────────────────
  aiScrollContent: { padding: Spacing.lg, paddingBottom: Spacing.xxl },
  aiBubble: { backgroundColor: Colors.primaryLight, borderRadius: BorderRadius.card, padding: Spacing.lg },
  aiBubbleIconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  aiBubbleIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.card, alignItems: 'center', justifyContent: 'center' },
  aiBubbleName: { fontSize: 14, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.primary },
  aiBubbleIntro: { fontSize: 15, fontFamily: FontFamily.regular, fontWeight: '400', color: Colors.text, marginBottom: Spacing.md, lineHeight: 22 },
  aiBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, marginBottom: Spacing.sm },
  aiBulletEmoji: { fontSize: 15, lineHeight: 22, width: 24 },
  aiBulletText: { fontSize: 15, fontFamily: FontFamily.regular, fontWeight: '400', color: Colors.text, lineHeight: 22, flex: 1 },
  aiInputBar: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  aiInputAction: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  aiTextInput: {
    flex: 1, height: 40, backgroundColor: Colors.card,
    borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md, fontSize: 15,
    color: Colors.text, fontFamily: FontFamily.regular,
  },
  aiSendBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  aiSendBtnDisabled: { backgroundColor: Colors.surface },

  // ── Manual Mode ─────────────────────────────────────────
  manualScrollContent: { padding: 20 },
  heroTouchable: { overflow: 'hidden', marginBottom: 4 },
  heroImage: { width: '100%', height: 220 },
  heroEditBadge: { position: 'absolute', bottom: 10, right: 12, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  heroEditBadgeText: { color: '#FFFFFF', fontSize: 12, fontFamily: FontFamily.semiBold, fontWeight: '600' },
  label: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.textSecondary, marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: Colors.white, borderRadius: BorderRadius.button, borderWidth: 1, borderColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: Colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  sectionHeader: { fontSize: 18, fontFamily: FontFamily.bold, fontWeight: '700', color: Colors.text, marginTop: 24, marginBottom: 12 },
  servingWrap: { alignItems: 'flex-start', paddingVertical: 4 },
  pillRow: { maxHeight: 44, flexDirection: 'row' },
  pillRowContent: { gap: 6, paddingRight: 4 },
  ingredientInputRow: { flexDirection: 'row', gap: 6, marginBottom: 8, alignItems: 'center' },
  ingInput: { backgroundColor: Colors.white, borderRadius: 10, borderWidth: 1, borderColor: Colors.surface, paddingHorizontal: 10, paddingVertical: 8, fontSize: 14, color: Colors.text },
  ingName: { flex: 3 }, ingQty: { flex: 1 }, ingUnit: { flex: 1 },
  ingRemove: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  addRowBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: Colors.surface, borderRadius: BorderRadius.button, alignSelf: 'flex-start', marginTop: 4 },
  addRowText: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.primary },
  stepInputRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  stepBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  stepBadgeText: { fontSize: 12, fontFamily: FontFamily.bold, fontWeight: '700', color: Colors.white },
  stepInput: { flex: 1, minHeight: 48, textAlignVertical: 'top' },
  accordionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 28, paddingVertical: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border },
  accordionHeaderTitle: { fontSize: 18, fontFamily: FontFamily.bold, fontWeight: '700', color: Colors.text },
  accordionBody: { paddingTop: 4, paddingBottom: 8 },
  accordionFieldLabel: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.textSecondary, marginTop: 16, marginBottom: 8 },
  aiFillStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  aiFillStatusText: { fontSize: 13, fontFamily: FontFamily.regular, color: Colors.primary, flex: 1 },
  refillLinkText: { fontSize: 12, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.textSecondary },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: Colors.white, borderRadius: BorderRadius.button, borderWidth: 1, borderColor: '#DDD9F5', paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '500', color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold, fontWeight: '600' },
  timeInputRow: { flexDirection: 'row', gap: 12, marginTop: 4 },
  timeInputWrap: { flex: 1 },
  timeInput: { backgroundColor: Colors.white, borderRadius: BorderRadius.button, borderWidth: 1, borderColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.text },
  nutritionRow: { flexDirection: 'row', gap: Spacing.sm },
  nutritionField: { flex: 1 },
  nutritionLabel: { fontSize: 11, fontFamily: FontFamily.semiBold, fontWeight: '500', color: Colors.textSecondary, marginBottom: 4 },
  nutritionInput: { backgroundColor: Colors.surface, borderRadius: BorderRadius.button, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: 15, fontFamily: FontFamily.semiBold, fontWeight: '500', color: Colors.text, textAlign: 'center' },
  customTagRow: { flexDirection: 'row', gap: 8 },
  customTagInput: { flex: 1, backgroundColor: Colors.white, borderRadius: BorderRadius.button, borderWidth: 1, borderColor: Colors.surface, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: Colors.text },
  customTagAddBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' },
  customTagList: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  customTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surface, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
  customTagText: { fontSize: 12, fontFamily: FontFamily.semiBold, fontWeight: '600', color: Colors.primary },
  bottomBar: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.divider, backgroundColor: Colors.background },
});
