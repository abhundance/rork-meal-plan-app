/**
 * PlanTabCoachmarks
 *
 * Self-contained 4-step onboarding tour for the Plan tab. Mounted by the
 * Plan tab once. Self-gates with AsyncStorage so it only fires on the
 * first viewing per user.
 *
 * Steps:
 *   1. Week strip       — "This is your week"
 *   2. Today's meal row — "Plan your meals here"
 *   3. Recipes tab      — "Your recipe library"
 *   4. Shopping tab     — "Shopping builds itself"
 *
 * Targets are computed from screen dimensions + safe-area insets — kept
 * approximate. If layouts shift, adjust the constants below; no need to
 * thread refs through the Plan tab.
 *
 * Storage key: @mealplan/coachmark_seen_v1_<userId>
 */
import React, { useEffect, useState, useCallback } from 'react';
import { Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CoachmarkOverlay, { CoachmarkTarget } from './CoachmarkOverlay';
import { useAuth } from '@/providers/AuthProvider';

const STORAGE_KEY_PREFIX = '@mealplan/coachmark_seen_v1_';

// ── Layout constants (approximate Plan tab geometry) ────────────────────
// Tweak these if the Plan tab layout changes.
const HEADER_HEIGHT          = 60; // page title + actions
const WEEK_STRIP_TOP_OFFSET  = 16; // gap below header
const WEEK_STRIP_HEIGHT      = 64; // day pill row height
const FIRST_SLOT_TOP_OFFSET  = 24; // gap below week strip
const FIRST_SLOT_HEIGHT      = 84; // single meal slot height
const TAB_BAR_HEIGHT         = 56; // iOS tab bar height (excluding safe area)

interface Step {
  title: string;
  body: string;
  arrow: 'up' | 'down';
  target: (insets: { top: number; bottom: number }) => CoachmarkTarget;
}

const SCREEN = Dimensions.get('window');

const STEPS: Step[] = [
  {
    title: 'This is your week',
    body: 'Tap any day to jump there.',
    arrow: 'up',
    target: ({ top }) => ({
      x: 16,
      y: top + HEADER_HEIGHT + WEEK_STRIP_TOP_OFFSET,
      width: SCREEN.width - 32,
      height: WEEK_STRIP_HEIGHT,
    }),
  },
  {
    title: 'Plan your meals here',
    body: 'Tap any slot to add, swap, or remove.',
    arrow: 'up',
    target: ({ top }) => ({
      x: 16,
      y: top + HEADER_HEIGHT + WEEK_STRIP_TOP_OFFSET + WEEK_STRIP_HEIGHT + FIRST_SLOT_TOP_OFFSET,
      width: SCREEN.width - 32,
      height: FIRST_SLOT_HEIGHT,
    }),
  },
  {
    title: 'Your recipe library',
    body: 'Save family favourites or add new from videos, photos, or text.',
    arrow: 'down',
    target: ({ bottom }) => {
      const tabWidth = SCREEN.width / 3;
      // Recipes is the rightmost tab in (tabs)/_layout — confirm against
      // your actual tab order if changed.
      return {
        x: tabWidth * 2 + 4,
        y: SCREEN.height - bottom - TAB_BAR_HEIGHT,
        width: tabWidth - 8,
        height: TAB_BAR_HEIGHT,
      };
    },
  },
  {
    title: 'Shopping builds itself',
    body: 'Every planned meal adds its ingredients here.',
    arrow: 'down',
    target: ({ bottom }) => {
      const tabWidth = SCREEN.width / 3;
      // Shopping is the middle tab in (tabs)/_layout
      return {
        x: tabWidth + 4,
        y: SCREEN.height - bottom - TAB_BAR_HEIGHT,
        width: tabWidth - 8,
        height: TAB_BAR_HEIGHT,
      };
    },
  },
];

interface PlanTabCoachmarksProps {
  /** Force-show the tour (used by Settings → Replay walkthrough). */
  forceShow?: boolean;
  /** Called when the user finishes or skips. */
  onClose?: () => void;
}

export default function PlanTabCoachmarks({ forceShow = false, onClose }: PlanTabCoachmarksProps) {
  const insets = useSafeAreaInsets();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [stepIndex, setStepIndex] = useState<number>(0);
  const [visible, setVisible] = useState<boolean>(false);
  const [checked, setChecked] = useState<boolean>(false);

  const userId = session?.user?.id;
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : null;

  // Decide whether to show on mount (and when auth finishes loading)
  useEffect(() => {
    if (isAuthLoading) return;
    if (checked) return;

    if (forceShow) {
      setVisible(true);
      setStepIndex(0);
      setChecked(true);
      return;
    }

    if (!storageKey) {
      // No user yet — wait. Don't mark as checked.
      return;
    }

    AsyncStorage.getItem(storageKey)
      .then(value => {
        setChecked(true);
        if (!value) {
          setVisible(true);
          setStepIndex(0);
        }
      })
      .catch(err => {
        console.warn('[Coachmarks] AsyncStorage read error:', err);
        setChecked(true);
      });
  }, [isAuthLoading, storageKey, forceShow, checked]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    if (storageKey) {
      try {
        await AsyncStorage.setItem(storageKey, 'done');
      } catch (err) {
        console.warn('[Coachmarks] AsyncStorage write error:', err);
      }
    }
    onClose?.();
  }, [storageKey, onClose]);

  const handleNext = useCallback(() => {
    if (stepIndex >= STEPS.length - 1) {
      dismiss();
    } else {
      setStepIndex(i => i + 1);
    }
  }, [stepIndex, dismiss]);

  if (!visible) return null;

  const step = STEPS[stepIndex];
  const target = step.target(insets);

  return (
    <CoachmarkOverlay
      visible={visible}
      step={stepIndex + 1}
      total={STEPS.length}
      title={step.title}
      body={step.body}
      target={target}
      arrow={step.arrow}
      onNext={handleNext}
      onSkip={dismiss}
      isLast={stepIndex === STEPS.length - 1}
    />
  );
}
