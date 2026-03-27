# Lessons Learned

Patterns discovered through development. Read this at the start of every session.

---

### 1. Review Screen Param Names
`add-recipe-review.tsx` expects `prefill*` param names (`prefillName`, `prefillCuisine`, `prefillMealType`, etc.) plus `inputMode`. Never send raw field names like `name`, `cuisine` — they'll be silently ignored.

### 2. Stale Closures in Chat Components
Any callback that reads `messages` (or similar array state) inside `useCallback` will capture a stale snapshot. Fix: use a `messagesRef` pattern — `const messagesRef = useRef([]); messagesRef.current = messages;` — and read `messagesRef.current` inside callbacks.

### 3. Component Definitions Inside Render Functions
Never define a component (e.g. `RecipeCard`) inside another component's render body. Every parent re-render recreates the component identity, destroying internal state (like `useState` for expand/collapse). Extract it as a standalone function component outside the parent, passing data via props.

### 4. Safe Area on Input Bars
Bottom-pinned input bars must include `paddingBottom: insets.bottom` (from `useSafeAreaInsets`) to clear the iPhone home indicator. Without it, the input overlaps the gesture bar on notched devices.

### 5. Edge Function URL Detection
Never use broad checks like `url.includes('http')` — it matches every URL including the API endpoint itself. Use an allowlist of known recipe site patterns (YouTube, TikTok, Instagram, allrecipes, etc.) plus keyword heuristics.

### 6. Cost-Benefit Analysis on Every Technical Decision
**Rule:** Before implementing any solution that involves API calls, AI model usage, or data transfer, always assess the cost implications and propose the most cost-effective approach that doesn't compromise user experience or business objectives.

**If a cheaper alternative exists that preserves UX:** Use it without asking. Example: extracting text from a PDF server-side before sending to GPT-4o costs fractions of a cent vs sending raw base64 as text tokens ($8+ for a 10MB file). There's no UX tradeoff — use the cheaper path.

**If the cheaper alternative involves a UX or business tradeoff:** Stop and explain the options to the user with clear cost/benefit numbers before proceeding. Example: "We can support 10MB PDFs with server-side extraction (~$0.01/request) or skip PDF support entirely (free). The extraction adds 2-3 seconds of processing time."

**Anti-patterns to avoid:**
- Sending raw binary data (base64 PDF, full audio blobs) directly into LLM text context windows — always preprocess first
- Arbitrary limits (truncation, file size caps) without explaining the cost driver and alternatives
- Choosing an expensive approach by default when a cheaper one exists at the same quality level
- Silently making cost-impacting decisions without flagging them

**Apply to:** API calls (OpenAI, Whisper, any LLM), Supabase Edge Function compute time, data transfer volumes, embedding generation, image processing.

### 7. Keyboard Avoidance in Modal Screens
**`KeyboardAvoidingView` does NOT work reliably with `presentation: "modal"` on iOS.** Card modals have a frame offset that KAV cannot calculate correctly, resulting in the keyboard covering the input bar. This was verified on device — KAV with any `keyboardVerticalOffset` value still fails for modals.

**Correct pattern:** Skip KAV entirely for modal screens. Instead, track the actual keyboard height via `Keyboard.addListener` and apply it as `marginBottom` on the input bar container. This is pixel-perfect on all devices.

```tsx
// ✅ Parent modal screen — plain View, no KAV
<View style={{ flex: 1, paddingTop: insets.top }}>
  {/* header */}
  <View style={{ flex: 1 }}>
    <ChatComponent />
  </View>
</View>

// ✅ Child component — manual keyboard height tracking
const [keyboardHeight, setKeyboardHeight] = useState(0);
const [keyboardVisible, setKeyboardVisible] = useState(false);

useEffect(() => {
  const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
  const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
  const onShow = (e) => { setKeyboardVisible(true); setKeyboardHeight(e.endCoordinates.height); };
  const onHide = () => { setKeyboardVisible(false); setKeyboardHeight(0); };
  const sub1 = Keyboard.addListener(showEvent, onShow);
  const sub2 = Keyboard.addListener(hideEvent, onHide);
  return () => { sub1.remove(); sub2.remove(); };
}, []);

// Input bar — shifts up by exact keyboard height
<View style={{
  paddingBottom: keyboardVisible ? Spacing.xs : insets.bottom,
  marginBottom: keyboardVisible ? keyboardHeight - insets.bottom : 0,
}}>
  {/* input bar */}
</View>
```

**Note:** `keyboardHeight - insets.bottom` avoids double-counting the safe area that the keyboard already covers.

### 8. Modal Stack Dismissal — Always Use `router.dismissAll()`
**Never use `router.replace()`, `router.push()`, or `router.back(); router.dismiss()` to close a chain of stacked modals.** These patterns either leave modals stranded in the stack (making the app appear frozen) or introduce race conditions when two calls fire before the first finishes processing.

**Correct pattern:** Use `router.dismissAll()` after any save/complete action in a modal screen. It closes the entire modal stack in one call regardless of how many modals are stacked (1, 2, or 3). This works identically whether the modal was opened from the Plan tab, Recipes tab, or recipe-detail.

```tsx
// ✅ Correct — one call, all modals gone
addRecipe(meal, { skipSync: true });
syncRecipeNow(meal).catch(console.error);
router.dismissAll();

// ❌ Wrong — race condition between two async router operations
router.back();
router.dismiss();

// ❌ Wrong — stacks the tab on top of unclosed modals
router.push('/(tabs)/recipes');

// ❌ Wrong — only replaces the TOP modal, leaves others in the stack
router.replace('/(tabs)');
```

