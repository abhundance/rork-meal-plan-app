# AI Chef Hero — Full Implementation Plan

> **Design reference:** `add-recipe-v3-toggle-prototype.html` (7-screen interactive prototype)
> **Approach:** No streaming. Full response buffered, with good loading UX.
> **Constraint:** All code changes via GitHub push. Edge Functions via Supabase MCP/Dashboard.

---

## Current State (Full Audit)

### Screens That Exist Today

| Screen | File | What It Does | Fate |
|--------|------|-------------|------|
| **Add Recipe Entry** | `app/add-recipe-entry.tsx` | SmartBar + SmartBarResults. Detects input type (URL, name, conversation, empty) and routes to the right handler. | **REWRITE** → toggle with AI Chef / Manual tabs |
| **Add Recipe Review** | `app/add-recipe-review.tsx` | Extraction landing screen. Receives prefilled params (from URL/photo/voice/text extraction), shows loading while AI extracts, then renders editable form. Also has Recipe Details accordion with AI auto-fill. | **KEEP** — still the landing page for AI-extracted recipes (URL, photo, voice) |
| **Add Recipe Manual** | `app/add-recipe-manual.tsx` (45KB) | Full manual entry form: name, photo, ingredients, method steps, cooking time, serving size, Recipe Details accordion (meal type, cuisine, dish type, protein, diet labels, allergens, occasions) with AI auto-fill. Also handles editing existing recipes. | **KEEP** — this IS the Manual tab content |
| **AI Chef** | `app/ai-chef.tsx` | Chat interface with message bubbles, voice input, recipe save/refine. No photo/link attachments. | **REWRITE** → extract into `components/AiChefChat.tsx` |
| **Meal Picker** | `app/meal-picker/index.tsx` | Plan tab entry. SmartBar + saved recipe carousel + search. | **REWRITE** → simplified (search + carousel + buttons) |
| **Meal Picker Manual** | `app/meal-picker/manual.tsx` | Quick "just add a name" from Plan tab. Name field + "Save to Recipes" checkbox. | **KEEP** or fold into Manual tab |
| **Meal Picker Delivery** | `app/meal-picker/delivery.tsx` | Ordering In flow. Meal name + optional delivery URL. | **KEEP** — unchanged |
| **Recipe Detail** | `app/recipe-detail.tsx` | View recipe. Edit button → navigates to `/add-recipe-manual?editId=X`. | **KEEP** — edit path unchanged |

### Components

| Component | File | Fate |
|-----------|------|------|
| `SmartBar` | `components/SmartBar.tsx` | **DELETE** — replaced by toggle architecture |
| `SmartBarResults` | `components/SmartBarResults.tsx` | **DELETE** — replaced by toggle architecture |
| `VoiceRecordSheet` | `components/VoiceRecordSheet.tsx` | **KEEP** — reuse in AI Chef chat |
| `SegmentedControl` | `components/SegmentedControl.tsx` | **REUSE** — for the AI Chef / Manual toggle |
| Input detection | `utils/inputDetection.ts` | **DELETE** — no longer needed |

### Services

| Service | File | Status | Notes |
|---------|------|--------|-------|
| Recipe extraction | `services/recipeExtraction.ts` | ✅ Working | All functions (URL, image, voice, PDF, metadata, name generation) operational |
| Image store | `services/imageStore.ts` | ✅ Working | In-memory base64 passing between screens |
| `extract-recipe` Edge Function | Deployed on Supabase | ✅ Working | Handles all extraction types |
| `ai-chef` Edge Function | **DOES NOT EXIST** | ❌ Blocker | App calls it → 404 |

### Key Flows Today

