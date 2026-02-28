import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Alert,
  RefreshControl,
  Animated,
  Share,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ShoppingBasket,
  Plus,
  Trash2,
  Check,
  Square,
  CheckSquare,
  Info,
  Share2,
  ChevronDown,
  ChevronRight,
  Package,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { BorderRadius, Shadows, Spacing } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import SegmentedControl from '@/components/SegmentedControl';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import PrimaryButton from '@/components/PrimaryButton';
import FilterPill from '@/components/FilterPill';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { useShopping } from '@/providers/ShoppingProvider';
import { ShoppingItem, INGREDIENT_CATEGORIES } from '@/types';
import { router, Href } from 'expo-router';

interface SectionData {
  title: string;
  data: ShoppingItem[];
  collapsed?: boolean;
}

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const { familySettings } = useFamilySettings();
  const { getIngredientsForWeek, meals } = useMealPlan();
  const { meals: favMeals } = useFavs();
  const shopping = useShopping();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [addText, setAddText] = useState<string>('');
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showBreakdown, setShowBreakdown] = useState<string | null>(null);

  const weekOffset = shopping.weekMode === 'current' ? 0 : 1;

  const handleGenerate = useCallback(() => {
    const { ingredients } = getIngredientsForWeek(weekOffset, !shopping.fullWeek, favMeals);
    const pantryNames = familySettings.pantry_items.map((p) => p.name);
    shopping.generateList(ingredients, pantryNames);
    console.log('[Shopping] Generated list from meal plan');
  }, [weekOffset, shopping.fullWeek, getIngredientsForWeek, familySettings.pantry_items, shopping]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    handleGenerate();
    setTimeout(() => setRefreshing(false), 600);
  }, [handleGenerate]);

  const handleAddManual = useCallback(() => {
    const trimmed = addText.trim();
    if (!trimmed) return;
    shopping.addManualItem(trimmed);
    setAddText('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [addText, shopping]);

  const handleToggleCheck = useCallback(
    (itemId: string) => {
      shopping.toggleChecked(itemId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [shopping]
  );

  const handleRemoveItem = useCallback(
    (itemId: string) => {
      shopping.removeItem(itemId);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    },
    [shopping]
  );

  const handleClearChecked = useCallback(() => {
    Alert.alert(
      'Clear Checked Items',
      `Clear all ${shopping.checkedCount} checked items? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            shopping.clearChecked();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          },
        },
      ]
    );
  }, [shopping]);

  const handleShareList = useCallback(async () => {
    const activeItems = shopping.items.filter((i) => !i.checked);
    const text = activeItems
      .map((i) => `☐ ${i.name}${i.quantity > 1 ? ` × ${i.quantity} ${i.unit}` : ''}`)
      .join('\n');

    try {
      await Share.share({ message: `Shopping List\n\n${text}` });
    } catch (e) {
      console.log('[Shopping] Share error:', e);
    }
  }, [shopping.items]);

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  }, []);

  const sections = useMemo((): SectionData[] => {
    const grouped = new Map<string, ShoppingItem[]>();

    for (const item of shopping.items) {
      const key = shopping.groupBy === 'category' ? item.category : (item.where_to_buy ?? 'Unassigned');
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(item);
    }

    const categoryOrder = INGREDIENT_CATEGORIES as readonly string[];
    const entries = Array.from(grouped.entries());

    if (shopping.groupBy === 'category') {
      entries.sort((a, b) => {
        const aIdx = categoryOrder.indexOf(a[0]);
        const bIdx = categoryOrder.indexOf(b[0]);
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      });
    } else {
      entries.sort((a, b) => a[0].localeCompare(b[0]));
    }

    return entries.map(([title, data]) => {
      const sorted = [...data].sort((a, b) => {
        if (a.checked !== b.checked) return a.checked ? 1 : -1;
        if (a.is_pantry !== b.is_pantry) return a.is_pantry ? 1 : -1;
        return a.name.localeCompare(b.name);
      });
      return { title, data: collapsedSections.has(title) ? [] : sorted };
    });
  }, [shopping.items, shopping.groupBy, collapsedSections]);

  const weekMeals = useMemo(() => {
    const { mealCount, totalDays } = getIngredientsForWeek(weekOffset, !shopping.fullWeek, favMeals);
    return { mealCount, totalDays };
  }, [weekOffset, shopping.fullWeek, getIngredientsForWeek]);

  const renderItem = useCallback(
    ({ item }: { item: ShoppingItem }) => (
      <ShoppingListRow
        item={item}
        onToggle={handleToggleCheck}
        onRemove={handleRemoveItem}
        showBreakdown={showBreakdown === item.id}
        onToggleBreakdown={() => setShowBreakdown((p) => (p === item.id ? null : item.id))}
      />
    ),
    [handleToggleCheck, handleRemoveItem, showBreakdown]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => {
      const isCollapsed = collapsedSections.has(section.title);
      const originalData = shopping.items.filter((i) => {
        const key = shopping.groupBy === 'category' ? i.category : (i.where_to_buy ?? 'Unassigned');
        return key === section.title;
      });
      const checkedInSection = originalData.filter((i) => i.checked).length;

      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.title)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionTitleRow}>
            {isCollapsed ? (
              <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
            ) : (
              <ChevronDown size={16} color={Colors.textSecondary} strokeWidth={2} />
            )}
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionBadge}>
              <Text style={styles.sectionBadgeText}>
                {checkedInSection}/{originalData.length}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [collapsedSections, shopping.items, shopping.groupBy, toggleSection]
  );

  if (shopping.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Shopping" />
        <View style={styles.skeletonWrap}>
          <SkeletonLoader height={36} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={50} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={50} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={50} borderRadius={12} />
        </View>
      </View>
    );
  }

  const hasItems = shopping.items.length > 0;
  const hasMeals = meals.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="Shopping" />

      <View style={styles.topBar}>
        <View style={styles.weekToggle}>
          <FilterPill
            label="This Week"
            active={shopping.weekMode === 'current'}
            onPress={() => shopping.setWeekMode('current')}
          />
          <FilterPill
            label="Next Week"
            active={shopping.weekMode === 'next'}
            onPress={() => shopping.setWeekMode('next')}
          />
        </View>

        <View style={styles.actionRow}>
          <View style={styles.modeToggle}>
            <FilterPill
              label={shopping.fullWeek ? 'Full Week' : 'Remaining'}
              active={true}
              onPress={() => shopping.setFullWeek(!shopping.fullWeek)}
            />
          </View>

          {hasItems && (
            <TouchableOpacity onPress={handleShareList} style={styles.shareBtn}>
              <Share2 size={18} color={Colors.primary} strokeWidth={2} />
            </TouchableOpacity>
          )}
        </View>

        {hasMeals && (
          <TouchableOpacity style={styles.generateBtn} onPress={handleGenerate} activeOpacity={0.7}>
            <ShoppingBasket size={16} color={Colors.primary} strokeWidth={2} />
            <Text style={styles.generateBtnText}>
              {hasItems ? 'Regenerate from meal plan' : 'Generate shopping list'}
            </Text>
          </TouchableOpacity>
        )}

        {hasItems && (
          <View style={styles.groupToggleWrap}>
            <SegmentedControl
              segments={['By Category', 'By Source']}
              activeIndex={shopping.groupBy === 'category' ? 0 : 1}
              onChange={(idx) => shopping.setGroupBy(idx === 0 ? 'category' : 'source')}
            />
          </View>
        )}
      </View>

      <View style={styles.quickAddWrap}>
        <TextInput
          style={styles.quickAddInput}
          placeholder="Add an item..."
          placeholderTextColor={Colors.textSecondary}
          value={addText}
          onChangeText={setAddText}
          onSubmitEditing={handleAddManual}
          returnKeyType="done"
          testID="quick-add-input"
        />
        <TouchableOpacity
          style={[styles.quickAddBtn, !addText.trim() && styles.quickAddBtnDisabled]}
          onPress={handleAddManual}
          disabled={!addText.trim()}
        >
          <Plus size={18} color={addText.trim() ? Colors.white : Colors.inactive} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {!hasItems && !hasMeals ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={<ShoppingBasket size={36} color={Colors.primary} strokeWidth={1.5} />}
            title="Your shopping list is empty"
            description="Plan some meals first, then generate your shopping list automatically."
            actionLabel="Go to Meal Plan"
            onAction={() => router.push('/' as Href)}
          />
        </View>
      ) : !hasItems ? (
        <View style={styles.emptyWrap}>
          <EmptyState
            icon={<Package size={36} color={Colors.primary} strokeWidth={1.5} />}
            title="Ready to generate"
            description={`You have ${weekMeals.mealCount} meals planned across ${weekMeals.totalDays} days. Tap generate to build your shopping list.`}
            actionLabel="Generate List"
            onAction={handleGenerate}
          />
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
          }
          ListFooterComponent={
            shopping.checkedCount > 0 ? (
              <View style={styles.clearWrap}>
                <PrimaryButton
                  label={`Clear ${shopping.checkedCount} checked item${shopping.checkedCount > 1 ? 's' : ''}`}
                  onPress={handleClearChecked}
                  variant="secondary"
                />
              </View>
            ) : null
          }
          testID="shopping-list"
        />
      )}

      {hasItems && (
        <View style={[styles.statusBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <Text style={styles.statusText}>
            {shopping.checkedCount} of {shopping.totalCount} items checked
          </Text>
        </View>
      )}
    </View>
  );
}

interface ShoppingListRowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  showBreakdown: boolean;
  onToggleBreakdown: () => void;
}

const ShoppingListRow = React.memo(function ShoppingListRow({
  item,
  onToggle,
  onRemove,
  showBreakdown,
  onToggleBreakdown,
}: ShoppingListRowProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }, [scaleAnim]);

  return (
    <Animated.View style={[styles.itemRow, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={styles.itemCheckArea}
        onPress={() => onToggle(item.id)}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.7}
      >
        {item.checked ? (
          <CheckSquare size={20} color={Colors.success} strokeWidth={2} />
        ) : item.is_pantry ? (
          <CheckSquare size={20} color={Colors.inactive} strokeWidth={2} />
        ) : (
          <Square size={20} color={Colors.textSecondary} strokeWidth={1.5} />
        )}

        <View style={styles.itemTextWrap}>
          <Text
            style={[
              styles.itemName,
              item.checked && styles.itemNameChecked,
              item.is_pantry && !item.checked && styles.itemNamePantry,
            ]}
            numberOfLines={1}
          >
            {item.name}
          </Text>
          <View style={styles.itemMetaRow}>
            <Text style={styles.itemQty}>
              {item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)} {item.unit}
            </Text>
            {item.is_pantry && !item.checked && (
              <View style={styles.pantryTag}>
                <Text style={styles.pantryTagText}>Already have this</Text>
              </View>
            )}
            {item.manually_added && (
              <View style={styles.manualTag}>
                <Text style={styles.manualTagText}>Added manually</Text>
              </View>
            )}
            {item.where_to_buy && (
              <View style={styles.sourceTag}>
                <Text style={styles.sourceTagText}>{item.where_to_buy}</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>

      <View style={styles.itemActions}>
        {item.meal_breakdown.length > 0 && (
          <TouchableOpacity
            onPress={onToggleBreakdown}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Info size={16} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => onRemove(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={16} color={Colors.inactive} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {showBreakdown && item.meal_breakdown.length > 0 && (
        <View style={styles.breakdownWrap}>
          {item.meal_breakdown.map((b, idx) => (
            <Text key={idx} style={styles.breakdownText}>
              {b.meal_name}: {b.quantity % 1 === 0 ? b.quantity : b.quantity.toFixed(1)} {item.unit}
            </Text>
          ))}
        </View>
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  topBar: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 8,
  },
  weekToggle: {
    flexDirection: 'row',
    gap: 8,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modeToggle: {
    flexDirection: 'row',
  },
  shareBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.button,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  generateBtnText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  groupToggleWrap: {
    marginTop: 2,
  },
  quickAddWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  quickAddInput: {
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
  quickAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddBtnDisabled: {
    backgroundColor: Colors.surface,
  },
  emptyWrap: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingTop: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700' as const,
    color: Colors.text,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    flex: 1,
  },
  sectionBadge: {
    backgroundColor: Colors.surface,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  sectionBadgeText: {
    fontSize: 11,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  itemRow: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    marginBottom: 6,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  itemCheckArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemTextWrap: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500' as const,
    color: Colors.text,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through' as const,
    color: Colors.inactive,
  },
  itemNamePantry: {
    color: Colors.inactive,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 3,
    flexWrap: 'wrap',
  },
  itemQty: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  pantryTag: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  pantryTagText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
  },
  manualTag: {
    backgroundColor: Colors.primaryLight,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  manualTagText: {
    fontSize: 10,
    fontWeight: '500' as const,
    color: Colors.primary,
  },
  sourceTag: {
    backgroundColor: Colors.surface,
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  sourceTagText: {
    fontSize: 10,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  breakdownWrap: {
    position: 'absolute' as const,
    bottom: -4,
    left: 44,
    right: 44,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 8,
    ...Shadows.card,
    zIndex: 10,
  },
  breakdownText: {
    fontSize: 12,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  clearWrap: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  statusBar: {
    position: 'absolute' as const,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingHorizontal: 16,
    paddingTop: 8,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
  skeletonWrap: {
    padding: 16,
  },
});
