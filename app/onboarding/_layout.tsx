import React from 'react';
import { Stack } from 'expo-router';
import Colors from '@/constants/colors';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="auth" />
      <Stack.Screen name="family-name" />
      <Stack.Screen name="household-size" />
      <Stack.Screen name="meal-slots" />
      <Stack.Screen name="family-dietary" />
      <Stack.Screen name="invite-members" />
      <Stack.Screen name="personal-dietary" />
      <Stack.Screen name="welcome" />
      <Stack.Screen name="walkthrough" options={{ animation: 'fade' }} />
    </Stack>
  );
}