| User Action | Current Path | New Path |
|------------|-------------|----------|
| Recipes tab → + Add Recipe | `add-recipe-entry` (SmartBar) | `add-recipe-entry` (Toggle: AI Chef / Manual) |
| Plan tab → tap empty slot | `meal-picker/index` (SmartBar + carousel) | `meal-picker/index` (search + carousel + buttons) |
| Type a meal name → Generate | SmartBar detects name → `generateRecipeFromName()` → review | AI Chef chat: type name → AI generates → recipe card → Save → review |
| Type a meal name → Just add | SmartBar detects name → skeleton recipe → save | Manual tab: type name → save directly |
| Paste a URL | SmartBar detects URL → `extractRecipeFromVideoUrl()` → review | AI Chef chat: paste URL → client extracts → recipe card |
| Take a photo | SmartBar camera → `add-recipe-review` with camera mode | AI Chef chat: tap 📷 → send image → AI extracts → recipe card |
| Voice input | SmartBar mic → `VoiceRecordSheet` → review | AI Chef chat: tap 🎤 → `VoiceRecordSheet` → transcribed text in chat |
| AI Chef conversation | SmartBar detects conversation → navigate to `ai-chef.tsx` modal | AI Chef tab: already there — type and go |
| Manual entry | SmartBarResults → navigate to `add-recipe-manual.tsx` | Manual tab: already there — form is right there |
| Ordering In | SmartBarResults → `meal-picker/delivery.tsx` | Button on Plan screen → `meal-picker/delivery.tsx` |
| Edit existing recipe | Recipe detail → `add-recipe-manual?editId=X` | **Unchanged** — edit always goes to manual form |

---

## Phase 1: AI Chef Edge Function (Backend)

**Goal:** Deploy a working `ai-chef` Edge Function. This unblocks everything.

### 1.1 Create the Edge Function

**Endpoint:** `POST /functions/v1/ai-chef`

