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
| **Meal Plan** | Weekly calendar grid. Assign meals to Breakfast / Lunch / Dinner / Snack slots across 7 days. Supports serving-size scaling per slot. |
| **Shopping** | Auto-generated shopping list aggregated from all planned meals. Items grouped by ingredient category with check-off functionality. |
| **Favs** | Two segments — **My Recipes** (family-created meals, permanent library) and **Saved** (meals hearted from Discover). Searchable and filterable. |
| **Discover** | Browse 38+ curated recipes. Filter by meal type, cuisine, cook time, and dietary needs. Includes chef profiles and curated collections. |

---

## Key Features

### Add a Recipe Flow
Single entry point: `app/add-recipe-entry.tsx`. The screen has two sections: a **Paste a Link** field at the top (handles recipe blogs, YouTube, TikTok — extracts recipe automatically), and a **Choose a Method** grid below with six options: Paste Text (`add-recipe-paste.tsx`), Manual Entry (`add-recipe-manual.tsx`), Photos, Video Link (`add-recipe-video.tsx`), Voice, and Camera. All paths eventually write to `app/add-recipe-review.tsx`.

> **Rule:** All navigation to the Add a Recipe flow must go to `/add-recipe-entry`. The only exception is editing an existing meal, which navigates directly to `/add-recipe-review?editId={id}` to bypass the entry chooser.

### Recipe Extraction
AI-powered extraction from YouTube URLs, TikTok URLs, pasted text, and images. Handled by `services/recipeExtraction.ts` using `gpt-4o-mini`. Extracts name, ingredients, method, cuisine, and cook time.

### Meal Image Handling
Auto-suggests food images from Unsplash after meal name entry. Users can also pick from camera or photo library. Base64 images passed between screens via `services/imageStore.ts` (never via route params). Handled by `services/imageSearch.ts`.

### My Recipes vs Saved (Favs Tab)
Family-created meals (`source === 'family_created'`) are stored permanently in **My Recipes** and can only be deleted via explicit confirmation — never accidentally removed by tapping a heart. Discovered/saved meals live in the **Saved** segment and can be removed via the heart button.

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
- `SlotPickerModal` — meal slot selection modal
- `MealPickerSheet` — slide-up sheet for adding meals to a slot (search, manual, delivery modes)
- `MealSlotEditor` — add/remove/rename meal slots in settings
- `WeeklyPlanView` — 7-day grid with meal pills, week navigation, Smart Fill
- `DailyPlanView` — day-level meal slots with serving stepper and meal rows
- `RepeatWeekSheet` / `RepeatDaySheet` — copy meals from a previous week/day
- `SegmentedControl` — two-option toggle (e.g. My Recipes / Saved, Week / Day)
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
// FavMeal — core meal object used across Favs, Meal Plan, and Add a Meal
{
  id: string
  name: string
  image_url?: string
  source: 'family_created' | 'discover' | string  // CRITICAL: determines My Recipes vs Saved
  cuisine?: string
  meal_type?: string
  prep_time?: number
  cook_time?: number
  ingredients: { name: string; quantity: number; unit: string }[]
  method_steps?: string[]
  recipe_serving_size?: number
  is_vegan?: boolean
  is_vegetarian?: boolean
  is_gluten_free?: boolean
  is_dairy_free?: boolean
}
```
