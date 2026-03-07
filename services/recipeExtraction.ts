// services/recipeExtraction.ts
// Extracts structured recipe data from images and text using OpenAI GPT-4o

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key is not configured. Add EXPO_PUBLIC_OPENAI_API_KEY in Rork environment variables.');
  return key;
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface ExtractedRecipe {
  // ── Core content ───────────────────────────────────────────────────────────
  name: string;
  description: string;
  ingredients: { name: string; quantity: number; unit: string }[];
  method_steps: string[];

  // ── Time & servings ────────────────────────────────────────────────────────
  prep_time: number;
  cook_time: number;
  cooking_time_band: 'Under 30' | '30-60' | 'Over 60';
  recipe_serving_size: number;

  // ── Classification (new) ───────────────────────────────────────────────────
  dish_category?: string;    // main | salad | soup | appetizer | side | dessert | drink | bread | sandwich | sauce | other
  protein_source?: string;   // chicken | beef | pork | lamb | turkey | seafood | egg | dairy | plant | none
  occasions?: string[];      // weeknight | weekend | brunch | date-night | meal-prep | etc.

  // ── Dietary & allergens (new) ──────────────────────────────────────────────
  allergens?: string[];      // what the recipe IS FREE FROM: gluten-free | dairy-free | etc.
  diet_labels?: string[];    // positive classifications: vegan | vegetarian | high-protein | etc.

  // ── Nutrition (new, per serving, estimated) ────────────────────────────────
  calories_per_serving?: number;
  protein_per_serving_g?: number;
  carbs_per_serving_g?: number;

  // ── Legacy fields — kept for backward compatibility ────────────────────────
  cuisine: string;
  meal_type: 'breakfast' | 'lunch_dinner' | 'light_bites';
  dietary_tags: string[];    // @deprecated — derived from diet_labels + allergens
}

const EXTRACTION_PROMPT = `You are a recipe extraction assistant. Extract the recipe from the provided content and return ONLY a valid JSON object with this exact structure. No markdown, no explanation — raw JSON only:
{
  "name": "Recipe name",
  "description": "1-2 sentence description",
  "cuisine": "e.g. Italian, Asian, Mexican",
  "meal_type": "breakfast" | "lunch_dinner" | "light_bites",
  "cooking_time_band": "Under 30" | "30-60" | "Over 60",
  "prep_time": number (minutes),
  "cook_time": number (minutes),
  "recipe_serving_size": number,
  "dietary_tags": array of applicable values from ["Vegan","Vegetarian","Gluten-Free","Dairy-Free","High Protein"],
  "ingredients": [{"name": "string", "quantity": number, "unit": "string"}],
  "method_steps": ["Step 1 text", "Step 2 text"],
  "dish_category": one of "main"|"salad"|"soup"|"appetizer"|"side"|"dessert"|"drink"|"bread"|"sandwich"|"sauce"|"other",
  "protein_source": one of "chicken"|"beef"|"pork"|"lamb"|"turkey"|"seafood"|"egg"|"dairy"|"plant"|"none",
  "allergens": array of values this recipe is genuinely FREE FROM, chosen from ["gluten-free","dairy-free","egg-free","nut-free","peanut-free","soy-free","shellfish-free","wheat-free","sesame-free"],
  "diet_labels": array of positive dietary classifications that genuinely apply, chosen from ["vegan","vegetarian","high-protein","low-carb","keto","paleo","whole30","plant-based","high-fibre","low-calorie","low-fat","mediterranean","gluten-free","dairy-free","omega-3","antioxidant-rich"],
  "occasions": array of 1-3 most applicable values from ["weeknight","weekend","brunch","date-night","meal-prep","potluck","game-day","bbq","picnic","summer","christmas","thanksgiving","easter","birthday"],
  "calories_per_serving": number or null if not determinable,
  "protein_per_serving_g": number or null if not determinable,
  "carbs_per_serving_g": number or null if not determinable
}
meal_type rules: use "breakfast" for morning meals, "lunch_dinner" for main meals, "light_bites" for snacks/sides.
cooking_time_band rules: total of prep+cook time: <30min = "Under 30", 30-60min = "30-60", >60min = "Over 60".
allergens rules: only include values the recipe is genuinely free from — do NOT add speculatively.
diet_labels rules: only include labels that clearly apply based on the ingredients.
nutrition rules: estimate per serving if ingredients are known; use null if not determinable.`;