**Request:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant',
    content: string,
    image_base64?: string   // photo attachment (GPT-4o vision)
  }>,
  language: string           // "English", "Français", etc.
}
```

**Response:**
```typescript
{
  reply: string,             // conversational text (always present)
  recipe?: {                 // present when AI suggests/refines a recipe
    name: string,
    description?: string,
    prep_time?: number,
    cook_time?: number,
    recipe_serving_size?: number,
    cuisine?: string,
    meal_type?: string,
    dish_category?: string,
    protein_source?: string,
    is_vegan?: boolean,
    is_vegetarian?: boolean,
    is_gluten_free?: boolean,
    is_dairy_free?: boolean,
    diet_labels?: string[],
    allergens?: string[],
    ingredients: Array<{ name: string, quantity: number, unit: string }>,
    method_steps?: string[],
  },
  changes_summary?: string,  // on refinements: "+ turmeric, ↓ 2 servings"
  extract_url?: string       // when user sends a URL — client handles extraction
}
```

**System prompt for GPT-4o:**
- You are AI Chef, a friendly cooking assistant.
- When user describes ingredients, cravings, dietary needs, or health goals → respond with a recipe.
- Always return JSON: `{ reply, recipe?, changes_summary? }`.
- `reply`: warm, concise, 1-3 sentences.
- `recipe`: structured object — include whenever suggesting or refining a recipe.
- `changes_summary`: brief diff when refining a previous recipe.
- If user is just chatting → `reply` only, no recipe.
- Respond in the user's language.

**Image handling:** If `image_base64` present → GPT-4o vision input. Handles cookbook pages, handwritten notes, menus, screenshots.

**URL handling:** If user message contains a URL → return `{ reply: "I see a link! Let me extract that recipe.", extract_url: "<url>" }`. Client calls existing `extract-recipe` Edge Function. No video/yt-dlp duplication.

**Context management:** If `messages.length > 12`, summarize older messages. Keep last 6 verbatim.

**Quota:** 30 sessions/month per user via `ai_usage.ai_chef_sessions`. Increment on first message of new conversation. On exceeded: `{ error: "quota_exceeded", reply: "..." }`.

**Model:** GPT-4o.

### 1.2 Deploy & Verify

- [ ] Deploy via Supabase MCP `deploy_edge_function`
- [ ] OpenAI API key already exists as Edge Function secret
- [ ] Test: text message, image message, URL message, refinement, quota
- [ ] Verify app gets real responses (not 404)

---

## Phase 2: AI Chef Chat Component

**Goal:** Build a reusable `components/AiChefChat.tsx` that feels like ChatGPT.

### 2.1 Component API

```typescript
interface AiChefChatProps {
  initialPrompt?: string;     // pre-fill from inspiration card or Plan context
  pendingPlanSlot?: {         // if coming from Plan tab, meal gets added to this slot on save
    slotId: string;
    date: string;
    slotName: string;
    defaultServing: number;
  } | null;
}
```

### 2.2 Empty/Welcome State (messages.length === 0)

- Chef avatar (gradient red circle with 👨‍🍳)
- "AI Chef" title
- Subtitle: "Tell me what you have, what you're craving, or share a recipe link, photo, or voice note"
- 5 inspiration cards (tappable → auto-send as first message):

| Icon bg | Icon | Text | Subtitle |
|---------|------|------|----------|
| Red | 💬 | "I have chicken and rice, need something quick" | Describe ingredients or cravings |
| Blue | 🔗 | Paste a YouTube, TikTok, or blog link | Extracts full recipe from any URL |
| Green | 📷 | Snap a photo of a recipe or menu | AI reads and structures the recipe |
| Orange | 🎤 | Speak your recipe or describe a dish | Voice to structured recipe |
| Purple | 🍽️ | "A lighter version of Butter Chicken" | Modify or reinvent any dish |

### 2.3 Chat Input Bar (bottom-pinned)

```
┌─────────────────────────────────────┐
│ [text input field]           [Send] │
│ [📷] [🖼️] [🎤] [🔗]       Attach │
└─────────────────────────────────────┘
```

- **Text input:** Multi-line, auto-grow, placeholder "Ask AI Chef anything..."
- **Send button:** Red circle with arrow icon. Disabled (gray) when empty.
- **Attachment buttons:**
  - 📷 Camera → `ImagePicker.launchCameraAsync()` → adds image to next message
  - 🖼️ Photo Library → `ImagePicker.launchImageLibraryAsync()` → adds image
  - 🎤 Mic → opens `VoiceRecordSheet` → transcribed text auto-sent as message
  - 🔗 Link → focuses text input with "Paste a link..." placeholder

### 2.4 Message Types & Rendering

**User text message:**
- Right-aligned, red background, white text, rounded 18px corners

**User image message:**
- Image thumbnail (rounded, max 200px tall) right-aligned
- Optional text below the image if user added context

**Assistant text message:**
- Left-aligned, small chef avatar (28px circle) + gray bubble
- If `recipe` in response: render recipe card below text
- If `changes_summary` in response: show diff section in recipe card
- If `extract_url` in response: trigger client-side URL extraction

**Recipe card (in chat):**
- White card with shadow, rounded 16px
- Hero area with emoji/gradient
- Name, time, servings, dietary chips
- Expandable ingredients list
- Expandable method steps
- Two buttons: **Save Recipe** (red primary) + **Refine** (gray secondary)

**Loading state:**
- Typing indicator (animated dots) in assistant position
- "AI Chef is thinking..."

**Error state:**
- Error text in assistant bubble: "Something went wrong. Tap to retry."

### 2.5 URL Detection Flow (in chat)

1. User types/pastes a URL → taps Send
2. Client detects URL via `detectVideoUrlType()` (existing util)
3. If URL detected:
   - Render user message with URL + source badge (🎬 YouTube, etc.)
   - Call `extractRecipeFromVideoUrl()` from `services/recipeExtraction.ts`
   - Show loading: "Extracting recipe from YouTube..."
   - On success: create assistant message with recipe card
   - On error: show error in assistant bubble
4. If no URL: send to `ai-chef` Edge Function as normal

### 2.6 Photo Flow (in chat)

1. User taps 📷 or 🖼️ → ImagePicker opens
2. Image captured/selected → shown as user image message
3. Optionally user types context text
4. Send → `image_base64` included in message to Edge Function
5. AI Chef (GPT-4o vision) responds with extracted recipe card

### 2.7 Voice Flow (in chat)

Existing `VoiceRecordSheet` integration:
1. User taps 🎤 → sheet opens
2. Record → stop → `transcribeAndExtract()` via `extract-recipe` Edge Function
3. Two possible outcomes:
   - **If transcription returns a full recipe** (e.g. user dictated a recipe): create assistant message with recipe card directly
   - **If transcription returns just text** (e.g. "I want something spicy with chicken"): auto-send as text message to AI Chef

### 2.8 Save Recipe Flow

When user taps "Save Recipe" on a recipe card:
1. Navigate to `add-recipe-review` with prefilled params (name, ingredients, method, cuisine, etc.)
2. User reviews/edits on the Review & Save screen (existing)
3. Review screen handles: save to RecipesProvider + plan slot sequencing

**Why go through Review instead of saving directly:**
- User might want to change the photo, adjust ingredients, or add metadata
- Review screen already handles the save-to-plan FK sequencing
- Consistent experience: every path ends at Review & Save

**If pending plan slot exists:**
- Review screen detects `pendingPlanSlot` → shows "Adding to Tuesday · Dinner" banner
- On save: `syncRecipeNow()` → `addMeal()` → dismiss to Plan tab

### 2.9 Refine Flow

When user taps "Refine":
1. Scroll to input bar + focus
2. Placeholder: "What would you like to change?"
3. User types refinement → sends as next message (full conversation history preserved)
4. AI Chef responds with updated recipe + `changes_summary`

---

## Phase 3: Toggle Screen Architecture + Flows

**Goal:** Wire up the toggle-based Add Recipe screen and simplified Plan flow.

### 3.1 Rebuild `app/add-recipe-entry.tsx`

**New structure:**

```
┌─────────────────────────────────┐
│ Header: "Add a Recipe"     [X]  │
├─────────────────────────────────┤
│ [✨ AI Chef] [✏️ Manual]        │  ← SegmentedControl toggle
├─────────────────────────────────┤
│                                 │
│  (AI Chef tab)                  │
│  → renders <AiChefChat />       │
│                                 │
│  OR                             │
│                                 │
│  (Manual tab)                   │
│  → navigates to                 │
│    /add-recipe-manual           │
│                                 │
└─────────────────────────────────┘
```

**Route params:**
- `?tab=ai` (default) or `?tab=manual` — controls initial toggle state
- `?prompt=<text>` — pre-fills AI Chef with initial message

**AI Chef tab:**
- Renders `<AiChefChat />` component (from Phase 2)
- Full height below toggle, chat input pinned to bottom
- Passes `pendingPlanSlot` if coming from Plan tab

**Manual tab behavior — two options (decide during implementation):**

**Option A: Navigate to existing screen**
- Tapping "Manual" toggle immediately navigates to `/add-recipe-manual`
- The toggle acts as a navigation choice, not a tab switch
- Pro: Zero new code — `add-recipe-manual.tsx` already works perfectly (45KB, full-featured)
- Con: Feels like leaving the screen rather than switching a tab

**Option B: Embed the manual form**
- Extract the form from `add-recipe-manual.tsx` into a `components/ManualEntryForm.tsx`
- Render it inline as the Manual tab content
- Pro: True tab experience — toggle switches content without navigation
- Con: Large refactor of a 45KB file

**Recommendation:** Start with **Option A** (navigate). It ships faster and the UX difference is minimal — the screen transition is a modal push that feels like a tab switch. If it feels wrong in practice, refactor to Option B later.

### 3.2 Simplify `app/meal-picker/index.tsx`

**New structure:**

```
┌─────────────────────────────────┐
│ Header: "Tuesday · Dinner" [X]  │
├─────────────────────────────────┤
│ 🔍 Search your recipes...      │
├─────────────────────────────────┤
│ YOUR RECIPES                    │
│ [BC] [DM] [PB] [TA] [BI] →     │
├─────────────────────────────────┤
│ ── Or add something new ──      │
├─────────────────────────────────┤
│ [👨‍🍳 AI Chef              →]    │  ← navigates to add-recipe-entry?tab=ai
│ [✏️ Manual Entry          →]    │  ← navigates to add-recipe-entry?tab=manual
├─────────────────────────────────┤
│ [🛵 Ordering in           →]    │  ← navigates to meal-picker/delivery
└─────────────────────────────────┘
```

**What stays:**
- Search bar (filters saved recipes)
- Horizontal recipe carousel (tap to add to plan slot)
- `handleSelectFavMeal()` (tap saved recipe → add to plan → dismiss)

**What's removed:**
- SmartBar import and all `smartBarValue` state
- SmartBarResults import
- `inputDetection` import and `detectInputType` calls
- All inline extraction handlers (URL, generate, just-save-name)
- The carousel-hiding-on-typing behavior

**Three new buttons:**
- **AI Chef** → `setPendingPlanSlot(...)` → `router.push('/add-recipe-entry?tab=ai')`
- **Manual Entry** → `setPendingPlanSlot(...)` → `router.push('/add-recipe-entry?tab=manual')`
- **Ordering In** → `router.push('/meal-picker/delivery')` (existing)

**What happens to `meal-picker/manual.tsx`?**
- Currently: quick "just add a name" with optional "Save to Recipes" checkbox
- In new flow: "Manual Entry" button goes to `add-recipe-entry?tab=manual` → full manual form
- `meal-picker/manual.tsx` can be **kept as-is** — it's navigated from inside the manual form for the "quick add" case, or can be removed if the full manual form is sufficient from Plan tab

### 3.3 Navigation Map (Complete)

```
                         ┌──────────────┐
                         │  Recipes Tab  │
                         │  (+ button)   │
                         └───────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │   add-recipe-entry.tsx   │
                    │  [AI Chef] [Manual]      │
                    └──┬──────────────────┬───┘
                       │                  │
              ┌────────▼───────┐  ┌───────▼────────┐
              │  AI Chef Chat  │  │  Manual Form   │
              │  (embedded)    │  │  (navigate to   │
              │                │  │  add-recipe-    │
              │  Save Recipe → │  │  manual.tsx)    │
              └────────┬───────┘  └───────┬────────┘
                       │                  │
              ┌────────▼──────────────────▼───────┐
              │        add-recipe-review.tsx       │
              │  (Review & Save — shared endpoint) │
              │  Recipe Details accordion still here│
              └────────────────┬──────────────────┘
                               │
                        Save to Recipes
                    (+ add to plan if slot)


                         ┌──────────────┐
                         │   Plan Tab    │
                         │ (tap slot)    │
                         └───────┬───────┘
                                 │
                    ┌────────────▼────────────┐
                    │  meal-picker/index.tsx   │
                    │  Search + Carousel       │
                    │  [AI Chef] [Manual]      │
                    │  [Ordering In]           │
                    └──┬────────┬────────┬────┘
                       │        │        │
                Pick   │   New  │   Delivery
                saved  │  recipe│        │
                recipe │        │        │
                       │   ┌────▼────┐   │
                       │   │add-recipe│   │
                       │   │entry.tsx │   │
                       │   └────┬────┘   │
                       │        │        │
                       ▼        ▼        ▼
                  Add to Plan  Review   meal-picker/
                  (direct)    & Save   delivery.tsx
