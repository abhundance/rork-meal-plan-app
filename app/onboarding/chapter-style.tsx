/**
 * Chapter 3 interstitial — "Your cooking style"
 * Sits between personal-goal and cuisines.
 * Introduces the cooking preferences chapter.
 */
import React from 'react';
import { router, Href } from 'expo-router';
import ChapterIntro from '@/components/ChapterIntro';

export default function ChapterStyleScreen() {
  return (
    <ChapterIntro
      chapterNumber={3}
      totalChapters={4}
      imageUri="https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=1080&q=85"
      icon="👨‍🍳"
      title={`How you\ncook`}
      subtitle="From quick weeknight dinners to leisurely weekend feasts — tell us how you roll."
      ctaLabel="Next up"
      onContinue={() => router.push('/onboarding/cuisines' as Href)}
    />
  );
}
