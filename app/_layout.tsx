import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FamilySettingsProvider } from "@/providers/FamilySettingsProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { MealPlanProvider } from "@/providers/MealPlanProvider";
import { ShoppingProvider } from "@/providers/ShoppingProvider";
import { FavsProvider } from "@/providers/FavsProvider";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="onboarding"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen
        name="family-settings"
        options={{
          headerShown: false,
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="meal-detail"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="add-meal"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-meal-entry"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-meal-review"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="chef-profile"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="discover-search"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="collection"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="find-chefs"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="filtered-meals"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen name="add-meal-video" options={{ headerShown: false }} />
      <Stack.Screen name="add-meal-paste" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <FamilySettingsProvider>
          <OnboardingProvider>
            <MealPlanProvider>
              <ShoppingProvider>
                <FavsProvider>
                  <RootLayoutNav />
                </FavsProvider>
              </ShoppingProvider>
            </MealPlanProvider>
          </OnboardingProvider>
        </FamilySettingsProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
