import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/theme';

export default function AddMealPasteScreen() {
  const insets = useSafeAreaInsets();
  const [text, setText] = useState<string>('');
  const extractScale = React.useRef(new Animated.Value(1)).current;

  const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
  const hasText = text.trim().length > 0;

  const handleExtractPressIn = () => {
    if (!hasText) return;
    Animated.timing(extractScale, {
      toValue: 0.96,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleExtractPressOut = () => {
    Animated.timing(extractScale, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  };

  const handleExtract = () => {
    if (!hasText) return;
    router.push({
      pathname: '/add-meal-review' as never,
      params: {
        inputMode: 'text',
        inputText: text.trim(),
      },
    });
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <View
          style={[
            styles.header,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.titleText}>Paste Recipe</Text>

          <Animated.View style={{ transform: [{ scale: extractScale }] }}>
            <Pressable
              onPress={handleExtract}
              onPressIn={handleExtractPressIn}
              onPressOut={handleExtractPressOut}
              disabled={!hasText}
              hitSlop={12}
            >
              <Text style={[styles.extractText, !hasText && styles.extractTextInactive]}>
                Extract →
              </Text>
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.textAreaSection}>
          <TextInput
            style={styles.textInput}
            multiline
            autoFocus
            value={text}
            onChangeText={setText}
            placeholder={`Paste your recipe here...\n\nWorks best with:\n· A full recipe copied from a website\n· Notes from a cookbook or magazine\n· A recipe sent in a message or email\n· Any text that describes a dish with ingredients and steps`}
            placeholderTextColor={Colors.textSecondary}
            scrollEnabled
            textAlignVertical="top"
          />
        </View>

        <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.sm }]}>
          <Text style={[styles.wordCount, wordCount === 0 && styles.wordCountEmpty]}>
            {wordCount} words
          </Text>

          {hasText && (
            <Pressable onPress={() => setText('')} hitSlop={12}>
              <Ionicons name="trash-outline" size={18} color={Colors.textSecondary} />
            </Pressable>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },
  extractText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  extractTextInactive: {
    color: Colors.inactive,
  },
  textAreaSection: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
    textAlignVertical: 'top',
  },
  footer: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCount: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  wordCountEmpty: {
    color: Colors.border,
  },
});