export async function extractRecipeFromImage(base64Image: string): Promise<ExtractedRecipe> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:image/jpeg;base64,${base64Image}` },
          },
          { type: 'text', text: EXTRACTION_PROMPT },
        ],
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[recipeExtraction] API error:', response.status, errorBody);
    throw new Error(`OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  const content = data.choices[0].message.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Could not extract recipe — no response from AI. Please try again.');
  }

  console.log('[recipeExtraction] Raw response:', content);

  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as ExtractedRecipe;
  } catch (_parseError) {
    console.error('[recipeExtraction] Failed to parse AI response:', cleaned);
    throw new Error('Could not extract recipe — the AI returned an unexpected format. Please try again or enter the recipe manually.');
  }
}

export async function extractRecipeFromText(text: string): Promise<ExtractedRecipe> {
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `${EXTRACTION_PROMPT}\n\nRecipe content to extract:\n${text}`,
      }],
      max_tokens: 2000,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[recipeExtraction] API error:', response.status, errorBody);
    throw new Error(`OpenAI error: ${response.status}`);
  }
  const data = await response.json();
  const content = data.choices[0].message.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Could not extract recipe — no response from AI. Please try again.');
  }

  console.log('[recipeExtraction] Raw response:', content);

  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as ExtractedRecipe;
  } catch (_parseError) {
    console.error('[recipeExtraction] Failed to parse AI response:', cleaned);
    throw new Error('Could not extract recipe — the AI returned an unexpected format. Please try again or enter the recipe manually.');
  }
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

function getYouTubeApiKey(): string {
  const key = process.env.EXPO_PUBLIC_YOUTUBE_API_KEY;
  if (!key) throw new Error('YouTube API key is not configured. Add EXPO_PUBLIC_YOUTUBE_API_KEY to Rork environment variables.');
  return key;
}

export async function extractRecipeFromYouTubeUrl(url: string): Promise<ExtractedRecipe> {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) throw new Error('Could not parse YouTube video ID from URL.');

  const apiKey = getYouTubeApiKey();
  const apiUrl = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${apiKey}`;

  const response = await fetch(apiUrl);
  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);

  const data = await response.json();
  const items = data.items;
  if (!items || items.length === 0) throw new Error('Video not found or is private.');

  const snippet = items[0].snippet;
  const title = snippet.title || '';
  const description = snippet.description || '';

  const combinedText = `Video title: ${title}\n\nVideo description:\n${description}`;

  return extractRecipeFromText(combinedText);
}

export async function extractRecipeFromTikTokUrl(url: string): Promise<ExtractedRecipe> {
  const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`;

  const response = await fetch(oembedUrl);
  if (!response.ok) throw new Error(`TikTok oEmbed error: ${response.status}`);

  const data = await response.json();
  const title = data.title || '';
  const author = data.author_name || '';

  if (!title) throw new Error('Could not retrieve TikTok video information.');

  const combinedText = `TikTok video by ${author}:\n\nCaption: ${title}`;

  return extractRecipeFromText(combinedText);
}

