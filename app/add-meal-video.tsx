import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { BorderRadius, Spacing } from '@/constants/theme';
import {
  detectVideoUrlType,
  extractRecipeFromVideoUrl,
} from '@/services/recipeExtraction';

export default function AddMealVideoScreen() {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [detectedType, setDetectedType] = useState<'youtube' | 'tiktok' | 'other' | null>(null);
  const inputRef = useRef<TextInput>(null);
  const extractScale = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(0)).current;

  const hasUrl = url.trim().length > 0;

  useEffect(() => {
    if (detectedType !== null) {
      Animated.timing(hintOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [detectedType, hintOpacity]);

  const handleChangeText = (text: string) => {
    setUrl(text);
    if (text.length > 10) {
      const type = detectVideoUrlType(text);
      setDetectedType(type);
    } else {
      setDetectedType(null);
    }
  };

  const handleExtractPressIn = () => {
    if (!hasUrl || isExtracting) return;
    Animated.timing(extractScale, { toValue: 0.96, duration: 150, useNativeDriver: true }).start();
  };

  const handleExtractPressOut = () => {
    Animated.timing(extractScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const handleExtract = async () => {
    if (!hasUrl || isExtracting) return;
    setIsExtracting(true);
    try {
      const result = await extractRecipeFromVideoUrl(url.trim());
      router.push({
        pathname: '/add-meal-review' as never,
        params: {
          inputMode: 'url',
          inputUrl: url.trim(),
          prefillName: result.name,
          prefillDescription: result.description,
          prefillCuisine: result.cuisine,
          prefillMealType: result.meal_type,
          prefillCookingTimeBand: result.cooking_time_band,
          prefillDietaryTags: JSON.stringify(result.dietary_tags),
          prefillIngredients: JSON.stringify(result.ingredients),
          prefillMethodSteps: JSON.stringify(result.method_steps),
          prefillServingSize: String(result.recipe_serving_size),
        },
      });
    } catch (e) {
      console.error('[AddMealVideo] extraction failed:', e);
      Alert.alert(
        'Extraction Failed',
        'We could not extract a recipe from that URL. Make sure the full recipe and ingredients are in the video description or caption.',
      );
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.flex}>
        <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          <Text style={styles.titleText}>Video Link</Text>

          <Animated.View style={{ transform: [{ scale: extractScale }] }}>
            <Pressable
              onPress={handleExtract}
              onPressIn={handleExtractPressIn}
              onPressOut={handleExtractPressOut}
              disabled={!hasUrl || isExtracting}
              hitSlop={12}
            >
              {isExtracting ? (
                <ActivityIndicator size="small" color={Colors.primary} />
              ) : (
                <Text style={[styles.extractText, !hasUrl && styles.extractTextInactive]}>
                  Extract →
                </Text>
              )}
            </Pressable>
          </Animated.View>
        </View>

        <View style={styles.body}>
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.disclaimerText}>
              Video links only work if the full recipe and ingredients are listed in the video description or caption.
            </Text>
          </View>

          <View style={styles.inputWrapper}>
            <Ionicons
              name="link-outline"
              size={18}
              color={Colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="https://youtube.com/... or https://tiktok.com/..."
              placeholderTextColor={Colors.textSecondary}
              value={url}
              onChangeText={handleChangeText}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleExtract}
              editable={!isExtracting}
            />
            {hasUrl && !isExtracting && (
              <Pressable onPress={() => { setUrl(''); setDetectedType(null); }} hitSlop={12}>
                <Ionicons name="close-circle" size={18} color={Colors.textSecondary} style={styles.clearIcon} />
              </Pressable>
            )}
          </View>

          <Animated.View style={[styles.hintRow, { opacity: hintOpacity }]}>
            {detectedType === 'youtube' && (
              <>
                <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                <Text style={styles.hintText}>YouTube link detected — we'll read the description</Text>
              </>
            )}
            {detectedType === 'tiktok' && (
              <>
                <Ionicons name="logo-tiktok" size={16} color={Colors.text} />
                <Text style={styles.hintText}>TikTok link detected — we'll read the caption</Text>
              </>
            )}
          </Animated.View>

          <View style={styles.supportedRow}>
            <Text style={styles.supportedLabel}>Works best with</Text>
            <View style={styles.supportedPills}>
              <View style={styles.pill}>
                <Ionicons name="logo-youtube" size={14} color="#FF0000" />
                <Text style={styles.pillText}>YouTube</Text>
              </View>
              <View style={styles.pill}>
                <Ionicons name="logo-tiktok" size={14} color={Colors.text} />
                <Text style={styles.pillText}>TikTok</Text>
              </View>
            </View>
          </View>
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
  body: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  disclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: Spacing.lg,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
    lineHeight: 18,
  },
  inputWrapper: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.sm,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '400',
    color: Colors.text,
    height: '100%',
  },
  clearIcon: {
    marginLeft: 6,
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.sm,
    marginLeft: 4,
    minHeight: 22,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  supportedRow: {
    marginTop: Spacing.xl,
  },
  supportedLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  supportedPills: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  pillText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
});
