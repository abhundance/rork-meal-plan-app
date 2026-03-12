/**
 * services/recipeExtraction.ts
 *
 * All OpenAI calls are now proxied through the `extract-recipe` Supabase Edge
 * Function so that the OpenAI API key never ships in the app bundle.
 *
 * Client → Supabase Edge Function (extract-recipe) → OpenAI
 *
 * The function URL is derived from EXPO_PUBLIC_SUPABASE_URL so no extra env
 * variable is needed.
 */

// ── Env readers (lazy pattern — see CLAUDE.md §Architectural Rules) ───────────
function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}
function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}
function getEdgeFunctionUrl(): string {
  const url = getSupabaseUrl();
  if (!url) throw new Error('EXPO_PUBLIC_SUPABASE_URL is not configured.');
  return `${url}/functions/v1/extract-recipe`;
}

// ── Output language ────────────────────────────────────────────────────────────
// The Edge Function handles the language mapping internally; we just forward the
// display name (e.g. "Français") in the request body.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ExtractedRecipe {
  // ── Core content ──────────────────────────────────────────────────────────
  name: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  method_steps: string[];

  // ── Time & servings ────────────────────────────────────────────────────────
  prep_time: number;
  cook_time: number;
  cooking_time_band: 'Under 30' | '30-60' | 'Over 60';
  recipe_serving_size: number;

  // ── Classification ────────────────────────────────────────────────────────
  dish_category?: string;
  protein_source?: string;
  occasions?: string[];

  // ── Dietary & allergens ───────────────────────────────────────────────────
  allergens?: string[];
  diet_labels?: string[];

  // ── Nutrition (per serving, estimated) ───────────────────────────────────
  calories_per_serving?: number;
  protein_per_serving_g?: number;
  carbs_per_serving_g?: number;

  // ── Legacy fields ─────────────────────────────────────────────────────────
  cuisine: string;
  meal_type: 'breakfast' | 'lunch_dinner' | 'light_bites';
  dietary_tags: string[];
}

export interface ExtractedMetadata {
  cuisine?: string;
  meal_type?: string;
  dish_category?: string;
  protein_source?: string;
  allergens?: string[];
  diet_labels?: string[];
  occasions?: string[];
  calories_per_serving?: number;
  protein_per_serving_g?: number;
  carbs_per_serving_g?: number;
}

// ─── Core Edge Function caller ────────────────────────────────────────────────

async function callEdgeFunction(payload: Record<string, unknown>): Promise<unknown> {
  const url = getEdgeFunctionUrl();
  const anonKey = getSupabaseAnonKey();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${anonKey}`,
      'apikey': anonKey,
    },
    body: JSON.stringify(payload),
  });

  let json: { data?: unknown; error?: string };
  try {
    json = await response.json();
  } catch {
    throw new Error(`Edge Function returned non-JSON response (HTTP ${response.status})`);
  }

  if (!response.ok || json.error) {
    throw new Error(json.error ?? `Edge Function error: ${response.status}`);
  }

  return json.data;
}

// ─── Public API (same signatures as before — no call-site changes needed) ─────

export async function extractRecipeFromImage(
  base64Image: string,
  language?: string,
): Promise<ExtractedRecipe> {
  return callEdgeFunction({ type: 'image', base64Image, language }) as Promise<ExtractedRecipe>;
}

export async function extractRecipeFromText(
  text: string,
  language?: string,
): Promise<ExtractedRecipe> {
  return callEdgeFunction({ type: 'text', text, language }) as Promise<ExtractedRecipe>;
}

export function detectVideoUrlType(url: string): 'youtube' | 'tiktok' | 'other' {
  const lower = url.toLowerCase();
  if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) return 'youtube';
  if (lower.includes('tiktok.com/')) return 'tiktok';
  return 'other';
}

export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export async function extractRecipeFromYouTubeUrl(
  url: string,
  language?: string,
): Promise<ExtractedRecipe> {
  // YouTube API call + GPT extraction both happen server-side in the Edge Function
  return callEdgeFunction({ type: 'youtube', url, language }) as Promise<ExtractedRecipe>;
}

export async function extractRecipeFromTikTokUrl(
  url: string,
  language?: string,
): Promise<ExtractedRecipe> {
  return callEdgeFunction({ type: 'tiktok', url, language }) as Promise<ExtractedRecipe>;
}

export async function extractRecipeFromVideoUrl(
  url: string,
  language?: string,
): Promise<ExtractedRecipe> {
  const type = detectVideoUrlType(url);
  if (type === 'youtube') return extractRecipeFromYouTubeUrl(url, language);
  if (type === 'tiktok')  return extractRecipeFromTikTokUrl(url, language);
  // Generic web URL
  return callEdgeFunction({ type: 'web', url, language }) as Promise<ExtractedRecipe>;
}

export async function transcribeAndExtract(
  audioUri: string,
  language?: string,
): Promise<ExtractedRecipe> {
  // Convert local file URI → base64 so we can send it in the JSON body.
  // On React Native, fetch() can read local file:// URIs.
  const audioResponse = await fetch(audioUri);
  if (!audioResponse.ok) throw new Error('Could not read audio file.');
  const blob = await audioResponse.blob();
  const base64Audio = await blobToBase64(blob);
  const audioMimeType = blob.type || 'audio/m4a';

  return callEdgeFunction({ type: 'voice', base64Audio, audioMimeType, language }) as Promise<ExtractedRecipe>;
}

export async function extractRecipeFromPdf(
  fileUri: string,
  filename = 'recipe.pdf',
  language?: string,
): Promise<ExtractedRecipe> {
  const fileResponse = await fetch(fileUri);
  if (!fileResponse.ok) throw new Error('Could not read PDF file.');
  const blob = await fileResponse.blob();
  const base64Pdf = await blobToBase64(blob);

  return callEdgeFunction({ type: 'pdf', base64Pdf, filename, language }) as Promise<ExtractedRecipe>;
}

export async function extractRecipeMetadata(
  name: string,
  ingredients: { name: string; quantity: number; unit: string }[],
  language?: string,
): Promise<ExtractedMetadata> {
  return callEdgeFunction({ type: 'metadata', name, ingredients, language }) as Promise<ExtractedMetadata>;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Strip "data:<mime>;base64," prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
