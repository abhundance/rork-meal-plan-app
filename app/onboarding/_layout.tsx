import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

/**
 * Onboarding stack — v2 redesign
 *
 * 5-screen editorial flow: auth → family → dietary → rhythm → welcome.
 * `auth` and `welcome` are terminal endpoints with no back gesture.
 *
 * `account` remains registered for the deferred anonymous → real-auth
 * upgrade flow (reachable from Settings later); not in the active chain.
 */
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
      {/* Screen 1 — Hero (edge-to-edge food image) */}
      <Stack.Screen name="auth" options={{ gestureEnabled: false }} />

      {/* Screen 2 — Family (name + adults + kids + ages) */}
      <Stack.Screen name="family" />

      {/* Screen 3 — Dietary (pill grid) */}
      <Stack.Screen name="dietary" />

      {/* Screen 4 — Rhythm (slot toggles + units) */}
      <Stack.Screen name="rhythm" />

      {/* Screen 5 — Welcome (celebration + Supabase sync, terminal) */}
      <Stack.Screen name="welcome" options={{ gestureEnabled: false }} />

      {/* Account upgrade — reachable from Settings (not in active flow) */}
      <Stack.Screen name="account" />
    </Stack>
  );
}
