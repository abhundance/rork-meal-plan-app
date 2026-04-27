/**
 * extract-recipe — Supabase Edge Function v13
 *
 * Changes from v12:
 *   - Anonymous users now get per-user quota (tied to their Supabase UUID) instead
 *     of falling through to IP-based quota. Removed `payload.role !== 'anon'` guard.
 *   - `metadata` extraction type is exempt from the monthly quota (it's a cheap
 *     GPT-4o-mini call triggered automatically on every recipe save, not a user action).
 *
 * Extraction pipeline by type:
 *
 *   text / image / voice / metadata / web — unchanged from v10
 *
 *   pdf — v12: server-side text extraction (unpdf) + GPT-4o-mini.
 *         Costs ~$0.001 per extraction vs $0.04+ with the old Files API approach.
 *         Smart fallback: if extracted text < 50 chars (scanned PDF), returns a
 *         helpful error suggesting the camera/photo flow instead.
 *
 *   youtube — caption-first with YouTube Data API enrichment
 *   tiktok — page parse + Whisper transcription + oEmbed fallback
 *   instagram — og:video download + Whisper transcription
 *
 *   name — Generates a complete home-cooking recipe from just a meal name.
 *
 * ENVIRONMENT VARIABLES (Supabase Dashboard → Edge Functions → Secrets):
 *   OPENAI_API_KEY          — OpenAI secret key (sk-...)
 *   YOUTUBE_API_KEY         — Google/YouTube Data API v3 key
 *   SUPABASE_URL            — auto-injected by Supabase runtime
 *   SUPABASE_SERVICE_ROLE_KEY — auto-injected; used for quota writes
 *
 * QUOTA: 30 extractions per identifier per calendar month.
 *        metadata type is exempt (cheap, automatic, not user-triggered).
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { extractText as extractPdfText } from 'npm:unpdf';

// ─── Types ────────────────────────────────────────────────────────────────────

type ExtractionType =
  | 'text' | 'image' | 'voice' | 'metadata' | 'pdf'
  | 'youtube' | 'tiktok' | 'instagram' | 'web'
  | 'name';

interface RequestBody {
  type:           ExtractionType;
  language?:      string;
  text?:          string;
  url?:           string;
  base64Image?:   string;
  base64Audio?:   string;
  audioMimeType?: string;
  name?:          string;
  ingredients?:   { name: string; quantity: number; unit: string }[];
  base64Pdf?:     string;
  filename?:      string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPENAI_CHAT_URL    = 'https://api.openai.com/v1/chat/completions';
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const FREE_TIER_LIMIT    = 30;
const WHISPER_MAX_BYTES  = 24 * 1024 * 1024; // 24 MB (Whisper limit is 25 MB)
const MAX_PDF_BYTES      = 10 * 1024 * 1024; // 10 MB

const LANGUAGE_DISPLAY_MAP: Record<string, string> = {
  'English':   'English',
  'Français':  'French',
  'Español':   'Spanish',
  'Deutsch':   'German',
  'Português': 'Portuguese',
  'Italiano':  'Italian',
  'हिन्दी':     'Hindi',
  '日本語':     'Japanese',
  'العربية':   'Arabic',
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

const NAME_GENERATION_PROMPT = `You are a recipe generation assistant. Given a meal name, generate a complete, authentic home-cooking recipe. Return ONLY a valid JSON object — no markdown, no explanation — raw JSON only:
{
  "name": "Recipe name (use the provided name, capitalised properly)",
  "description": "1-2 sentence appetising description",
  "cuisine": "e.g. Italian, Asian, Mexican",
  "meal_type": "breakfast" | "lunch_dinner" | "light_bites",
  "cooking_time_band": "Under 30" | "30-60" | "Over 60",
  "prep_time": number (minutes),
  "cook_time": number (minutes),
  "recipe_serving_size": 4,
  "dietary_tags": array of applicable values from ["Vegan","Vegetarian","Gluten-Free","Dairy-Free","High Protein"],
  "ingredients": [{"name": "string", "quantity": number, "unit": "string", "category": "one of: Produce|Meat & Fish|Dairy & Eggs|Pantry|Bread & Bakery|Frozen|Drinks|Condiments & Sauces|Herbs & Spices|Other"}],
  "method_steps": ["Step 1 text", "Step 2 text", ...],
  "dish_category": one of "main"|"salad"|"soup"|"appetizer"|"side"|"dessert"|"drink"|"bread"|"sandwich"|"sauce"|"other",
  "protein_source": one of "chicken"|"beef"|"pork"|"lamb"|"turkey"|"seafood"|"egg"|"dairy"|"plant"|"none",
  "allergens": array of values this recipe is genuinely FREE FROM, chosen from ["gluten-free","dairy-free","egg-free","nut-free","peanut-free","soy-free","shellfish-free","wheat-free","sesame-free"],
  "diet_labels": array of positive dietary classifications that genuinely apply, chosen from ["vegan","vegetarian","high-protein","low-carb","keto","paleo","whole30","plant-based","high-fibre","low-calorie","low-fat","mediterranean","gluten-free","dairy-free","omega-3","antioxidant-rich"],
  "occasions": array of 1-3 most applicable values from ["weeknight","weekend","brunch","date-night","meal-prep","potluck","game-day","bbq","picnic","summer","christmas","thanksgiving","easter","birthday"],
  "calories_per_serving": number (estimate),
  "protein_per_serving_g": number (estimate),
  "carbs_per_serving_g": number (estimate)
}

Rules:
- Generate an authentic, well-tested recipe — not a creative experiment.
- Use precise metric quantities (g, ml, kg, L). No fractions — use decimals.
- Include 6-12 ingredients with realistic quantities for 4 servings.
- Include 4-8 clear, actionable method steps.
- Estimate realistic prep and cook times.
- Default serving size is 4.
- Assign appropriate dietary tags, allergens, and diet labels based on the actual ingredients.
- Estimate macros (calories, protein, carbs) per serving.`;

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

// ─── Core helpers ────────────────────────────────────────────────────────────────

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

async function callGptMini(
  messages: unknown[],
  maxTokens = 2000,
  openaiKey: string,
): Promise<string> {
  const resp = await fetch(OPENAI_CHAT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
    body: JSON.stringify({ model: 'gpt-4o-mini', messages, max_tokens: maxTokens }),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`OpenAI error ${resp.status}: ${err}`);
  }
  const data = await resp.json();
  return data.choices[0].message.content as string;
}

// ─── Quota ────────────────────────────────────────────────────────────────────

async function getIdentifier(req: Request, authHeader: string | null): Promise<string> {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        // FIX v13: include anonymous users in per-user quota (previously role !== 'anon'
        // pushed all anonymous users to IP-based quota, which is weaker).
        if (payload.sub) return `user:${payload.sub}`;
      }
    } catch { /* fall through to IP */ }
  }
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('cf-connecting-ip') ??
    'unknown';
  const encoded = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0')).join('');
  return `ip:${hashHex.slice(0, 16)}`;
}

