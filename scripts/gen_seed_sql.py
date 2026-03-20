"""
gen_seed_sql.py
Parses mocks/discover.ts and generates SQL to seed curated recipes into Supabase.
"""
import re
import uuid
import sys

# ── Read source ───────────────────────────────────────────────────────────────
with open('mocks/discover.ts', 'r') as f:
    content = f.read()

# ── Extract DISCOVER_MEALS array block ────────────────────────────────────────
start = content.index('DISCOVER_MEALS: DiscoverMeal[] = [') + len('DISCOVER_MEALS: DiscoverMeal[] = [')
depth = 1
pos = start
while pos < len(content) and depth > 0:
    if content[pos] == '[': depth += 1
    elif content[pos] == ']': depth -= 1
    pos += 1
raw = content[start:pos-1]

# ── Strip single-line comments but NOT inside strings ────────────────────────
def strip_comments(s):
    result = []
    i = 0
    in_str = False
    str_char = None
    while i < len(s):
        c = s[i]
        if in_str:
            result.append(c)
            if c == '\\':
                i += 1
                if i < len(s):
                    result.append(s[i])
            elif c == str_char:
                in_str = False
        else:
            if c in ('"', "'"):
                in_str = True
                str_char = c
                result.append(c)
            elif c == '/' and i+1 < len(s) and s[i+1] == '/':
                # skip to end of line
                while i < len(s) and s[i] != '\n':
                    i += 1
                continue
            else:
                result.append(c)
        i += 1
    return ''.join(result)

raw = strip_comments(raw)

# ── Split into individual meal objects (balanced brace matching) ──────────────
def extract_objects(s):
    objects = []
    i = 0
    s = s.strip()
    while i < len(s):
        if s[i] == '{':
            depth = 1
            j = i + 1
            in_str = False
            str_char = None
            while j < len(s) and depth > 0:
                c = s[j]
                if in_str:
                    if c == '\\':
                        j += 1
                    elif c == str_char:
                        in_str = False
                else:
                    if c in ('"', "'"):
                        in_str = True
                        str_char = c
                    elif c == '{':
                        depth += 1
                    elif c == '}':
                        depth -= 1
                j += 1
            objects.append(s[i:j])
            i = j
        else:
            i += 1
    return objects

meal_strs = extract_objects(raw)
print(f"Found {len(meal_strs)} meal objects", file=sys.stderr)

# ── Simple key-value extractor for TypeScript object literals ─────────────────
def extract_field(s, key):
    """Extract a scalar value for a given key from a TS object string."""
    # Match:  key: 'value'  or  key: "value"  or  key: number  or  key: true/false/null
    # Key must be preceded by start-of-string, newline, comma, or { (not inside a value)
    pattern = rf"(?:^|[{{\n,])\s*{re.escape(key)}\s*:\s*"
    m = re.search(pattern, s)
    if not m:
        return None
    rest = s[m.end():]
    # String value
    if rest.startswith("'"):
        end = 1
        while end < len(rest):
            if rest[end] == '\\':
                end += 2
                continue
            if rest[end] == "'":
                break
            end += 1
        return rest[1:end]
    if rest.startswith('"'):
        end = 1
        while end < len(rest):
            if rest[end] == '\\':
                end += 2
                continue
            if rest[end] == '"':
                break
            end += 1
        return rest[1:end]
    # Number / bool / null
    m2 = re.match(r'(-?\d+(?:\.\d+)?|true|false|null)', rest)
    if m2:
        v = m2.group(1)
        if v == 'true': return True
        if v == 'false': return False
        if v == 'null': return None
        return float(v) if '.' in v else int(v)
    return None

def extract_array_of_strings(s, key):
    """Extract an array of string literals for a given key."""
    pattern = rf"(?:^|\n)\s*{re.escape(key)}\s*:\s*\["
    m = re.search(pattern, s)
    if not m:
        return []
    # Find the closing ]
    start = m.end() - 1  # points to [
    depth = 1
    i = start + 1
    in_str = False
    str_char = None
    while i < len(s) and depth > 0:
        c = s[i]
        if in_str:
            if c == '\\': i += 1
            elif c == str_char: in_str = False
        else:
            if c in ('"', "'"): in_str = True; str_char = c
            elif c == '[': depth += 1
            elif c == ']': depth -= 1
        i += 1
    arr_str = s[start:i]
    return re.findall(r"['\"]([^'\"]*)['\"]", arr_str)

