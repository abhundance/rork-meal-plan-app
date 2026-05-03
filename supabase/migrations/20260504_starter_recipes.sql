-- Starter Recipes — 20 universally-recognised recipes seeded for new users
-- Safe to re-run (ON CONFLICT DO NOTHING)
-- Identified by: source = 'curated', custom_tags @> ARRAY['starter']
-- App fetches these on first launch and copies them to the user's personal collection.

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
-- ── BREAKFAST ────────────────────────────────────────────────────────────────
(
  'f0000001-0000-4000-8000-000000000001', NULL, 'Avocado Toast', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Creamy mashed avocado on crispy sourdough — a simple, satisfying start.', 'American', '{"american"}',
  'breakfast', 'Under 30', 5, 5,
  'other', 'plant', '{"weekday","brunch"}',
  TRUE, TRUE, FALSE, TRUE,
  '{"dairy-free"}', '{"vegan","vegetarian","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000002', NULL, 'Overnight Oats', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Prep the night before and wake up to a ready-made, nutritious breakfast.', 'American', '{"american"}',
  'breakfast', 'Under 30', 5, 0,
  'other', 'dairy', '{"weekday","meal-prep"}',
  FALSE, TRUE, FALSE, FALSE,
  '{}', '{"vegetarian"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000003', NULL, 'Scrambled Eggs on Toast', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Soft, buttery scrambled eggs on golden toast — a classic that never fails.', 'British', '{"british"}',
  'breakfast', 'Under 30', 2, 5,
  'other', 'egg', '{"weekday","weekend"}',
  FALSE, TRUE, FALSE, FALSE,
  '{}', '{"vegetarian","high-protein"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000004', NULL, 'Greek Yogurt Parfait', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Creamy yogurt layered with granola and fresh berries — no cooking required.', 'Greek', '{"greek","mediterranean"}',
  'breakfast', 'Under 30', 5, 0,
  'other', 'dairy', '{"weekday","brunch"}',
  FALSE, TRUE, TRUE, FALSE,
  '{"gluten-free"}', '{"vegetarian","gluten-free","high-protein"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000005', NULL, 'Banana Pancakes', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Fluffy golden pancakes made with ripe bananas — a weekend favourite.', 'American', '{"american"}',
  'breakfast', 'Under 30', 5, 15,
  'other', 'egg', '{"weekend","brunch"}',
  FALSE, TRUE, FALSE, FALSE,
  '{}', '{"vegetarian"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),
-- ── LUNCH / DINNER ───────────────────────────────────────────────────────────
(
  'f0000001-0000-4000-8000-000000000006', NULL, 'Spaghetti Bolognese', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'The ultimate family comfort food — rich meat sauce over al dente spaghetti.', 'Italian', '{"italian"}',
  'lunch_dinner', '30-60', 10, 30,
  'main', 'beef', '{"weeknight","family"}',
  FALSE, FALSE, FALSE, FALSE,
  '{}', '{"high-protein"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000007', NULL, 'Chicken Stir Fry', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Quick, colourful, and packed with protein — a weeknight go-to.', 'Chinese', '{"chinese","asian"}',
  'lunch_dinner', 'Under 30', 10, 15,
  'main', 'chicken', '{"weeknight","healthy"}',
  FALSE, FALSE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"high-protein","gluten-free","dairy-free","low-carb"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000008', NULL, 'Grilled Salmon', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Perfectly seared salmon with garlic and lemon — elegant and effortless.', 'Mediterranean', '{"mediterranean"}',
  'lunch_dinner', 'Under 30', 5, 10,
  'main', 'seafood', '{"weeknight","healthy","date-night"}',
  FALSE, FALSE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"high-protein","omega-3","gluten-free","dairy-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000009', NULL, 'Caesar Salad with Chicken', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Crisp romaine, grilled chicken, and parmesan in a classic creamy dressing.', 'American', '{"american"}',
  'lunch_dinner', 'Under 30', 10, 15,
  'salad', 'chicken', '{"weeknight","healthy","lunch"}',
  FALSE, FALSE, FALSE, FALSE,
  '{}', '{"high-protein","low-carb"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000010', NULL, 'Vegetable Fried Rice', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'A brilliant way to use leftover rice — ready in under 20 minutes.', 'Chinese', '{"chinese","asian"}',
  'lunch_dinner', 'Under 30', 5, 15,
  'main', 'egg', '{"weeknight","meal-prep","vegetarian"}',
  FALSE, TRUE, FALSE, TRUE,
  '{"dairy-free"}', '{"vegetarian","dairy-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),
-- ── SNACKS / LIGHT BITES ─────────────────────────────────────────────────────
(
  'f0000001-0000-4000-8000-000000000011', NULL, 'Hummus & Veggie Sticks', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Creamy hummus with crunchy fresh vegetables — a healthy, no-cook snack.', 'Middle Eastern', '{"middle-eastern"}',
  'light_bites', 'Under 30', 5, 0,
  'appetizer', 'plant', '{"snack","healthy","party"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000012', NULL, 'Caprese Salad', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Ripe tomatoes, fresh mozzarella, and basil with a drizzle of balsamic.', 'Italian', '{"italian","mediterranean"}',
  'light_bites', 'Under 30', 10, 0,
  'salad', 'dairy', '{"snack","starter","summer"}',
  FALSE, TRUE, TRUE, FALSE,
  '{"gluten-free"}', '{"vegetarian","gluten-free","low-carb"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000013', NULL, 'Peanut Butter Toast', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Quick, filling, and delicious — peanut butter and banana on toast.', 'American', '{"american"}',
  'light_bites', 'Under 30', 2, 3,
  'other', 'plant', '{"snack","weekday"}',
  TRUE, TRUE, FALSE, TRUE,
  '{"dairy-free"}', '{"vegan","vegetarian","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000014', NULL, 'Guacamole & Tortilla Chips', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Fresh, chunky guacamole served with crispy tortilla chips.', 'Mexican', '{"mexican"}',
  'light_bites', 'Under 30', 10, 0,
  'appetizer', 'plant', '{"snack","party","entertaining"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000015', NULL, 'Trail Mix', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'A satisfying mix of nuts, seeds, dried fruit, and dark chocolate.', NULL, '{}',
  'light_bites', 'Under 30', 2, 0,
  'other', 'plant', '{"snack","on-the-go"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),
-- ── DRINKS ───────────────────────────────────────────────────────────────────
(
  'f0000001-0000-4000-8000-000000000016', NULL, 'Mango Smoothie', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Thick and tropical — ripe mango blended with creamy yogurt and milk.', NULL, '{}',
  'light_bites', 'Under 30', 5, 0,
  'drink', 'dairy', '{"breakfast","snack","summer"}',
  FALSE, TRUE, TRUE, FALSE,
  '{"gluten-free"}', '{"vegetarian","gluten-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000017', NULL, 'Chai Latte', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Warm, spiced milk tea with cardamom, cinnamon, and ginger.', 'Indian', '{"indian"}',
  'light_bites', 'Under 30', 2, 8,
  'drink', 'dairy', '{"morning","cosy","snack"}',
  FALSE, TRUE, TRUE, FALSE,
  '{"gluten-free"}', '{"vegetarian","gluten-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000018', NULL, 'Fresh Orange Juice', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Simply squeezed fresh oranges — the best morning pick-me-up.', NULL, '{}',
  'light_bites', 'Under 30', 5, 0,
  'drink', 'none', '{"breakfast","morning"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000019', NULL, 'Green Detox Smoothie', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'Spinach, banana, and apple blended with lemon and ginger — refreshing and energising.', NULL, '{}',
  'light_bites', 'Under 30', 5, 0,
  'drink', 'plant', '{"breakfast","healthy","morning"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free","plant-based"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
),(
  'f0000001-0000-4000-8000-000000000020', NULL, 'Lemon Ginger Honey Tea', 'curated', FALSE,
  2, '{}', '{"starter"}', 0, TRUE, TRUE,
  NULL, 'A soothing hot drink with fresh lemon, ginger, and honey.', NULL, '{}',
  'light_bites', 'Under 30', 2, 5,
  'drink', 'none', '{"morning","cosy","healthy"}',
  TRUE, TRUE, TRUE, TRUE,
  '{"gluten-free","dairy-free"}', '{"vegan","vegetarian","gluten-free","dairy-free"}',
  NULL, NULL, NULL, NULL, NULL, NULL, NULL,
  NULL, NULL, NULL, NULL, NOW(), NOW()
)
ON CONFLICT (id) DO NOTHING;

-- ── INGREDIENTS ──────────────────────────────────────────────────────────────
INSERT INTO recipe_ingredients (id, recipe_id, family_id, name, quantity, unit, category, position) VALUES
-- Avocado Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Sourdough bread',2,'slices','Bakery',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Ripe avocado',1,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Lemon juice',1,'tbsp','Condiments',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Cherry tomatoes',6,'pc','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Chilli flakes',1,'pinch','Pantry Staples',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Salt and pepper',1,'pinch','Pantry Staples',5),
-- Overnight Oats
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Rolled oats',100,'g','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Milk',200,'ml','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Banana',1,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Chia seeds',1,'tbsp','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Honey',1,'tbsp','Pantry Staples',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Mixed berries',50,'g','Produce',5),
-- Scrambled Eggs on Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Eggs',3,'pc','Dairy',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Butter',1,'tbsp','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Milk',2,'tbsp','Dairy',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Bread',2,'slices','Bakery',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Fresh chives',1,'tbsp','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Salt and pepper',1,'pinch','Pantry Staples',5),
-- Greek Yogurt Parfait
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Greek yogurt',200,'g','Dairy',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Granola',50,'g','Pantry Staples',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Mixed berries',100,'g','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Banana',1,'pc','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Honey',1,'tbsp','Pantry Staples',4),
-- Banana Pancakes
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Ripe bananas',2,'pc','Produce',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Eggs',2,'pc','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Plain flour',100,'g','Pantry Staples',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Milk',100,'ml','Dairy',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Baking powder',1,'tsp','Pantry Staples',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Butter',1,'tbsp','Dairy',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Maple syrup',2,'tbsp','Pantry Staples',6),
-- Spaghetti Bolognese
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Spaghetti',200,'g','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Beef mince',300,'g','Meat & Fish',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Tomato passata',400,'ml','Pantry Staples',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Onion',1,'pc','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Garlic',3,'cloves','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Olive oil',2,'tbsp','Pantry Staples',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Parmesan',30,'g','Dairy',6),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Mixed Italian herbs',1,'tsp','Pantry Staples',7),
-- Chicken Stir Fry
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Chicken breast',300,'g','Meat & Fish',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Broccoli',150,'g','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Bell pepper',1,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Soy sauce',3,'tbsp','Condiments',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Garlic',2,'cloves','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Fresh ginger',1,'tsp','Produce',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Sesame oil',1,'tbsp','Pantry Staples',6),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Steamed rice',150,'g','Pantry Staples',7),
-- Grilled Salmon
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Salmon fillet',300,'g','Meat & Fish',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Lemon',1,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Olive oil',2,'tbsp','Pantry Staples',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Garlic',2,'cloves','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Fresh parsley or dill',1,'tbsp','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Salt and pepper',1,'pinch','Pantry Staples',5),
-- Caesar Salad with Chicken
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Chicken breast',250,'g','Meat & Fish',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Romaine lettuce',1,'head','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Parmesan',30,'g','Dairy',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Croutons',50,'g','Bakery',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Caesar dressing',3,'tbsp','Condiments',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Lemon juice',1,'tbsp','Condiments',5),
-- Vegetable Fried Rice
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Cooked rice',300,'g','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Eggs',2,'pc','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Mixed frozen vegetables',150,'g','Frozen',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Soy sauce',2,'tbsp','Condiments',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Sesame oil',1,'tbsp','Pantry Staples',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Garlic',2,'cloves','Produce',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Spring onions',2,'pc','Produce',6),
-- Hummus & Veggie Sticks
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Hummus',200,'g','Deli',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Carrots',2,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Cucumber',1,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Bell pepper',1,'pc','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Celery sticks',3,'pc','Produce',4),
-- Caprese Salad
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Fresh mozzarella',150,'g','Dairy',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Tomatoes',3,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Fresh basil',1,'bunch','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Olive oil',2,'tbsp','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Balsamic glaze',1,'tbsp','Condiments',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Salt and pepper',1,'pinch','Pantry Staples',5),
-- Peanut Butter Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Bread',2,'slices','Bakery',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Peanut butter',2,'tbsp','Pantry Staples',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Banana',1,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Honey',1,'tsp','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Cinnamon',1,'pinch','Pantry Staples',4),
-- Guacamole & Tortilla Chips
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Avocados',2,'pc','Produce',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Lime',1,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Red onion',0.25,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Fresh coriander',1,'tbsp','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Jalapeño',0.5,'pc','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Salt',1,'pinch','Pantry Staples',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Tortilla chips',100,'g','Snacks',6),
-- Trail Mix
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Mixed nuts',100,'g','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Dried cranberries',30,'g','Pantry Staples',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Dark chocolate chips',30,'g','Pantry Staples',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Pumpkin seeds',20,'g','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Dried mango',30,'g','Pantry Staples',4),
-- Mango Smoothie
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Mango',1,'pc','Produce',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Greek yogurt',100,'g','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Milk',150,'ml','Dairy',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Honey',1,'tbsp','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Ice cubes',4,'pc','Pantry Staples',4),
-- Chai Latte
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Black tea bags',2,'pc','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Milk',300,'ml','Dairy',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Cardamom pods',3,'pc','Pantry Staples',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Cinnamon stick',1,'pc','Pantry Staples',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Fresh ginger',1,'tsp','Produce',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Sugar',1,'tbsp','Pantry Staples',5),
-- Fresh Orange Juice
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000018',NULL,'Oranges',4,'pc','Produce',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000018',NULL,'Ice cubes',4,'pc','Pantry Staples',1),
-- Green Detox Smoothie
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Baby spinach',50,'g','Produce',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Banana',1,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Apple',1,'pc','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Fresh ginger',1,'tsp','Produce',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Lemon juice',1,'tbsp','Condiments',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Water',200,'ml','Pantry Staples',5),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Ice cubes',4,'pc','Pantry Staples',6),
-- Lemon Ginger Honey Tea
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Water',400,'ml','Pantry Staples',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Lemon',1,'pc','Produce',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Fresh ginger',1,'tsp','Produce',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Honey',2,'tbsp','Pantry Staples',3)
ON CONFLICT DO NOTHING;