**Screens that must follow this pattern:** `add-recipe-review.tsx`, `add-recipe-manual.tsx`, `ai-chef.tsx`, `meal-picker/manual.tsx`, `meal-picker/delivery.tsx`.

### 9. Always Use `expo-image`, Never React Native's `Image`
React Native's built-in `<Image>` from `'react-native'` has **no disk caching**. Every cold start or app resume re-downloads all images from the network. Always use `expo-image` instead:

```tsx
// ✅ Correct — disk-cached, async layout, no re-downloads
import { Image } from 'expo-image';
<Image source={{ uri: url }} contentFit="cover" cachePolicy="memory-disk" />

// ❌ Wrong — no cache, synchronous layout, re-downloads every time
import { Image } from 'react-native';
<Image source={{ uri: url }} resizeMode="cover" />
```

**Key API difference:** `expo-image` uses `contentFit` instead of `resizeMode`, and supports `cachePolicy`.

### 10. TanStack Query — Keep Sensible Defaults
The QueryClient must have `staleTime` and `gcTime` configured. Without them, every tab switch and app resume triggers a full network refetch, causing visible loading delays.

```tsx
// ✅ Correct — in _layout.tsx
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,   // 5 min
      gcTime: 30 * 60 * 1000,      // 30 min
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    },
  },
});
```

### 11. No Unsplash in the App
The app does not use Unsplash for any image functionality. AI-generated images are created via the image generation service and stored in Supabase Storage. Some legacy curated recipe data in the DB still has Unsplash URLs — these are leftover from the old Discover tab and are not actively used. The onboarding screens use static food photo URLs for decorative backgrounds (not an API integration).

### 12. Rork Metro Wrapper Caches Old Bundles — Must Remove for Local Expo
**The `@rork-ai/toolkit-sdk` package includes a Metro transformer (`withRorkMetro()` in `metro.config.js`) that caches pre-compiled bundles.** When running locally with `npx expo start`, this wrapper silently serves stale cached code instead of reading updated source files from disk. Code changes appear on GitHub but never render on device — clearing Metro cache and `.expo` alone does NOT fix it.

**When switching from Rork to local Expo development:**
1. Remove the Rork Metro wrapper from `metro.config.js`:
   ```js
   // ✅ Correct — vanilla Expo Metro
   const { getDefaultConfig } = require("expo/metro-config");
   module.exports = getDefaultConfig(__dirname);

   // ❌ Wrong — Rork wrapper caches old bundles
   const { withRorkMetro } = require("@rork-ai/toolkit-sdk/metro");
   module.exports = withRorkMetro(config);
   ```
2. Uninstall the Rork SDK: `npm uninstall @rork-ai/toolkit-sdk --legacy-peer-deps`
3. Clean all caches: `rm -rf node_modules/.cache .expo`
4. Reinstall: `npm install --legacy-peer-deps`
5. Start fresh: `npx expo start --clear`

**All 5 steps are required.** Skipping the uninstall or only clearing cache will NOT work — the SDK's metro-transformer hooks into the bundler even without `withRorkMetro()` in the config if the package is still installed.

### 13. Pushing to GitHub from Cowork — Use git push, Not API
**The Cowork sandbox blocks all HTTPS traffic to `api.github.com` via its proxy.** Python `requests`, `urllib`, `PyGithub`, `curl`, and Node.js `https` all fail with `403 Forbidden` or DNS resolution errors. Do NOT waste time trying API-based approaches.

**What works:** Embed the PAT directly in the git remote URL, then use `git push`:
```bash
git remote set-url origin https://<PAT>@github.com/abhundance/rork-meal-plan-app.git
git add <files>
git commit -m "message"
git push origin master:main   # ← ALWAYS push to main, not master
```

**CRITICAL: The user's repo default branch is `main`.** The Cowork sandbox local clone uses `master`. Always push with `master:main` refspec. Pushing to `master` only (without `:main`) creates a separate branch the user never pulls from — `git pull` will say "already up to date" even though the changes aren't there. When in doubt, run `git branch -a` to confirm branch names before pushing.

**What does NOT work (all blocked by sandbox proxy):**
- `curl` to api.github.com
- Python `requests` / `urllib` / `PyGithub`
- Node.js `https` / `fetch`
- SOCKS proxy on any port
- `gh` CLI (not installed)

### 14. User's Machine Has Local Edits — Always Use `git stash && git pull`
**Never tell the user to run `git pull` alone.** The user's machine often has local uncommitted changes to files (from Expo's hot-reload, linters, or previous edits). A plain `git pull` will abort with "Your local changes would be overwritten by merge" — confusing and frustrating for a non-technical user.

**Always give the user this exact three-command sequence:**
```bash
git stash && git pull && npx expo start --clear
```
- `git stash` parks local changes safely before the pull
- `git pull` can then merge cleanly
- `npx expo start --clear` ensures Metro picks up the new code with a clean cache

**Always verify the pull worked** by asking the user to run `git log --oneline -1` and confirming the hash matches the last pushed commit. If it doesn't match, the fix is not on their device — do not proceed as if it is.

**Important:** `.git/index.lock` and `.git/config.lock` files may exist from previous failed git operations. If `git remote set-url` or `git commit` fails with "File exists", check and remove these lock files first. They may require `mcp__cowork__allow_cowork_file_delete` to remove.
