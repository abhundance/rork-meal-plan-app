# Onboarding v2 — Implementation Plan

**Branch:** `feat/onboarding-v2`
**Rollback tag:** `pre-onboarding-v2`
**Started:** 2026-05-04

## Goal
Replace the current 8-screen onboarding (`auth → setup → setup-size → setup-units → slots → preview → account → welcome`) with a leaner 5-screen editorial flow that captures dietary + household composition, and add a one-time 4-step coachmark tour on the Plan tab after first sign-in.

## New flow
```
1. Hero    — edge-to-edge food image, "Plan dinner. Effortlessly."
2. Family  — name + adults stepper + kids stepper + age chips
3. Dietary — pill grid (Vegetarian/Vegan/GF/etc.) + "None of these" exclusivity
4. Rhythm  — meal slot toggles + units segmented control
5. Welcome — celebration, "Open my plan"
   → /(tabs)/(home) → 4-step coachmark tour fires on first view
```

## Stages

- [x] Stage 0 — Tag `pre-onboarding-v2`, branch `feat/onboarding-v2`, write this file
- [ ] Stage 1 — Add `household_adults`, `household_kids`, `kids_ages` fields to OnboardingProvider + OnboardingData type
- [ ] Stage 2 — `components/OnboardingProgress.tsx` (4 dots, primary-red active, smooth fill animation)
- [ ] Stage 3 — `components/CoachmarkOverlay.tsx` (dim + spotlight + bubble + step counter)
- [ ] Stage 4 — Replace `app/onboarding/auth.tsx` body with new hero (edge-to-edge image, no wordmark, tight CTA grouping)
- [ ] Stage 5 — Create `app/onboarding/family.tsx`
- [ ] Stage 6 — Create `app/onboarding/dietary.tsx`
- [ ] Stage 7 — Create `app/onboarding/rhythm.tsx`
- [ ] Stage 8 — Rewrite `app/onboarding/welcome.tsx` body
- [ ] Stage 9 — Wire `CoachmarkOverlay` into Plan tab with 4 stops + AsyncStorage gate
- [ ] Stage 10 — Update `app/onboarding/_layout.tsx`; delete legacy screens

## Contracts that MUST be preserved
- `auth.tsx` is the entry; `gestureEnabled: false`. Anonymous auth fires from `AuthProvider` — not in this screen.
- `welcome.tsx` sequence: build `meal_slots` from `enabled_slots` → `updateFamilySettings({ family_name, measurement_units, meal_slots, default_serving_size })` → Supabase `families.update({ onboarding_completed: true, onboarding_step: 99 })` → `completeOnboarding()` → `router.replace('/(tabs)')`. `gestureEnabled: false`.
- Slots: minimum 1 must remain enabled. Default `['breakfast','lunch','dinner']`. Canonical order from existing `SLOTS` constant preserved.
- Account/auth flows removed from onboarding (anonymous-first). Account upgrade deferred to a follow-up PR.
- All design tokens from `constants/colors.ts` + `constants/theme.ts`. No hardcoded hex.
- Reuse `PrimaryButton`, `InputField`, `ServingStepper`, `SegmentedControl`, `DietaryPillGrid` — exact prop signatures.

## Out of scope (v2)
- Account upgrade flow (anonymous → real email/social) — follow-up PR
- Pre-curated "starter weeks" for the Plan tab — option 5 chosen, rely on existing 20-recipe seed in Recipes tab
- Real Lottie / video assets for the hero