```

### 3.4 What Happens to Each Handler

Current handlers in `add-recipe-entry.tsx` → where they move:

| Handler | Current | New Location |
|---------|---------|-------------|
| `handleExtractFromSmartBar()` (URL) | SmartBar → extract → review | AI Chef chat: URL detection → extract → recipe card → Save → review |
| `handleGenerate()` (name → AI recipe) | SmartBar → `generateRecipeFromName()` → review | AI Chef chat: type name → AI generates → recipe card → Save → review |
| `handleJustSaveName()` (name only) | SmartBar → skeleton recipe → save | Manual tab: form has name field → save directly |
| `handleAiChef()` (conversation) | SmartBar → navigate to `ai-chef.tsx` | AI Chef tab: already there — no navigation needed |
| `handleCamera()` (photo) | SmartBar → camera → review w/ camera mode | AI Chef chat: 📷 button → image message → AI vision → recipe card |
| `handleVoiceExtracted()` (voice) | SmartBar → VoiceRecordSheet → review | AI Chef chat: 🎤 button → VoiceRecordSheet → text in chat |
| Manual entry button | SmartBarResults → navigate to `add-recipe-manual` | Manual tab on toggle → navigate to `add-recipe-manual` |
| Ordering In button | SmartBarResults → navigate to `meal-picker/delivery` | Button on meal-picker → navigate to `meal-picker/delivery` |

### 3.5 Remove Dead Code

After Phase 3 is complete:

| Delete | Reason |
|--------|--------|
| `components/SmartBar.tsx` | Replaced by toggle + AI Chef chat input |
| `components/SmartBarResults.tsx` | Replaced by toggle architecture |
| `utils/inputDetection.ts` | No longer used — AI Chef handles all input types |
| `app/ai-chef.tsx` | Replaced by embedded `AiChefChat` component |

### 3.6 Files That Stay Unchanged

| File | Why |
|------|-----|
| `app/add-recipe-review.tsx` | Still the shared Review & Save endpoint for all paths |
| `app/add-recipe-manual.tsx` | Still the manual entry form (Manual tab navigates here) |
| `app/meal-picker/delivery.tsx` | Ordering In flow — unchanged |
| `app/recipe-detail.tsx` | Edit button → `add-recipe-manual?editId=X` — unchanged |
| `services/recipeExtraction.ts` | All extraction functions still used by AI Chef chat |
| `services/imageStore.ts` | Still used for image passing |
| `components/VoiceRecordSheet.tsx` | Reused in AI Chef chat |
| `providers/RecipesProvider.tsx` | Unchanged |
| `providers/MealPlanProvider.tsx` | Unchanged (addMealLocalOnly already added) |

---

## Phase 4: Polish

### 4.1 Quota UX
- AI Chef returns `quota_exceeded` → show friendly message in chat
- Disable send button with note: "Sessions reset on [date]"
- Show "Try Manual Entry →" link pointing to the other tab

### 4.2 Offline Handling
- No network → banner: "You're offline. AI Chef needs internet."
- Manual tab works fully offline (local save)
- Saved recipe carousel works offline (cached)

### 4.3 Error States
- Edge Function timeout → "AI Chef took too long. Tap to retry."
- Image too large → compress before sending (max 1MB base64)
- URL extraction fails → "Couldn't find a recipe at that link."
- Voice transcription fails → "Couldn't understand. Try again or type it."

### 4.4 Keyboard & Layout
- `KeyboardAvoidingView` wrapping AI Chef chat
- Dismiss keyboard on scroll up
- Chat auto-scrolls to newest message
- Input bar stays above keyboard at all times

### 4.5 Transitions
- Toggle switch should feel instant (no loading)
- AI Chef ↔ Manual: if AI Chef has an active conversation, preserve it when switching back
- Recipe card save → review screen: smooth modal push

### 4.6 Empty State: Recipes Tab with 0 Recipes
- "+" button on Recipes tab goes to `add-recipe-entry` (AI Chef tab)
- Empty state messaging: "Add your first recipe with AI Chef or manually"

---

## Implementation Order

```
Phase 1 (Backend)             ~1 session
  1.1  Write ai-chef Edge Function
  1.2  Deploy to Supabase
  1.3  Test: text, image, URL, refinement, quota

