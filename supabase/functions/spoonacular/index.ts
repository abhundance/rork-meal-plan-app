/**
 * Spoonacular Edge Function
 *
 * Proxies Spoonacular API calls server-side so the API key is never exposed
 * to the client. Handles recipe search and detail fetching.
 *
 * Routes:
 *   POST { type: 'search', ...params }  → complexSearch with full recipe info
 *   POST { type: 'detail', id: number } → recipeInformation for a single recipe
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SPOONACULAR_BASE = 'https://api.spoonacular.com';

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function errResponse(msg: string, status = 400): Response {
  return jsonResponse({ error: msg }, status);
}

// ── Mapping helpers ─────────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function cookTimeBand(mins: number): 'Under 30' | '30-60' | 'Over 60' {
  if (mins < 30) return 'Under 30';
  if (mins <= 60) return '30-60';
  return 'Over 60';
}

function toMealType(dishTypes: string[]): 'breakfast' | 'lunch_dinner' | 'light_bites' {
  const dt = dishTypes.map((d: string) => d.toLowerCase());
  if (dt.some((d: string) => ['breakfast', 'brunch', 'morning meal'].includes(d))) return 'breakfast';
  if (dt.some((d: string) => ['snack', 'appetizer', 'antipasti', 'antipasto', 'finger food', 'fingerfood', 'starter', 'hor d\'oeuvre'].includes(d))) return 'light_bites';
  return 'lunch_dinner';
}

function toDishCategory(dishTypes: string[]): string {
  const dt = dishTypes.map((d: string) => d.toLowerCase());
  if (dt.some((d: string) => ['main course', 'main dish', 'dinner'].includes(d))) return 'main';
  if (dt.includes('soup')) return 'soup';
  if (dt.includes('salad')) return 'salad';
  if (dt.some((d: string) => ['appetizer', 'antipasti', 'antipasto', 'starter', 'hor d\'oeuvre'].includes(d))) return 'appetizer';
  if (dt.some((d: string) => ['side dish', 'side'].includes(d))) return 'sides';
  if (dt.includes('breakfast') || dt.includes('brunch')) return 'breakfast';
  if (dt.includes('dessert')) return 'dessert';
  if (dt.some((d: string) => ['snack', 'finger food', 'fingerfood'].includes(d))) return 'snack';
  if (dt.some((d: string) => ['drink', 'beverage'].includes(d))) return 'drink';
  return 'main';
}

function toProteinSource(ingredients: Array<{ name: string }>): string {
  const names = ingredients.map((i: { name: string }) => i.name.toLowerCase()).join(' ');
  if (/chicken|turkey|poultry/.test(names)) return 'chicken';
  if (/\bbeef\b|steak|brisket|ground beef|mince/.test(names)) return 'beef';
  if (/\bpork\b|bacon|ham|prosciutto|pancetta/.test(names)) return 'pork';
  if (/\blamb\b|mutton/.test(names)) return 'lamb';
  if (/salmon|tuna|\bfish\b|cod|shrimp|prawn|scallop|crab|lobster|seafood|halibut|tilapia/.test(names)) return 'seafood';
  if (/\begg\b/.test(names)) return 'egg';
  if (/tofu|tempeh|seitan/.test(names)) return 'plant';
  if (/lentil|chickpea|\bbean\b|legume|soy/.test(names)) return 'plant';
  return 'plant';
}

function toAllergens(diets: string[]): string[] {
  const allergens: string[] = [];
  const d = diets.map((x: string) => x.toLowerCase());
  if (d.includes('gluten free')) allergens.push('gluten-free');
  if (d.includes('dairy free')) allergens.push('dairy-free');
  if (d.some((x: string) => x.includes('peanut') || x.includes('tree nut'))) allergens.push('nut-free');
  return allergens;
}

function toDietLabels(diets: string[]): string[] {
  const labels: string[] = [];
  const d = diets.map((x: string) => x.toLowerCase());
  if (d.includes('vegan')) labels.push('vegan');
  if (d.some((x: string) => x.includes('vegetarian'))) labels.push('vegetarian');
  if (d.includes('ketogenic')) labels.push('keto');
  if (d.includes('paleo')) labels.push('paleo');
  if (d.includes('whole30')) labels.push('whole30');
  if (d.includes('gluten free')) labels.push('gluten-free');
  if (d.includes('dairy free')) labels.push('dairy-free');
  return labels;
}

function toDietaryTags(diets: string[]): string[] {
  const tags: string[] = [];
  const d = diets.map((x: string) => x.toLowerCase());
  if (d.includes('vegan')) tags.push('Vegan');
  if (d.some((x: string) => x.includes('vegetarian'))) tags.push('Vegetarian');
  if (d.includes('gluten free')) tags.push('Gluten-Free');
  if (d.includes('dairy free')) tags.push('Dairy-Free');
  return tags;
}

/** Extract a named nutrient's rounded value from Spoonacular's nutrition.nutrients array. */
// deno-lint-ignore no-explicit-any
function nutrientValue(nutrition: any, name: string): number {
  const nutrients: Array<{ name: string; amount: number }> = nutrition?.nutrients ?? [];
  const hit = nutrients.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return hit ? Math.round(hit.amount) : 0;
}