def extract_ingredients(meal_str):
    """Extract ingredients array from meal object string."""
    m = re.search(r'ingredients\s*:\s*\[', meal_str)
    if not m:
        return []
    start = m.end() - 1
    depth = 1
    i = start + 1
    in_str = False
    str_char = None
    while i < len(meal_str) and depth > 0:
        c = meal_str[i]
        if in_str:
            if c == '\\': i += 1
            elif c == str_char: in_str = False
        else:
            if c in ('"', "'"): in_str = True; str_char = c
            elif c == '[': depth += 1
            elif c == ']': depth -= 1
        i += 1
    ing_block = meal_str[start:i]
    # Extract each ingredient object
    return extract_objects(ing_block)

def extract_steps(meal_str):
    """Extract method_steps array of strings."""
    return extract_array_of_strings(meal_str, 'method_steps')

# ── SQL helpers ───────────────────────────────────────────────────────────────
def sq(v):
    if v is None: return 'NULL'
    return "'" + str(v).replace("'", "''") + "'"

def sa(arr):
    if not arr: return "'{}'"
    items = ','.join('"' + str(x).replace('"', '\\"') + '"' for x in arr)
    return "'{" + items + "}'"

def sn(v):
    if v is None: return 'NULL'
    return str(v)

def sb(v):
    if v is None: return 'FALSE'
    return 'TRUE' if v else 'FALSE'

def det_uuid(seed):
    """Deterministic UUID from seed string."""
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f'meal-plan-curated-{seed}'))

# ── Build SQL ─────────────────────────────────────────────────────────────────
recipe_rows = []
ingredient_rows = []
step_rows = []

