import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { FamilySettingsProvider } from "@/providers/FamilySettingsProvider";
import { OnboardingProvider } from "@/providers/OnboardingProvider";
import { MealPlanProvider } from "@/providers/MealPlanProvider";
import { ShoppingProvider } from "@/providers/ShoppingProvider";
import { FavsProvider } from "@/providers/FavsProvider";
import { DiscoverProvider } from "@/providers/DiscoverProvider";
import { AuthProvider } from "@/providers/AuthProvider";
import { AppState, Animated, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AlertCircle, Bike, X } from 'lucide-react-native';
import { useFonts, Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold } from '@expo-google-fonts/nunito';
import Colors from "@/constants/colors";
import { FontFamily } from "@/constants/typography";
import { Spacing, BorderRadius } from "@/constants/theme";
import { detectPlatformFromUrl, getPlatformLabel } from "@/services/deliveryUtils";
import { setPendingDeliveryLink } from "@/services/pendingDeliveryLink";

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={errorStyles.container}>
          <AlertCircle size={64} color={Colors.textSecondary} strokeWidth={1.5} />
          <Text style={errorStyles.title}>Something went wrong</Text>
          <Text style={errorStyles.message}>
            The app ran into an unexpected error. Tap below to try again.
          </Text>
          <TouchableOpacity
            style={errorStyles.button}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={errorStyles.buttonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xxxl,
  },
  title: {
    fontFamily: FontFamily.semiBold,
    fontSize: 20,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: Spacing.lg,
  },
  message: {
    fontFamily: FontFamily.regular,
    fontSize: 15,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    maxWidth: 280,
  },
  button: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingVertical: 14,
    paddingHorizontal: Spacing.xxxl,
    marginTop: Spacing.xxl,
  },
  buttonText: {
    fontFamily: FontFamily.semiBold,
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.white,
  },
});

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
        name="recipe-detail"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="add-recipe-manual"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-recipe-entry"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-recipe-review"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="discover-search"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="discover-collection"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="discover-filter-results"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen name="add-recipe-video" options={{ headerShown: false }} />
      <Stack.Screen name="add-recipe-paste" options={{ headerShown: false }} />
      <Stack.Screen
        name="meal-picker"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen
        name="add-to-favs"
        options={{ headerShown: false, presentation: "modal" }}
      />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}

function DeliveryBannerLayout() {
  const insets = useSafeAreaInsets();
  const [bannerUrl, setBannerUrl] = useState<string | null>(null);
  const [bannerPlatform, setBannerPlatform] = useState<string | null>(null);
  const lastShownUrl = useRef<string | null>(null);
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useRef(new Animated.Value(-120)).current;

  const dismissBanner = useCallback(() => {
    Animated.timing(translateY, {
      toValue: -120,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setBannerUrl(null);
    });
  }, [translateY]);

  const showBanner = useCallback((url: string, platform: string | null) => {
    setBannerUrl(url);
    setBannerPlatform(platform);
    Animated.spring(translateY, {
      toValue: 0,
      friction: 8,
      bounciness: 4,
      useNativeDriver: true,
    }).start();
    if (dismissTimeout.current) {
      clearTimeout(dismissTimeout.current);
    }
    dismissTimeout.current = setTimeout(() => {
      dismissBanner();
    }, 7000);
  }, [translateY, dismissBanner]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (nextAppState === 'active') {
        try {
          const text = await Clipboard.getStringAsync();
          const trimmed = text.trim();
          if (trimmed.startsWith('http')) {
            const platform = detectPlatformFromUrl(trimmed);
            if (platform !== null && trimmed !== lastShownUrl.current) {
              lastShownUrl.current = trimmed;
              showBanner(trimmed, platform);
            }
          }
        } catch (e) {
          console.log('[DeliveryBanner] Clipboard read error:', e);
        }
      }
    });
    return () => {
      subscription.remove();
      if (dismissTimeout.current) {
        clearTimeout(dismissTimeout.current);
      }
    };
  }, [showBanner]);

  const platformLabel = getPlatformLabel(bannerPlatform as Parameters<typeof getPlatformLabel>[0]);

  return (
    <View style={{ flex: 1 }}>
      <RootLayoutNav />
      <Animated.View
        style={[
          styles.bannerContainer,
          {
            top: insets.top + 12,
            transform: [{ translateY }],
          },
        ]}
      >
        {bannerUrl !== null && (
          <View style={styles.bannerCard}>
            <Bike size={18} color={Colors.primary} strokeWidth={2} />
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>{platformLabel} link detected</Text>
              <Text style={styles.bannerSubtitle}>Tap Add Meal to save it to your favourites</Text>
            </View>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => {
                if (bannerUrl) {
                  setPendingDeliveryLink(bannerUrl, bannerPlatform);
                  router.push('/(tabs)/favs');
                  dismissBanner();
                }
              }}
            >
              <Text style={styles.addButtonText}>Add Meal</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={dismissBanner} style={styles.closeButton}>
              <X size={16} color={Colors.textSecondary} strokeWidth={2} />
            </TouchableOpacity>
          </View>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bannerContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  bannerCard: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontFamily: FontFamily.semiBold,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  bannerSubtitle: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    fontWeight: '400',
    color: Colors.textSecondary,
    lineHeight: 15,
  },
  addButton: {
    borderRadius: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  addButtonText: {
    fontFamily: FontFamily.bold,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.white,
  },
  closeButton: {
    paddingLeft: 4,
  },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <StatusBar style="dark" />
          <AuthProvider>
            <FamilySettingsProvider>
              <OnboardingProvider>
                <MealPlanProvider>
                  <ShoppingProvider>
                    <FavsProvider>
                      <DiscoverProvider>
                        <DeliveryBannerLayout />
                      </DiscoverProvider>
                    </FavsProvider>
                  </ShoppingProvider>
                </MealPlanProvider>
              </OnboardingProvider>
            </FamilySettingsProvider>
          </AuthProvider>
        </GestureHandlerRootView>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
