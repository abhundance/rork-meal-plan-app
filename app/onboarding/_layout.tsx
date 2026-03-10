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
      {/* Entry screen — no back gesture (nothing behind it) */}
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />

      {/* Step 1 */}
      <Stack.Screen name="region" />

      {/* Steps 2–11 */}
      <Stack.Screen name="family-name" />
      <Stack.Screen name="household-size" />
      <Stack.Screen name="family-dietary" />
      <Stack.Screen name="personal-goal" />
      <Stack.Screen name="personal-goal-diet" />
      <Stack.Screen name="personal-goal-life" />
      <Stack.Screen name="personal-goal-health" />
      <Stack.Screen name="cuisines" />
      <Stack.Screen name="cooking-time" />
      <Stack.Screen name="planning-style" />
      <Stack.Screen name="configure-slots" />
      <Stack.Screen name="breakfast-picks" />
      <Stack.Screen name="lunch-picks" />
      <Stack.Screen name="dinner-picks" />

      {/* Terminal screen — no going back once complete */}
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />

      {/* Legacy screens (kept for safety) */}
      <Stack.Screen name="meal-slots" />
      <Stack.Screen name="invite-members" />
      <Stack.Screen name="personal-dietary" />
      <Stack.Screen name="walkthrough" options={{ animation: 'fade' }} />
    </Stack>
  );
}
