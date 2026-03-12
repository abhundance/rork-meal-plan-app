/**
 * extract-recipe — Supabase Edge Function
 *
 * Secure server-side proxy for all OpenAI recipe extraction calls.
 * Replaces the client-side EXPO_PUBLIC_OPENAI_API_KEY pattern so the key
 * is never shipped in the app bundle.
 *
 * ENVIRONMENT VARIABLES (set in Supabase Dashboard → Edge Functions → Secrets):
 *   OPENAI_API_KEY   — OpenAI secret key (sk-...)
 *   YOUTUBE_API_KEY  — Google/YouTube Data API v3 key
 *
 * REQUEST
 *   POST /functions/v1/extract-recipe
 *   Headers:
 *     Authorization: Bearer <supabase-anon-key>   (or user JWT)
 *     Content-Type: application/json
 *   Body: one of the union types below (discriminated by `type` field)
 *
 * RESPONSE
 *   200 { data: ExtractedRecipe | ExtractedMetadata }
 *   400 { error: string }
 *   500 { error: string }
 */

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

// ─── Types (mirror of services/recipeExtraction.ts) ──────────────────────────

type ExtractionType = 'text' | 'image' | 'voice' | 'metadata' | 'pdf' | 'youtube' | 'tiktok' | 'web';

interface RequestBody {
  type: ExtractionType;
  language?: string;        // display name e.g. "Français"
  // text / youtube / tiktok / web
  text?: string;
  url?: string;
  // image
  base64Image?: string;
  // voice
  base64Audio?: string;
  audioMimeType?: string;   // default: audio/m4a
  // metadata
  name?: string;
  ingredients?: { name: string; quantity: number; unit: string }[];
  // pdf
  base64Pdf?: string;
  filename?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_CHAT_URL = 'https://api.openai.com/v1/chat/completions';
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const OPENAI_FILES_URL = 'https://api.openai.com/v1/files';

const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  'English': 'English',
  'Français': 'French',
  'Español': 'Spanish',
  'Deutsch': 'German',
  'Português': 'Portuguese',
  'Italiano': 'Italian',
  'हिन्दी': 'Hindi',
  '日本語': 'Japanese',
  'العربية': 'Arabic',
};

function getOutputLanguage(displayName?: string): string {
  if (!displayName) return 'English';
  return LANGUAGE_DISPLAY_MAP[displayName] ?? 'English';
}

function getLanguageSystemMessage(language?: string) {
  const lang = getOutputLanguage(language);
  return {
    role: 'system' as const,
    content: `You are a recipe extraction assistant. Always respond in ${lang}. All text values you produce — including recipe name, description, ingredient names, and method step text — MUST be written in ${lang}, regardless of the language of the input content. Translate non-${lang} content into ${lang} as part of the extraction process.`,
  };
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
  "ingredients": [{"name": "string", "quantity": number, "unit": "string", "category": "one of: Produce|Meat & Fish|Dairy & Eggs|Pantry|Bread & Bakery|Frozen|Drinks|Condiments & Sauces|Herbs & Spices|Other"}],
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
nutrition rules: estimate per serving if ingredients are known; use null if not determinable.
ingredient unit rules: ALWAYS use metric units (g, ml, kg, L). Use singular unit names. Never use fractions — convert to decimals. If the source uses imperial, convert to metric.
ingredient category rules: assign each ingredient to exactly one category from the list.`;

const METADATA_PROMPT = `You are a recipe metadata assistant. Given a recipe name and ingredient list, infer the classification and nutritional metadata. Return ONLY a valid JSON object — no markdown, no explanation:
{
  "cuisine": the primary cuisine style as a plain string, or null if unclear,
  "meal_type": one of "breakfast"|"lunch"|"dinner"|"snack"|"dessert",
  "dish_category": one of "main"|"salad"|"soup"|"appetizer"|"side"|"dessert"|"drink"|"bread"|"sandwich"|"sauce"|"other",
  "protein_source": one of "chicken"|"beef"|"pork"|"lamb"|"turkey"|"seafood"|"egg"|"dairy"|"plant"|"none",
  "allergens": array of values this recipe is genuinely FREE FROM, chosen from ["gluten-free","dairy-free","egg-free","nut-free","peanut-free","soy-free","shellfish-free","wheat-free","sesame-free"],
  "diet_labels": array of positive dietary classifications that genuinely apply, chosen from ["vegan","vegetarian","high-protein","low-carb","keto","paleo","whole30","plant-based","high-fibre","low-calorie","low-fat","mediterranean","gluten-free","dairy-free","omega-3","antioxidant-rich"],
  "occasions": array of 1-3 most applicable values from ["weeknight","weekend","brunch","date-night","meal-prep","potluck","game-day","bbq","picnic","summer","christmas","thanksgiving","easter","birthday"],
  "calories_per_serving": number or null if not determinable,
  "protein_per_serving_g": number or null if not determinable,
  "carbs_per_serving_g": number or null if not determinable
}`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  });
}

function parseJsonResponse(content: string): unknown {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned);
}

async function callGptMini(messages: unknown[], maxTokens = 2000, openaiKey: string): Promise<string> {
  const resp = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices[0].message.content as string;
}

// ─── Extraction handlers ──────────────────────────────────────────────────────

async function handleText(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.text) throw new Error('text field is required');
  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${EXTRACTION_PROMPT}\n\nRecipe content to extract:\n${body.text}` },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handleImage(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Image) throw new Error('base64Image field is required');
  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    {
      role: 'user',
      content: [
        { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.base64Image}` } },
        { type: 'text', text: EXTRACTION_PROMPT },
      ],
    },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handleMetadata(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.name || !body.ingredients) throw new Error('name and ingredients are required');
  const ingredientList = body.ingredients.map(i => `${i.quantity} ${i.unit} ${i.name}`.trim()).join(', ');
  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${METADATA_PROMPT}\n\nRecipe name: ${body.name}\nIngredients: ${ingredientList}` },
  ], 500, openaiKey);
  return parseJsonResponse(content);
}

