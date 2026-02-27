import React, { useRef, useState } from 'react';
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
  ExtractedRecipe,
} from '@/services/recipeExtraction';

export default function AddMealVideoScreen() {
  const insets = useSafeAreaInsets();
  const [url, setUrl] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const extractScale = useRef(new Animated.Value(1)).current;

  const trimmed = url.trim();
  const hasUrl = trimmed.length > 0;
  const detectedType = hasUrl ? detectVideoUrlType(trimmed) : null;

  const handleExtractPressIn = () => {
    if (!hasUrl) return;
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

  const handleExtract = async () => {
    if (!hasUrl || isExtracting) return;
    console.log('[add-recipe-video] Extracting from URL:', trimmed);
    setIsExtracting(true);
    try {
      const result: ExtractedRecipe = await extractRecipeFromVideoUrl(trimmed);
      console.log('[add-recipe-video] Extraction success:', result.name);
      router.push({
        pathname: '/add-recipe-review' as never,
        params: {
          inputMode: 'url',
          inputUrl: trimmed,
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
    } catch (err) {
      console.error('[add-recipe-video] Extraction failed:', err);
      Alert.alert(
        'Extraction Failed',
        'We could not extract a recipe from that link. For video links, make sure the recipe is in the description. For websites, make sure the page contains a full recipe.',
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

        <View style={styles.content}>
          <View style={styles.disclaimer}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.disclaimerText}>
              This only works if the full recipe — including ingredients and steps — is listed in the video description or caption. If the recipe is only spoken in the video, use Voice or Paste Text instead.
            </Text>
          </View>

          <View style={styles.inputRow}>
            <Ionicons name="link-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={styles.textInput}
              value={url}
              onChangeText={setUrl}
              placeholder="https://youtube.com/... or tiktok.com/..."
              placeholderTextColor={Colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              returnKeyType="go"
              onSubmitEditing={handleExtract}
              editable={!isExtracting}
            />
          </View>

          {hasUrl && detectedType !== 'other' && detectedType !== null && (
            <View style={styles.hintRow}>
              {detectedType === 'youtube' ? (
                <>
                  <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                  <Text style={styles.hintText}>YouTube link detected</Text>
                </>
              ) : (
                <>
                  <Ionicons name="logo-tiktok" size={16} color={Colors.text} />
                  <Text style={styles.hintText}>TikTok link detected</Text>
                </>
              )}
            </View>
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
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
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
  inputRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingLeft: Spacing.lg,
    paddingRight: Spacing.lg,
  },
  inputIcon: {
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    height: '100%',
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  hintText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
