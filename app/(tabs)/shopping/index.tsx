import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SectionList,
  StyleSheet,
  Alert,
  Share,
  Modal,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Plus, Copy, Share2, ChevronDown, ChevronRight, Check, Trash2, ShoppingBasket } from 'lucide-react-native';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Shadows } from '@/constants/theme';
import AppHeader from '@/components/AppHeader';
import EmptyState from '@/components/EmptyState';
import SkeletonLoader from '@/components/SkeletonLoader';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useMealPlan } from '@/providers/MealPlanProvider';
import { useFavs } from '@/providers/FavsProvider';
import { useShopping } from '@/providers/ShoppingProvider';
import { ShoppingItem, INGREDIENT_CATEGORIES } from '@/types';
import { getWeekDates } from '@/utils/dates';
import { router, Href } from 'expo-router';

// ─── Category emoji icons ─────────────────────────────────────────────────────
const CATEGORY_ICONS: Record<string, string> = {
  'Produce':             '🥦',
  'Meat & Fish':         '🥩',
  'Dairy & Eggs':        '🥛',
  'Pantry':              '🫙',
  'Bread & Bakery':      '🍞',
  'Frozen':              '❄️',
  'Drinks':              '🥤',
  'Condiments & Sauces': '🧴',
  'Herbs & Spices':      '🌿',
  'Other':               '🛒',
  // legacy category names — so old items still display with an icon
  'Dairy':               '🥛',
  'Bakery':              '🍞',
  'Pantry Staples':      '🫙',
  'Household':           '🏠',
};