// deno-lint-ignore no-explicit-any
function mapSpoonacularRecipe(r: any): Record<string, unknown> {
  const dishTypes: string[] = r.dishTypes ?? [];
  const diets: string[]     = r.diets     ?? [];
  const cuisines: string[]  = r.cuisines  ?? [];
  const ingredients: Array<{ name: string; amount: number; unit: string }>
    = r.extendedIngredients ?? [];

  // Parse method steps from analyzedInstructions
  const methodSteps: string[] = [];
  for (const instruction of (r.analyzedInstructions ?? [])) {
    for (const step of (instruction.steps ?? [])) {
      if (step.step) methodSteps.push(step.step as string);
    }
  }

  const mappedIngredients = ingredients.map((ing) => ({
    name:     ing.name ?? '',
    quantity: Math.round((ing.amount ?? 0) * 10) / 10,
    unit:     ing.unit ?? '',
  }));

  const readyInMinutes = r.readyInMinutes ?? 30;

  return {
    id:                  `spoon_${r.id}`,
    spoonacular_id:      r.id as number,
    name:                (r.title ?? 'Untitled') as string,
    image_url:           (r.image ?? '') as string,
    description:         r.summary ? stripHtml(r.summary as string).slice(0, 400) : '',
    created_at:          new Date().toISOString(),

    cuisines:            cuisines.length > 0 ? cuisines : ['International'],
    cuisine:             cuisines[0] ?? 'International',
    meal_type:           toMealType(dishTypes),
    dish_category:       toDishCategory(dishTypes),
    protein_source:      toProteinSource(ingredients),
    occasions:           [] as string[],

    allergens:           toAllergens(diets),
    diet_labels:         toDietLabels(diets),
    dietary_tags:        toDietaryTags(diets),
    is_vegan:            diets.some((d: string) => d.toLowerCase() === 'vegan'),
    is_vegetarian:       diets.some((d: string) => d.toLowerCase().includes('vegetarian')),
    is_gluten_free:      diets.some((d: string) => d.toLowerCase() === 'gluten free'),
    is_dairy_free:       diets.some((d: string) => d.toLowerCase() === 'dairy free'),

    prep_time:           r.preparationMinutes ?? Math.floor(readyInMinutes * 0.3),
    cook_time:           r.cookingMinutes     ?? readyInMinutes,
    cooking_time_band:   cookTimeBand(readyInMinutes),
    recipe_serving_size: (r.servings ?? 4) as number,

    // Taste — Spoonacular doesn't include taste in complexSearch; use neutral defaults.
    taste_sweetness:     50,
    taste_saltiness:     50,
    taste_sourness:      50,
    taste_bitterness:    50,
    taste_savoriness:    50,
    taste_fattiness:     50,
    taste_spiciness:     50,

    // Nutrition — populated when includeNutrition=true (detail calls); 0 otherwise.
    calories_per_serving:  nutrientValue(r.nutrition, 'Calories'),
    protein_per_serving_g: nutrientValue(r.nutrition, 'Protein'),
    carbs_per_serving_g:   nutrientValue(r.nutrition, 'Carbohydrates'),

    health_score:        Math.round((r.healthScore ?? 50) as number),
    add_to_plan_count:   0,

    ingredients:         mappedIngredients,
    method_steps:        methodSteps,

    source_url:          (r.sourceUrl   ?? '') as string,
    credits:             (r.creditsText ?? r.sourceName ?? '') as string,
  };
}

