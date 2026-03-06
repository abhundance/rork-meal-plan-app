/**
 * RecipeFilterSheet
 *
 * Shared filter bottom sheet used by both the Favs and Discover tabs.
 * Configure which sections appear via the `config` prop.
 *
 * Design contract (do not change without updating both callers):
 *   - presentationStyle "pageSheet" modal with handle bar
 *   - FilterPill chips for every option
 *   - Cuisine / Dietary: multi-select (tap again to deselect one item)
 *   - Cook Time / Sort / Calories: single-select (tap again to deselect)
 *   - Footer: "Clear All" + "Apply" (Apply calls onApply then closes)
 *   - Badge shows the number of active filter sections, not a dot
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
import FilterPill from '@/components/FilterPill';
import Colors from '@/constants/colors';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RecipeFilterState {
  sort:     string;    // 'recently_added' | 'most_used' | 'recently_planned' | 'cooking_time' | 'a_to_z'
  cuisines: string[];  // multi-select — lowercase keys, e.g. ['italian', 'thai']
  cookTime: string;    // '' | 'Under 30' | '30-60' | 'Over 60'
  dietary:  string[];  // multi-select — keys: 'vegan' | 'vegetarian' | 'gluten_free' | 'dairy_free' | 'high_protein' | 'low_carb'
  protein:  string[];  // multi-select — keys: 'chicken' | 'beef_lamb' | 'seafood' | 'egg' | 'plant'
  calories: string;    // '' | 'under_400' | '400_600' | 'over_600'
}

export const DEFAULT_FILTER_STATE: RecipeFilterState = {
  sort:     'recently_added',
  cuisines: [],
  cookTime: '',
  dietary:  [],
  protein:  [],
  calories: '',
};

export interface RecipeFilterConfig {
  showSort?:      boolean;
  showCuisine?:   boolean;
  /** Pass the cuisine options to show. Each entry: { key: 'italian', label: 'Italian' } */
  cuisineOptions?: { key: string; label: string }[];
  showCookTime?:  boolean;
  showDietary?:   boolean;
  showProtein?:   boolean;
  showCalories?:  boolean;
}

/** Returns the number of active filter sections (used for the badge count). */
export function countActiveFilters(
  state: RecipeFilterState,
  config: RecipeFilterConfig,
): number {
  let n = 0;
  if (config.showSort     && state.sort && state.sort !== 'recently_added') n++;
  if (config.showCuisine  && state.cuisines.length > 0)  n++;
  if (config.showCookTime && state.cookTime !== '')       n++;
  if (config.showDietary  && state.dietary.length > 0)   n++;
  if (config.showProtein  && state.protein.length > 0)   n++;
  if (config.showCalories && state.calories !== '')       n++;
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
];

const PROTEIN_OPTIONS = [
  { key: 'chicken',   label: '🐓 Chicken' },
  { key: 'beef_lamb', label: '🥩 Red Meat' },
  { key: 'seafood',   label: '🐟 Seafood' },
  { key: 'egg',       label: '🥚 Eggs' },
  { key: 'plant',     label: '🌿 Plant-based' },
];

const CALORIE_OPTIONS = [
  { key: 'under_400', label: 'Under 400 cal' },
  { key: '400_600',   label: '400–600 cal' },
  { key: 'over_600',  label: 'Over 600 cal' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toggle(arr: string[], key: string): string[] {
  return arr.includes(key) ? arr.filter(k => k !== key) : [...arr, key];
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
  const [draft, setDraft] = useState<RecipeFilterState>(initialState);

  // Sync draft when the sheet opens so it reflects the current applied state
  useEffect(() => {
    if (visible) setDraft(initialState);
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClear = () => {
    setDraft(DEFAULT_FILTER_STATE);
  };

  const handleApply = () => {
    onApply(draft);
    onClose();
  };

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
            <X size={22} color="#6B7280" strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* ── Sections ── */}
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >

          {/* SORT BY */}
          {config.showSort && (
            <>
              <Text style={styles.sectionLabel}>SORT BY</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {SORT_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.sort === opt.key}
                    onPress={() => setDraft(d => ({ ...d, sort: opt.key }))}
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* CUISINE */}
          {config.showCuisine && (config.cuisineOptions?.length ?? 0) > 0 && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>CUISINE</Text>
              <View style={styles.wrapRow}>
                {(config.cuisineOptions ?? []).map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.cuisines.includes(opt.key)}
                    onPress={() =>
                      setDraft(d => ({ ...d, cuisines: toggle(d.cuisines, opt.key) }))
                    }
                  />
                ))}
              </View>
            </>
          )}

          {/* COOK TIME */}
          {config.showCookTime && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>COOK TIME</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {COOK_TIME_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.cookTime === opt.key}
                    onPress={() =>
                      setDraft(d => ({ ...d, cookTime: d.cookTime === opt.key ? '' : opt.key }))
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

          {/* DIETARY */}
          {config.showDietary && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>DIETARY</Text>
              <View style={styles.wrapRow}>
                {DIETARY_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.dietary.includes(opt.key)}
                    onPress={() =>
                      setDraft(d => ({ ...d, dietary: toggle(d.dietary, opt.key) }))
                    }
                  />
                ))}
              </View>
            </>
          )}

          {/* PROTEIN SOURCE */}
          {config.showProtein && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>PROTEIN</Text>
              <View style={styles.wrapRow}>
                {PROTEIN_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.protein.includes(opt.key)}
                    onPress={() =>
                      setDraft(d => ({ ...d, protein: toggle(d.protein, opt.key) }))
                    }
                  />
                ))}
              </View>
            </>
          )}

          {/* CALORIES PER SERVING */}
          {config.showCalories && (
            <>
              <Text style={[styles.sectionLabel, styles.sectionGap]}>CALORIES PER SERVING</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {CALORIE_OPTIONS.map(opt => (
                  <FilterPill
                    key={opt.key}
                    label={opt.label}
                    active={draft.calories === opt.key}
                    onPress={() =>
                      setDraft(d => ({ ...d, calories: d.calories === opt.key ? '' : opt.key }))
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

        </ScrollView>

        {/* ── Footer ── */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.clearBtn} onPress={handleClear}>
            <Text style={styles.clearText}>Clear All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>

      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
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
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  clearBtn: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  applyBtn: {
    flex: 2,
    height: 50,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