async function handleVoice(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Audio) throw new Error('base64Audio field is required');
  const mimeType = body.audioMimeType ?? 'audio/m4a';
  const ext = mimeType.split('/')[1] ?? 'm4a';

  // Decode base64 → binary
  const binaryStr = atob(body.base64Audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: mimeType }), `recording.${ext}`);
  formData.append('model', 'whisper-1');

  const whisperResp = await fetch(OPENAI_WHISPER_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}` },
    body: formData,
  });
  if (!whisperResp.ok) {
    const err = await whisperResp.text();
    throw new Error(`Whisper error ${whisperResp.status}: ${err}`);
  }
  const { text: transcribedText } = await whisperResp.json();

  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${EXTRACTION_PROMPT}\n\nRecipe content to extract:\n${transcribedText}` },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handlePdf(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Pdf) throw new Error('base64Pdf field is required');
  const filename = body.filename ?? 'recipe.pdf';

  // Decode base64 → binary
  const binaryStr = atob(body.base64Pdf);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

  // Upload to OpenAI Files API
  const uploadFormData = new FormData();
  uploadFormData.append('file', new Blob([bytes], { type: 'application/pdf' }), filename);
  uploadFormData.append('purpose', 'user_data');

  const uploadResp = await fetch(OPENAI_FILES_URL, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${openaiKey}` },
    body: uploadFormData,
  });
  if (!uploadResp.ok) {
    const err = await uploadResp.text();
    throw new Error(`OpenAI file upload error ${uploadResp.status}: ${err}`);
  }
  const { id: fileId } = await uploadResp.json();

  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    {
      role: 'user',
      content: [
        { type: 'text', text: EXTRACTION_PROMPT },
        { type: 'file', file: { file_id: fileId } },
      ],
    },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handleYouTube(body: RequestBody, openaiKey: string, youtubeKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field is required');

  // Extract video ID
  const patterns = [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ];
  let videoId: string | null = null;
  for (const p of patterns) {
    const m = body.url.match(p);
    if (m) { videoId = m[1]; break; }
  }
  if (!videoId) throw new Error('Could not parse YouTube video ID from URL.');

  const ytResp = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet&key=${youtubeKey}`
  );
  if (!ytResp.ok) throw new Error(`YouTube API error ${ytResp.status}`);

  const ytData = await ytResp.json();
  if (!ytData.items?.length) throw new Error('Video not found or is private.');

  const { title, description } = ytData.items[0].snippet;
  const combinedText = `Video title: ${title}\n\nVideo description:\n${description}`;

  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${EXTRACTION_PROMPT}\n\nRecipe content to extract:\n${combinedText}` },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handleTikTok(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field is required');

  const oembedResp = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(body.url)}`);
  if (!oembedResp.ok) throw new Error(`TikTok oEmbed error ${oembedResp.status}`);

  const { title = '', author_name: author = '' } = await oembedResp.json();
  if (!title) throw new Error('Could not retrieve TikTok video information.');

  const combinedText = `TikTok video by ${author}:\n\nCaption: ${title}`;
  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${EXTRACTION_PROMPT}\n\nRecipe content to extract:\n${combinedText}` },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

async function handleWeb(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field is required');

  const webResp = await fetch(body.url, { headers: { 'Accept': 'text/html,application/xhtml+xml,*/*' } });
  if (!webResp.ok) throw new Error(`Could not fetch webpage (HTTP ${webResp.status}).`);

  const html = await webResp.text();
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

  if (textContent.length < 50) throw new Error('The webpage did not contain enough text to extract a recipe.');

  const content = await callGptMini([
    getLanguageSystemMessage(body.language),
    { role: 'user', content: `${EXTRACTION_PROMPT}\n\nRecipe from webpage (${body.url}):\n\n${textContent}` },
  ], 2000, openaiKey);
  return parseJsonResponse(content);
}

// ─── Main handler ─────────────────────────────────────────────────────────────

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders() });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const youtubeKey = Deno.env.get('YOUTUBE_API_KEY') ?? '';

  if (!openaiKey) {
    return jsonResponse({ error: 'OPENAI_API_KEY not configured in Edge Function secrets' }, 500);
  }

  let body: RequestBody;
  try {
    body = await req.json() as RequestBody;
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.type) {
    return jsonResponse({ error: 'type field is required' }, 400);
  }

  try {
    let data: unknown;
    switch (body.type) {
      case 'text':     data = await handleText(body, openaiKey);               break;
      case 'image':    data = await handleImage(body, openaiKey);              break;
      case 'metadata': data = await handleMetadata(body, openaiKey);           break;
      case 'voice':    data = await handleVoice(body, openaiKey);              break;
      case 'pdf':      data = await handlePdf(body, openaiKey);                break;
      case 'youtube':  data = await handleYouTube(body, openaiKey, youtubeKey); break;
      case 'tiktok':   data = await handleTikTok(body, openaiKey);             break;
      case 'web':      data = await handleWeb(body, openaiKey);                break;
      default:
        return jsonResponse({ error: `Unknown extraction type: ${body.type}` }, 400);
    }
    return jsonResponse({ data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[extract-recipe] Error (type=${body.type}):`, message);
    return jsonResponse({ error: message }, 500);
  }
});
