/**
 * Lightweight in-memory tracker for recipes currently generating AI images.
 * Used by MealImagePlaceholder to show a shimmer/pulse indicator.
 *
 * This is intentionally NOT React state — it's a global Set that components
 * can check synchronously. The parent component (Recipes grid) re-renders
 * when updateRecipe is called with the new image_url, at which point the
 * recipe is removed from this set and the placeholder is replaced by the image.
 */

const generatingSet = new Set<string>();
const listeners = new Set<() => void>();

export function markGenerating(recipeId: string): void {
  generatingSet.add(recipeId);
  listeners.forEach((fn) => fn());
}

export function clearGenerating(recipeId: string): void {
  generatingSet.delete(recipeId);
  listeners.forEach((fn) => fn());
}

export function isGeneratingImage(recipeId: string): boolean {
  return generatingSet.has(recipeId);
}

/** Subscribe to changes — returns unsubscribe function */
export function onGeneratingChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
