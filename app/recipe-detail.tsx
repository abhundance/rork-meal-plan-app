import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Stack } from 'expo-router';
import MealImagePlaceholder from '@/components/MealImagePlaceholder';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Heart,
  Pencil,
  CalendarPlus,
  Clock,
  Users,
  X,
  FileText,
} from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Shadows } from '@/constants/theme';
import ServingStepper from '@/components/ServingStepper';
import SlotPickerModal from '@/components/SlotPickerModal';
import { useFavs } from '@/providers/FavsProvider';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { Recipe, PlannedMeal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { getCachedDiscoverMeal, cacheDiscoverMeal } from '@/services/discoverMealCache';
import { getFamilyInitials, isRealPhotoUrl } from '@/utils/familyAvatar';
import { getSupabase } from '@/services/supabase';
import { generateUUID } from '@/utils/uuid';

/**
 * Find a discover meal. Resolution order:
 *   1. `override` — asynchronously fetched from Supabase (covers UUID-based IDs from the main Discover tab)
 *   2. In-memory cache — populated when user browses the Discover tab in the current session
 *   3. Static mock fallback — covers disc_X IDs coming from discover-search / discover-collection
 */
function findDiscoverMeal(id: string, override?: import('@/types').DiscoverMeal | null) {
  return override ?? getCachedDiscoverMeal(id) ?? DISCOVER_MEALS.find((m) => m.id === id);
}
/** Find a discover meal by name (for plan-source lookups). */
function findDiscoverMealByName(name: string) {
  const lower = name.toLowerCase();
  return DISCOVER_MEALS.find((m) => m.name.toLowerCase() === lower);
}

const DESTRUCTIVE_RED = Colors.danger;

export default function MealDetailScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id: string; source: string }>();
  const { meals: favMeals, isFav, isFavByName, addFav, addFromDiscover, removeFav, incrementPlanCount } = useFavs();
  const { familySettings } = useFamilySettings();
  const { meals: planMeals, addMeal, removeMeal, updateMealNote, getMealsForSlot, linkMealToPlan } = useMealPlan();

  const [servingScale, setServingScale] = useState<number>(4);
  const [slotPickerVisible, setSlotPickerVisible] = useState<boolean>(false);
  const [dailyNote, setDailyNote] = useState<string>('');
  const [initialized, setInitialized] = useState<boolean>(false);
  // richDetail kept for nutrition display (always null now — Spoonacular removed)
  const richDetail = null;
  const isLoadingDetail = false;
  // Asynchronously fetched discover meal — used when source=discover and the ID is a Supabase UUID
  // that is not yet in the in-memory cache (i.e. cold start, first open of this meal).
  const [fetchedDiscover, setFetchedDiscover] = useState<import('@/types').DiscoverMeal | null>(null);
  const [isLoadingDiscover, setIsLoadingDiscover] = useState<boolean>(false);

  const plannedMeal = useMemo<PlannedMeal | null>(() => {
    if (params.source !== 'plan') return null;
    return planMeals.find((m) => m.id === params.id) ?? null;
  }, [params.source, params.id, planMeals]);

  useEffect(() => {
    if (params.source === 'plan' && plannedMeal && !initialized) {
      setServingScale(plannedMeal.serving_size);
      setDailyNote(plannedMeal.daily_note ?? '');
      setInitialized(true);
    }
  }, [plannedMeal, params.source, initialized]);

  const planMealFoundViaId = useMemo<boolean>(() => {
    if (params.source !== 'plan' || !plannedMeal?.meal_id) return false;
    return favMeals.some((f) => f.id === plannedMeal.meal_id);
  }, [params.source, plannedMeal, favMeals]);

  const meal = useMemo<Recipe | null>(() => {
    if (params.source === 'favs') {
      const favMeal = favMeals.find((m) => m.id === params.id) ?? null;
      // If this fav was hearted from a Discover card (not the detail view), it was saved
      // with card-only data (ingredients: []). Once fetchedDiscover is loaded, merge in
      // the full ingredient + method data so the detail screen shows correctly.
      if (
        favMeal &&
        favMeal.source === 'discover' &&
        favMeal.ingredients.length === 0 &&
        fetchedDiscover
      ) {
        return {
          ...favMeal,
          ingredients: fetchedDiscover.ingredients,
          method_steps: fetchedDiscover.method_steps,
          is_ingredient_complete: fetchedDiscover.ingredients.length > 0,
          is_recipe_complete: fetchedDiscover.method_steps.length > 0,
        };
      }
      return favMeal;
    }

    if (params.source === 'plan') {
      if (!plannedMeal) return null;
      let favMatch = plannedMeal.meal_id
        ? favMeals.find((f) => f.id === plannedMeal.meal_id)
        : undefined;
      if (!favMatch) {
        favMatch = favMeals.find(
          (f) => f.name.toLowerCase() === plannedMeal.meal_name.toLowerCase()
        );
      }
      const discMatch = findDiscoverMealByName(plannedMeal.meal_name);
      const methodSteps = favMatch?.method_steps ?? discMatch?.method_steps ?? [];
      return {
        id: plannedMeal.id,
        name: plannedMeal.meal_name,
        image_url: plannedMeal.meal_image_url,
        cuisine: favMatch?.cuisine ?? discMatch?.cuisine,
        cooking_time_band: favMatch?.cooking_time_band ?? discMatch?.cooking_time_band,
        prep_time: favMatch?.prep_time ?? discMatch?.prep_time,
        cook_time: favMatch?.cook_time ?? discMatch?.cook_time,
        dietary_tags: favMatch?.dietary_tags ?? discMatch?.dietary_tags ?? [],
        custom_tags: favMatch?.custom_tags ?? [],
        ingredients: favMatch?.ingredients ?? plannedMeal.ingredients,
        recipe_serving_size: plannedMeal.recipe_serving_size,
        method_steps: methodSteps,
        description: favMatch?.description ?? discMatch?.description,
        source: favMatch ? favMatch.source : (discMatch ? 'discover' as const : 'family_created' as const),
        add_to_plan_count: favMatch?.add_to_plan_count ?? 0,
        created_at: favMatch?.created_at ?? plannedMeal.date,
        is_ingredient_complete: (favMatch?.ingredients ?? plannedMeal.ingredients).length > 0,
        is_recipe_complete: methodSteps.length > 0,
      } as Recipe;
    }

    const disc = findDiscoverMeal(params.id, fetchedDiscover);
    if (disc) {
      return {
        id: disc.id,
        name: disc.name,
        image_url: disc.image_url,
        cuisine: disc.cuisine,
        cooking_time_band: disc.cooking_time_band,
        prep_time: disc.prep_time,
        cook_time: disc.cook_time,
        dietary_tags: disc.dietary_tags,
        custom_tags: [] as string[],
        ingredients: disc.ingredients,
        recipe_serving_size: disc.recipe_serving_size,
        method_steps: disc.method_steps,
        description: disc.description,
        source: 'discover' as const,
        add_to_plan_count: 0,
        created_at: disc.created_at,
        is_ingredient_complete: disc.ingredients.length > 0,
        is_recipe_complete: disc.method_steps.length > 0,
      } as Recipe;
    }
    return null;
  }, [params.id, params.source, favMeals, plannedMeal, fetchedDiscover]);

  const discoverData = useMemo(() => {
    if (params.source === 'discover') {
      return findDiscoverMeal(params.id, fetchedDiscover) ?? null;
    }
    if (params.source === 'plan' && plannedMeal) {
      return findDiscoverMealByName(plannedMeal.meal_name) ?? null;
    }
    return null;
  }, [params.source, params.id, plannedMeal, fetchedDiscover]);

  /**
   * When source=discover, resolve the meal data.
   * Fast path: in-memory cache (populated when user has browsed the Discover tab this session).
   * Slow path: fetch from Supabase by UUID — needed on cold start when the Discover tab hasn't
   * been visited yet (so the cache is empty) and the ID is a Supabase UUID, not a disc_X mock ID.
   *
   * Also handles source=favs when the fav was hearted from a Discover card (not the detail view):
   * those favs are saved with card-only data (ingredients: []) because useDiscoverMeals no longer
   * fetches joins for the list. In that case we fetch by name from Supabase to fill in the gaps.
   */
  useEffect(() => {
    // Favs saved from a Discover card have source='discover' but empty ingredients.
    const isFavsNeedingFetch =
      params.source === 'favs' &&
      !!meal &&
      meal.source === 'discover' &&
      meal.ingredients.length === 0;

    if (params.source !== 'discover' && !isFavsNeedingFetch) return;

    // Check cache first — only use it if it has full recipe data (ingredients loaded).
    // The discover list now fetches card-only data, so the cache may hold a
    // lightweight copy without ingredients. In that case fall through to Supabase.
    const cached = getCachedDiscoverMeal(params.id);
    if (cached && cached.ingredients && cached.ingredients.length > 0) {
      setFetchedDiscover(cached);
      return;
    }

    // If the ID looks like a mock disc_X id, the DISCOVER_MEALS fallback will handle it
    if (params.source === 'discover' && params.id.startsWith('disc_')) return;

    // UUID path: fetch from Supabase.
    // For discover source: look up by UUID (params.id).
    // For favs source: the fav has a fav_disc_* id, not the Supabase UUID — look up by name.
    setIsLoadingDiscover(true);
    const sb = getSupabase();
    const selectQuery = sb.from('recipes')
      .select(`
        id, name, image_url, description, source,
        cuisine, cuisines, meal_type, cooking_time_band, prep_time, cook_time,
        dish_category, protein_source, occasions,
        is_vegan, is_vegetarian, is_gluten_free, is_dairy_free,
        allergens, diet_labels, dietary_tags,
        taste_sweetness, taste_saltiness, taste_sourness, taste_bitterness,
        taste_savoriness, taste_fattiness, taste_spiciness,
        calories_per_serving, protein_per_serving_g, carbs_per_serving_g,
        health_score, recipe_serving_size, add_to_plan_count, created_at,
        recipe_ingredients ( id, name, quantity, unit, category, position ),
        recipe_method_steps ( id, step_text, position )
      `);
    const queryWithFilter = isFavsNeedingFetch && meal
      ? selectQuery.eq('name', meal.name).eq('source', 'curated')
      : selectQuery.eq('id', params.id);
    queryWithFilter
      .single()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .then(({ data, error }: { data: any; error: any }) => {
        if (!error && data) {
          const mapped: import('@/types').DiscoverMeal = {
            id: data.id,
            name: data.name,
            image_url: data.image_url ?? undefined,
            description: data.description ?? '',
            source: data.source,
            created_at: data.created_at,
            cuisine: data.cuisine ?? '',
            cuisines: data.cuisines ?? [],
            meal_type: data.meal_type ?? 'lunch_dinner',
            cooking_time_band: data.cooking_time_band ?? 'Under 30',
            prep_time: data.prep_time ?? 0,
            cook_time: data.cook_time ?? 0,
            dish_category: data.dish_category ?? 'main',
            protein_source: data.protein_source ?? 'none',
            occasions: data.occasions ?? [],
            is_vegan: data.is_vegan ?? false,
            is_vegetarian: data.is_vegetarian ?? false,
            is_gluten_free: data.is_gluten_free ?? false,
            is_dairy_free: data.is_dairy_free ?? false,
            allergens: data.allergens ?? [],
            diet_labels: data.diet_labels ?? [],
            dietary_tags: data.dietary_tags ?? [],
            taste_sweetness: data.taste_sweetness ?? 0,
            taste_saltiness: data.taste_saltiness ?? 0,
            taste_sourness: data.taste_sourness ?? 0,
            taste_bitterness: data.taste_bitterness ?? 0,
            taste_savoriness: data.taste_savoriness ?? 0,
            taste_fattiness: data.taste_fattiness ?? 0,
            taste_spiciness: data.taste_spiciness ?? 0,
            calories_per_serving: data.calories_per_serving ?? 0,
            protein_per_serving_g: data.protein_per_serving_g ?? 0,
            carbs_per_serving_g: data.carbs_per_serving_g ?? 0,
            health_score: data.health_score ?? 0,
            recipe_serving_size: data.recipe_serving_size ?? 2,
            add_to_plan_count: data.add_to_plan_count ?? 0,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ingredients: (data.recipe_ingredients ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => a.position - b.position)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((i: any) => ({
                id: i.id,
                name: i.name,
                quantity: i.quantity,
                unit: i.unit,
                category: i.category,
              })),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            method_steps: (data.recipe_method_steps ?? [])
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .sort((a: any, b: any) => a.position - b.position)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((s: any) => s.step_text),
          };
          // Warm the cache with the full recipe so subsequent taps are instant.
          cacheDiscoverMeal(mapped);
          setFetchedDiscover(mapped);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingDiscover(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id, params.source, meal?.source, meal?.ingredients?.length]);

  const isInFavs = useMemo(() => {
    if (!meal) return false;
    // For discover-sourced meals saved via addFromDiscover(), the stored fav has a
    // fav_disc_* id — not the original discover UUID. Use name-based lookup instead.
    if (params.source === 'discover') return isFavByName(meal.name);
    return isFav(meal.id) || params.source === 'favs';
  }, [meal, isFav, isFavByName, params.source]);

  const isPlanMealFav = useMemo(() => {
    if (params.source !== 'plan' || !meal) return false;
    return isFavByName(meal.name);
  }, [params.source, meal, isFavByName]);

  const sortedSlots = useMemo(
    () => [...familySettings.meal_slots].sort((a, b) => a.order - b.order),
    [familySettings.meal_slots]
  );

  const scaledIngredients = useMemo(() => {
    if (!meal) return [];
    const ratio = meal.recipe_serving_size > 0 ? servingScale / meal.recipe_serving_size : 1;
    return meal.ingredients.map((i) => ({
      ...i,
      quantity: Math.round(i.quantity * ratio * 100) / 100,
    }));
  }, [meal, servingScale]);

  const handleToggleFav = useCallback(() => {
    if (!meal) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (isInFavs && params.source === 'favs') {
      Alert.alert('Remove from Favs?', `Remove "${meal.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            removeFav(meal.id);
            router.back();
          },
        },
      ]);
    } else if (!isInFavs && params.source === 'discover') {
      const disc = findDiscoverMeal(params.id, fetchedDiscover);
      if (disc) {
        addFromDiscover(disc);
        Alert.alert('Saved!', `${meal.name} added to your Favs`);
      }
    }
  }, [meal, isInFavs, params, removeFav, addFromDiscover, fetchedDiscover]);

  const handleToggleFavFromPlan = useCallback(() => {
    if (!meal) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentlyFav = isFavByName(meal.name);
    if (currentlyFav) {
      const favEntry = favMeals.find(
        (f) => f.name.toLowerCase() === meal.name.toLowerCase()
      );
      if (favEntry) {
        Alert.alert('Remove from Favs?', `Remove "${meal.name}"?`, [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => removeFav(favEntry.id),
          },
        ]);
      }
    } else {
      const newFav: Recipe = {
        id: generateUUID(),
        name: meal.name,
        image_url: meal.image_url,
        cuisine: meal.cuisine,
        cooking_time_band: meal.cooking_time_band,
        prep_time: meal.prep_time,
        cook_time: meal.cook_time,
        dietary_tags: meal.dietary_tags,
        custom_tags: meal.custom_tags,
        ingredients: meal.ingredients,
        recipe_serving_size: meal.recipe_serving_size,
        method_steps: meal.method_steps,
        description: meal.description,
        source: 'family_created' as const,
        add_to_plan_count: 0,
        created_at: new Date().toISOString(),
        is_ingredient_complete: meal.ingredients.length > 0,
        is_recipe_complete: meal.method_steps.length > 0,
      };
      addFav(newFav);
      Alert.alert('Saved!', `${meal.name} added to your Favs`);
    }
  }, [meal, isFavByName, favMeals, removeFav, addFav]);

  const handleRemoveFromPlan = useCallback(() => {
    if (!plannedMeal) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Remove from Plan?', `Remove "${plannedMeal.meal_name}" from this day?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          removeMeal(plannedMeal.id);
          router.back();
        },
      },
    ]);
  }, [plannedMeal, removeMeal]);

  const handleAddToPlan = useCallback(() => {
    setSlotPickerVisible(true);
  }, []);

  const handleSlotSelected = useCallback(
    (date: string, slotId: string) => {
      if (!meal) return;
      const planned: PlannedMeal = {
        id: generateUUID(),
        slot_id: slotId,
        date,
        meal_name: meal.name,
        meal_image_url: meal.image_url,
        serving_size: familySettings.default_serving_size,
        ingredients: meal.ingredients,
        recipe_serving_size: meal.recipe_serving_size,
        ...(params.source === 'favs' ? { meal_id: meal.id } : {}),
      };
      addMeal(planned);
      if (params.source === 'favs') {
        incrementPlanCount(meal.id);
      }
      setSlotPickerVisible(false);
      const slot = familySettings.meal_slots.find((s) => s.slot_id === slotId);
      Alert.alert('Added!', `${meal.name} added to ${slot?.name ?? 'plan'}`);
    },
    [meal, addMeal, incrementPlanCount, familySettings, params.source]
  );

  const handleNoteSave = useCallback(() => {
    if (plannedMeal) {
      updateMealNote(plannedMeal.id, dailyNote);
      console.log('[MealDetail] Saved note for:', plannedMeal.id);
    }
  }, [plannedMeal, dailyNote, updateMealNote]);

  if (!meal) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.notFound}>
          {isLoadingDiscover ? (
            <Text style={styles.notFoundText}>Loading recipe…</Text>
          ) : (
            <>
              <Text style={styles.notFoundText}>Meal not found</Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backLink}>Go back</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroWrap}>
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <MealImagePlaceholder
              size="hero"
              mealType={meal.meal_type}
              cuisine={meal.cuisine}
              name={meal.name}
              deliveryPlatform={meal.delivery_platform}
              familyInitials={!meal.delivery_platform && meal.source === 'family_created' ? meal.name : undefined}
            />
          )}
          <TouchableOpacity
            style={[styles.backBtn, { top: insets.top + 8 }]}
            onPress={() => router.back()}
          >
            <ArrowLeft size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
          {params.source === 'favs' && (
            <TouchableOpacity
              style={[styles.editBtn, { top: insets.top + 8 }]}
              onPress={() => router.push({ pathname: '/add-recipe-manual', params: { editId: meal.id } })}
            >
              <Pencil size={18} color={Colors.text} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {params.source === 'discover' && discoverData !== null && (
            <TouchableOpacity
              style={[styles.editBtn, { top: insets.top + 8 }]}
              onPress={() => {
                // Saved discover meals have fav_disc_* ids — look up by name
                const savedMeal = favMeals.find(
                  (m) => m.name.toLowerCase() === meal.name.toLowerCase()
                );
                if (savedMeal) {
                  // Already saved — go straight to editor
                  router.push({ pathname: '/add-recipe-manual', params: { editId: savedMeal.id } });
                } else {
                  // Save a copy first, then open editor
                  const newMeal = addFromDiscover(discoverData);
                  router.push({ pathname: '/add-recipe-manual', params: { editId: newMeal.id } });
                }
              }}
            >
              <Pencil size={18} color={Colors.text} strokeWidth={2} />
            </TouchableOpacity>
          )}
          {params.source === 'plan' && (
            plannedMeal?.delivery_url ? (
              <TouchableOpacity
                style={{ position: 'absolute', top: insets.top + 8, right: 56, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                onPress={() => router.push(`/meal-picker/delivery?editId=${plannedMeal!.id}` as any)}
              >
                <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600' as const }}>Edit Delivery</Text>
              </TouchableOpacity>
            ) : planMealFoundViaId ? (
              <TouchableOpacity
                style={[styles.editBtn, { top: insets.top + 8 }]}
                onPress={() => router.push({ pathname: '/add-recipe-manual', params: { editId: plannedMeal!.meal_id } })}
              >
                <Pencil size={18} color={Colors.text} strokeWidth={2} />
              </TouchableOpacity>
            ) : discoverData !== null ? (
              <TouchableOpacity
                style={{ position: 'absolute', top: insets.top + 8, right: 8, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                onPress={() => {
                  const newMeal = addFromDiscover(discoverData);
                  linkMealToPlan(plannedMeal!.id, newMeal.id);
                  router.push({ pathname: '/add-recipe-manual', params: { editId: newMeal.id } });
                }}
              >
                <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600' as const }}>Save to My Meals & Edit</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={{ position: 'absolute', top: insets.top + 8, right: 8, backgroundColor: Colors.primaryLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 }}
                onPress={() => {
                  const newId = 'fav_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                  addFav({ id: newId, name: plannedMeal!.meal_name, image_url: plannedMeal!.meal_image_url, ingredients: [], method_steps: [], dietary_tags: [], custom_tags: [], recipe_serving_size: plannedMeal!.recipe_serving_size, add_to_plan_count: 0, created_at: new Date().toISOString(), source: 'family_created', is_ingredient_complete: false, is_recipe_complete: false });
                  linkMealToPlan(plannedMeal!.id, newId);
                  router.push({ pathname: '/add-recipe-manual', params: { editId: newId } });
                }}
              >
                <Text style={{ color: Colors.primary, fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600' as const }}>Save & Edit</Text>
              </TouchableOpacity>
            )
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.mealName}>{meal.name}</Text>

          <View style={styles.tagsRow}>
            {meal.cuisine && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>{meal.cuisine}</Text>
              </View>
            )}
            {meal.cooking_time_band && (
              <View style={styles.tag}>
                <Clock size={11} color={Colors.primary} strokeWidth={2} />
                <Text style={styles.tagText}>{meal.cooking_time_band} min</Text>
              </View>
            )}
            {meal.dietary_tags.map((dt) => (
              <View key={dt} style={styles.tag}>
                <Text style={styles.tagText}>{dt}</Text>
              </View>
            ))}
            {params.source === 'favs' && (
              <View style={[styles.tag, styles.sourceTag]}>
                <Text style={styles.tagText}>
                  {meal.is_customized
                    ? 'Customised'
                    : meal.source === 'family_created'
                    ? 'Your recipe'
                    : 'Curated recipe'}
                </Text>
              </View>
            )}
          </View>

          {(meal.prep_time || meal.cook_time) && (
            <View style={styles.timeRow}>
              {meal.prep_time ? (
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Prep</Text>
                  <Text style={styles.timeValue}>{meal.prep_time} min</Text>
                </View>
              ) : null}
              {meal.cook_time ? (
                <View style={styles.timeItem}>
                  <Text style={styles.timeLabel}>Cook</Text>
                  <Text style={styles.timeValue}>{meal.cook_time} min</Text>
                </View>
              ) : null}
            </View>
          )}

          {(() => {
            const calories = richDetail?.calories_per_serving || meal?.calories_per_serving || discoverData?.calories_per_serving;
            const protein = richDetail?.protein_per_serving_g || meal?.protein_per_serving_g || discoverData?.protein_per_serving_g;
            const carbs = richDetail?.carbs_per_serving_g || meal?.carbs_per_serving_g || discoverData?.carbs_per_serving_g;
            const hasNutrition = (calories ?? 0) > 0 || (protein ?? 0) > 0 || (carbs ?? 0) > 0;
            const showLoading = isLoadingDetail && !richDetail && params.source === 'discover';
            if (!hasNutrition && !showLoading) return null;
            return (
              <View style={styles.nutritionCard}>
                <View style={styles.nutritionHeader}>
                  <Text style={styles.nutritionTitle}>Nutrition</Text>
                  <Text style={styles.nutritionSubtitle}>per serving</Text>
                </View>
                <View style={styles.nutritionRow}>
                  {[
                    { label: 'Calories', value: showLoading ? 'Loading...' : calories, unit: 'kcal' },
                    { label: 'Protein', value: showLoading ? 'Loading...' : protein, unit: 'g' },
                    { label: 'Carbs', value: showLoading ? 'Loading...' : carbs, unit: 'g' },
                  ].map((stat) => (
                    <View key={stat.label} style={styles.nutritionBox}>
                      <View style={styles.nutritionValueRow}>
                        <Text style={styles.nutritionValue}>{stat.value}</Text>
                        <Text style={styles.nutritionUnit}>{stat.unit}</Text>
                      </View>
                      <Text style={styles.nutritionLabel}>{stat.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            );
          })()}



          <View style={styles.servingRow}>
            <View style={styles.servingLabel}>
              <Users size={16} color={Colors.textSecondary} strokeWidth={2} />
              <Text style={styles.servingText}>Servings</Text>
            </View>
            <ServingStepper value={servingScale} onValueChange={setServingScale} compact />
          </View>

          {meal.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.sectionBody}>{meal.description}</Text>
            </View>
          )}

          {scaledIngredients.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              {scaledIngredients.map((ing, idx) => (
                <View
                  key={ing.id && !scaledIngredients.slice(0, idx).some(prev => prev.id === ing.id) ? ing.id : `ing_fallback_${idx}`}
                  style={[
                    styles.ingredientRow,
                    idx < scaledIngredients.length - 1 && styles.ingredientBorder,
                  ]}
                >
                  <Text style={styles.ingredientQty}>
                    {ing.quantity} {ing.unit}
                  </Text>
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                </View>
              ))}
            </View>
          )}

          {(() => {
            const steps = richDetail?.method_steps?.length ? richDetail.method_steps : meal.method_steps;
            if (steps.length === 0) return null;
            return (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Method</Text>
                {steps.map((step, idx) => (
                  <View key={idx} style={styles.stepRow}>
                    <View style={styles.stepNum}>
                      <Text style={styles.stepNumText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.stepText}>{step}</Text>
                  </View>
                ))}
              </View>
            );
          })()}

          {params.source === 'plan' && (
            <View style={styles.section}>
              <View style={styles.noteSectionHeader}>
                <FileText size={16} color={Colors.textSecondary} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Today's Note</Text>
              </View>
              <TextInput
                style={styles.notesInput}
                value={dailyNote}
                onChangeText={setDailyNote}
                onBlur={handleNoteSave}
                placeholder="Add a note for today, e.g. Add more salt or Make without chicken."
                placeholderTextColor={Colors.textSecondary}
                multiline
                textAlignVertical="top"
              />
            </View>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {params.source === 'plan' ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={styles.favBtn}
            onPress={handleToggleFavFromPlan}
            activeOpacity={0.8}
          >
            <Heart
              size={22}
              color={Colors.primary}
              strokeWidth={2}
              fill={isPlanMealFav ? Colors.primary : 'transparent'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addToPlanBtn, styles.removePlanBtn]}
            onPress={handleRemoveFromPlan}
            activeOpacity={0.8}
          >
            <X size={18} color={DESTRUCTIVE_RED} strokeWidth={2.5} />
            <Text style={[styles.addToPlanText, styles.removeText]}>Remove from Plan</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 8 }]}>
          <TouchableOpacity
            style={[styles.addToPlanBtn]}
            onPress={handleAddToPlan}
            activeOpacity={0.8}
          >
            <CalendarPlus size={18} color={Colors.white} strokeWidth={2} />
            <Text style={styles.addToPlanText}>Add to Plan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.favBtn} onPress={handleToggleFav}>
            <Heart
              size={22}
              color={Colors.primary}
              strokeWidth={2}
              fill={isInFavs ? Colors.primary : 'transparent'}
            />
          </TouchableOpacity>
        </View>
      )}

      <SlotPickerModal
        visible={slotPickerVisible}
        onClose={() => setSlotPickerVisible(false)}
        onSelect={handleSlotSelected}
        mealSlots={sortedSlots}
        getMealsForSlot={getMealsForSlot}
        mealName={meal.name}
      />
    </KeyboardAvoidingView>
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
  heroImage: {
    width: '100%',
    aspectRatio: 16 / 9,
  },
  heroWrap: {
    position: 'relative' as const,
  },

  backBtn: {
    position: 'absolute' as const,
    left: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  editBtn: {
    position: 'absolute' as const,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  mealName: {
    fontSize: 24,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 12,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sourceTag: {
    backgroundColor: Colors.primaryLight,
  },
  tagText: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  timeRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 16,
  },
  timeItem: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  timeValue: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },

  servingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    padding: 12,
    marginBottom: 20,
    ...Shadows.card,
  },
  servingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  servingText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  noteSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  sectionBody: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
  ingredientRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  ingredientBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  ingredientQty: {
    width: 80,
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  ingredientName: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  stepRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  stepNumText: {
    fontSize: 13,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.white,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    lineHeight: 23,
  },
  notesInput: {
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    minHeight: 90,
    lineHeight: 22,
    borderWidth: 1.5,
    borderColor: Colors.divider,
  },
  bottomBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  addToPlanBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
  },
  removePlanBtn: {
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: `${DESTRUCTIVE_RED}30`,
  },
  addToPlanText: {
    fontSize: 16,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.white,
  },
  removeText: {
    color: DESTRUCTIVE_RED,
  },
  favBtn: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notFound: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 18,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  nutritionCard: {
    marginBottom: 20,
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 16,
    ...Shadows.card,
  },
  nutritionHeader: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    justifyContent: 'space-between' as const,
    marginBottom: 14,
  },
  nutritionTitle: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  nutritionSubtitle: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
  },
  nutritionRow: {
    flexDirection: 'row' as const,
    gap: 8,
  },
  nutritionBox: {
    flex: 1,
    alignItems: 'center' as const,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  nutritionValueRow: {
    flexDirection: 'row' as const,
    alignItems: 'flex-end' as const,
    gap: 2,
  },
  nutritionValue: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  nutritionUnit: {
    fontSize: 11,
    fontFamily: FontFamily.regular,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  nutritionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  backLink: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
