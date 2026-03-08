import { TextStyle } from 'react-native';
import Colors from './colors';

// Font family strings — loaded via @expo-google-fonts/nunito in app/_layout.tsx
export const FontFamily = {
  regular: 'Nunito_400Regular',
  semiBold: 'Nunito_600SemiBold',
  bold: 'Nunito_700Bold',
};

// 6-stop type scale
export const FontSize = {
  xs: 11,      // tab labels, badges
  sm: 13,      // captions, metadata, filter chips
  base: 15,    // body text, list items
  md: 17,      // section headers, card titles
  lg: 20,      // screen headings
  display: 28, // hero titles, onboarding
};

export const FontWeight = {
  regular: '400' as const,
  semiBold: '600' as const,
  bold: '700' as const,
};

// Pre-composed TextStyle objects — import these for common patterns
export const Typography: Record<string, TextStyle> = {
  display: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.display,
    color: Colors.text,
    lineHeight: 38,
  },
  lg: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.text,
    lineHeight: 28,
  },
  md: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  base: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text,
    lineHeight: 22,
  },
  sm: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  xs: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    lineHeight: 16,
  },
  // Legacy aliases kept for compatibility
  h1: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.display,
    color: Colors.text,
    lineHeight: 38,
  },
  h2: {
    fontFamily: FontFamily.bold,
    fontSize: FontSize.lg,
    color: Colors.text,
    lineHeight: 28,
  },
  h3: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.md,
    color: Colors.text,
    lineHeight: 24,
  },
  body: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.base,
    color: Colors.text,
    lineHeight: 22,
  },
  small: {
    fontFamily: FontFamily.regular,
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.base,
    lineHeight: 22,
  },
  tabLabel: {
    fontFamily: FontFamily.semiBold,
    fontSize: FontSize.xs,
    lineHeight: 16,
  },
};

export default Typography;
