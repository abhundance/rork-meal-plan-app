import React, { useState, useEffect, useCallback } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';
import { extractRecipeFromImage, extractRecipeFromText } from '@/services/recipeExtraction';
import { imageStore } from '@/services/imageStore';
import { useFavs } from '@/providers/FavsProvider';
import { FavMeal, Ingredient } from '@/types';
import ServingStepper from '@/components/ServingStepper';

type Params = {
  inputMode: 'camera' | 'photos' | 'text' | 'voice' | 'manual';
  imageBase64?: string;
  imageUri?: string;
  inputText?: string;
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

  const inputMode = params.inputMode ?? 'manual';

  const [isLoading, setIsLoading] = useState<boolean>(
    inputMode === 'camera' || inputMode === 'photos' || inputMode === 'text',
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

  useEffect(() => {
    if (inputMode !== 'camera' && inputMode !== 'photos' && inputMode !== 'text') return;

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
      } catch (e) {
        console.log('[Review] Extraction failed:', e);
        Alert.alert(
          "Couldn't extract recipe",
          "We couldn't read this image. Fill in manually?",
          [
            { text: 'Try Again', onPress: () => setRetryCount((c) => c + 1) },
            { text: 'Fill Manually', onPress: () => router.replace('/add-meal' as never) },
          ],
        );
      } finally {
        setIsLoading(false);
      }
    };

    doExtract();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  const toggleDietary = useCallback((tag: string) => {
    setDietaryTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  }, []);

  const handleSave = useCallback(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const meal: FavMeal = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: trimmedName,
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
    router.replace('/(tabs)/favs' as never);
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
    router,
  ]);

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: Colors.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingTitle}>Extracting recipe...</Text>
        <Text style={styles.loadingSubtitle}>This takes about 5 seconds</Text>
      </View>
    );
  }

  const canSave = name.trim().length > 0;
  const showAiChip = inputMode === 'camera' || inputMode === 'photos' || inputMode === 'text';

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
          <Text style={styles.headerTitle}>Review Recipe</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSave}
            style={[styles.headerSide, styles.headerSideRight]}
          >
            <Text style={[styles.headerSaveText, !canSave && styles.headerSaveTextDisabled]}>
              Save
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
          {params.imageUri ? (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: params.imageUri }}
                style={styles.heroImage}
                resizeMode="cover"
              />
              {showAiChip && (
                <View style={styles.aiChip}>
                  <Text style={styles.aiChipText}>AI Extracted</Text>
                </View>
              )}
            </View>
          ) : null}

          <View style={[styles.card, !params.imageUri && styles.cardFirstNoImage]}>
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

          {ingredients.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>INGREDIENTS</Text>
              {ingredients.map((ing, idx) => (
                <View
                  key={ing.id ?? String(idx)}
                  style={[
                    styles.ingredientRow,
                    idx < ingredients.length - 1 && styles.rowDivider,
                  ]}
                >
                  <Text style={styles.ingredientText}>
                    {ing.quantity > 0 ? `${ing.quantity} ` : ''}
                    {ing.unit ? `${ing.unit} ` : ''}
                    {ing.name}
                  </Text>
                </View>
              ))}
              <TouchableOpacity style={styles.editLink}>
                <Text style={styles.editLinkText}>Edit ingredients</Text>
              </TouchableOpacity>
            </View>
          )}

          {methodSteps.length > 0 && (
            <View style={styles.card}>
              <Text style={styles.sectionLabel}>METHOD</Text>
              {methodSteps.map((step, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.stepRow,
                    idx < methodSteps.length - 1 && styles.rowDivider,
                  ]}
                >
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
              <TouchableOpacity style={styles.editLink}>
                <Text style={styles.editLinkText}>Edit method</Text>
              </TouchableOpacity>
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
          <Text style={styles.saveFullBtnText}>Save to Favourites</Text>
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
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    textAlign: 'center',
    flex: 1,
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
    paddingHorizontal: Spacing.lg,
  },
  imageContainer: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.card,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.card,
  },
  aiChip: {
    position: 'absolute',
    bottom: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: 'rgba(123, 104, 204, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  aiChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
    marginTop: Spacing.md,
    ...Shadows.card,
  },
  cardFirstNoImage: {
    marginTop: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
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