-- ── METHOD STEPS ─────────────────────────────────────────────────────────────
INSERT INTO recipe_method_steps (id, recipe_id, family_id, step_text, position) VALUES
-- Avocado Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Toast the sourdough bread until golden and crisp.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Halve the avocado, remove the stone, and scoop the flesh into a bowl.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Mash with lemon juice, salt, and pepper to your preferred texture.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Spread generously over the toast.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000001',NULL,'Top with halved cherry tomatoes and a pinch of chilli flakes.',4),
-- Overnight Oats
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Combine oats, milk, chia seeds, and honey in a jar or bowl.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Stir well, cover, and refrigerate overnight or for at least 4 hours.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'In the morning, stir and add a splash of extra milk if needed.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000002',NULL,'Top with sliced banana and mixed berries. Serve cold.',3),
-- Scrambled Eggs on Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Whisk eggs with milk, salt, and pepper.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Melt butter in a non-stick pan over low heat.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Add eggs and stir gently with a spatula — low and slow is the key.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Remove from heat just before fully set; residual heat finishes the cooking.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000003',NULL,'Serve on buttered toast and garnish with fresh chives.',4),
-- Greek Yogurt Parfait
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Spoon half the yogurt into each glass or bowl.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Add a layer of granola.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Top with mixed berries and sliced banana.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Add remaining yogurt and another sprinkle of granola.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000004',NULL,'Drizzle with honey and serve immediately.',4),
-- Banana Pancakes
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Mash bananas in a bowl until smooth.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Whisk in eggs, flour, milk, and baking powder until a smooth batter forms.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Melt butter in a non-stick pan over medium heat.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Pour small rounds of batter and cook 2 minutes each side until golden.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000005',NULL,'Serve stacked with maple syrup and fresh fruit.',4),
-- Spaghetti Bolognese
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Cook spaghetti in salted boiling water according to packet instructions.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Fry diced onion and garlic in olive oil until soft and golden.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Add beef mince and brown well, breaking up any lumps.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Stir in passata, herbs, salt, and pepper. Simmer for 20 minutes.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000006',NULL,'Drain pasta and toss with the sauce. Serve with grated parmesan.',4),
-- Chicken Stir Fry
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Slice chicken breast into thin strips.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Heat sesame oil in a wok or large pan over high heat.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Stir-fry chicken until golden, about 4 minutes.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Add garlic, ginger, broccoli, and bell pepper. Stir-fry for 3 minutes.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000007',NULL,'Pour in soy sauce and toss to coat. Serve over steamed rice.',4),
-- Grilled Salmon
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Pat salmon fillets dry and season with salt and pepper.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Mix olive oil, minced garlic, lemon zest, and fresh herbs.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Brush marinade over the salmon and rest for 5 minutes.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Grill or pan-fry skin-side down for 4 minutes, then flip for 3 minutes.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000008',NULL,'Serve with lemon wedges and your choice of vegetables.',4),
-- Caesar Salad with Chicken
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Season chicken and grill or pan-fry until cooked through. Rest 5 minutes then slice.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Tear romaine lettuce leaves into a large bowl.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Toss with Caesar dressing and lemon juice until evenly coated.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Top with sliced chicken, croutons, and parmesan shavings.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000009',NULL,'Serve immediately.',4),
-- Vegetable Fried Rice
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Use cold cooked rice for best results — day-old rice works perfectly.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Heat sesame oil in a wok over high heat. Add garlic and stir-fry 30 seconds.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Add frozen vegetables and cook for 2 minutes.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Push everything to one side and scramble the eggs on the other.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Add rice and soy sauce. Toss everything together for 2 minutes.',4),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000010',NULL,'Garnish with sliced spring onions and serve hot.',5),
-- Hummus & Veggie Sticks
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Cut carrots into sticks and slice cucumber into batons.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Deseed and slice bell pepper into strips.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Arrange vegetables around a bowl of hummus.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000011',NULL,'Drizzle hummus with olive oil and a dusting of paprika if desired.',3),
-- Caprese Salad
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Slice tomatoes and mozzarella into rounds of similar thickness.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Arrange alternating slices of tomato and mozzarella on a plate.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Tuck fresh basil leaves between each slice.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Drizzle with olive oil and balsamic glaze.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000012',NULL,'Season with salt and pepper. Serve immediately.',4),
-- Peanut Butter Toast
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Toast bread until golden.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Spread peanut butter generously over each slice.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Slice banana and arrange on top.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000013',NULL,'Drizzle with honey and dust with a pinch of cinnamon.',3),
-- Guacamole & Tortilla Chips
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Halve and pit avocados. Scoop flesh into a bowl.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Mash to your preferred texture — chunky or smooth.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Finely dice red onion, jalapeño, and coriander.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Mix into avocado with lime juice and salt. Taste and adjust.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000014',NULL,'Serve immediately with tortilla chips.',4),
-- Trail Mix
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Combine all ingredients in a bowl and toss together.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Portion into snack servings.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000015',NULL,'Store any leftovers in an airtight container for up to 2 weeks.',2),
-- Mango Smoothie
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Peel and dice the mango.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Add mango, yogurt, milk, and honey to a blender.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Add ice cubes and blend until smooth and creamy.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000016',NULL,'Pour into glasses and serve immediately.',3),
-- Chai Latte
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Lightly crush cardamom pods and break the cinnamon stick.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Bring milk to a gentle simmer with cardamom, cinnamon, and ginger.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Add tea bags and steep for 4 minutes — do not boil.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Remove tea bags and spices. Stir in sugar.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000017',NULL,'Pour through a strainer into mugs and serve hot.',4),
-- Fresh Orange Juice
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000018',NULL,'Cut oranges in half.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000018',NULL,'Juice using a citrus juicer or squeeze by hand.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000018',NULL,'Pour over ice in glasses and serve immediately for best flavour.',2),
-- Green Detox Smoothie
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Core the apple and roughly chop.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Add spinach, banana, apple, ginger, and lemon juice to a blender.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Pour in water and blend until completely smooth.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Add ice cubes and blend again briefly.',3),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000019',NULL,'Pour into glasses and serve immediately.',4),
-- Lemon Ginger Honey Tea
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Slice lemon into rounds and finely slice ginger.',0),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Bring water to a boil, add lemon and ginger. Simmer for 3 minutes.',1),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Remove from heat and stir in honey.',2),
(gen_random_uuid(),'f0000001-0000-4000-8000-000000000020',NULL,'Pour through a strainer into mugs and serve hot.',3)
ON CONFLICT DO NOTHING;
