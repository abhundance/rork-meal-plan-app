# Meal Plan — Project Brief
*Context document for AI tools and developers continuing work on this project.*

---

## App Overview

**Name:** Meal Plan
**Purpose:** A meal planning app for anyone managing a household — solo planners, couples, and families alike. Solves the daily problem of deciding what to cook, building shopping lists, and organising recipes in one place.
**Target user:** Anyone cooking for themselves or others who wants a fast, warm, and low-friction experience. Originally focused on busy parents (2–6 person households); now intentionally inclusive of single-person households. Household size = 1 is a first-class use case — onboarding copy adapts dynamically via the `useHouseholdCopy` hook (`hooks/useHouseholdCopy.ts`).

---

## Platform & Build Tool

- **Framework:** React Native + Expo Router + TypeScript
- **Build tool:** [Rork](https://rork.com) — an AI-powered app builder. All code changes are made by prompting Rork in natural language.
- **Backend:** Supabase (Postgres + Row-Level Security + Edge Functions). Anonymous auth on first launch; email OTP for full auth.
- **Local cache:** AsyncStorage (persists Supabase auth session; no longer the primary data store)
- **State management:** React Context + TanStack Query
- **Discover content:** AI-generated curated recipes stored in Supabase (`source = 'curated'`). No external recipe API.

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
| `pre-recipe-type-unification` | c090906 | 2026-03-06 | Recipes grid layout ✅, add-meal tile ✅, chip row removed ✅ | Before Option B: merging `Meal` + `DiscoverMeal` into unified `Recipe` type |
| *(latest stable)* | 88d4499 | 2026-03-10 | Pinterest Red design system ✅, cardless Recipes grid ✅, meal name initials ✅, chip consistency ✅, Plan tab action buttons ✅, Repeat sheet double-tap fix ✅ | Pinterest Red rebrand (#E60023) |
| `post-supabase-migration` | 8bea588 | 2026-03-21 | Supabase-primary for all data ✅, anonymous auth ✅, video extraction (YT/TikTok/IG) ✅, family invite flow ✅, quota enforcement ✅, UUID IDs ✅ | After full Supabase migration + video extraction |

---

## Three Main Tabs

| Tab | Purpose |
|-----|---------|
| **Plan** | Weekly calendar grid. Assign meals to Breakfast / Lunch / Dinner / Snack slots across 7 days. Supports serving-size scaling per slot. |
| **Recipes** | Single unified grid of all saved meals (family-created + saved from onboarding/extraction), searchable and filterable by meal type, dish type, protein, and diet. Previously called "Favs". |
| **Shopping** | Auto-generated shopping list aggregated from all planned meals. Items grouped by ingredient category with check-off functionality. |

> **Note:** The Discover tab was removed. The app is a meal planner, not a recipe browser. AI recipe generation is now built into the Add Recipe flow via the Smart Bar.

---

## Key Features

### Add a Recipe Flow
Single entry point: `app/add-recipe-entry.tsx`. The screen has a **SmartBar** that detects input type and shows context-aware actions:

- **Empty (default state):** Shows a grid of method options: Manual Entry, Photos, Voice, Camera.
- **URL detected:** Shows "Extract Recipe" button (recipe blog, website, YouTube, TikTok, Instagram, pasted text).
- **Meal name detected:** Shows "Generate Recipe with AI" button and "Just Save" button.
- **Question/constraint detected:** Shows "Let AI Chef help →" button to enter a conversational recipe refinement flow.

The `components/SmartBar.tsx` component handles input detection via `utils/inputDetection.ts`. The `components/SmartBarResults.tsx` component renders context-aware action buttons.

All paths eventually write to `app/add-recipe-review.tsx`.

> **Note:** The standalone `add-recipe-video.tsx` and `add-recipe-paste.tsx` screens were removed — video/link extraction is now handled directly by the Paste a Link field on the entry screen.

> **Rule:** All navigation to the Add a Recipe flow must go to `/add-recipe-entry`. The only exception is editing an existing meal, which navigates directly to `/add-recipe-review?editId={id}` to bypass the entry chooser.

### Recipe Extraction
AI-powered extraction from YouTube URLs (including Shorts), TikTok URLs, Instagram Reels, pasted text, and images. All extraction is proxied through the `extract-recipe` Supabase Edge Function (server-side) — the OpenAI API key never ships in the app bundle. Client-side logic lives in `services/recipeExtraction.ts`. Includes full video extraction: server-side download via yt-dlp/Apify, Whisper transcription, GPT-4o Vision frame analysis, and GPT-4o recipe assembly. Per-user quota enforcement is built into the Edge Function.

> Extraction supports output in the user's chosen language (forwarded from FamilySettings.language).

### AI Recipe Generation
Type a meal name (e.g., "Masala Chai") and tap "Generate Recipe with AI" to auto-generate a recipe via the `extract-recipe` Edge Function with `type: 'name'`. Results are reviewed on the same `add-recipe-review.tsx` screen.

### AI Chef (Conversational Recipe Assistant)
Type a question or constraint (e.g., "low-carb pasta with spinach") and tap "Let AI Chef help →" to enter a conversational flow. Navigates to `app/ai-chef.tsx` — a chat interface powered by the `ai-chef` Edge Function. The function uses GPT-4o for nuanced recipe generation through conversation. Quota: 20 AI Chef sessions per month (tracked in `ai_usage.ai_chef_sessions`). The function receives the initial prompt from SmartBar and auto-sends the first message. The user can refine via conversation, then save the resulting recipe to the review screen.

### Meal Image Handling
Auto-suggests food images from Unsplash after meal name entry. Users can also pick from camera or photo library. Base64 images passed between screens via `services/imageStore.ts` (never via route params).

### My Recipes vs Saved (Recipes Tab)
Family-created meals (`source === 'family_created'`) are stored permanently and can only be deleted via explicit long-press confirmation — never accidentally removed by tapping a heart. Discovered/saved meals can be removed via the heart button. Both types appear together in one unified grid (the SegmentedControl between My Recipes / Saved was removed).

### Onboarding & Auth
Onboarding flow exists at `app/onboarding/`. The home screen redirects to `/onboarding/auth` when `onboardingData.completed === false`. Authentication is handled by `providers/AuthProvider.tsx`: anonymous auth via `signInAnonymously()` on first launch (so every device has a real `auth.uid()` for RLS), with email OTP (6-digit code) for full auth. Anonymous users will be upgraded via `supabase.auth.linkIdentity()` when full auth ships.

The flow is **14 steps** (updated March 2026 — was 11). Each screen calls `setStep(N)` then `router.push(...)` on continue.

| Step | File | Screen title | Key data written |
|------|------|--------------|-----------------|
| 1 | `auth.tsx` | Welcome / sign in | — |
| 2 | `family-name.tsx` | What's your household called? | `family_name` |
| 3 | `household-size.tsx` | How many people are in your household? | `household_size` |
| 4 | `cultural-restrictions.tsx` | Do you follow any of these? | `cultural_restrictions[]` |
| 5 | `family-dietary.tsx` | Any food allergies or intolerances? | `intolerances[]` |
| 6 | `diet-preferences.tsx` | How do you want your meal plan to lean? | `diet_preferences[]` |
| 7 | `household-type.tsx` | What's your household like? | `household_type` |
| 8 | `personal-goal.tsx` | Any personal health goals? | `health_goals[]` |
| 9 | `cuisines.tsx` | Which cuisines do you / does your household love? | `cuisine_preferences[]` |
| 10 | `cooking-time.tsx` | How much time do you usually have to cook? | `cooking_time_pref` |
| 11 | `planning-style.tsx` | How do you like to plan meals? | `planning_style` |
| 12 | `configure-slots.tsx` | Which meal slots do you plan for? | `enabled_slots[]` |
| 13 | `breakfast-picks.tsx` | Pick some breakfast favourites | `starter_meals[]` |
| 14 | `lunch-picks.tsx` / `dinner-picks.tsx` | Pick lunch / dinner favourites | `starter_meals[]` |

**Step 4 design rules:**
- Question is "Do you follow any of these?" — grammatically correct for all option types (No beef, Halal only, No animal products, etc.)
- Options: `no_beef`, `no_pork`, `no_shellfish`, `no_meat`, `vegan` (labelled "No animal products"), `halal`, `kosher`
- "No meat" description: "Vegetarian — no meat or fish, eggs and dairy may vary" — deliberately avoids saying fish is included, because many vegetarian households (especially Indian) do not eat fish

**Steps 4–5 are hard gates** — cultural restrictions and intolerances are strict constraints used for recipe filtering. Smart Fill will never suggest a meal that violates these.

**Steps 6–8 are soft signals** — diet preferences and health goals inform recommendation scoring and carousel selection, but do not hard-exclude meals.

**Step 7 household types:** `solo`, `young_family`, `school_age`, `adults_only`, `seniors`, `mixed`. `solo` is a first-class option and appears first in the list.

**Dead routes (do not navigate to):** `personal-goal-diet.tsx`, `personal-goal-life.tsx`, `personal-goal-health.tsx` — these were the old Steps 5b–5d, collapsed into the new Step 8. Files remain for safety but are no longer reachable from the flow.

**Solo user adaptive copy:** Import `useHouseholdCopy` from `hooks/useHouseholdCopy.ts` in any onboarding screen that references the household. Returns `isSolo`, `noneLabel`, `subject`, `possessive`, and `object` that switch between singular ("you / me") and plural ("your household / us") based on `household_size === 1`. Applied to Steps 4–9.

### Family Invite Flow
Full invite system for adding family members: `app/invite-member.tsx` (generate/share invite codes), `app/join/[code].tsx` (accept invites), `services/inviteService.ts` (invite lifecycle). Supports native share sheet, WhatsApp, iMessage, and clipboard copy. Invite codes are 8-character, readable, and valid for 7 days.

---

## Active Development Flags

| Flag | File | Current Value | Notes |
|------|------|---------------|-------|
| `DEV_SKIP_ONBOARDING` | `providers/OnboardingProvider.tsx` | `false` | Onboarding is active. Set to `true` only during development to bypass auth/onboarding. |

---

## Environment Variables

### Client-side (in Rork's Environment Variables panel)

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous/public key (safe to expose — RLS protects data) |

### Server-side (Supabase Edge Function secrets)

All third-party API keys live exclusively in Edge Function secrets — never in client code:

| Secret | Used by Edge Function | Purpose |
|--------|----------------------|---------|
| OpenAI API key | `extract-recipe` | GPT-4o-mini/GPT-4o for recipe extraction + Whisper for video transcription |
| YouTube API key | `extract-recipe` | YouTube video metadata |
| ~~Spoonacular API key~~ | ~~`spoonacular`~~ | **Dead code** — Discover tab now queries curated recipes from Supabase directly. `services/spoonacular.ts` and the `spoonacular` Edge Function are unused legacy files. |

> The old client-side env vars (`EXPO_PUBLIC_UNSPLASH_ACCESS_KEY`, `EXPO_PUBLIC_OPENAI_API_KEY`, `EXPO_PUBLIC_YOUTUBE_API_KEY`) have been removed from client code.

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
- `MealImagePlaceholder` — image placeholder for meals without a photo. Renders in three modes: (1) **delivery platform logo** (when `deliveryPlatform` prop is set), (2) **meal name initials** on a hashed muted background (when `familyInitials` prop is set — initials are derived from the `name` prop, e.g. "MC" for Masala Chai; the `familyInitials` value itself acts as a flag, the component derives the actual initials from `name`), (3) **emoji + colour gradient** fallback. Never pass `familyAvatarUrl` to Recipes grid cards — only `familyInitials` is used there.
  > ⚠️ **Rule:** In the Recipes grid, pass `familyInitials` for **any meal without an `image_url`** (not just `source === 'family_created'`). Meals saved from onboarding or AI extraction may have no photo — they must show initials, not the emoji/gradient fallback. Correct condition: `!item.delivery_platform && !item.image_url ? familyInitials : undefined`.
- `SmartBar` — context-aware recipe input field. Detects input type (empty, URL, name, question) and displays appropriate action buttons. Component: `components/SmartBar.tsx`.
- `SmartBarResults` — renders action buttons based on SmartBar input detection. Component: `components/SmartBarResults.tsx`.
- `SlotPickerModal` — meal slot selection modal
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

### Custom Hooks (`hooks/`)
- `useHouseholdCopy` — returns copy variants that adapt to solo vs multi-person households. Reads `household_size` from `useOnboarding()`. Use on any screen that references the household in copy. Returns: `isSolo` (bool), `subject` ("you" / "your household"), `possessive` ("your" / "your household's"), `noneLabel` ("None of these apply to me" / "…to us"), `object` ("me" / "us"), `followVerb` ("I follow" / "We follow"). **Rule:** never hardcode "your family" or "your household" in onboarding screens — always use this hook.

---

## Rork Prompt Submission Rules

> ⚠️ **Critical:** Rork's chat input treats the Enter/Return key as "send message". Never use the `type` tool to enter multi-line prompts — every newline will submit a separate prompt and flood the queue.

The correct way to submit a prompt to Rork via browser automation:
1. Use `form_input` to set the textarea value (pastes the full text without triggering Enter)
2. Then click the Send button once

Always submit prompts as a **single message** — no newlines in the submitted text if using the `type` tool.

---

## Cost-Aware Development

> ⚠️ **Mandatory rule:** Every technical decision involving API calls, AI model usage, or data processing must include a cost assessment.

- **Always preprocess before sending to LLMs.** Never send raw binary data (base64 PDFs, full audio blobs) into an LLM's text context window. Extract text server-side first — it's orders of magnitude cheaper and often more accurate.
- **If a cheaper approach exists at the same quality level:** Use it without asking.
- **If the cheaper approach involves a UX or business tradeoff:** Stop and explain the options with cost/benefit numbers before proceeding. Let the product owner decide.
- **Flag cost-impacting decisions proactively.** File size limits, truncation strategies, retry counts, model selection (GPT-4o vs GPT-4o-mini), embedding dimensions — all have cost implications that must be stated explicitly.

---

## Architectural Rules

These patterns were established through development and must be followed:

1. **Lazy API key pattern** — Never assign `process.env.EXPO_PUBLIC_*` to a module-level `const`. Always wrap in a function called at use time. Expo/Metro's bundler caches module-level values and breaks env var reads.
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

   > **Screens using this pattern:** `app/(tabs)/recipes/index.tsx`
   > **Reference implementation:** See commit `6ac4db6` — `fix(favs): merge all content into single FlatList`

---

## Pre-Production Checklist

| Item | Status |
|------|--------|
| Full authentication flow (anonymous + email OTP) | ✅ Done |
| Move API keys server-side (Supabase Edge Functions) | ✅ Done |
| Per-user quota system for AI extraction | ✅ Done |
| Supabase as primary data store (recipes, meal plans, shopping, settings) | ✅ Done |
| Full video recipe extraction (YouTube, TikTok, Instagram) | ✅ Done |
| Family invite flow | ✅ Done |
| UUID migration for all entity IDs | ✅ Done |

Items still pending before public launch:

- [ ] Upgrade anonymous users to full auth via `linkIdentity()` (currently anonymous auth only)
- [ ] Unsplash API: apply for production access (current: demo tier, 50 req/hour)
- [ ] Production error monitoring / crash reporting
- [ ] App Store / Play Store submission prep

---

## Feature Backlog

Post-launch features for future development sprints:

### Localisation — Full UI Translation (Phases 2–3)
**What:** Translate all hardcoded UI strings in the app so the interface responds to the language set in Settings → Language. Currently the language picker saves the setting but only AI extraction uses it (Phase 1 is done — see commit `33686b9`).
**Why:** The app already has a language picker with 6 languages (English, Français, Español, Deutsch, Português, Italiano). Completing the UI layer makes the whole experience consistent for non-English speakers.
**How:**
1. Install `expo-localization` + `i18next` + `react-i18next`
2. Create `services/i18n.ts` — initialises i18next, maps FamilySettings.language display names to locale codes (`'Français' → 'fr'`)
3. Create `locales/en.json` (source), then generate `fr.json`, `es.json`, `de.json`, `pt.json`, `it.json` via GPT-4o batch translation
4. Extract strings from 7 high-traffic screens: Plan tab, Recipes, Shopping, Add a Meal flows, Settings
5. Extract remaining screens (onboarding, modals, alerts, enum option labels)
6. Wire `changeLanguage()` to the existing language picker in Settings — changes take effect instantly, no restart needed
**Dependency:** Supabase migration is complete, so this is unblocked. Discover content (curated recipes) is stored in Supabase and would need translated versions or a translation layer.
**Effort:** ~2–3 days.
**Note on data model:** FamilySettings.language currently stores display names ('Français'). Keep this — the i18n service maps to locale codes internally. No data migration needed.

---

### Smart Recommendations (pgvector)
**What:** Use vector embeddings to power "suggest meals similar to what this family ate last week" and duplicate detection when saving new recipes.
**Why:** Smart Fill currently picks from saved recipes without semantic awareness. Embeddings would enable similarity-based suggestions and "you already have something like this" detection.
**How:** Enable `pgvector` extension in Supabase (already available), add an `embedding` column to `recipes`, generate embeddings via OpenAI when recipes are saved, query by cosine similarity.
**Priority:** Phase 3 — core value works without it.

---

## Key Services

| File | Purpose |
|------|---------|
| `services/supabase.ts` | Singleton Supabase client (lazy env pattern, AsyncStorage for session persistence) |
| `services/db.ts` | Supabase row ↔ TypeScript type transformations (all providers import from here) |
| `services/recipeExtraction.ts` | Client-side logic for calling the `extract-recipe` Edge Function |
| `services/inviteService.ts` | Family invite lifecycle (create, resolve, accept) |
| `services/imageStore.ts` | In-memory base64 image store for passing images between screens |
| `utils/inputDetection.ts` | SmartBar input type detection (URL, name, question, empty) |

### Supabase Edge Functions

| Function | Purpose |
|----------|---------|
| `extract-recipe` | AI recipe extraction (text, YouTube, TikTok, Instagram, name). Handles video download, Whisper transcription, GPT-4o Vision, quota enforcement. |
| `ai-chef` | Conversational recipe assistant using GPT-4o. Quota: 20 sessions per month per user. |

> Edge Function source is maintained in the Supabase Dashboard. The `supabase/functions/` directory contains placeholder files for source control. Deploy via `supabase functions deploy <name>`.

---

## Data Model (Key Fields)

```ts
// Recipe — core meal object used across Recipes tab, Meal Plan, and Add a Meal
// IDs are UUIDs (crypto.randomUUID() with Hermes polyfill)
{
  id: string                // UUID
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
