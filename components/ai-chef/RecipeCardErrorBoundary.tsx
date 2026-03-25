/**
 * RecipeCardErrorBoundary — Catches render errors in RecipeCard
 * so a malformed recipe doesn't crash the entire chat.
 *
 * Displays a friendly fallback message and logs the error.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { Spacing, BorderRadius } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

export default class RecipeCardErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[RecipeCard] Render error:', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={boundaryStyles.fallback}>
          <Text style={boundaryStyles.fallbackText}>
            Couldn't display this recipe. Try asking AI Chef again.
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}

const boundaryStyles = StyleSheet.create({
  fallback: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.card,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fallbackText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
