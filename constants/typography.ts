import { TextStyle } from 'react-native';
import Colors from './colors';

export const Typography: Record<string, TextStyle> = {
  h1: {
    fontSize: 28,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 42,
  },
  h2: {
    fontSize: 22,
    fontWeight: '700' as const,
    color: Colors.text,
    lineHeight: 33,
  },
  h3: {
    fontSize: 18,
    fontWeight: '600' as const,
    color: Colors.text,
    lineHeight: 27,
  },
  body: {
    fontSize: 16,
    fontWeight: '400' as const,
    color: Colors.text,
    lineHeight: 24,
  },
  small: {
    fontSize: 13,
    fontWeight: '400' as const,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  button: {
    fontSize: 16,
    fontWeight: '600' as const,
    lineHeight: 24,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
  },
};

export default Typography;
