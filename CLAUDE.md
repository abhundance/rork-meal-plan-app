# Meal Plan — Project Brief
*Context document for AI tools and developers continuing work on this project.*

---

## App Overview

**Name:** Meal Plan
**Purpose:** A family meal planning app for busy parents (2–6 person households). Solves the daily problem of deciding what to cook, building shopping lists, and organising family recipes in one place.
**Target user:** Parents managing household meals who want a fast, warm, and low-friction experience.

---

## Platform & Build Tool

- **Framework:** React Native + Expo Router + TypeScript
- **Build tool:** [Rork](https://rork.com) — an AI-powered app builder. All code changes are made by prompting Rork in natural language.
- **Storage:** AsyncStorage (local only — no backend yet)
- **State management:** React Context + TanStack Query

> ⚠️ When building any UI, always reuse existing design system components and patterns. Never create one-off custom components for individual screens. See Design System section below.

---

## GitHub Repository

**Repo:** https://github.com/abhundance/rork-meal-plan-app

> **Rule:** Always read source files by cloning/pulling from GitHub (`git clone` or `git pull` in the working directory) — never navigate the Rork browser file tree to read code. GitHub is always faster and more reliable.

---

## Git Restore Points

Safe checkpoints tagged on GitHub. To restore: `git checkout pre-recipe-type-unification` (or create a new branch from the tag).

| Tag | Commit | Date | What's working | Why it was tagged |
|-----|--------|------|----------------|-------------------|
| `pre-recipe-type-unification` | c090906 | 2026-03-06 | Favs grid layout ✅, add-meal tile ✅, chip row removed ✅ | Before Option B: merging `Meal` + `DiscoverMeal` into unified `Recipe` type |

---

## Four Main Tabs

| Tab | Purpose |
|-----|---------|
| **Plan** | Weekly calendar grid. Assign meals to Breakfast / Lunch / Dinner / Snack slots across 7 days. Supports serving-size scaling per slot. |
| **Shopping** | Auto-generated shopping list aggregated from all planned meals. Items grouped by ingredient category with check-off functionality. |
| **Favs** | Single unified grid of all saved meals (family-created + hearted from Discover). Searchable. Inline filter pills: Sort, Meal Type, Dish Type, Protein, Diet. Filter sheet: 9 sections (Meal Type, Dish Type, Cuisine, Protein, Cook Time, Dietary, Calories, Source, Rating). Recipe cards have a ghost `CalendarPlus` icon to add directly to plan. |
| **Discover** | Browse 38+ curated recipes. Filter sheet: 10 sections (Meal Type, Dish Type, Cuisine, Protein, Cook Time, Dietary, Intolerances, Occasion, Spice Level, Calories). Includes chef profiles and curated collections. |

---

## Key Features

### Add a Recipe Flow
Single entry point: `app/add-recipe-entry.tsx`. The screen has **two modes toggled entirely via local state — no sub-navigation**:

- **✨ AI Mode** (default) — chat-style input. User types a meal name and description; AI extracts and auto-fills all recipe metadata (cuisine, cook time, dietary tags, etc.) via `services/recipeExtraction.ts`. Voice input via `VoiceRecordSheet`. Recipe Details accordion auto-fills with AI the moment it is opened (no button tap required); shows "Auto-filled with AI" status + quiet "Re-fill" link once done.
- **✏️ Manual Mode** — full form entry. User fills in all fields themselves (name, image, ingredients, method steps, cook time, dietary tags, etc.).

Both modes write to `app/add-recipe-review.tsx` when the user is ready to save.

> **Rule:** All navigation to the Add a Recipe flow must go to `/add-recipe-entry`. The only exception is editing an existing meal, which navigates directly to `/add-recipe-review?editId={id}` to bypass the entry screen.

> **Note:** The old 6-button entry chooser (Paste Text, Manual Entry, Photos, Video Link, Voice, Camera) no longer exists. The files `add-recipe-paste.tsx`, `add-recipe-manual.tsx`, and `add-recipe-video.tsx` may still be present in the repo but are no longer part of the active flow.

### Recipe Extraction
AI-powered extraction from YouTube URLs, TikTok URLs, pasted text, and images. Handled by `services/recipeExtraction.ts` using `gpt-4o-mini`. Extracts name, ingredients, method, cuisine, and cook time.

### Meal Image Handling
Auto-suggests food images from Unsplash after meal name entry. Users can also pick from camera or photo library. Base64 images passed between screens via `services/imageStore.ts` (never via route params). Handled by `services/imageSearch.ts`.

### Favs Tab — Unified Grid
Family-created meals (`source === 'family_created'`) are stored permanently and can only be deleted via explicit long-press confirmation — never accidentally removed by tapping a heart. Discovered/saved meals can be removed via the heart button. Both types appear in **one unified grid** — there is no SegmentedControl separating them. Each card shows a ghost `CalendarPlus` icon (bare, no border, `Colors.primary`, size 15) in the white strip next to the title — this triggers the slot picker to add the meal to the plan. This button is distinct from the floating `+` FAB which opens the Add a Recipe flow.

### Onboarding & Auth
Onboarding flow exists at `app/onboarding/`. The home screen redirects to `/onboarding/auth` when `onboardingData.completed === false`.

---

## Active Development Flags

> ⚠️ These must be reverted before production release.

| Flag | File | Current Value | Action needed |
|------|------|---------------|---------------|
| `DEV_SKIP_ONBOARDING` | `providers/OnboardingProvider.tsx` | `true` | Set to `false` to re-enable auth and onboarding |

---

## Environment Variables

All stored in Rork's Environment Variables panel (not in `.env` files):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_UNSPLASH_ACCESS_KEY` | Unsplash image search for meal photos |
| `EXPO_PUBLIC_OPENAI_API_KEY` | Recipe extraction (GPT-4o-mini) |
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | YouTube video metadata for recipe extraction |

> ⚠️ OpenAI API key is currently client-side. Must be moved to Supabase Edge Functions before public launch.

---

## Design System

All design tokens live in two files. **Never hardcode hex values or magic numbers.**

### `constants/colors.ts`
```
Colors.primary         #7B68CC   — purple accent, buttons, active states
Colors.primaryLight    #F0EEF9   — selected chip backgrounds, highlights
Colors.text            #2C2C2C   — primary text
Colors.textSecondary   #8B7EA8   — secondary text, placeholders
Colors.border          #F0EEF9   — borders, dividers
Colors.card            #FFFFFF   — card backgrounds
Colors.background      #FAFAF8   — page background
Colors.surface         #F0EEF9   — input backgrounds, chip surfaces
Colors.white           #FFFFFF
Colors.success         #8BAF7A   — success states
Colors.warning         #D4A853   — warning states
Colors.inactive        rgba(44,44,44,0.4) — inactive tab icons, disabled elements
Colors.divider         #F0EEF9   — list dividers
Colors.slotColors      array[7]  — per-slot colour schemes (background, text, dot) for meal slot differentiation
```

### `constants/theme.ts`
```
Spacing.xs(4) / sm(8) / md(12) / lg(16) / xl(20) / xxl(24) / xxxl(32)
BorderRadius.button(12) / input(12) / card(16) / pill(20) / full(999)
Shadows.card / header / tabBar
```

### Existing Components (reuse, never recreate)
- `AppHeader` — top navigation bar with title and optional right element
- `FilterPill` — horizontal chip for filter rows
- `RecipeFilterSheet` — shared bottom sheet filter component used by both Favs and Discover tabs. Configured via `RecipeFilterConfig` prop (13 possible sections). Exports `RecipeFilterState`, `DEFAULT_FILTER_STATE`, `countActiveFilters`. See `components/RecipeFilterSheet.tsx`.
- `SlotPickerModal` — meal slot selection modal
- `MealPickerSheet` — slide-up RN Modal for adding meals to a slot. Three internal modes: `choose` (search existing meals + option tiles), `manual` (Add Without Recipe — name-only quick add), `delivery` (Add from Delivery App — name + URL). Used in `home/index.tsx` and `recipe-detail.tsx`. "Add with Recipe" from this sheet navigates to `/add-recipe-entry` (Expo Router modal).
- `MealSlotEditor` — add/remove/rename meal slots in settings
- `WeeklyPlanView` — 7-day grid with meal pills, week navigation, Smart Fill
- `DailyPlanView` — day-level meal slots with serving stepper and meal rows
- `RepeatWeekSheet` / `RepeatDaySheet` — copy meals from a previous week/day
- `SegmentedControl` — two-option toggle (e.g. Week / Day view)
- `EmptyState` — standardised empty screen with icon, title, and CTA
- `SkeletonLoader` — loading placeholder
- `ServingStepper` — +/– control for adjusting serving sizes
- `InputField` — styled text input with label
- `PrimaryButton` — full-width primary CTA button
- `Card` — generic card container with shadow
- `DietaryPillGrid` — grid of dietary tag chips
- `ProgressBar` — onboarding/step progress indicator
- `OfflineBanner` — network status banner
- `VoiceRecordSheet` — mic recording sheet for voice recipe input

---

## Rork Prompt Submission Rules

> ⚠️ **Critical:** Rork's chat input treats the Enter/Return key as "send message". Never use the `type` tool to enter multi-line prompts — every newline will submit a separate prompt and flood the queue.

The correct way to submit a prompt to Rork via browser automation:
1. Use `form_input` to set the textarea value (pastes the full text without triggering Enter)
2. Then click the Send button once

Always submit prompts as a **single message** — no newlines in the submitted text if using the `type` tool.

---

## Screen Map

A visual reference of every screen, its exact file path, and all navigation connections is maintained at **`screen-map.html`** in the repository root. Open it in any browser — it is pannable, zoomable, and click-to-inspect.

> **Rule — keep the screen map current at all times.**
> After any change that does one of the following, update `screen-map.html` before committing:
> - Adds a new screen or sheet/modal component
> - Removes or renames an existing screen file
> - Adds, removes, or changes a `router.push` / `router.replace` navigation call
>
> **What to edit:** Only the `SCREENS` array and the `CONNECTIONS` array inside the `<script>` block at the bottom of `screen-map.html`. The HTML, CSS, and rendering logic must never be changed.
>
> **`SCREENS` entry shape:**
> ```js
> { id:'unique-id', label:'Display Name', file:'app/path/to/file.tsx',
>   group:'tabs|add-recipe|discover|onboarding|shared|settings|sheets',
>   type:'Tab|Screen|Sheet|Modal', x: 000, y: 000,
>   desc:'One sentence describing this screen and its purpose.' }
> ```
> **`CONNECTIONS` entry shape:** `['fromId', 'toId', 'short edge label']`
>
> **Groups and their left-border colours:**
> | group | colour | use for |
> |---|---|---|
> | `tabs` | #7B68CC purple | The four main tab screens |
> | `add-recipe` | #d97706 orange | add-recipe-entry, review, manual, paste, video |
> | `discover` | #059669 green | discover sub-screens |
> | `onboarding` | #db2777 pink | onboarding flow screens |
> | `shared` | #2563eb blue | screens reached from multiple tabs (recipe-detail) |
> | `settings` | #6b7280 grey | family-settings |
> | `sheets` | #0891b2 teal dashed | any component-level sheet or modal |

---

## Architectural Rules

These patterns were established through development and must be followed:

1. **Lazy API key pattern** — Never assign `process.env.EXPO_PUBLIC_*` to a module-level `const`. Always wrap in a function called at use time. Rork's bundler caches module-level values and breaks env var reads.
   ```ts
   // ✅ Correct
   function getApiKey() { return process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? ''; }

   // ❌ Wrong
   const API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
   ```

2. **Image passing between screens** — Never pass base64 image data through route params. Use `services/imageStore.ts` as an in-memory store.

3. **Edit navigation** — Editing an existing meal always navigates to `{ pathname: '/add-recipe-review', params: { editId: meal.id } }` — never to `/add-recipe-entry`.

4. **Horizontal ScrollView height** — Always set an explicit `height` on horizontal `ScrollView` containers (e.g., `height: 46`). Without it, they collapse to zero height on iOS native. Use `paddingVertical` in `contentContainerStyle` (not `alignItems: 'center'`) to centre chips within the container.

5. **Single-scroll-container for filter-pill + grid screens** — Any screen that has a filter pill row above a scrollable content grid **must** put both inside the same scroll container. Never split them across a fixed-above-ScrollView architecture.

   **Why:** iOS's `UIScrollView` preserves its `contentOffset` when the user scrolls down and then switches tabs. On return, the grid's scroll container is at its old position — creating a phantom blank gap at the top equal to how far the user had scrolled. This gap is invisible to the layout inspector (it shows as the screen's background colour with no element owning it).

   **The fix:** Use a `FlatList` that owns the entire scroll area. Put the search bar and filter pill row inside `ListHeaderComponent`. The grid items are the FlatList data.

   ```tsx
   // ✅ Correct — single FlatList owns everything
   <FlatList
     ref={flatListRef}
     data={gridData}
     numColumns={COLS}
     ListHeaderComponent={
       <View>
         {/* search bar */}
         {/* filter pill horizontal ScrollView */}
         <View style={{ height: 12 }} />
       </View>
     }
     ListEmptyComponent={emptyState}
     contentContainerStyle={{ paddingBottom: 100 }}
   />

   // ❌ Wrong — fixed siblings above a separate grid ScrollView
   <View style={styles.searchWrap} />
   <ScrollView horizontal style={{ height: 46 }}>{/* filter pills */}</ScrollView>
   <ScrollView style={{ flex: 1 }}>{/* grid */}</ScrollView>
   ```

   Also add a `useFocusEffect` that calls `flatListRef.current?.scrollToOffset({ offset: 0, animated: false })` whenever the tab is focused as a belt-and-suspenders safety net.

   > **Screens using this pattern:** `app/(tabs)/favs/index.tsx`
   > **Reference implementation:** Commit `6ac4db6` — `fix(favs): merge all content into single FlatList`

---

## Pre-Production Checklist

Items intentionally deferred — must be completed before public launch:

- [ ] Set `DEV_SKIP_ONBOARDING = false` and implement full authentication flow
- [ ] Move OpenAI API calls from client-side to Supabase Edge Functions
- [ ] Implement per-user credit/quota system for AI feature usage
- [ ] Unsplash API: apply for production access (current: demo tier, 50 req/hour)

---

## Data Model (Key Fields)

```ts
// Recipe — unified type used across Favs, Plan tab, and Add a Recipe flow
// (also DiscoverMeal for the Discover tab — nearly identical shape)
{
  id: string
  name: string
  source: 'family_created' | 'discover' | string  // CRITICAL: determines card delete behaviour
  image_url?: string

  // Classification (used by filter sheet)
  meal_type?: 'breakfast' | 'lunch_dinner' | 'light_bites'
  dish_category?: 'main' | 'salad' | 'soup' | 'appetizer' | 'side' | 'dessert' | 'drink' | 'bread' | 'sandwich' | 'sauce' | 'other'
  cuisine?: string               // single primary cuisine (e.g. 'Italian')
  cuisines?: string[]            // multi-cuisine array (Spoonacular-compatible)
  protein_source?: 'chicken' | 'beef' | 'pork' | 'lamb' | 'turkey' | 'seafood' | 'egg' | 'dairy' | 'plant' | 'none'
  cooking_time_band?: 'Under 30' | '30-60' | 'Over 60'
  prep_time?: number             // minutes
  cook_time?: number             // minutes

  // Dietary (multiple overlapping arrays — check all three in filter logic)
  dietary_tags?: string[]        // e.g. ['Vegan', 'Gluten-Free']
  diet_labels?: string[]         // Spoonacular positive labels e.g. ['keto', 'paleo']
  allergens?: string[]           // free-from list e.g. ['gluten-free', 'nut-free']
  occasions?: string[]           // e.g. ['weeknight', 'meal-prep']

  // Nutrition (used by Calories filter)
  calories_per_serving?: number
  protein_per_serving_g?: number
  carbs_per_serving_g?: number

  // Taste profile (used by Spice Level filter: 0–100; mild ≤15, medium 16–35, hot ≥36)
  taste_spiciness?: number

  // Family interaction (used by Rating filter)
  rating?: 'loved' | 'liked' | undefined
  add_to_plan_count: number      // used by 'Most Used' sort
  last_planned_date?: string
  created_at: string

  // Recipe content
  ingredients: { name: string; quantity: number; unit: string }[]
  method_steps?: string[]
  recipe_serving_size?: number
}
```

### RecipeFilterState (from `components/RecipeFilterSheet.tsx`)
All 13 filter fields. Both tabs share this type; each tab enables a subset via `RecipeFilterConfig`.
```ts
{
  sort:         string    // 'recently_added' | 'most_used' | 'recently_planned' | 'cooking_time' | 'a_to_z'
  mealType:     string    // '' | 'breakfast' | 'lunch_dinner' | 'light_bites'
  dishTypes:    string[]  // multi-select DishCategory values
  cuisines:     string[]  // multi-select cuisine keys
  protein:      string[]  // multi-select ProteinSource keys
  cookTime:     string    // '' | 'Under 30' | '30-60' | 'Over 60'
  dietary:      string[]  // multi-select: vegan | vegetarian | gluten_free | dairy_free | high_protein | low_carb | keto | paleo | whole30 | nut_free
  intolerances: string[]  // multi-select allergen-free keys (Discover only)
  occasions:    string[]  // multi-select (Discover only)
  spiceLevel:   string    // '' | 'mild' | 'medium' | 'hot' (Discover only)
  calories:     string    // '' | 'under_400' | '400_600' | 'over_600'
  source:       string    // '' | 'family_created' | 'discover' (Favs only)
  rating:       string    // '' | 'loved' | 'liked' | 'unrated' (Favs only)
}
```
