/**
 * useDiscoverMeals
 *
 * TanStack Query hook that fetches live Spoonacular recipes through the
 * `spoonacular` Edge Function. Supports infinite pagination and reacts to
 * filter/search changes by re-fetching automatically.
 *
 * Usage:
 *   const { meals, isLoading, fetchNextPage, hasNextPage } =
 *     useDiscoverMeals(filters, searchQuery);
 */

import { useInfiniteQuery } from '@tanstack/react-query';
import { searchDiscover, DiscoverSearchResult } from '@/services/spoonacular';
import { RecipeFilterState, DEFAULT_FILTER_STATE } from '@/components/RecipeFilterSheet';
import { DiscoverMeal } from '@/types';

const PAGE_SIZE = 20;

// 5-minute cache: balances freshness vs Spoonacular quota usage.
const STALE_TIME_MS = 5 * 60 * 1000;

export interface UseDiscoverMealsResult {
  meals:               DiscoverMeal[];
  isLoading:           boolean;
  isError:             boolean;
  isFetchingNextPage:  boolean;
  hasNextPage:         boolean;
  fetchNextPage:       () => void;
  refetch:             () => void;
}

export function useDiscoverMeals(
  filters: RecipeFilterState = DEFAULT_FILTER_STATE,
  query = '',
): UseDiscoverMealsResult {
  const result = useInfiniteQuery({
    // Re-fetch whenever filters or search query change.
    queryKey: ['discoverMeals', filters, query],

    queryFn: async ({ pageParam }: { pageParam: number }): Promise<DiscoverSearchResult> => {
      return searchDiscover(filters, query, pageParam, PAGE_SIZE);
    },

    // Start at offset 0; next page is current offset + number returned.
    initialPageParam: 0,
    getNextPageParam: (lastPage: DiscoverSearchResult): number | undefined => {
      const nextOffset = lastPage.offset + lastPage.number;
      return nextOffset < lastPage.totalResults ? nextOffset : undefined;
    },

    staleTime: STALE_TIME_MS,
  });

  const meals: DiscoverMeal[] =
    result.data?.pages.flatMap((page) => page.meals) ?? [];

  return {
    meals,
    isLoading:          result.isLoading,
    isError:            result.isError,
    isFetchingNextPage: result.isFetchingNextPage,
    hasNextPage:        result.hasNextPage ?? false,
    fetchNextPage:      () => { void result.fetchNextPage(); },
    refetch:            () => { void result.refetch(); },
  };
}
