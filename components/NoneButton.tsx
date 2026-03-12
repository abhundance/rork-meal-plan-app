import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius } from '@/constants/theme';

interface NoneButtonProps {
  label?: string;
  onPress: () => void;
  testID?: string;
}

/**
 * NoneButton — equal-weight secondary action for onboarding dietary screens.
 * Displayed below the primary CTA so users clearly see "none of these apply"
 * as a real option, not a hidden skip link.
 */
export default function NoneButton({
  label = 'None of these apply to us',
  onPress,
  testID,
}: NoneButtonProps) {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}
    >
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    marginTop: 10,
  },
  label: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
  },
});