async function checkAndIncrementQuota(identifier: string): Promise<boolean> {
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await sb
    .from('ai_usage')
    .select('extractions')
    .eq('identifier', identifier)
    .eq('month', month)
    .maybeSingle();
  const current = (data?.extractions ?? 0) as number;
  if (current >= FREE_TIER_LIMIT) return false;
  await sb.from('ai_usage').upsert(
    { identifier, month, extractions: current + 1 },
    { onConflict: 'identifier,month' },
  );
  return true;
}

// ─── Video transcript helpers ─────────────────────────────────────────────────

function extractJsonValue(html: string, key: string): unknown {
  const searchKey = `"${key}"`;
  const keyIdx = html.indexOf(searchKey);
  if (keyIdx === -1) return null;
  let valueStart = keyIdx + searchKey.length;
  while (valueStart < html.length && /[\s:]/.test(html[valueStart])) valueStart++;
  if (valueStart >= html.length) return null;
  const opener = html[valueStart];
  if (opener !== '[' && opener !== '{') return null;
  const closer = opener === '[' ? ']' : '}';
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = valueStart; i < html.length; i++) {
    const ch = html[i];
    if (escaped)          { escaped = false; continue; }
    if (ch === '\\' && inString) { escaped = true;  continue; }
    if (ch === '"')       { inString = !inString; continue; }
    if (inString)         { continue; }
    if (ch === opener || ch === '{' || ch === '[') depth++;
    else if (ch === closer || ch === '}' || ch === ']') {
      depth--;
      if (depth === 0) {
        try { return JSON.parse(html.slice(valueStart, i + 1)); } catch { return null; }
      }
    }
  }
  return null;
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    const resp = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
      },
    });
    clearTimeout(timer);
    if (!resp.ok) return null;
    const html = await resp.text();
    const tracks = extractJsonValue(html, 'captionTracks') as Array<{ baseUrl: string; languageCode: string; kind?: string }> | null;
    if (!Array.isArray(tracks) || tracks.length === 0) return null;
    const track = tracks.find(t => t.languageCode?.startsWith('en') && t.kind === 'asr') ?? tracks.find(t => t.languageCode?.startsWith('en')) ?? tracks[0];
    if (!track?.baseUrl) return null;
    const captionUrl = new URL(track.baseUrl);
    captionUrl.searchParams.set('fmt', 'json3');
    const capResp = await fetch(captionUrl.toString(), { signal: AbortSignal.timeout(8000) });
    if (!capResp.ok) return null;
    const capData = await capResp.json();
    const transcript = (capData.events ?? [])
      .filter((e: { segs?: Array<{ utf8?: string }> }) => e.segs?.length)
      .flatMap((e: { segs: Array<{ utf8?: string }> }) => e.segs.map(s => (s.utf8 ?? '').replace(/\n/g, ' ')))
      .join(' ').replace(/\[\S[^\]]*\]/g, '').replace(/\s+/g, ' ').trim();
    return transcript.length > 30 ? transcript : null;
  } catch (err) {
    console.warn('[YouTube] Caption fetch failed:', (err as Error).message);
    return null;
  }
}

