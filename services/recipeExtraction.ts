// services/recipeExtraction.ts
// Extracts structured recipe data from images and text using OpenAI GPT-4o

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

if (!OPENAI_API_KEY) {
  console.error('[recipeExtraction] EXPO_PUBLIC_OPENAI_API_KEY is undefined. Check Rork environment variables.');
}

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
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
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
