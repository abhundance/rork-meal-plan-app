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

### 6. Keyboard Avoidance in Modal Screens
**Never** put `KeyboardAvoidingView` (KAV) inside a child component with a hardcoded `keyboardVerticalOffset`. The offset depends on everything above the KAV (safe area, headers, toggles, modal card gap) — a hardcoded value is always wrong on some device.

**Correct pattern:** Place the KAV at the **root of the modal screen** (the parent), wrapping header + content + input together. Use `behavior="padding"` on iOS with a small `keyboardVerticalOffset` (≈10 for card modals, 0 for fullscreen). The child component should be a plain `View`.

Also: when keyboard is open, drop bottom safe-area padding to a small constant (e.g. `Spacing.xs`) — the keyboard already covers the home indicator area. Use `Keyboard.addListener('keyboardWillShow'/'keyboardWillHide')` to track visibility.

```tsx
// ✅ Parent modal screen
<KeyboardAvoidingView
  style={{ flex: 1 }}
  behavior={Platform.OS === 'ios' ? 'padding' : undefined}
  keyboardVerticalOffset={Platform.OS === 'ios' ? 10 : 0}
>
  {/* header, toggle, chat child */}
</KeyboardAvoidingView>

// ✅ Child component — plain View, dynamic bottom padding
<View style={{ flex: 1 }}>
  <FlatList ... />
  <View style={{ paddingBottom: keyboardVisible ? 4 : insets.bottom }}>
    {/* input bar */}
  </View>
</View>
```