for meal_str in meal_strs:
    meal_id_raw = extract_field(meal_str, 'id')
    if not meal_id_raw:
        continue
    recipe_uuid = det_uuid(meal_id_raw)

    r = {
        'id': recipe_uuid,
        'name': extract_field(meal_str, 'name'),
        'image_url': extract_field(meal_str, 'image_url'),
        'description': extract_field(meal_str, 'description'),
        'cuisine': extract_field(meal_str, 'cuisine'),
        'meal_type': extract_field(meal_str, 'meal_type'),
        'cooking_time_band': extract_field(meal_str, 'cooking_time_band'),
        'prep_time': extract_field(meal_str, 'prep_time'),
        'cook_time': extract_field(meal_str, 'cook_time'),
        'recipe_serving_size': extract_field(meal_str, 'recipe_serving_size'),
        'dish_category': extract_field(meal_str, 'dish_category'),
        'protein_source': extract_field(meal_str, 'protein_source'),
        'is_vegan': extract_field(meal_str, 'is_vegan'),
        'is_vegetarian': extract_field(meal_str, 'is_vegetarian'),
        'is_gluten_free': extract_field(meal_str, 'is_gluten_free'),
        'is_dairy_free': extract_field(meal_str, 'is_dairy_free'),
        'taste_sweetness': extract_field(meal_str, 'taste_sweetness'),
        'taste_saltiness': extract_field(meal_str, 'taste_saltiness'),
        'taste_sourness': extract_field(meal_str, 'taste_sourness'),
        'taste_bitterness': extract_field(meal_str, 'taste_bitterness'),
        'taste_savoriness': extract_field(meal_str, 'taste_savoriness'),
        'taste_fattiness': extract_field(meal_str, 'taste_fattiness'),
        'taste_spiciness': extract_field(meal_str, 'taste_spiciness'),
        'calories_per_serving': extract_field(meal_str, 'calories_per_serving'),
        'protein_per_serving_g': extract_field(meal_str, 'protein_per_serving_g'),
        'carbs_per_serving_g': extract_field(meal_str, 'carbs_per_serving_g'),
        'health_score': extract_field(meal_str, 'health_score'),
        'cuisines': extract_array_of_strings(meal_str, 'cuisines'),
        'dietary_tags': extract_array_of_strings(meal_str, 'dietary_tags'),
        'allergens': extract_array_of_strings(meal_str, 'allergens'),
        'diet_labels': extract_array_of_strings(meal_str, 'diet_labels'),
        'occasions': extract_array_of_strings(meal_str, 'occasions'),
    }

    recipe_rows.append(f"""(
    {sq(r['id'])}, NULL, {sq(r['name'])}, 'curated', FALSE,
    {sn(r['recipe_serving_size'])}, {sa(r['dietary_tags'])}, '{{}}', 0, TRUE, TRUE,
    {sq(r['image_url'])}, {sq(r['description'])}, {sq(r['cuisine'])}, {sa(r['cuisines'])},
    {sq(r['meal_type'])}, {sq(r['cooking_time_band'])}, {sn(r['prep_time'])}, {sn(r['cook_time'])},
    {sq(r['dish_category'])}, {sq(r['protein_source'])}, {sa(r['occasions'])},
    {sb(r['is_vegan'])}, {sb(r['is_vegetarian'])}, {sb(r['is_gluten_free'])}, {sb(r['is_dairy_free'])},
    {sa(r['allergens'])}, {sa(r['diet_labels'])},
    {sn(r['taste_sweetness'])}, {sn(r['taste_saltiness'])}, {sn(r['taste_sourness'])},
    {sn(r['taste_bitterness'])}, {sn(r['taste_savoriness'])}, {sn(r['taste_fattiness'])}, {sn(r['taste_spiciness'])},
    {sn(r['calories_per_serving'])}, {sn(r['protein_per_serving_g'])}, {sn(r['carbs_per_serving_g'])},
    {sn(r['health_score'])}, NOW(), NOW()
  )""")

    # Ingredients
    for idx, ing_str in enumerate(extract_ingredients(meal_str)):
        iname = extract_field(ing_str, 'name')
        iqty = extract_field(ing_str, 'quantity')
        iunit = extract_field(ing_str, 'unit')
        icat = extract_field(ing_str, 'category')
        if iname:
            ingredient_rows.append(f"(gen_random_uuid(), {sq(recipe_uuid)}, NULL, {sq(iname)}, {sn(iqty) if iqty is not None else '0'}, {sq(iunit)}, {sq(icat)}, {idx})")

    # Steps
    for idx, step in enumerate(extract_steps(meal_str)):
        step_rows.append(f"(gen_random_uuid(), {sq(recipe_uuid)}, NULL, {sq(step)}, {idx})")

print(f"Recipes: {len(recipe_rows)}, Ingredients: {len(ingredient_rows)}, Steps: {len(step_rows)}", file=sys.stderr)

sql = f"""-- Seed: {len(recipe_rows)} curated Discover recipes
-- Generated by scripts/gen_seed_sql.py
-- Safe to re-run (ON CONFLICT DO NOTHING)

INSERT INTO recipes (
  id, family_id, name, source, is_customized, recipe_serving_size,
  dietary_tags, custom_tags, add_to_plan_count, is_ingredient_complete,
  is_recipe_complete, image_url, description, cuisine, cuisines,
  meal_type, cooking_time_band, prep_time, cook_time, dish_category,
  protein_source, occasions, is_vegan, is_vegetarian, is_gluten_free,
  is_dairy_free, allergens, diet_labels,
  taste_sweetness, taste_saltiness, taste_sourness, taste_bitterness,
  taste_savoriness, taste_fattiness, taste_spiciness,
  calories_per_serving, protein_per_serving_g, carbs_per_serving_g,
  health_score, created_at, updated_at
) VALUES
{','.join(recipe_rows)}
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_ingredients (
  id, recipe_id, family_id, name, quantity, unit, category, position
) VALUES
{','.join(ingredient_rows)}
ON CONFLICT (id) DO NOTHING;

INSERT INTO recipe_method_steps (
  id, recipe_id, family_id, step_text, position
) VALUES
{','.join(step_rows)}
ON CONFLICT (id) DO NOTHING;
"""

with open('scripts/seed-output.sql', 'w') as f:
    f.write(sql)

print(f"SQL written to scripts/seed-output.sql", file=sys.stderr)
print(sql[:500], file=sys.stderr)
