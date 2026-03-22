import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Text,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Colors from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/theme';
import { FontFamily } from '@/constants/typography';
import type { InputType, UrlSource } from '@/utils/inputDetection';

interface SmartBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onCameraPress: () => void;
  onMicPress: () => void;
  inputType: InputType;
  urlSource?: UrlSource;
  autoFocus?: boolean;
  disabled?: boolean;
}

const PLACEHOLDERS = [
  'Paste a recipe link...',
  'Type a meal name...',
  'Ask AI Chef anything...',
  "What's for dinner tonight?",
];

export default function SmartBar({
  value,
  onChangeText,
  onCameraPress,
  onMicPress,
  inputType,
  urlSource,
  autoFocus = false,
  disabled = false,
}: SmartBarProps) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const inputRef = useRef<TextInput>(null);

  // Rotate placeholder text every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDERS.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [opacityAnim]);

  const handleClear = useCallback(() => {
    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  const currentPlaceholder = PLACEHOLDERS[placeholderIndex];

  return (
    <View style={[styles.container, disabled && styles.disabled]}>
      {/* Camera icon */}
      <TouchableOpacity
        onPress={onCameraPress}
        disabled={disabled}
        style={styles.iconButton}
        activeOpacity={0.6}
      >
        <Ionicons name="camera-outline" size={20} color={Colors.text} />
      </TouchableOpacity>

      {/* Text input */}
      <TextInput
        ref={inputRef}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={currentPlaceholder}
        placeholderTextColor={Colors.inactive}
        editable={!disabled}
        autoFocus={autoFocus}
      />

      {/* Clear button or Mic button */}
      {value.trim().length > 0 ? (
        <TouchableOpacity
          onPress={handleClear}
          disabled={disabled}
          style={styles.iconButton}
          activeOpacity={0.6}
        >
          <Ionicons name="close-circle" size={20} color={Colors.text} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          onPress={onMicPress}
          disabled={disabled}
          style={styles.iconButton}
          activeOpacity={0.6}
        >
          <Ionicons name="mic-outline" size={20} color={Colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.sm,
    height: 48,
    gap: Spacing.sm,
  },
  disabled: {
    opacity: 0.5,
    pointerEvents: 'none',
  },
  iconButton: {
    padding: Spacing.xs,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.regular,
    fontSize: 16,
    color: Colors.text,
    padding: 0,
  },
});