async function transcribeVideoUrl(videoUrl: string, referer: string, openaiKey: string): Promise<string | null> {
  try {
    const dlResp = await fetch(videoUrl, {
      signal: AbortSignal.timeout(30000),
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Referer': referer,
        'Range': `bytes=0-${WHISPER_MAX_BYTES}`,
      },
    });
    if (!dlResp.ok && dlResp.status !== 206) return null;
    const buffer = await dlResp.arrayBuffer();
    if (buffer.byteLength < 5000) return null;
    const magic = new Uint8Array(buffer.slice(0, 12));
    const isWebm = magic[0] === 0x1a && magic[1] === 0x45 && magic[2] === 0xdf && magic[3] === 0xa3;
    const isMp4  = magic[4] === 0x66 && magic[5] === 0x74 && magic[6] === 0x79 && magic[7] === 0x70;
    const ext    = isWebm ? 'webm' : isMp4 ? 'mp4' : 'mp4';
    const mime   = isWebm ? 'video/webm' : 'video/mp4';
    const form = new FormData();
    form.append('file', new Blob([buffer], { type: mime }), `video.${ext}`);
    form.append('model', 'whisper-1');
    const whisperResp = await fetch(OPENAI_WHISPER_URL, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: form,
      signal: AbortSignal.timeout(60000),
    });
    if (!whisperResp.ok) return null;
    const { text } = await whisperResp.json();
    const transcript = (text as string)?.trim();
    return transcript?.length > 20 ? transcript : null;
  } catch (err) {
    console.warn('[Video] transcribeVideoUrl failed:', (err as Error).message);
    return null;
  }
}

async function parseTikTokPage(url: string): Promise<{ videoUrl: string | null; caption: string | null }> {
  try {
    const resp = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': 'https://www.tiktok.com/',
      },
    });
    if (!resp.ok) return { videoUrl: null, caption: null };
    const html = await resp.text();
    const sigiMatch = html.match(/window\['SIGI_STATE'\]\s*=\s*(\{[\s\S]*?\});\s*window\[/);
    if (sigiMatch) {
      try {
        const data = JSON.parse(sigiMatch[1]);
        const videos = data?.ItemModule;
        if (videos) {
          const item = Object.values(videos)[0] as Record<string, unknown>;
          const video = item?.video as Record<string, string> | undefined;
          return { caption: (item?.desc as string) ?? null, videoUrl: video?.downloadAddr ?? video?.playAddr ?? null };
        }
      } catch { /* no luck */ }
    }
    return { videoUrl: null, caption: null };
  } catch (err) {
    console.warn('[TikTok] Page parse failed:', (err as Error).message);
    return { videoUrl: null, caption: null };
  }
}

