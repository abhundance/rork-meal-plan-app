/**
 * Client-side helper for AI meal image generation.
 *
 * Calls the `generate-meal-image` Supabase Edge Function which uses
 * Gemini 2.0 Flash to create a food photography image, uploads it to
 * Supabase Storage (`meal-images` bucket), and returns the public URL.
 *
 * The Edge Function also updates the recipe's `image_url` column in Supabase
 * when a `recipe_id` is provided, so the caller only needs to update local state.
 */

import { getSupabase } from './supabase';
import { markGenerating, clearGenerating } from './imageGenerationTracker';

// ── Lazy env readers (never assign process.env to a module-level const) ──────
function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export interface GenerateImageParams {
  /** UUID of the recipe (used for Storage path + DB update) */
  recipe_id: string;
  /** Meal name — the primary prompt input */
  name: string;
  /** Optional description for richer prompt */
  description?: string;
  /** Optional cuisine (e.g. "Indian", "Italian") */
  cuisine?: string;
  /** Optional top ingredients for prompt detail */
  ingredients?: string[];
}

export interface GenerateImageResult {
  image_url: string;
  storage_path: string;
}

/**
 * Generate an AI meal image via the Edge Function.
 * Returns the public URL of the generated image, or null on failure.
 * Never throws — logs errors and returns null so callers can degrade gracefully.
 */
export async function generateMealImage(
  params: GenerateImageParams,
): Promise<GenerateImageResult | null> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();

    const headers: Record<string, string> = { 'X-API-Version': '1' };
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    } else {
      // Fallback for anonymous users — send apikey header
      headers['apikey'] = getSupabaseAnonKey();
    }

    const { data, error } = await supabase.functions.invoke('generate-meal-image', {
      body: {
        recipe_id: params.recipe_id,
        name: params.name,
        description: params.description,
        cuisine: params.cuisine,
        ingredients: params.ingredients,
      },
      headers,
    });

    if (error) {
      console.error('[imageGeneration] Edge Function error:', error);
      return null;
    }

    if (!data?.image_url) {
      console.error('[imageGeneration] No image_url in response:', data);
      return null;
    }

    console.log('[imageGeneration] Generated image for', params.name, '→', data.image_url);
    // Track generation for observability
    if (data.usage) {
      console.log('[imageGeneration] Usage:', JSON.stringify(data.usage));
    }
    return { image_url: data.image_url, storage_path: data.storage_path };
  } catch (err) {
    console.error('[imageGeneration] Unexpected error:', err);
    return null;
  }
}

/**
 * Fire-and-forget image generation for a recipe that was just saved.
 * Updates the recipe's image_url in Supabase (via the Edge Function).
 * Optionally calls `onComplete` with the URL so the caller can update local state.
 */
export function generateMealImageInBackground(
  params: GenerateImageParams,
  onComplete?: (imageUrl: string) => void,
): void {
  markGenerating(params.recipe_id);
  generateMealImage(params).then((result) => {
    clearGenerating(params.recipe_id);
    if (result?.image_url && onComplete) {
      try {
        onComplete(result.image_url);
      } catch (err) {
        console.error('[imageGeneration] onComplete callback error:', err);
      }
    }
  }).catch((err) => {
    console.error('[imageGeneration] Background generation failed:', err);
    clearGenerating(params.recipe_id);
  });
}

/**
 * Shared helper: trigger AI image generation for a recipe if it has no image.
 * DRY extraction for use in both add-recipe-review and add-recipe-manual save paths.
 *
 * @param recipe - The saved Recipe object
 * @param updateRecipe - Function to update the recipe in local + remote state
 */
export function triggerImageGenIfNeeded(
  recipe: { id: string; name: string; description?: string; cuisine?: string; ingredients?: { name: string }[]; image_url?: string },
  updateRecipe: (id: string, updates: { image_url: string }) => void,
): void {
  if (recipe.image_url) return;
  const ingredientNames = (recipe.ingredients ?? [])
    .map((ing) => ing.name)
    .filter(Boolean);
  generateMealImageInBackground(
    {
      recipe_id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      ingredients: ingredientNames,
    },
    (imageUrl) => {
      updateRecipe(recipe.id, { image_url: imageUrl });
      console.log('[imageGeneration] AI image generated for', recipe.name);
    },
  );
}

/**
 * Backfill images for existing recipes that don't have one.
 * Calls the `backfill-meal-images` Edge Function which processes
 * up to `limit` recipes server-side (sequential, rate-limited).
 *
 * @param familyId - Optional family_id to scope the backfill
 * @param limit - Max recipes to process (default 10, max 50)
 * @param onRecipeUpdated - Called for each recipe that gets an image
 */
export async function backfillMealImages(
  familyId?: string,
  limit = 10,
  onRecipeUpdated?: (recipeId: string, imageUrl: string) => void,
): Promise<{ processed: number; failed: number }> {
  try {
    const supabase = getSupabase();
    const { data: sessionData } = await supabase.auth.getSession();

    const headers: Record<string, string> = { 'X-API-Version': '1' };
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    } else {
      headers['apikey'] = getSupabaseAnonKey();
    }

    const { data, error } = await supabase.functions.invoke('backfill-meal-images', {
      body: { family_id: familyId, limit },
      headers,
    });

    if (error) {
      console.error('[imageGeneration] Backfill error:', error);
      return { processed: 0, failed: 0 };
    }

    console.log('[imageGeneration] Backfill result:', data?.message);

    // Notify caller for each successfully generated image
    if (data?.results && onRecipeUpdated) {
      for (const result of data.results) {
        onRecipeUpdated(result.id, result.image_url);
      }
    }

    return { processed: data?.processed ?? 0, failed: data?.failed ?? 0 };
  } catch (err) {
    console.error('[imageGeneration] Backfill unexpected error:', err);
    return { processed: 0, failed: 0 };
  }
}
