// services/recipeExtraction.ts
// Extracts structured recipe data from images and text using OpenAI GPT-4o

function getApiKey(): string {
  const key = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) throw new Error('OpenAI API key is not configured. Add EXPO_PUBLIC_OPENAI_API_KEY in Rork environment variables.');
  return key;
}

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

export interface ExtractedRecipe {
  name: string;
  description: string;
  cuisine: string;
  meal_type: 'breakfast' | 'lunch_dinner' | 'light_bites';
  cooking_time_band: 'Under 30' | '30-60' | 'Over 60';
  prep_time: number;
  cook_time: number;
  recipe_serving_size: number;
  dietary_tags: string[];
  ingredients: { name: string; quantity: number; unit: string }[];
  method_steps: string[];
  chef_notes: string;
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
  "chef_notes": "Any tips or notes, empty string if none"
}
meal_type rules: use "breakfast" for morning meals, "lunch_dinner" for main meals, "light_bites" for snacks/sides.
cooking_time_band rules: total of prep+cook time: <30min = "Under 30", 30-60min = "30-60", >60min = "Over 60".`;

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
  console.log('[recipeExtraction] Raw response:', content);

  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned) as ExtractedRecipe;
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
  console.log('[recipeExtraction] Raw response:', content);

  let cleaned = content.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
  }
  return JSON.parse(cleaned) as ExtractedRecipe;
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