async function parseInstagramPage(url: string): Promise<{ videoUrl: string | null; caption: string | null }> {
  const cleanUrl = url.split('?')[0].replace(/\/$/, '');
  try {
    const resp = await fetch(cleanUrl, {
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });
    if (!resp.ok) return { videoUrl: null, caption: null };
    const html = await resp.text();
    const videoMatch = html.match(/<meta[^>]+property=["']og:video(?::url)?["'][^>]+content=["']([^"']+)["']/);
    const videoUrl = videoMatch ? videoMatch[1].replace(/&amp;/g, '&') : null;
    const captionMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/);
    const caption = captionMatch ? captionMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&').slice(0, 500) : null;
    return { videoUrl, caption };
  } catch (err) {
    console.warn('[Instagram] Page parse failed:', (err as Error).message);
    return { videoUrl: null, caption: null };
  }
}

async function enrichMetadata(raw: Record<string, unknown>, openaiKey: string): Promise<Record<string, unknown>> {
  const name = raw.name as string | undefined;
  const ingredients = (raw.ingredients ?? []) as Array<{ name: string }>;
  if (!name || ingredients.length === 0) return raw;
  const ingredientNames = ingredients.map(i => i.name).join(', ');
  const prompt = `${METADATA_PROMPT}\n\nRecipe: ${name}\nIngredients: ${ingredientNames}`;
  try {
    const content = await callGptMini([{ role: 'user' as const, content: prompt }], 1000, openaiKey);
    const metadata = parseJsonResponse(content) as Record<string, unknown>;
    return { ...raw, ...metadata };
  } catch (err) {
    console.warn('[Metadata enrichment] Failed:', (err as Error).message);
    return raw;
  }
}

// ─── Extraction handlers ──────────────────────────────────────────────────────

async function handleText(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.text) throw new Error('text field required');
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nContent:\n${body.text}` }], 2000, openaiKey);
  const raw = parseJsonResponse(content) as Record<string, unknown>;
  return enrichMetadata(raw, openaiKey);
}

async function handleImage(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Image) throw new Error('base64Image field required');
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: [{ type: 'text', text: EXTRACTION_PROMPT }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${body.base64Image}` } }] as unknown }], 2000, openaiKey);
  const raw = parseJsonResponse(content) as Record<string, unknown>;
  return enrichMetadata(raw, openaiKey);
}

async function handleVoice(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Audio || !body.audioMimeType) throw new Error('base64Audio and audioMimeType required');
  const form = new FormData();
  const buf = Uint8Array.from(atob(body.base64Audio), c => c.charCodeAt(0));
  form.append('file', new Blob([buf], { type: body.audioMimeType }), 'audio.m4a');
  form.append('model', 'whisper-1');
  const whisperResp = await fetch(OPENAI_WHISPER_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${openaiKey}` }, body: form });
  if (!whisperResp.ok) throw new Error('Whisper transcription failed');
  const { text: transcript } = await whisperResp.json();
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nTranscribed audio:\n${transcript}` }], 2000, openaiKey);
  const raw = parseJsonResponse(content) as Record<string, unknown>;
  return enrichMetadata(raw, openaiKey);
}

