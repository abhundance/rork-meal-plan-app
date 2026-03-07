import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import createContextHook from '@nkzw/create-context-hook';
import { ShoppingItem } from '@/types';

const SHOPPING_KEY = 'shopping_list';
const SOURCES_KEY = 'ingredient_sources';

export const [ShoppingProvider, useShopping] = createContextHook(() => {
  const queryClient = useQueryClient();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [sources, setSources] = useState<Record<string, string>>({});
  const [weekMode, setWeekMode] = useState<'current' | 'next'>('current');
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null);

  const shoppingQuery = useQuery({
    queryKey: ['shoppingList'],
    queryFn: async (): Promise<{ items: ShoppingItem[]; generatedAt: string | null }> => {
      try {
        const stored = await AsyncStorage.getItem(SHOPPING_KEY);
        if (stored) {
          const parsed = JSON.parse(stored);
          console.log('[Shopping] Loaded from storage');
          return parsed;
        }
      } catch (e) {
        console.log('[Shopping] Error loading:', e);
      }
      return { items: [], generatedAt: null };
    },
  });

  const sourcesQuery = useQuery({
    queryKey: ['ingredientSources'],
    queryFn: async (): Promise<Record<string, string>> => {
      try {
        const stored = await AsyncStorage.getItem(SOURCES_KEY);
        if (stored) return JSON.parse(stored);
      } catch (e) {
        console.log('[Shopping] Error loading sources:', e);
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

  const saveMutation = useMutation({
    mutationFn: async (data: { items: ShoppingItem[]; generatedAt: string | null }) => {
      await AsyncStorage.setItem(SHOPPING_KEY, JSON.stringify(data));
      console.log('[Shopping] Saved, items:', data.items.length);
      return data;
    },
    onSuccess: (d) => queryClient.setQueryData(['shoppingList'], d),
  });

  const saveSourcesMutation = useMutation({
    mutationFn: async (updated: Record<string, string>) => {
      await AsyncStorage.setItem(SOURCES_KEY, JSON.stringify(updated));
      return updated;
    },
    onSuccess: (d) => queryClient.setQueryData(['ingredientSources'], d),
  });

  const saveMutateRef = useRef(saveMutation.mutate);
  saveMutateRef.current = saveMutation.mutate;
  const saveSourcesMutateRef = useRef(saveSourcesMutation.mutate);
  saveSourcesMutateRef.current = saveSourcesMutation.mutate;

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
      console.log('[Shopping] Generated list:', newItems.length, 'auto +', manualItems.length, 'manual');
    },
    []
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
      console.log('[Shopping] Added manual item:', name);
    },
    []
  );

  const toggleChecked = useCallback(
    (itemId: string) => {
      const updated = itemsRef.current.map((i) =>
        i.id === itemId ? { ...i, checked: !i.checked, is_pantry: !i.checked ? false : i.is_pantry } : i
      );
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
    },
    []
  );

  const removeItem = useCallback(
    (itemId: string) => {
      const updated = itemsRef.current.filter((i) => i.id !== itemId);
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
    },
    []
  );

  const clearChecked = useCallback(() => {
    const updated = itemsRef.current.filter((i) => !i.checked);
    setItems(updated);
    saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
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

      if (item) {
        const updatedSources = { ...sourcesRef.current, [item.name.toLowerCase()]: source };
        setSources(updatedSources);
        saveSourcesMutateRef.current(updatedSources);
      }
    },
    []
  );

  const updateItemQuantity = useCallback(
    (itemId: string, quantity: number) => {
      const updated = itemsRef.current.map((i) =>
        i.id === itemId ? { ...i, quantity } : i
      );
      setItems(updated);
      saveMutateRef.current({ items: updated, generatedAt: lastGeneratedAtRef.current });
    },
    []
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
