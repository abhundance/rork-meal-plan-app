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
