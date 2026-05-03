/**
 * ai-chef — Supabase Edge Function v6
 *
 * Conversational recipe assistant with GPT-4o vision support.
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

const OPENAI_CHAT_URL    = 'https://api.openai.com/v1/chat/completions';
const OPENAI_WHISPER_URL = 'https://api.openai.com/v1/audio/transcriptions';
const AI_CHEF_QUOTA      = 30;

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

const RECIPE_URL_PATTERNS = [
  /youtube\.com\/watch/i, /youtu\.be\//i, /youtube\.com\/shorts\//i,
  /tiktok\.com\//i, /instagram\.com\/reel\//i, /instagram\.com\/p\//i,
  /allrecipes\.com/i, /foodnetwork\.com/i, /tasty\.co/i,
  /epicurious\.com/i, /simplyrecipes\.com/i, /seriouseats\.com/i,
  /bonappetit\.com/i, /delish\.com/i, /food52\.com/i,
];

const URL_REGEX = /https?:\/\/[^\s]+/i;

function isLikelyRecipeUrl(url: string): boolean {
  if (RECIPE_URL_PATTERNS.some(p => p.test(url))) return true;
  const lower = url.toLowerCase();
  return lower.includes('recipe') || lower.includes('cook') || lower.includes('food') ||
         lower.includes('youtube') || lower.includes('youtu.be') || lower.includes('tiktok') || lower.includes('instagram');
}

function buildSystemPrompt(servingSize: number): string {
  return `You are AI Chef, a friendly and knowledgeable cooking assistant inside a family meal planning app. Your job is to help users decide what to cook and generate complete recipes.

Behaviour rules:
- Be warm, encouraging, and concise. Keep replies under 150 words unless the user asks for detail.
- When you have enough context to suggest a recipe, ALWAYS include a structured recipe JSON in your response.
- If you need more information, ask a focused clarifying question — max 1-2 questions at a time.
- When the user asks you to refine or change a recipe, return the COMPLETE updated recipe with a changes_summary field.
- Never refuse a reasonable food request.
- If the user's first message is a simple meal name, generate the recipe immediately.
- If the user sends an image, carefully examine it and extract any recipe content.
- Support iterative refinement.

Response format — ONLY a valid JSON object:
{
  "reply": "Your conversational message",
  "recipe": { recipe object or null },
  "changes_summary": "Description of changes or null"
}

When recipe is not null:
{
  "name": string, "description": string, "cuisine": string,
  "meal_type": "breakfast"|"lunch_dinner"|"light_bites",
  "cooking_time_band": "Under 30"|"30-60"|"Over 60",
  "prep_time": number, "cook_time": number,
  "recipe_serving_size": ${servingSize},
  "dietary_tags": string[],
  "ingredients": [{"name": string, "quantity": number, "unit": string, "category": string}],
  "method_steps": string[],
  "dish_category": string, "protein_source": string,
  "allergens": string[], "diet_labels": string[], "occasions": string[],
  "calories_per_serving": number|null, "protein_per_serving_g": number|null, "carbs_per_serving_g": number|null
}

This family has ${servingSize} people. Always generate recipes for ${servingSize} servings. Use metric units (g, ml, kg, L). No fractions.`;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(), 'Content-Type': 'application/json' } });
}

function parseJsonResponse(content: string): unknown {
  let cleaned = content.trim();
  if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  return JSON.parse(cleaned);
}

interface FamilyContext {
  dietary_preferences?: string[];
  allergens?: string[];
  default_serving_size?: number;
}

function buildFamilyContextPrompt(ctx?: FamilyContext): string {
  if (!ctx) return '';
  const parts: string[] = [];
  if (ctx.dietary_preferences?.length) parts.push(`Family dietary preferences: ${ctx.dietary_preferences.join(', ')}.`);
  if (ctx.allergens?.length) parts.push(`Family allergens/restrictions (MUST avoid): ${ctx.allergens.join(', ')}.`);
  if (parts.length === 0) return '';
  return '\n\nFamily context:\n' + parts.join('\n');
}

const WHISPER_EXT_MAP: Record<string, string> = {
  'x-m4a': 'm4a', 'mpeg4': 'm4a', 'aac': 'm4a', 'x-aac': 'm4a',
  '3gpp': 'mp4', '3gp': 'mp4', 'mp4a-latm': 'm4a',
};

function normaliseAudioExt(mimeType: string): string {
  const sub = mimeType.split('/')[1] ?? 'm4a';
  return WHISPER_EXT_MAP[sub] ?? sub;
}

async function transcribeAudio(base64Audio: string, audioMimeType: string, openaiKey: string): Promise<string> {
  const mimeType = audioMimeType || 'audio/m4a';
  const ext = normaliseAudioExt(mimeType);
  const binaryStr = atob(base64Audio);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  const canonicalMime = ext === 'm4a' ? 'audio/m4a' : ext === 'mp4' ? 'audio/mp4' : mimeType;
  const formData = new FormData();
  formData.append('file', new Blob([bytes], { type: canonicalMime }), `recording.${ext}`);
  formData.append('model', 'whisper-1');
  const whisperResp = await fetch(OPENAI_WHISPER_URL, { method: 'POST', headers: { 'Authorization': `Bearer ${openaiKey}` }, body: formData, signal: AbortSignal.timeout(30000) });
  if (!whisperResp.ok) { const err = await whisperResp.text(); throw new Error(`Whisper error ${whisperResp.status}: ${err}`); }
  const { text } = await whisperResp.json();
  return (text as string)?.trim() ?? '';
}

async function getIdentifier(req: Request, authHeader: string | null): Promise<string> {
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.sub) return `user:${payload.sub}`;
      }
    } catch { /* fall through to IP */ }
  }
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('cf-connecting-ip') ?? 'unknown';
  const encoded = new TextEncoder().encode(ip);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  return `ip:${hashHex.slice(0, 16)}`;
}

