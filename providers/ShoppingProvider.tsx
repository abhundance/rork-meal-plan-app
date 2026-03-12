/**
 * ShoppingProvider — manages shopping list items and ingredient sources.
 *
 * Storage strategy (dual-write):
 *   • AsyncStorage is ALWAYS written — works offline / logged-out.
 *   • When authenticated, items are also synced to Supabase in the background.
 *     Tables: shopping_list, ingredient_sources.
 *   • queryKey includes userId so TanStack Query re-fetches on sign-in / sign-out.
 *   • generateList replaces the entire shopping_list in Supabase (delete-and-insert).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { ShoppingItem } from '@/types';
import { useAuth } from '@/providers/AuthProvider';
import { getSupabase } from '@/services/supabase';
import { shoppingItemToRow, rowToShoppingItem } from '@/services/db';

const SHOPPING_KEY = 'shopping_list';
const SOURCES_KEY  = 'ingredient_sources';

export const [ShoppingProvider, useShopping] = createContextHook(() => {
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const userId = session?.user?.id ?? null;

  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [weekMode, setWeekMode] = useState<'current' | 'next'>('current');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  // ── Shopping list query ───────────────────────────────────────────────────
  const shoppingQuery = useQuery({
    queryKey: ['shoppingList', userId],
    queryFn: async (): Promise<{ items: ShoppingItem[]; generatedAt: string | null }> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('shopping_list')
          .select('*')
          .eq('family_id', userId)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('[Shopping] Supabase fetch error:', error.message);
        } else if (data) {
          const items = data.map((row) => rowToShoppingItem(row as Record<string, unknown>));
          // Pick the most recent generated_at from any auto-generated item
          const autoItems = data.filter((r) => !r.manually_added && r.generated_at);
          const generatedAt = autoItems.length > 0
            ? autoItems[0].generated_at as string
            : null;
          const result = { items, generatedAt };
          console.log('[Shopping] Loaded from Supabase:', items.length, 'items');
          AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(result)).catch(console.error);
          return result;
        }
      }

      // Fallback to AsyncStorage
      try {
        const stored = await AsyncStorage.getItem(SHOPPING_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[Shopping] Loaded from AsyncStorage');
          return parsed;
        }
      } catch (e) {
        console.error('[Shopping] AsyncStorage load error:', e);
      }
      return { items: [], generatedAt: null };
    },
  });

  // ── Ingredient sources query ──────────────────────────────────────────────
  const sourcesQuery = useQuery({
    queryKey: ['ingredientSources', userId],
    queryFn: async (): Promise<Record<string, string>> => {
      if (userId) {
        const supabase = getSupabase();
        const { data, error } = await supabase
          .from('ingredient_sources')
          .select('ingredient_name, where_to_buy')
          .eq('family_id', userId);
        if (!error && data) {
          const result: Record<string, string> = {};
          data.forEach((r: { ingredient_name: string; where_to_buy: string }) => {
            result[r.ingredient_name] = r.where_to_buy;
          });
          AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(result)).catch(console.error);
          return result;
        }
      }
      try {
        const stored = await AsyncStorage.getItem(SOURCES_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.error('[Shopping] Sources AsyncStorage load error:', e);
      }
      return {};
    },
  });

  useEffect(() => {
    if (shoppingQuery.data) {
      setItems(shoppingQuery.data.items);
      setLastGeneratedAt(shoppingQuery.data.generatedAt);
    }
  }, [shoppingQuery.data]);

  useEffect(() => {
    if (sourcesQuery.data) setSources(sourcesQuery.data);
  }, [sourcesQuery.data]);

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const sourcesRef = useRef(sources);
  sourcesRef.current = sources;
  const lastGeneratedAtRef = useRef(lastGeneratedAt);
  lastGeneratedAtRef.current = lastGeneratedAt;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  // ── Mutations ─────────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async (data: { items: ShoppingItem[]; generatedAt: string | null }) => {
      await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(data));
      console.log('[Shopping] Saved to AsyncStorage, items:', data.items.length);
      return data;
    },
    onSuccess: (d) => queryClient.setQueryData(['shoppingList', userIdRef.current], d),
  });

  const saveSourcesMutation = useMutation({
    mutationFn: async (updated: Record<string, string>) => {
      await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['ingredientSources', userIdRef.current], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;
  const saveSourcesMutateRef = useRef(saveSourcesMutation.mutate);
  saveSourcesMutateRef.current = saveSourcesMutation.mutate;

  // ── Supabase helpers ──────────────────────────────────────────────────────
  const syncItemsToSupabase = useCallback((
    allItems: ShoppingItem[],
    generatedAt: string | null,
    replaceAll = false
  ) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const supabase = getSupabase();

    if (replaceAll) {
      // Delete all auto-generated items, then re-insert everything
      supabase.from('shopping_list').delete()
        .eq('family_id', uid)
        .eq('manually_added', false)
        .then(() => {
          if (allItems.length > 0) {
            supabase.from('shopping_list').upsert(
              allItems.map((i) => shoppingItemToRow(i, uid, generatedAt)),
              { onConflict: 'id' }
            ).then(({ error }) => {
              if (error) console.error('[Shopping] Supabase replaceAll error:', error.message);
            });
          }
        });
    } else {
      supabase.from('shopping_list').upsert(
        allItems.map((i) => shoppingItemToRow(i, uid, generatedAt)),
        { onConflict: 'id' }
      ).then(({ error }) => {
        if (error) console.error('[Shopping] Supabase upsert error:', error.message);
      });
    }
  }, []);

  const deleteItemFromSupabase = useCallback((itemId: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    getSupabase()
      .from('shopping_list')
      .delete()
      .eq('id', itemId)
      .eq('family_id', uid)
      .then(({ error }) => {
        if (error) console.error('[Shopping] Supabase delete error:', error.message);
      });
  }, []);

  // ── Public actions ────────────────────────────────────────────────────────

  const generateList = useCallback(
    (
      ingredientMap: Map<string, { name: string; quantity: number; unit: string; category: string; meals: { meal_name: string; quantity: number }[] }>,
      pantryItemNames: string[]
    ) => {
      const pantrySet = new Set(pantryItemNames.map((n) => n.toLowerCase()));
      const newItems: ShoppingItem[] = [];

      ingredientMap.forEach((val, key) => {
        const isPantry = pantrySet.has(val.name.toLowerCase());
        const existingItem = itemsRef.current.find(
          (i) => i.name.toLowerCase() === val.name.toLowerCase() && i.unit === val.unit && !i.manually_added
        );

        newItems.push({
          id: `shop_${key}_${Date.now()}`,
          name: val.name,
          quantity: Math.round(val.quantity * 100) / 100,
          unit: val.unit,
          category: val.category,
          checked: existingItem?.checked ?? false,
          is_pantry: isPantry,
          manually_added: false,
          where_to_buy: sourcesRef.current[val.name.toLowerCase()] ?? undefined,
          meal_breakdown: val.meals,
        });
      });

      const manualItems = itemsRef.current.filter((i) => i.manually_added);
      const allItems = [...newItems, ...manualItems];
      const now = new Date().toISOString();

      setItems(allItems);
      setLastGeneratedAt(now);
      saveMutateRef.current({ items: allItems, generatedAt: now });
      syncItemsToSupabase(allItems, now, true);
      console.log('[Shopping] Generated list:', newItems.length, 'auto +', manualItems.length, 'manual');
    },
    [syncItemsToSupabase]
  );

  const addManualItem = useCallback(
    (name: string, category = 'Other', quantity = 1, unit = '') => {
      const newItem: ShoppingItem = {
        id: `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        name,
        quantity,
        unit,
        category,
        checked: false,
        is_pantry: false,
        manually_added: true,
        meal_breakdown: [],
      };
      const updated = [...itemsRef.current, newItem];
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
      syncItemsToSupabase([newItem], lastGeneratedAtRef.current);
      console.log('[Shopping] Added manual item:', name);
    },
    [syncItemsToSupabase]
  );

  const toggleChecked = useCallback(
    (itemId: string) => {
      const updated = itemsRef.current.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked, is_pantry: !i.checked ? false : i.is_pantry } : i
      );
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
      const updatedItem = updated.find((i) => i.id === itemId);
      if (updatedItem) syncItemsToSupabase([updatedItem], lastGeneratedAtRef.current);
    },
    [syncItemsToSupabase]
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const updated = itemsRef.current.filter((i) => i.id !== itemId);
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
      deleteItemFromSupabase(itemId);
    },
    [deleteItemFromSupabase]
  );

  const clearChecked = useCallback(() => {
    const toDelete = itemsRef.current.filter((i) => i.checked).map((i) => i.id);
    const updated = itemsRef.current.filter((i) => !i.checked);
    setItems(updated);
    saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
    const uid = userIdRef.current;
    if (uid && toDelete.length > 0) {
      getSupabase()
        .from('shopping_list')
        .delete()
        .in('id', toDelete)
        .eq('family_id', uid)
        .then(({ error }) => {
          if (error) console.error('[Shopping] clearChecked Supabase error:', error.message);
        });
    }
    console.log('[Shopping] Cleared checked items');
  }, []);

  const updateWhereToBuy = useCallback(
    (itemId: string, source: string) => {
      const item = itemsRef.current.find((i) => i.id === itemId);
      const updated = itemsRef.current.map((i) =>
        i.id === itemId ? { ...i, where_to_buy: source } : i
      );
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
      const updatedItem = updated.find((i) => i.id === itemId);
      if (updatedItem) syncItemsToSupabase([updatedItem], lastGeneratedAtRef.current);

      if (item) {
        const updatedSources = { ...sourcesRef.current, [item.name.toLowerCase()]: source };
        setSources(updatedSources);
        saveSourcesMutateRef.current(updatedSources);
        // Sync ingredient_sources to Supabase
        const uid = userIdRef.current;
        if (uid) {
          getSupabase()
            .from('ingredient_sources')
            .upsert(
              { family_id: uid, ingredient_name: item.name.toLowerCase(), where_to_buy: source },
              { onConflict: 'family_id,ingredient_name' }
            )
            .then(({ error }) => {
              if (error) console.error('[Shopping] ingredient_sources Supabase error:', error.message);
            });
        }
      }
    },
    [syncItemsToSupabase]
  );

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const updated = itemsRef.current.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      );
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
      const updatedItem = updated.find((i) => i.id === itemId);
      if (updatedItem) syncItemsToSupabase([updatedItem], lastGeneratedAtRef.current);
    },
    [syncItemsToSupabase]
  );

  const checkedCount = items.filter((i) => i.checked).length;
  const totalCount = items.length;
  const isLoading = shoppingQuery.isLoading;

  return {
    items,
    sources,
    weekMode,
    lastGeneratedAt,
    checkedCount,
    totalCount,
    isLoading,
    setWeekMode,
    generateList,
    addManualItem,
    toggleChecked,
    removeItem,
    clearChecked,
    updateWhereToBuy,
    updateItemQuantity,
  };
});
