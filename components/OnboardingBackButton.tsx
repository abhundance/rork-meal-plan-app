import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { ChevronLeft } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '@/constants/colors';

/**
 * Floating back button for onboarding screens.
 * Positions itself in the top-left corner, respecting the status bar safe area.
 * Renders nothing when there is no previous screen to go back to.
 */
export default function OnboardingBackButton() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  if (!navigation.canGoBack()) return null;

  return (
    <TouchableOpacity
      style={[styles.button, { top: insets.top + 6 }]}
      onPress={() => router.back()}
      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
      accessibilityLabel="Go back"
      accessibilityRole="button"
    >
      <ChevronLeft size={26} color={Colors.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    left: 8,
    zIndex: 10,
    padding: 4,
  },
});
