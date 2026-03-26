# Plan Tab Daily View — Carousel Redesign

## Summary
Transform the DailyPlanView meal slots from a vertical list layout to a horizontal image carousel. Remove inline serving stepper. Each meal becomes a visual card with prominent image and name underneath.

## Decision Log
- **Serving stepper removed from plan view** — PM analysis confirmed: 70%+ users never adjust per-meal servings; 5-10% engagement rate; recipe detail screen is an acceptable fallback (10-15s); single source of truth improves shopping list accuracy.
- **Serving badge shown only when ≠ family default** — informational only, tap opens recipe detail.

## Implementation Plan

- [ ] **Phase 1: DailySlotCard → Carousel Layout**
  - Replace vertical `MealItemRow` list with horizontal `ScrollView` of `MealCarouselCard` components
  - Each card: ~104px wide, 96×96 image (borderRadius 14), meal name below (12px, 2 lines max)
  - "+" add button at end of carousel (dashed border, same height as cards)
  - Horizontal ScrollView with `showsHorizontalScrollIndicator={false}`
  - Keep existing slot label (BREAKFAST, LUNCH, etc.) above carousel
  - Keep existing empty state (dashed card with "Add Meal" CTA)

- [ ] **Phase 2: Serving Badge**
  - Small "×N" badge on bottom-right of image (only when servings ≠ family default)
  - Semi-transparent dark background, white text, 11px font
  - Purely informational — tapping the card navigates to recipe detail

- [ ] **Phase 3: Interaction Model**
  - Tap card → `onMealPress(meal)` (navigates to recipe detail, same as current)
  - Long-press → existing remove confirmation Alert
  - Swipe carousel horizontally for overflow meals
  - Keep existing swipe-day gesture on the outer container (horizontal pan ±60px)

- [ ] **Phase 4: Cleanup**
  - Remove MealItemRow component (no longer used)
  - Remove ServingStepper import (no longer used in this file)
  - Remove unused styles (itemRow, itemRowInner, itemDivider, itemNameCol, etc.)
  - Keep Card import for empty state

- [ ] **Phase 5: QA**
  - Verify empty slots render correctly
  - Verify single-meal slots (1 card + add button)
  - Verify multi-meal slots (3+ cards, scrollable)
  - Verify carousel scroll doesn't conflict with day-swipe gesture
  - Verify delivery meals still show correctly
  - Verify MealImagePlaceholder renders correctly for meals without images
  - Verify long-press remove still works
  - Verify no TypeScript errors
  - Verify all existing props/callbacks still connected
