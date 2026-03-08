/**
 * RecipeFilterSheet
 *
 * Shared filter bottom sheet used by both the Favs and Discover tabs.
 * Configure which sections appear via the `config` prop.
 *
 * Design contract (do not change without updating both callers):
 *   - presentationStyle "pageSheet" modal with handle bar
 *   - FilterPill chips for every option
 *   - Multi-select sections: Cuisine, Dish Type, Protein, Dietary, Intolerances, Occasion
 *   - Single-select sections: Meal Type, Cook Time, Spice Level, Calories, Source, Rating, Sort
 *   - Footer: "Clear All" + "Apply" (Apply calls onApply then closes)
 *   - Badge shows the number of active filter sections, not a dot
 *
 * Section order (both tabs render the subset enabled by their config):
 *   1. Meal Type        — single-select  (both tabs)
 *   2. Dish Type        — multi-select   (both tabs)
 *   3. Cuisine          — multi-select   (both tabs)
 *   4. Protein          — multi-select   (both tabs)
 *   5. Cook Time        — single-select  (both tabs)
 *   6. Dietary          — multi-select   (both tabs)
 *   7. Intolerances     — multi-select   (Discover only)
 *   8. Occasion         — multi-select   (Discover only)
 *   9. Spice Level      — single-select  (Discover only)
 *  10. Calories         — single-select  (both tabs)
 *  11. Source           — single-select  (Favs only)
 *  12. Rating           — single-select  (Favs only)
 *  13. Sort             — single-select  (optional, currently off on both)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { X } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import FilterPill from '@/components/FilterPill';
import PrimaryButton from '@/components/PrimaryButton';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { Spacing } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecipeFilterState {
  sort:         string;    // 'recently_added' | 'most_used' | 'recently_planned' | 'cooking_time' | 'a_to_z'
  mealType:     string;    // '' | 'breakfast' | 'lunch_dinner' | 'light_bites'
  dishTypes:    string[];  // multi-select — DishCategory values e.g. ['main', 'salad']
  cuisines:     string[];  // multi-select — lowercase keys e.g. ['italian', 'thai']
  protein:      string[];  // multi-select — ProteinSource keys e.g. ['chicken', 'seafood']
  cookTime:     string;    // '' | 'Under 30' | '30-60' | 'Over 60'
  dietary:      string[];  // multi-select — e.g. ['vegan', 'gluten_free', 'keto']
  intolerances: string[];  // multi-select — allergen-free keys e.g. ['gluten-free', 'nut-free']
  occasions:    string[];  // multi-select — e.g. ['weeknight', 'meal-prep']
  spiceLevel:   string;    // '' | 'mild' | 'medium' | 'hot'
  calories:     string;    // '' | 'under_400' | '400_600' | 'over_600'
  source:       string;    // '' | 'family_created' | 'discover'   (Favs only)
  rating:       string;    // '' | 'loved' | 'liked' | 'unrated'   (Favs only)
}

export const DEFAULT_FILTER_STATE: RecipeFilterState = {
  sort:         'recently_added',
  mealType:     '',
  dishTypes:    [],
  cuisines:     [],
  protein:      [],
  cookTime:     '',
  dietary:      [],
  intolerances: [],
  occasions:    [],
  spiceLevel:   '',
  calories:     '',
  source:       '',
  rating:       '',
};

export interface RecipeFilterConfig {
  // ── Shared sections ────────────────────────────────────────────────────────
  showMealType?:    boolean;
  showDishType?:    boolean;
  showCuisine?:     boolean;
  /** Pass the cuisine options to show. Each entry: { key: 'italian', label: 'Italian' } */
  cuisineOptions?:  { key: string; label: string }[];
  showProtein?:     boolean;
  showCookTime?:    boolean;
  showDietary?:     boolean;
  showCalories?:    boolean;
  // ── Discover-only sections ─────────────────────────────────────────────────
  showIntolerances?: boolean;
  showOccasion?:     boolean;
  showSpiceLevel?:   boolean;
  // ── Favs-only sections ─────────────────────────────────────────────────────
  showSource?:       boolean;
  showRating?:       boolean;
  // ── Optional (currently off on both tabs) ─────────────────────────────────
  showSort?:         boolean;
}

/** Returns the number of active filter sections (used for the badge count). */
export function countActiveFilters(
  state: RecipeFilterState,
  config: RecipeFilterConfig,
): number {
  let n = 0;
  if (config.showSort         && state.sort && state.sort !== 'recently_added') n++;
  if (config.showMealType     && state.mealType !== '')          n++;
  if (config.showDishType     && state.dishTypes.length > 0)     n++;
  if (config.showCuisine      && state.cuisines.length > 0)      n++;
  if (config.showProtein      && state.protein.length > 0)       n++;
  if (config.showCookTime     && state.cookTime !== '')           n++;
  if (config.showDietary      && state.dietary.length > 0)       n++;
  if (config.showIntolerances && state.intolerances.length > 0)  n++;
  if (config.showOccasion     && state.occasions.length > 0)     n++;
  if (config.showSpiceLevel   && state.spiceLevel !== '')        n++;
  if (config.showCalories     && state.calories !== '')          n++;
  if (config.showSource       && state.source !== '')            n++;
  if (config.showRating       && state.rating !== '')            n++;
  return n;
}