interface SectionData {
  title: string;
  data: ShoppingItem[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildDateLabel(weekMode: 'current' | 'next'): string {
  if (weekMode === 'next') return 'Mon → Sun';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const todayName = days[today.getDay()];
  const weekDates = getWeekDates(0);
  const lastDay = weekDates[weekDates.length - 1];
  const lastDayName = days[lastDay.getDay()];
  if (todayName === lastDayName) return lastDayName;
  return `${todayName} → ${lastDayName}`;
}

function buildShareText(
  items: ShoppingItem[],
  dateLabel: string,
): string {
  const grouped = new Map<string, ShoppingItem[]>();
  const order = [...(INGREDIENT_CATEGORIES as readonly string[])];

  for (const item of items) {
    const cat = item.category || 'Other';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  const lines: string[] = [`🛒 Shopping List — ${dateLabel}\n`];
  const seen = new Set<string>();

  const emit = (cat: string) => {
    if (seen.has(cat)) return;
    const catItems = grouped.get(cat);
    if (!catItems || catItems.length === 0) return;
    seen.add(cat);
    lines.push(`${CATEGORY_ICONS[cat] ?? '•'} ${cat}`);
    catItems.forEach((i) => {
      const qty =
        i.quantity > 0 || i.unit
          ? ` — ${i.quantity > 0 ? (i.quantity % 1 === 0 ? i.quantity : i.quantity.toFixed(1)) : ''}${i.unit ? ` ${i.unit}` : ''}`.trimEnd()
          : '';
      lines.push(`  ${i.checked ? '✓' : '□'} ${i.name}${qty}`);
    });
    lines.push('');
  };

  order.forEach(emit);
  grouped.forEach((_, cat) => emit(cat));
  lines.push('Sent from Meal Plan 🍽️');
  return lines.join('\n');
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

function ProgressBar({ checked, total }: { checked: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((checked / total) * 100);
  const widthAnim = useRef(new Animated.Value(pct)).current;

  useEffect(() => {
    Animated.timing(widthAnim, {
      toValue: pct,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [pct]);

  return (
    <View style={pbStyles.wrap}>
      <View style={pbStyles.row}>
        <Text style={pbStyles.label}>{checked} of {total} items</Text>
        <Text style={[pbStyles.pct, pct === 100 && pbStyles.pctDone]}>{pct}%</Text>
      </View>
      <View style={pbStyles.track}>
        <Animated.View
          style={[
            pbStyles.fill,
            pct === 100 && pbStyles.fillDone,
            {
              width: widthAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const pbStyles = StyleSheet.create({
  wrap: { paddingHorizontal: 14, paddingVertical: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  label: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '500' as const, color: Colors.textSecondary },
  pct: { fontSize: 13, fontFamily: FontFamily.semiBold, fontWeight: '600' as const, color: Colors.primary },
  pctDone: { color: Colors.success },
  track: { height: 6, borderRadius: 99, backgroundColor: Colors.surface, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 99, backgroundColor: Colors.primary },
  fillDone: { backgroundColor: Colors.success },
});

// ─── All done state ───────────────────────────────────────────────────────────

function AllDoneState({ onClearAll }: { onClearAll: () => void }) {
  return (
    <View style={adStyles.wrap}>
      <Text style={adStyles.emoji}>🎉</Text>
      <Text style={adStyles.title}>Shopping done!</Text>
      <Text style={adStyles.sub}>Everything's ticked off. Time to cook something great.</Text>
      <TouchableOpacity style={adStyles.btn} onPress={onClearAll} activeOpacity={0.8}>
        <Text style={adStyles.btnText}>Clear & start fresh</Text>
      </TouchableOpacity>
    </View>
  );
}

const adStyles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 22, fontFamily: FontFamily.bold, fontWeight: '700' as const, color: Colors.text, marginBottom: 8 },
  sub: {
    fontSize: 15,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  btnText: { fontSize: 14, fontFamily: FontFamily.semiBold, fontWeight: '600' as const, color: Colors.textSecondary },
});

// ─── Add item sheet ───────────────────────────────────────────────────────────

interface AddItemSheetProps {
  visible: boolean;
  onClose: () => void;
  onAdd: (name: string, qty: string, unit: string, category: string) => void;
}

function AddItemSheet({ visible, onClose, onAdd }: AddItemSheetProps) {
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState('Other');
  const insets = useSafeAreaInsets();

  const reset = () => { setName(''); setQty(''); setUnit(''); setCategory('Other'); };

  const handleAdd = () => {
    if (!name.trim()) return;
    onAdd(name.trim(), qty.trim(), unit.trim(), category);
    reset();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      presentationStyle="overFullScreen"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={sheetStyles.kavRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Tap-to-dismiss overlay — absoluteFill so it sits behind the sheet */}
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} />
        <View style={[sheetStyles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={sheetStyles.handle} />
          <View style={sheetStyles.inner}>
            <Text style={sheetStyles.title}>Add item</Text>

            <TextInput
              autoFocus
              style={sheetStyles.input}
              placeholder="Item name"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              returnKeyType="next"
            />

          <View style={sheetStyles.qtyRow}>
            <TextInput
              style={[sheetStyles.input, sheetStyles.inputHalf]}
              placeholder="Qty (e.g. 200)"
              placeholderTextColor={Colors.textSecondary}
              value={qty}
              onChangeText={setQty}
              keyboardType="decimal-pad"
              returnKeyType="next"
            />
            <TextInput
              style={[sheetStyles.input, sheetStyles.inputHalf]}
              placeholder="Unit (e.g. g, ml)"
              placeholderTextColor={Colors.textSecondary}
              value={unit}
              onChangeText={setUnit}
              returnKeyType="done"
            />
          </View>

          <Text style={sheetStyles.aisleLabel}>Aisle</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={sheetStyles.chipScroll}
            contentContainerStyle={{ paddingBottom: 4 }}
          >
            {(INGREDIENT_CATEGORIES as readonly string[]).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[sheetStyles.chip, category === cat && sheetStyles.chipActive]}
                onPress={() => setCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[sheetStyles.chipText, category === cat && sheetStyles.chipTextActive]}>
                  {CATEGORY_ICONS[cat] ?? '•'} {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <TouchableOpacity
            style={[sheetStyles.addBtn, !name.trim() && sheetStyles.addBtnDisabled]}
            onPress={handleAdd}
            disabled={!name.trim()}
            activeOpacity={0.8}
          >
            <Text style={[sheetStyles.addBtnText, !name.trim() && sheetStyles.addBtnTextDisabled]}>
              Add to list
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const sheetStyles = StyleSheet.create({
  // KeyboardAvoidingView root: fills screen, pushes sheet up with keyboard
  kavRoot: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.overlay,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.header,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 99,
    backgroundColor: Colors.border,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  inner: { paddingHorizontal: 16, paddingTop: 8 },
  title: { fontSize: 18, fontFamily: FontFamily.bold, fontWeight: '700' as const, color: Colors.text, marginBottom: 16 },
  input: {
    height: 46,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    paddingHorizontal: 14,
    fontSize: 15,
    color: Colors.text,
    marginBottom: 10,
  },
  qtyRow: { flexDirection: 'row', gap: 10 },
  inputHalf: { flex: 1 },
  aisleLabel: {
    fontSize: 11,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
    marginBottom: 8,
    marginTop: 4,
  },
  chipScroll: { marginBottom: 20, height: 46 },
  chip: {
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipText: { fontSize: 13, color: Colors.textSecondary },
  chipTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold, fontWeight: '600' as const },
  addBtn: {
    height: 50,
    borderRadius: BorderRadius.button,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addBtnDisabled: { backgroundColor: Colors.surface },
  addBtnText: { fontSize: 15, fontFamily: FontFamily.semiBold, fontWeight: '600' as const, color: Colors.white },
  addBtnTextDisabled: { color: Colors.inactive },
});

// ─── Shopping item row ────────────────────────────────────────────────────────

interface RowProps {
  item: ShoppingItem;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
}

const ShoppingItemRow = React.memo(function ShoppingItemRow({ item, onToggle, onRemove }: RowProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const onPressIn = () =>
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () =>
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 2 }).start();

  return (
    <Animated.View style={[rowStyles.wrap, { transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        style={rowStyles.checkArea}
        onPress={() => onToggle(item.id)}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        activeOpacity={0.8}
      >
        <View style={[rowStyles.circle, item.checked && rowStyles.circleChecked]}>
          {item.checked && <Check size={12} color={Colors.white} strokeWidth={3} />}
        </View>

        <View style={rowStyles.textWrap}>
          <Text style={[rowStyles.name, item.checked && rowStyles.nameChecked]} numberOfLines={1}>
            {item.name}
          </Text>
          {(item.quantity > 0 || item.unit) && (
            <Text style={[rowStyles.qty, item.checked && rowStyles.qtyChecked]}>
              {item.quantity > 0
                ? `${item.quantity % 1 === 0 ? item.quantity : item.quantity.toFixed(1)}${item.unit ? ` ${item.unit}` : ''}`
                : item.unit}
              {item.manually_added ? '  ·  added manually' : ''}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onRemove(item.id)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Trash2 size={15} color={Colors.inactive} strokeWidth={2} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const rowStyles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    marginBottom: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  checkArea: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  circle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  circleChecked: { borderColor: Colors.success, backgroundColor: Colors.success },
  textWrap: { flex: 1 },
  name: { fontSize: 15, fontFamily: FontFamily.regular, fontWeight: '400' as const, color: Colors.text },
  nameChecked: { textDecorationLine: 'line-through' as const, color: Colors.inactive },
  qty: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  qtyChecked: { color: Colors.inactive },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ShoppingScreen() {
  const insets = useSafeAreaInsets();
  const { familySettings } = useFamilySettings();
  const { getIngredientsForWeek, meals } = useMealPlan();
  const { meals: favMeals } = useFavs();
  const shopping = useShopping();

  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekOffset = shopping.weekMode === 'current' ? 0 : 1;
  const fromTodayOnly = shopping.weekMode === 'current';

  // ── Auto-generate whenever meals or week selection changes ──────────────────
  useEffect(() => {
    const { ingredients } = getIngredientsForWeek(weekOffset, fromTodayOnly, favMeals);
    const pantryNames = familySettings.pantry_items.map((p) => p.name);
    shopping.generateList(ingredients, pantryNames);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, weekOffset]);

  // ── Derived state ───────────────────────────────────────────────────────────
  const dateLabel = useMemo(() => buildDateLabel(shopping.weekMode), [shopping.weekMode]);

  const mealCount = useMemo(() => {
    const { mealCount } = getIngredientsForWeek(weekOffset, fromTodayOnly, favMeals);
    return mealCount;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meals, weekOffset]);

  const allDone = shopping.totalCount > 0 && shopping.checkedCount === shopping.totalCount;

  // ── Sections ────────────────────────────────────────────────────────────────
  const sections = useMemo((): SectionData[] => {
    const grouped = new Map<string, ShoppingItem[]>();
    for (const item of shopping.items) {
      const cat = item.category || 'Other';
      if (!grouped.has(cat)) grouped.set(cat, []);
      grouped.get(cat)!.push(item);
    }

    const order = [...(INGREDIENT_CATEGORIES as readonly string[])];
    const result: SectionData[] = [];
    const seen = new Set<string>();

    const addSection = (cat: string) => {
      if (seen.has(cat) || !grouped.has(cat)) return;
      seen.add(cat);
      const raw = grouped.get(cat)!;
      const sorted = [...raw].sort((a, b) => a.name.localeCompare(b.name));
      result.push({ title: cat, data: collapsedSections.has(cat) ? [] : sorted });
    };

    order.forEach(addSection);
    grouped.forEach((_, cat) => addSection(cat));
    return result;
  }, [shopping.items, collapsedSections]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleToggle = useCallback((id: string) => {
    shopping.toggleChecked(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [shopping]);

  const handleRemove = useCallback((id: string) => {
    shopping.removeItem(id);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [shopping]);

  const handleClearChecked = useCallback(() => {
    Alert.alert(
      'Clear checked items',
      `Remove all ${shopping.checkedCount} ticked items?`,
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

  const handleClearAll = useCallback(() => {
    shopping.clearChecked();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [shopping]);

  const handleCopy = useCallback(async () => {
    const text = buildShareText(shopping.items, dateLabel);
    await Clipboard.setStringAsync(text);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopyToast(true);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setCopyToast(false), 2500);
  }, [shopping.items, dateLabel]);

  const handleShare = useCallback(async () => {
    const text = buildShareText(shopping.items, dateLabel);
    try {
      await Share.share({ message: text, title: 'Shopping List' });
    } catch (e) {
      console.log('[Shopping] Share error:', e);
    }
  }, [shopping.items, dateLabel]);

  const handleAddItem = useCallback(
    (name: string, qty: string, unit: string, category: string) => {
      const parsedQty = parseFloat(qty) || 0;
      shopping.addManualItem(name, category, parsedQty, unit);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [shopping]
  );

  const toggleSection = useCallback((title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      next.has(title) ? next.delete(title) : next.add(title);
      return next;
    });
  }, []);

  // ── Render helpers ───────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: ShoppingItem }) => (
      <ShoppingItemRow item={item} onToggle={handleToggle} onRemove={handleRemove} />
    ),
    [handleToggle, handleRemove]
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionData }) => {
      const isCollapsed = collapsedSections.has(section.title);
      const all = shopping.items.filter((i) => (i.category || 'Other') === section.title);
      const checkedInSection = all.filter((i) => i.checked).length;
      const allChecked = all.length > 0 && checkedInSection === all.length;
      const icon = CATEGORY_ICONS[section.title] ?? '🛒';

      return (
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection(section.title)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionIcon}>{icon}</Text>
          <Text style={[styles.sectionTitle, allChecked && styles.sectionTitleDone]}>
            {section.title}
          </Text>
          <Text style={[styles.sectionCount, allChecked && styles.sectionCountDone]}>
            {checkedInSection}/{all.length}
          </Text>
          {isCollapsed
            ? <ChevronRight size={16} color={Colors.textSecondary} strokeWidth={2} />
            : <ChevronDown size={16} color={Colors.textSecondary} strokeWidth={2} />
          }
        </TouchableOpacity>
      );
    },
    [collapsedSections, shopping.items, toggleSection]
  );

  // ── AppHeader right element — Copy + Share icon buttons ─────────────────────
  const headerRight = shopping.totalCount > 0 ? (
    <View style={styles.headerActions}>
      <TouchableOpacity
        style={[styles.iconBtn, copyToast && styles.iconBtnSuccess]}
        onPress={handleCopy}
        activeOpacity={0.8}
      >
        {copyToast
          ? <Check size={16} color={Colors.success} strokeWidth={3} />
          : <Copy size={16} color={Colors.textSecondary} strokeWidth={2} />
        }
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconBtn} onPress={handleShare} activeOpacity={0.8}>
        <Share2 size={16} color={Colors.textSecondary} strokeWidth={2} />
      </TouchableOpacity>
    </View>
  ) : undefined;

  // ── List header (lives inside SectionList so it scrolls with items) ──────────
  const ListHeader = (
    <View>
      {/* Week pills */}
      <View style={styles.weekRow}>
        {(['current', 'next'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[styles.weekPill, shopping.weekMode === mode && styles.weekPillActive]}
            onPress={() => shopping.setWeekMode(mode)}
            activeOpacity={0.8}
          >
            <Text style={[styles.weekPillText, shopping.weekMode === mode && styles.weekPillTextActive]}>
              {mode === 'current' ? 'This week' : 'Next week'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Timestamp + Clear checked row */}
      <View style={styles.timestampRow}>
        <Text style={styles.timestamp}>
          {dateLabel} · {mealCount} meal{mealCount !== 1 ? 's' : ''} planned
        </Text>
        {shopping.checkedCount > 0 && !allDone && (
          <TouchableOpacity
            style={styles.clearCheckedBtn}
            onPress={handleClearChecked}
            activeOpacity={0.8}
          >
            <Text style={styles.clearCheckedText}>Clear checked</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Progress bar */}
      {shopping.totalCount > 0 && !allDone && (
        <View style={styles.progressWrap}>
          <ProgressBar checked={shopping.checkedCount} total={shopping.totalCount} />
        </View>
      )}

      <View style={{ height: 4 }} />
    </View>
  );

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (shopping.isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Shopping" />
        <View style={styles.skeletonWrap}>
          <SkeletonLoader height={36} borderRadius={20} style={{ marginBottom: 16 }} />
          <SkeletonLoader height={50} borderRadius={12} style={{ marginBottom: 12 }} />
          <SkeletonLoader height={50} borderRadius={12} />
        </View>
      </View>
    );
  }

  const hasItems = shopping.totalCount > 0;
  const hasMeals = meals.length > 0;

  // ── Empty state ──────────────────────────────────────────────────────────────
  if (!hasItems) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Shopping" />
        {ListHeader}
        <View style={styles.emptyWrap}>
          {!hasMeals ? (
            <EmptyState
              icon={<ShoppingBasket size={36} color={Colors.primary} strokeWidth={1.5} />}
              title="Nothing to shop for yet"
              description="Plan some meals and your shopping list will appear here automatically."
              actionLabel="Plan a meal"
              onAction={() => router.push('/' as Href)}
            />
          ) : (
            <EmptyState
              icon={<ShoppingBasket size={36} color={Colors.primary} strokeWidth={1.5} />}
              title="List is generating…"
              description={`${mealCount} meal${mealCount !== 1 ? 's' : ''} planned for ${dateLabel}.`}
            />
          )}
        </View>
        <TouchableOpacity
          style={[styles.fab, { bottom: insets.bottom + 16 }]}
          onPress={() => setShowAddSheet(true)}
          activeOpacity={0.8}
        >
          <Plus size={26} color={Colors.white} strokeWidth={2.5} />
        </TouchableOpacity>
        <AddItemSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} onAdd={handleAddItem} />
      </View>
    );
  }

  // ── All done ─────────────────────────────────────────────────────────────────
  if (allDone) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <AppHeader title="Shopping" rightElement={headerRight} />
        {ListHeader}
        <AllDoneState onClearAll={handleClearAll} />
      </View>
    );
  }

  // ── Main list ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <AppHeader title="Shopping" rightElement={headerRight} />
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        renderSectionHeader={renderSectionHeader}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 80 },
        ]}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />

      <TouchableOpacity
        style={[styles.fab, { bottom: insets.bottom + 16 }]}
        onPress={() => setShowAddSheet(true)}
        activeOpacity={0.8}
      >
        <Plus size={26} color={Colors.white} strokeWidth={2.5} />
      </TouchableOpacity>

      <AddItemSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)} onAdd={handleAddItem} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  skeletonWrap: { padding: 16 },
  emptyWrap: { flex: 1 },

  // Header action buttons (passed as AppHeader rightElement)
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnSuccess: { borderColor: Colors.success, backgroundColor: Colors.primaryLight },

  // Timestamp row — date label on left, Clear checked on right
  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 4,
  },

  clearCheckedBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  clearCheckedText: { fontSize: 12, fontFamily: FontFamily.semiBold, fontWeight: '500' as const, color: Colors.textSecondary },

  weekRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingTop: 12, marginBottom: 6 },
  weekPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  weekPillActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  weekPillText: { fontSize: 13, fontFamily: FontFamily.regular, fontWeight: '400' as const, color: Colors.textSecondary },
  weekPillTextActive: { color: Colors.primary, fontFamily: FontFamily.semiBold, fontWeight: '600' as const },

  timestamp: {
    fontSize: 12,
    color: Colors.textSecondary,
  },

  progressWrap: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: BorderRadius.card,
    marginTop: 8,
    ...Shadows.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 10,
    paddingTop: 16,
    gap: 6,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: {
    flex: 1,
    fontSize: 12,
    fontFamily: FontFamily.bold,
    fontWeight: '700' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.6,
  },
  sectionTitleDone: { color: Colors.success },
  sectionCount: { fontSize: 11, color: Colors.textSecondary, marginRight: 2 },
  sectionCountDone: { color: Colors.success },

  listContent: { paddingHorizontal: 16 },

  fab: {
    position: 'absolute' as const,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 7,
  },
});
