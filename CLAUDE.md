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
| *(latest stable)* | 88d4499 | 2026-03-10 | Pinterest Red design system ✅, cardless Favs grid ✅, meal name initials ✅, chip consistency ✅, Plan tab action buttons ✅, Repeat sheet double-tap fix ✅ | Pinterest Red rebrand (#E60023) |

---

## Four Main Tabs

| Tab | Purpose |
|-----|---------|
| **Meal Plan** | Weekly calendar grid. Assign meals to Breakfast / Lunch / Dinner / Snack slots across 7 days. Supports serving-size scaling per slot. |
| **Shopping** | Auto-generated shopping list aggregated from all planned meals. Items grouped by ingredient category with check-off functionality. |
| **Favs** | Single unified grid of all saved meals (family-created + hearted from Discover), searchable and filterable by meal type, dish type, protein, and diet. No SegmentedControl — the segment was removed. |
| **Discover** | Browse 38+ curated recipes. Filter by meal type, cuisine, cook time, and dietary needs. Includes chef profiles and curated collections. |

---

## Key Features

### Add-Meal Navigation Architecture

There are **two distinct add-meal entry points** with different intents. They share child screens but must never be confused:

**1. Plan tab / Recipe detail — slot-aware flow (`/meal-picker`)**
Entry via `router.push('/meal-picker')` after calling `setPendingPlanSlot({slotId, date, slotName, defaultServing})`. The choose screen includes "From My Favourites" and "Try Something New" browse cards (because the user is picking a meal for a specific slot and may want to browse). Sub-screens: `/meal-picker/manual`, `/meal-picker/delivery`. All use `consumePendingPlanSlot()` to read slot context. Back navigation is native Expo Router — `router.back()` returns to the choose screen, and from the choose screen returns to the plan tab.

**2. Favs tab — library-only flow (`/add-to-favs`)**
Entry via `router.push('/add-to-favs')`. No slot context. No "From My Favourites" card (user is already there). No "Try Something New". Options: "Add with Recipe", "Add Without Recipe", "Add from Delivery App". Saves directly to the favourites library. Sub-screens: `/add-to-favs/manual`, `/add-to-favs/delivery`.

> ⚠️ **Never add "From My Favourites" to the `/add-to-favs` flow.** The user is already on the Favs tab — it would be nonsensical.

> ⚠️ **`MealPickerSheet` (RN Modal component) has been deleted.** Do not recreate it. All add-meal flows use Expo Router screens.

---

### Add a Recipe Flow
Single entry point: `app/add-recipe-entry.tsx`. The screen has two sections: a **Paste a Link** field at the top (handles recipe blogs, YouTube, TikTok — extracts recipe automatically), and a **Choose a Method** grid below with six options: Paste Text (`add-recipe-paste.tsx`), Manual Entry (`add-recipe-manual.tsx`), Photos, Video Link (`add-recipe-video.tsx`), Voice, and Camera. All paths eventually write to `app/add-recipe-review.tsx`.

> **Rule:** All navigation to the Add a Recipe flow must go to `/add-recipe-entry`. The only exception is editing an existing meal, which navigates directly to `/add-recipe-review?editId={id}` to bypass the entry chooser.

### Recipe Extraction
AI-powered extraction from YouTube URLs, TikTok URLs, pasted text, and images. Handled by `services/recipeExtraction.ts` using `gpt-4o-mini`. Extracts name, ingredients, method, cuisine, and cook time.

### Meal Image Handling
Auto-suggests food images from Unsplash after meal name entry. Users can also pick from camera or photo library. Base64 images passed between screens via `services/imageStore.ts` (never via route params). Handled by `services/imageSearch.ts`.

### My Recipes vs Saved (Favs Tab)
Family-created meals (`source === 'family_created'`) are stored permanently and can only be deleted via explicit long-press confirmation — never accidentally removed by tapping a heart. Discovered/saved meals can be removed via the heart button. Both types appear together in one unified grid (the SegmentedControl between My Recipes / Saved was removed).

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

> ⚠️ The app uses a **Pinterest Red** brand palette — not purple and not "Supreme Red". Any documentation or AI context referring to purple, lavender, `#7B68CC`, `#7C3AED`, or `#ED1C16` is outdated and must be ignored.

### `constants/colors.ts`
```
// Primary — Pinterest Red
Colors.primary         #E60023   — buttons, active states, CTAs, icons
Colors.primaryVibrant  #F80020   — decorative only: hero fills, card tints, filled hearts
Colors.primaryLight    #FDEBED   — selected chip bg, highlights, icon container bg

// Family placeholder gradient (used by MealImagePlaceholder for family-created meals)
// Update all three values in colors.ts whenever primary changes — never hardcode inline.
Colors.familyGradient  ['#FDEBED', '#FBDADF', '#FAC7CF']  — warm red-tinted gradient

// Surfaces — neutral so the red accent pops rather than bleeds
Colors.background      #FFFFFF   — page background (pure white)
Colors.surface         #F8F8F8   — input bg, chip default bg (distinct from white)
Colors.card            #FFFFFF   — card backgrounds (elevation via shadow, not colour)

// Text
Colors.text            #2C2C2C   — primary text
Colors.textSecondary   #6B7280   — metadata, helper text, timestamps

// Status
Colors.success         #8BAF7A   — success states
Colors.warning         #D4A853   — warning states
Colors.danger          #B91C1C   — errors (darker crimson, distinct from primary red)

// Utility
Colors.white           #FFFFFF
Colors.border          #E0E0E0   — borders, dividers
Colors.divider         #E0E0E0   — list dividers
Colors.shadow          #E60023   — red-tinted shadows on cards and tab bar
Colors.inactive        rgba(44,44,44,0.4) — inactive tab icons, disabled elements
Colors.overlay         rgba(0,0,0,0.3)   — modal/sheet backdrops
Colors.skeleton1       #FACCD3   — warm red-tinted skeleton base
Colors.skeleton2       #FDEBED   — skeleton shimmer highlight
Colors.offlineBanner   #F5E6C8
Colors.offlineText     #8B6914
Colors.SlotColors      array[7]  — per-slot colour schemes (bg, text, dot) for meal slot differentiation
```

### `constants/theme.ts`
```
Spacing.xs(4) / sm(8) / md(12) / lg(16) / xl(20) / xxl(24) / xxxl(32)
BorderRadius.button(12) / input(12) / card(16) / pill(20) / full(999)
Shadows.card / header / tabBar  — all use Colors.shadow (red-tinted)
```

### Existing Components (reuse, never recreate)
- `AppHeader` — top navigation bar with title and optional right element
- `FilterPill` — horizontal chip for filter rows. Active state: `Colors.primary` bg + white text. Inactive: `Colors.surface` bg + `Colors.text`.
- `MealImagePlaceholder` — image placeholder for meals without a photo. Renders in three modes: (1) **delivery platform logo** (when `deliveryPlatform` prop is set), (2) **meal name initials** on a hashed muted background (when `familyInitials` prop is set — used for family-created meals without a photo; initials are derived from `name` prop, e.g. "MC" for Masala Chai), (3) **emoji + colour gradient** fallback. Never pass `familyAvatarUrl` to Favs grid cards — only `familyInitials` is used there.
- `SlotPickerModal` — meal slot selection modal
- ~~`MealPickerSheet`~~ — **deleted**. Replaced by `/meal-picker` and `/add-to-favs` Expo Router screens. See "Add-Meal Navigation Architecture" section above.
- `MealSlotEditor` — add/remove/rename meal slots in settings
- `WeeklyPlanView` — 7-day grid with meal pills, week navigation, Smart Fill. Action buttons (Reshuffle, Repeat, Clear week) use `Colors.surface` bg, `Colors.text`, `fontWeight: '600'`, no icons.
- `DailyPlanView` — day-level meal slots with serving stepper and meal rows. Action buttons (Smart Fill/Reshuffle, Repeat day, Clear day) match WeeklyPlanView style exactly.
- `RepeatWeekSheet` / `RepeatDaySheet` — copy meals from a previous week/day. Both recompute their items list whenever the sheet opens (`visible` is in the `useMemo` dep array) — do not remove this.
- `SegmentedControl` — two-option toggle
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

   **Why:** iOS's `UIScrollView` preserves its `contentOffset` when the user scrolls down and then switches tabs or navigates away. When they return, the grid's scroll container is at its old position — creating a phantom blank gap at the top equal to how far the user had scrolled. This gap is invisible to the layout inspector (it shows as the screen's background colour, with no element owning it), making it extremely hard to diagnose.

   **The fix:** Use a `FlatList` that owns the entire scroll area. Put the search bar and filter pill row inside `ListHeaderComponent`. The grid items are the FlatList data. This mirrors the Discover tab architecture and makes phantom gaps structurally impossible — there is no seam between the header and the grid.

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
         {/* filter count bar */}
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

   Also add a `useFocusEffect` that calls `flatListRef.current?.scrollToOffset({ offset: 0, animated: false })` whenever the tab is focused, as a belt-and-suspenders safety net.

   > **Screens using this pattern:** `app/(tabs)/favs/index.tsx`
   > **Reference implementation:** See commit `6ac4db6` — `fix(favs): merge all content into single FlatList`

---

## Pre-Production Checklist

Items intentionally deferred — must be completed before public launch:

- [ ] Set `DEV_SKIP_ONBOARDING = false` and implement full authentication flow
- [ ] Move OpenAI API calls from client-side to Supabase Edge Functions
- [ ] Implement per-user credit/quota system for AI feature usage
- [ ] Unsplash API: apply for production access (current: demo tier, 50 req/hour)

---

## Feature Backlog

Post-launch features for future development sprints:

### Full Video Recipe Extraction (TikTok / Instagram / YouTube)
**What:** Extract recipes from videos even when there is no recipe text in the description — by downloading the video, transcribing the audio, and analysing video frames with vision AI.
**Why:** Competitors like Honeydew do this. Currently the app only reads the YouTube description and TikTok caption, which fails for videos with no text.
**How it works:**
1. Server-side video download using `yt-dlp` or Apify (cannot run client-side)
2. Audio extraction → OpenAI Whisper transcription
3. Frame extraction (keyframes) → GPT-4o Vision analysis for on-screen text, ingredients, quantities
4. Combined transcript + visual data → GPT-4o recipe assembly
**Dependency:** Requires backend migration (Supabase Edge Functions) to be completed first — video downloading and processing cannot run on the mobile client.
**Estimated cost:** ~$0.08–0.17 per video extraction (Whisper + GPT-4o Vision + GPT-4o). Cover via subscription or per-user credit quota.
**Legal note:** Downloading TikTok/Instagram videos without authorisation technically violates their ToS. Monitor platform policy changes.

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