async function extractRecipeFromWebUrl(url: string): Promise<ExtractedRecipe> {
  let response: Response;
  try {
    const isWeb = typeof document !== 'undefined';
    const fetchUrl = isWeb
      ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
      : url;

    response = await fetch(fetchUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,*/*',
      },
    });
  } catch (e) {
    console.error('[recipeExtraction] Fetch error:', e);
    throw new Error('Could not fetch the webpage. Check the URL and try again.');
  }

  if (!response.ok) {
    throw new Error(`Could not fetch the webpage (HTTP ${response.status}).`);
  }

  const html = await response.text();

  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#\d+;/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 8000);

  if (textContent.length < 50) {
    throw new Error('The webpage did not contain enough text to extract a recipe.');
  }

  return extractRecipeFromText(
    `Recipe from webpage (${url}):\n\n${textContent}`
  );
}

export async function extractRecipeFromVideoUrl(url: string): Promise<ExtractedRecipe> {
  const type = detectVideoUrlType(url);
  if (type === 'youtube') return extractRecipeFromYouTubeUrl(url);
  if (type === 'tiktok') return extractRecipeFromTikTokUrl(url);
  return extractRecipeFromWebUrl(url);
}

export async function transcribeAndExtract(audioUri: string): Promise<ExtractedRecipe> {
  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', 'whisper-1');

  const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: formData,
  });

  if (!whisperResponse.ok) {
    const errorBody = await whisperResponse.text();
    console.error('[recipeExtraction] Whisper error:', whisperResponse.status, errorBody);
    throw new Error(`Whisper error: ${whisperResponse.status}`);
  }

  const whisperData = await whisperResponse.json();
  const transcribedText: string = whisperData.text;
  console.log('[recipeExtraction] Transcribed:', transcribedText);

  return extractRecipeFromText(transcribedText);
}

// ─── Metadata-only extraction (for manual entry AI fill) ─────────────────────
// Given a recipe name + ingredient list, infers classification / dietary /
// nutrition metadata without re-extracting the full recipe content.

export interface ExtractedMetadata {
  dish_category?: string;
  protein_source?: string;
  allergens?: string[];
  diet_labels?: string[];
  occasions?: string[];
  calories_per_serving?: number;
  protein_per_serving_g?: number;
  carbs_per_serving_g?: number;
}

const METADATA_PROMPT = `You are a recipe metadata assistant. Given a recipe name and ingredient list, infer the classification and nutritional metadata. Return ONLY a valid JSON object — no markdown, no explanation:
{
  "dish_category": one of "main"|"salad"|"soup"|"appetizer"|"side"|"dessert"|"drink"|"bread"|"sandwich"|"sauce"|"other",
  "protein_source": one of "chicken"|"beef"|"pork"|"lamb"|"turkey"|"seafood"|"egg"|"dairy"|"plant"|"none",
  "allergens": array of values this recipe is genuinely FREE FROM, chosen from ["gluten-free","dairy-free","egg-free","nut-free","peanut-free","soy-free","shellfish-free","wheat-free","sesame-free"],
  "diet_labels": array of positive dietary classifications that genuinely apply, chosen from ["vegan","vegetarian","high-protein","low-carb","keto","paleo","whole30","plant-based","high-fibre","low-calorie","low-fat","mediterranean","gluten-free","dairy-free","omega-3","antioxidant-rich"],
  "occasions": array of 1-3 most applicable values from ["weeknight","weekend","brunch","date-night","meal-prep","potluck","game-day","bbq","picnic","summer","christmas","thanksgiving","easter","birthday"],
  "calories_per_serving": number or null if not determinable,
  "protein_per_serving_g": number or null if not determinable,
  "carbs_per_serving_g": number or null if not determinable
}
Rules: only include allergens the recipe is genuinely free from. Only include diet_labels that clearly apply. Estimate nutrition from ingredients if possible; use null otherwise.`;

export async function extractRecipeMetadata(
  name: string,
  ingredients: { name: string; quantity: number; unit: string }[],
): Promise<ExtractedMetadata> {
  const ingredientList = ingredients
    .map((i) => `${i.quantity} ${i.unit} ${i.name}`.trim())
    .join(', ');

  const userContent = `${METADATA_PROMPT}\n\nRecipe name: ${name}\nIngredients: ${ingredientList}`;

  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: userContent }],
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('[recipeExtraction] Metadata API error:', response.status, errorBody);
    throw new Error(`OpenAI error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;

  if (!content || typeof content !== 'string') {
    throw new Error('Could not extract metadata — no response from AI.');
  }

  console.log('[recipeExtraction] Metadata response:', content);

  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  try {
    return JSON.parse(cleaned) as ExtractedMetadata;
  } catch (_parseError) {
    console.error('[recipeExtraction] Failed to parse metadata response:', cleaned);
    throw new Error('Could not parse metadata — please try again.');
  }
}
