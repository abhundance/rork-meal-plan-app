/**
 * Chapter 2 interstitial — "How you eat"
 * Sits between household-size and cultural-restrictions.
 * Introduces the dietary preferences chapter with a cinematic food image.
 */
import React from 'react';
import { router, Href } from 'expo-router';
import ChapterIntro from '@/components/ChapterIntro';

export default function ChapterDietaryScreen() {
  return (
    <ChapterIntro
      chapterNumber={2}
      totalChapters={4}
      imageUri="https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=1080&q=85"
      icon="🥗"
      title={`How you\neat`}
      subtitle="We'll personalise your plan around the way your household eats — no guesswork."
      ctaLabel="Let's do it"
      onContinue={() => router.push('/onboarding/cultural-restrictions' as Href)}
    />
  );
}