// ─── Static option tables ─────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'recently_added',   label: 'Recently Added' },
  { key: 'most_used',        label: 'Most Used' },
  { key: 'recently_planned', label: 'Recently Planned' },
  { key: 'cooking_time',     label: 'Cooking Time' },
  { key: 'a_to_z',           label: 'A to Z' },
];

const MEAL_TYPE_OPTIONS = [
  { key: 'breakfast',    label: '🌅 Breakfast' },
  { key: 'lunch_dinner', label: '🍽️ Lunch & Dinner' },
  { key: 'light_bites',  label: '🥗 Light Bites' },
];

const DISH_TYPE_OPTIONS = [
  { key: 'main',      label: 'Main Course' },
  { key: 'salad',     label: 'Salad' },
  { key: 'soup',      label: 'Soup' },
  { key: 'appetizer', label: 'Appetizer' },
  { key: 'side',      label: 'Side Dish' },
  { key: 'dessert',   label: 'Dessert' },
  { key: 'sandwich',  label: 'Sandwich / Wrap' },
  { key: 'bread',     label: 'Bread / Baked' },
  { key: 'drink',     label: 'Drink' },
  { key: 'sauce',     label: 'Sauce' },
];

const COOK_TIME_OPTIONS = [
  { key: 'Under 30', label: 'Under 30 min' },
  { key: '30-60',    label: '30–60 min' },
  { key: 'Over 60',  label: 'Over 60 min' },
];

const DIETARY_OPTIONS = [
  { key: 'vegan',        label: 'Vegan' },
  { key: 'vegetarian',   label: 'Vegetarian' },
  { key: 'gluten_free',  label: 'Gluten-Free' },
  { key: 'dairy_free',   label: 'Dairy-Free' },
  { key: 'high_protein', label: 'High Protein' },
  { key: 'low_carb',     label: 'Low Carb' },
  { key: 'keto',         label: 'Keto' },
  { key: 'paleo',        label: 'Paleo' },
  { key: 'whole30',      label: 'Whole30' },
  { key: 'nut_free',     label: 'Nut-Free' },
];

const PROTEIN_OPTIONS = [
  { key: 'chicken', label: '🐓 Chicken' },
  { key: 'beef',    label: '🥩 Beef' },
  { key: 'pork',    label: '🥩 Pork' },
  { key: 'lamb',    label: '🥩 Lamb' },
  { key: 'turkey',  label: '🦃 Turkey' },
  { key: 'seafood', label: '🐟 Seafood' },
  { key: 'egg',     label: '🥚 Eggs' },
  { key: 'dairy',   label: '🧀 Dairy' },
  { key: 'plant',   label: '🌿 Plant-Based' },
];

const INTOLERANCE_OPTIONS = [
  { key: 'dairy-free',     label: 'Dairy' },
  { key: 'gluten-free',    label: 'Gluten' },
  { key: 'nut-free',       label: 'Nuts' },
  { key: 'egg-free',       label: 'Eggs' },
  { key: 'soy-free',       label: 'Soy' },
  { key: 'shellfish-free', label: 'Shellfish' },
  { key: 'peanut-free',    label: 'Peanuts' },
  { key: 'wheat-free',     label: 'Wheat' },
  { key: 'sesame-free',    label: 'Sesame' },
];

const OCCASION_OPTIONS = [
  { key: 'weeknight',     label: 'Weeknight' },
  { key: 'weekend',       label: 'Weekend' },
  { key: 'meal-prep',     label: 'Meal Prep' },
  { key: 'date-night',    label: 'Date Night' },
  { key: 'brunch',        label: 'Brunch' },
  { key: 'family-dinner', label: 'Family Dinner' },
  { key: 'potluck',       label: 'Potluck' },
  { key: 'bbq',           label: 'BBQ' },
  { key: 'game-day',      label: 'Game Day' },
  { key: 'dinner-party',  label: 'Dinner Party' },
  { key: 'picnic',        label: 'Picnic' },
];

const SPICE_OPTIONS = [
  { key: 'mild',   label: '😌 Mild' },
  { key: 'medium', label: '🌶️ Medium' },
  { key: 'hot',    label: '🔥 Hot' },
];

const CALORIE_OPTIONS = [
  { key: 'under_400', label: 'Under 400 cal' },
  { key: '400_600',   label: '400–600 cal' },
  { key: 'over_600',  label: 'Over 600 cal' },
];

const SOURCE_OPTIONS = [
  { key: 'family_created', label: '👨‍👩‍👧 My Recipes' },
  { key: 'discover',       label: '🔍 Saved from Discover' },
];

const RATING_OPTIONS = [
  { key: 'loved',   label: '❤️ Loved' },
  { key: 'liked',   label: '👍 Liked' },
  { key: 'unrated', label: 'Unrated' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key];
}