Phase 2 (Chat Component)      ~2 sessions
  2.1  Create components/AiChefChat.tsx shell
  2.2  Welcome state + inspiration cards
  2.3  Chat input bar with attachment buttons
  2.4  Message list rendering (text, image, recipe cards)
  2.5  Wire to ai-chef Edge Function
  2.6  Photo flow (camera + library → image message)
  2.7  URL detection → delegate to extract-recipe
  2.8  Voice flow (VoiceRecordSheet integration)
  2.9  Save recipe → navigate to review
  2.10 Refine flow

Phase 3 (Screen Architecture)  ~1 session (can start during Phase 2)
  3.1  Rebuild add-recipe-entry.tsx with toggle
  3.2  Simplify meal-picker/index.tsx
  3.3  Wire navigation (tab params, plan slot passing)
  3.4  Delete dead code (SmartBar, SmartBarResults, inputDetection, ai-chef.tsx)
  3.5  Update _layout.tsx routes

Phase 4 (Polish)               ~0.5 session
  4.1  Quota exceeded UX
  4.2  Offline handling
  4.3  Error states
  4.4  Keyboard/layout
  4.5  Tab state preservation
  4.6  Empty states
```

**Total estimate:** 4–5 sessions

---

## Files Changed (Complete Summary)

| Action | File | Notes |
|--------|------|-------|
| **CREATE** | `supabase/functions/ai-chef/index.ts` | Edge Function — the backend |
| **CREATE** | `components/AiChefChat.tsx` | Reusable ChatGPT-style chat component |
| **REWRITE** | `app/add-recipe-entry.tsx` | Toggle layout: AI Chef tab + Manual tab |
| **REWRITE** | `app/meal-picker/index.tsx` | Search + carousel + 3 buttons |
| **MODIFY** | `app/_layout.tsx` | Remove `ai-chef` modal route |
| **DELETE** | `components/SmartBar.tsx` | Replaced by toggle architecture |
| **DELETE** | `components/SmartBarResults.tsx` | Replaced by toggle architecture |
| **DELETE** | `utils/inputDetection.ts` | No longer needed |
| **DELETE** | `app/ai-chef.tsx` | Replaced by embedded AiChefChat |
| **UNCHANGED** | `app/add-recipe-review.tsx` | Shared Review & Save — still used |
| **UNCHANGED** | `app/add-recipe-manual.tsx` | Full manual form — still used |
| **UNCHANGED** | `app/meal-picker/delivery.tsx` | Ordering In — unchanged |
| **UNCHANGED** | `app/recipe-detail.tsx` | Edit flow — unchanged |
| **UNCHANGED** | `services/recipeExtraction.ts` | All extraction services — still used |
| **UNCHANGED** | `components/VoiceRecordSheet.tsx` | Reused in AI Chef chat |

---

## Design Reference

Interactive prototype: `/Meal Plan App/add-recipe-v3-toggle-prototype.html`

| Prototype Screen | Maps To |
|-----------------|---------|
| Screen 1: Add Recipe — AI Chef | `add-recipe-entry.tsx` (AI Chef tab) |
| Screen 2: Add Recipe — Manual | `add-recipe-manual.tsx` (navigated from Manual tab) |
| Screen 3: Plan → Add Meal | `meal-picker/index.tsx` (simplified) |
| Screens 4–5: AI Chef Chat + Refine | `AiChefChat.tsx` component |
| Screen 6: AI Chef Link Extraction | `AiChefChat.tsx` URL detection flow |
| Screen 7: Review & Save | `add-recipe-review.tsx` (unchanged) |