// ── Handlers ─────────────────────────────────────────────────────────────────

// deno-lint-ignore no-explicit-any
async function handleSearch(body: any): Promise<Response> {
  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) return errResponse('SPOONACULAR_API_KEY not configured', 500);

  const {
    query        = '',
    cuisine      = '',
    mealType     = '',
    diet         = '',
    intolerances = '',
    maxReadyTime,
    minCalories,
    maxCalories,
    offset       = 0,
    number       = 20,
  } = body;

  const params = new URLSearchParams({
    apiKey,
    addRecipeInformation:  'true',
    addRecipeInstructions: 'true',   // include analyzedInstructions so method_steps are populated
    fillIngredients:       'true',
    number:                String(Math.min(number, 100)),
    offset:                String(offset),
    sort:                  'popularity',
  });

  if (query)        params.set('query', query as string);
  if (cuisine)      params.set('cuisine', cuisine as string);
  if (mealType)     params.set('type', mealType as string);
  if (diet)         params.set('diet', diet as string);
  if (intolerances) params.set('intolerances', intolerances as string);
  if (maxReadyTime != null) params.set('maxReadyTime', String(maxReadyTime));
  if (minCalories  != null) params.set('minCalories',  String(minCalories));
  if (maxCalories  != null) params.set('maxCalories',  String(maxCalories));

  const url = `${SPOONACULAR_BASE}/recipes/complexSearch?${params}`;
  console.log('[spoonacular] search:', url.replace(apiKey, '***'));

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[spoonacular] search error:', response.status, errorText);
    return errResponse(`Spoonacular error: ${response.status}`, response.status);
  }

  const data = await response.json();
  const meals = (data.results ?? []).map(mapSpoonacularRecipe);

  return jsonResponse({
    meals,
    offset:       data.offset       ?? offset,
    number:       data.number       ?? meals.length,
    totalResults: data.totalResults ?? meals.length,
  });
}

// deno-lint-ignore no-explicit-any
async function handleDetail(body: any): Promise<Response> {
  const apiKey = Deno.env.get('SPOONACULAR_API_KEY');
  if (!apiKey) return errResponse('SPOONACULAR_API_KEY not configured', 500);

  const { id } = body;
  if (!id) return errResponse('id is required');

  const params = new URLSearchParams({
    apiKey,
    includeNutrition: 'true',
  });

  const url = `${SPOONACULAR_BASE}/recipes/${id}/information?${params}`;
  console.log('[spoonacular] detail: recipe', id);

  const response = await fetch(url);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[spoonacular] detail error:', response.status, errorText);
    return errResponse(`Spoonacular error: ${response.status}`, response.status);
  }

  const r = await response.json();
  return jsonResponse({ meal: mapSpoonacularRecipe(r) });
}

// ── Main ──────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { type } = body;

    switch (type) {
      case 'search': return await handleSearch(body);
      case 'detail': return await handleDetail(body);
      default:       return errResponse(`Unknown type: ${String(type)}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[spoonacular] unhandled error:', msg);
    return errResponse(`Internal error: ${msg}`, 500);
  }
});
