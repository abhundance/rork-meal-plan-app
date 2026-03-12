/**
 * Chapter 4 interstitial — "Your meal plan"
 * Sits between planning-style and configure-slots.
 * Introduces the plan configuration chapter.
 */
import React from 'react';
import { router, Href } from 'expo-router';
import ChapterIntro from '@/components/ChapterIntro';

export default function ChapterPlanScreen() {
  return (
    <ChapterIntro
      chapterNumber={4}
      totalChapters={4}
      imageUri="https://images.unsplash.com/photo-1547592180-85f173990554?w=1080&q=85"
      icon="📋"
      title={`Build your\nfirst plan`}
      subtitle="Choose your meal slots and pick a few favourites — your planner will be ready in seconds."
      ctaLabel="Almost there"
      onContinue={() => router.push('/onboarding/configure-slots' as Href)}
    />
  );
}