async function checkAndIncrementQuota(identifier: string, isNewSession: boolean): Promise<boolean> {
  if (!isNewSession) return true;
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const month = new Date().toISOString().slice(0, 7);
  const { data } = await sb.from('ai_usage').select('ai_chef_sessions, extractions').eq('identifier', identifier).eq('month', month).maybeSingle();
  const currentSessions = (data?.ai_chef_sessions ?? 0) as number;
  if (currentSessions >= AI_CHEF_QUOTA) return false;
  await sb.from('ai_usage').upsert({ identifier, month, ai_chef_sessions: currentSessions + 1, extractions: (data?.extractions ?? 0) as number }, { onConflict: 'identifier,month' });
  return true;
}

interface IncomingMessage { role: 'user' | 'assistant'; content: string; image_base64?: string; }

function buildGptMessages(systemMessage: { role: string; content: string }, messages: IncomingMessage[]) {
  const gptMessages: unknown[] = [systemMessage];
  for (const msg of messages) {
    if (msg.role === 'assistant') { gptMessages.push({ role: 'assistant', content: msg.content }); continue; }
    if (msg.image_base64) {
      const contentParts: unknown[] = [];
      if (msg.content?.trim()) contentParts.push({ type: 'text', text: msg.content });
      let mimeType = 'image/jpeg';
      if (msg.image_base64.startsWith('iVBOR')) mimeType = 'image/png';
      else if (msg.image_base64.startsWith('R0lGO')) mimeType = 'image/gif';
      else if (msg.image_base64.startsWith('UklGR')) mimeType = 'image/webp';
      contentParts.push({ type: 'image_url', image_url: { url: `data:${mimeType};base64,${msg.image_base64}`, detail: 'auto' } });
      if (contentParts.length === 1) contentParts.unshift({ type: 'text', text: 'Please look at this image and extract or suggest a recipe based on what you see.' });
      gptMessages.push({ role: 'user', content: contentParts });
    } else {
      gptMessages.push({ role: 'user', content: msg.content });
    }
  }
  return gptMessages;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders() });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  if (!openaiKey) return jsonResponse({ error: 'OPENAI_API_KEY not configured' }, 500);

  let body: { type?: string; messages?: IncomingMessage[]; language?: string; family_context?: FamilyContext; base64Audio?: string; audioMimeType?: string; };
  try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }

  if (body.type === 'transcribe') {
    if (!body.base64Audio) return jsonResponse({ error: 'base64Audio field is required for transcription' }, 400);
    try {
      const text = await transcribeAudio(body.base64Audio, body.audioMimeType ?? 'audio/m4a', openaiKey);
      return jsonResponse({ text });
    } catch (err: unknown) {
      return jsonResponse({ error: err instanceof Error ? err.message : 'Transcription failed' }, 500);
    }
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0)
    return jsonResponse({ error: 'messages array is required and must not be empty' }, 400);

  const lastUserMsg = [...body.messages].reverse().find(m => m.role === 'user');
  if (lastUserMsg) {
    const urlMatch = lastUserMsg.content.match(URL_REGEX);
    if (urlMatch && isLikelyRecipeUrl(urlMatch[0]))
      return jsonResponse({ reply: "I see a link! Let me extract that recipe for you.", recipe: null, changes_summary: null, extract_url: urlMatch[0] });
  }

  const authHeader = req.headers.get('Authorization');
  const identifier = await getIdentifier(req, authHeader);
  const isNewSession = body.messages.filter(m => m.role === 'user').length === 1;
  const allowed = await checkAndIncrementQuota(identifier, isNewSession);
  if (!allowed) return jsonResponse({ error: 'quota_exceeded', reply: `You've used all ${AI_CHEF_QUOTA} AI Chef sessions this month.` }, 429);

  const lang = getOutputLanguage(body.language);
  const familyServingSize = body.family_context?.default_serving_size || 4;
  const systemMessage = {
    role: 'system',
    content: buildSystemPrompt(familyServingSize) + buildFamilyContextPrompt(body.family_context) + `\n\nIMPORTANT: Respond entirely in ${lang}.`,
  };

  let conversationMessages = body.messages;
  if (conversationMessages.length > 12) {
    const older = conversationMessages.slice(0, -6);
    const recent = conversationMessages.slice(-6);
    const summary = older.map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n');
    conversationMessages = [{ role: 'user' as const, content: `[Previous conversation summary: ${summary}]` }, ...recent];
  }

  const gptMessages = buildGptMessages(systemMessage, conversationMessages);

  try {
    const resp = await fetch(OPENAI_CHAT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openaiKey}` },
      body: JSON.stringify({ model: 'gpt-4o', messages: gptMessages, max_tokens: 3000, temperature: 0.7 }),
    });
    if (!resp.ok) { const err = await resp.text(); throw new Error(`OpenAI error ${resp.status}: ${err}`); }
    const data = await resp.json();
    const content = data.choices[0].message.content as string;
    let parsed: { reply?: string; recipe?: unknown; changes_summary?: string | null };
    try {
      parsed = parseJsonResponse(content) as typeof parsed;
      // GPT sometimes returns the recipe object directly (without the {reply, recipe} wrapper).
      // Detect this and normalise so the client always receives { reply: string, recipe: object }.
      const p = parsed as Record<string, unknown>;
      if (!p.reply && !p.recipe && typeof p.name === 'string' && Array.isArray(p.ingredients)) {
        parsed = { reply: '', recipe: p, changes_summary: null };
      }
    } catch {
      // Parsing failed entirely — send raw content as plain-text reply
      parsed = { reply: content, recipe: null, changes_summary: null };
    }
    return jsonResponse({ reply: parsed.reply ?? '', recipe: parsed.recipe ?? null, changes_summary: parsed.changes_summary ?? null, extract_url: null });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[ai-chef] Error:', message);
    return jsonResponse({ error: message }, 500);
  }
});