function singleToggle(current: string, key: string): string {
  return current === key ? '' : key;
}

// ─── Section component ────────────────────────────────────────────────────────

function Section({ label, first = false, children }: {
  label: string;
  first?: boolean;
  children: React.ReactNode;
}) {
  return (
    <>
      <Text style={[styles.sectionLabel, !first && styles.sectionGap]}>{label}</Text>
      {children}
    </>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface RecipeFilterSheetProps {
  visible:      boolean;
  onClose:      () => void;
  onApply:      (state: RecipeFilterState) => void;
  initialState: RecipeFilterState;
  config:       RecipeFilterConfig;
}

export default function RecipeFilterSheet({
  visible,
  onClose,
  onApply,
  initialState,
  config,
}: RecipeFilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<RecipeFilterState>(initialState);

  useEffect(() => {
    if (visible) setDraft(initialState);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => setDraft({ ...DEFAULT_FILTER_STATE });
  const handleApply = () => { onApply(draft); onClose(); };

  // Track whether a section is the first rendered (to skip top gap)
  let isFirst = true;
  function nextFirst() {
    const f = isFirst;
    isFirst = false;
    return f;
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>

        {/* ── Header ── */}
        <View style={styles.header}>
          <Text style={styles.title}>Filters</Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <X size={22} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Sections ── */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* 1. MEAL TYPE */}
          {config.showMealType && (
            <Section label="MEAL TYPE" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {MEAL_TYPE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.mealType === opt.key}
                    onPress={() => setDraft(d => ({ ...d, mealType: singleToggle(d.mealType, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 2. DISH TYPE */}
          {config.showDishType && (
            <Section label="DISH TYPE" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {DISH_TYPE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.dishTypes.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, dishTypes: toggle(d.dishTypes, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 3. CUISINE */}
          {config.showCuisine && (config.cuisineOptions?.length ?? 0) > 0 && (
            <Section label="CUISINE" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {(config.cuisineOptions ?? []).map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.cuisines.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, cuisines: toggle(d.cuisines, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 4. PROTEIN */}
          {config.showProtein && (
            <Section label="PROTEIN" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {PROTEIN_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.protein.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, protein: toggle(d.protein, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 5. COOK TIME */}
          {config.showCookTime && (
            <Section label="COOK TIME" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {COOK_TIME_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.cookTime === opt.key}
                    onPress={() => setDraft(d => ({ ...d, cookTime: singleToggle(d.cookTime, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 6. DIETARY */}
          {config.showDietary && (
            <Section label="DIETARY" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {DIETARY_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.dietary.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, dietary: toggle(d.dietary, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 7. INTOLERANCES / ALLERGENS (Discover only) */}
          {config.showIntolerances && (
            <Section label="INTOLERANCES / FREE FROM" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {INTOLERANCE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.intolerances.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, intolerances: toggle(d.intolerances, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 8. OCCASION (Discover only) */}
          {config.showOccasion && (
            <Section label="OCCASION" first={nextFirst()}>
              <View style={styles.wrapRow}>
                {OCCASION_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.occasions.includes(opt.key)}
                    onPress={() => setDraft(d => ({ ...d, occasions: toggle(d.occasions, opt.key) }))}
                  />
                ))}
              </View>
            </Section>
          )}

          {/* 9. SPICE LEVEL (Discover only) */}
          {config.showSpiceLevel && (
            <Section label="SPICE LEVEL" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {SPICE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.spiceLevel === opt.key}
                    onPress={() => setDraft(d => ({ ...d, spiceLevel: singleToggle(d.spiceLevel, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 10. CALORIES PER SERVING */}
          {config.showCalories && (
            <Section label="CALORIES PER SERVING" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {CALORIE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.calories === opt.key}
                    onPress={() => setDraft(d => ({ ...d, calories: singleToggle(d.calories, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 11. SOURCE (Favs only) */}
          {config.showSource && (
            <Section label="SOURCE" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {SOURCE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.source === opt.key}
                    onPress={() => setDraft(d => ({ ...d, source: singleToggle(d.source, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 12. RATING (Favs only) */}
          {config.showRating && (
            <Section label="RATING" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {RATING_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.rating === opt.key}
                    onPress={() => setDraft(d => ({ ...d, rating: singleToggle(d.rating, opt.key) }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

          {/* 13. SORT BY (optional, currently off on both tabs) */}
          {config.showSort && (
            <Section label="SORT BY" first={nextFirst()}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
                {SORT_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.sort === opt.key}
                    onPress={() => setDraft(d => ({ ...d, sort: opt.key }))}
                  />
                ))}
              </ScrollView>
            </Section>
          )}

        </ScrollView>

        {/* ── Footer ── */}
        <View style={[styles.footer, { paddingBottom: Math.max(Spacing.lg, insets.bottom) }]}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
          <PrimaryButton label="Apply" onPress={handleApply} style={{ flex: 2 }} />
        </View>

      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 18,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.textSecondary,
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  sectionGap: {
    marginTop: 28,
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  footer: {
    flexDirection: 'row',
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  clearBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
});
