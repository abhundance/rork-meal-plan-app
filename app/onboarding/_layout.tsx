import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: true,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      {/* Screen 1 — Launch Mosaic: no back gesture (nothing behind it) */}
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />

      {/* Screen 2 — Quick Setup: household size + measurement units */}
      <Stack.Screen name="setup" />

      {/* Screen 3 — Meal Slots: toggle breakfast/lunch/dinner/snacks */}
      <Stack.Screen name="slots" />

      {/* Screen 4 — Feature Preview: Plan / Recipes / Shopping */}
      <Stack.Screen name="preview" />

      {/* Screen 5 — Create Account: Google/Apple stubs + email OTP */}
      <Stack.Screen name="account" />

      {/* Screen 6 — Welcome: animated celebration, syncs settings, enters app */}
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />

      {/* ── Legacy screens (kept for safe routing, not navigated to in new flow) ── */}
      <Stack.Screen name="auth-options" options={{ animation: 'slide_from_bottom' }} />
      <Stack.Screen name="region" />
      <Stack.Screen name="family-name" />
      <Stack.Screen name="household-size" />
      <Stack.Screen name="cultural-restrictions" />
      <Stack.Screen name="family-dietary" />
      <Stack.Screen name="diet-preferences" />
      <Stack.Screen name="household-type" />
      <Stack.Screen name="personal-goal" />
      <Stack.Screen name="cuisines" />
      <Stack.Screen name="cooking-time" />
      <Stack.Screen name="planning-style" />
      <Stack.Screen name="configure-slots" />
      <Stack.Screen name="breakfast-picks" />
      <Stack.Screen name="lunch-dinner-picks" />
      <Stack.Screen name="chapter-dietary" options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="chapter-style"   options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="chapter-plan"    options={{ animation: 'fade', gestureEnabled: false }} />
      <Stack.Screen name="meal-slots" />
      <Stack.Screen name="invite-members" />
      <Stack.Screen name="personal-dietary" />
      <Stack.Screen name="walkthrough" options={{ animation: 'fade' }} />
    </Stack>
  );
}