async function handlePdf(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.base64Pdf) throw new Error('base64Pdf field required');
  if (body.base64Pdf.length > MAX_PDF_BYTES * 1.4) throw new Error('PDF file too large');
  try {
    const buf = Uint8Array.from(atob(body.base64Pdf), c => c.charCodeAt(0));
    const text = await extractPdfText(buf);
    const extracted = text.trim();
    if (extracted.length < 50) throw new Error('PDF appears to be a scanned image — no readable text found. Try photographing the recipe with your camera or using OCR software first.');
    const sysMsg = getLanguageSystemMessage(body.language);
    const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nPDF content:\n${extracted}` }], 2000, openaiKey);
    const raw = parseJsonResponse(content) as Record<string, unknown>;
    return enrichMetadata(raw, openaiKey);
  } catch (err) {
    if (err instanceof Error && err.message.includes('scanned image')) throw err;
    throw new Error(`PDF extraction failed: ${(err as Error).message}`);
  }
}

async function handleMetadata(body: RequestBody, openaiKey: string): Promise<unknown> {
  const name = body.name;
  const ingredients = body.ingredients ?? [];
  if (!name) throw new Error('name field required');
  if (ingredients.length === 0) throw new Error('ingredients array required and must not be empty');
  const ingredientNames = (ingredients as Array<{ name: string }>).map(i => i.name).join(', ');
  const prompt = `${METADATA_PROMPT}\n\nRecipe: ${name}\nIngredients: ${ingredientNames}`;
  const content = await callGptMini([{ role: 'user' as const, content: prompt }], 1000, openaiKey);
  return parseJsonResponse(content);
}

async function handleYouTube(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field required');
  const videoIdMatch = body.url.match(/(?:youtu\.be\/|youtube\.com\/(?:[^/]+\/)*(?:watch\?v=|shorts\/))([^&?/\s]+)/);
  if (!videoIdMatch) throw new Error('Invalid YouTube URL');
  const videoId = videoIdMatch[1];
  const caption = await fetchYouTubeTranscript(videoId);
  if (caption) {
    const sysMsg = getLanguageSystemMessage(body.language);
    const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nYouTube caption:\n${caption}` }], 2000, openaiKey);
    const raw = parseJsonResponse(content) as Record<string, unknown>;
    return enrichMetadata(raw, openaiKey);
  }
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const transcript = await transcribeVideoUrl(videoUrl, videoUrl, openaiKey);
  if (!transcript) throw new Error('YouTube video: no captions or audio found');
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nTranscribed audio:\n${transcript}` }], 2000, openaiKey);
  const raw = parseJsonResponse(content) as Record<string, unknown>;
  return enrichMetadata(raw, openaiKey);
}

async function handleTikTok(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field required');
  const { videoUrl, caption } = await parseTikTokPage(body.url);
  if (caption && caption.length > 10) {
    const sysMsg = getLanguageSystemMessage(body.language);
    const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nTikTok caption:\n${caption}` }], 2000, openaiKey);
    const raw = parseJsonResponse(content) as Record<string, unknown>;
    return enrichMetadata(raw, openaiKey);
  }
  if (videoUrl) {
    const transcript = await transcribeVideoUrl(videoUrl, body.url, openaiKey);
    if (transcript) {
      const sysMsg = getLanguageSystemMessage(body.language);
      const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nTranscribed audio:\n${transcript}` }], 2000, openaiKey);
      const raw = parseJsonResponse(content) as Record<string, unknown>;
      return enrichMetadata(raw, openaiKey);
    }
  }
  throw new Error('TikTok video: could not extract caption or download video for transcription');
}

async function handleInstagram(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field required');
  const { videoUrl, caption } = await parseInstagramPage(body.url);
  if (caption && caption.length > 10) {
    const sysMsg = getLanguageSystemMessage(body.language);
    const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nInstagram caption:\n${caption}` }], 2000, openaiKey);
    const raw = parseJsonResponse(content) as Record<string, unknown>;
    return enrichMetadata(raw, openaiKey);
  }
  if (videoUrl) {
    const transcript = await transcribeVideoUrl(videoUrl, body.url, openaiKey);
    if (transcript) {
      const sysMsg = getLanguageSystemMessage(body.language);
      const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nTranscribed audio:\n${transcript}` }], 2000, openaiKey);
      const raw = parseJsonResponse(content) as Record<string, unknown>;
      return enrichMetadata(raw, openaiKey);
    }
  }
  throw new Error('Instagram reel: could not extract caption or download video for transcription');
}

async function handleWeb(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.url) throw new Error('url field required');
  const resp = await fetch(body.url, { signal: AbortSignal.timeout(15000), headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${body.url}`);
  const html = await resp.text();
  const text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 5000);
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${EXTRACTION_PROMPT}\n\nWeb page content:\n${text}` }], 2000, openaiKey);
  const raw = parseJsonResponse(content) as Record<string, unknown>;
  return enrichMetadata(raw, openaiKey);
}

async function handleName(body: RequestBody, openaiKey: string): Promise<unknown> {
  if (!body.name) throw new Error('name field required');
  const sysMsg = getLanguageSystemMessage(body.language);
  const content = await callGptMini([sysMsg, { role: 'user' as const, content: `${NAME_GENERATION_PROMPT}\n\nMeal name: ${body.name}` }], 3000, openaiKey);
  return parseJsonResponse(content);
}

// ─── Main handler ────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

  try {
    const authHeader = req.headers.get('authorization');
    const identifier = await getIdentifier(req, authHeader);

    if (req.method !== 'POST') return jsonResponse({ error: 'POST required' }, 400);

    const body = await req.json() as RequestBody;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) throw new Error('OPENAI_API_KEY not set');
    if (!body.type) throw new Error('type field required');

    // FIX v13: metadata calls are cheap (GPT-4o-mini only, no Whisper/YouTube) and are
    // triggered automatically on every recipe save — exempt them from the monthly quota
    // so they don't eat into a user's 30 extraction allowance.
    if (body.type !== 'metadata') {
      const allowed = await checkAndIncrementQuota(identifier);
      if (!allowed) {
        return jsonResponse({ error: 'Quota exceeded: 30 extractions per month' }, 429);
      }
    }

    let result: unknown;

    switch (body.type) {
      case 'text':      result = await handleText(body, openaiKey); break;
      case 'image':     result = await handleImage(body, openaiKey); break;
      case 'voice':     result = await handleVoice(body, openaiKey); break;
      case 'pdf':       result = await handlePdf(body, openaiKey); break;
      case 'metadata':  result = await handleMetadata(body, openaiKey); break;
      case 'youtube':   result = await handleYouTube(body, openaiKey); break;
      case 'tiktok':    result = await handleTikTok(body, openaiKey); break;
      case 'instagram': result = await handleInstagram(body, openaiKey); break;
      case 'web':       result = await handleWeb(body, openaiKey); break;
      case 'name':      result = await handleName(body, openaiKey); break;
      default:          throw new Error(`Unknown extraction type: ${body.type}`);
    }

    return jsonResponse(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[extract-recipe] Error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
