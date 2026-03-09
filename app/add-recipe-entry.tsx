import React, { useRef, useState } from 'react';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
import { ExtractedRecipe, extractRecipeFromVideoUrl, extractRecipeFromText } from '@/services/recipeExtraction';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Mic, Camera, Send, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { imageStore } from '@/services/imageStore';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';

const AI_BULLETS = [
  { emoji: '🔗', text: 'Paste a link from the web' },
  { emoji: '🎙️', text: 'Describe it by voice' },
  { emoji: '📷', text: 'Share a photo' },
  { emoji: '▶️', text: 'Paste a YouTube or TikTok link' },
];

export default function AddMealEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);

  const isUrl = (text: string) => {
    const lower = text.toLowerCase();
    return lower.startsWith('http://') || lower.startsWith('https://');
  };

  const handleAiSend = async () => {
    const input = aiInput.trim();
    if (!input || isExtracting) return;
    setIsExtracting(true);
    try {
      let result: ExtractedRecipe;
      if (isUrl(input)) {
        result = await extractRecipeFromVideoUrl(input);
      } else {
        result = await extractRecipeFromText(input);
      }
      router.push({
        pathname: '/add-recipe-review' as never,
        params: {
          inputMode: isUrl(input) ? 'url' : 'text',
          inputUrl: isUrl(input) ? input : undefined,
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
      console.error('[AddMealEntry] AI extract error:', err);
      Alert.alert(
        'Extraction Failed',
        isUrl(input)
          ? 'Could not extract a recipe from this link. Try copying the recipe text and typing it here instead.'
          : 'Could not extract a recipe from your description. Try adding more detail — ingredients, quantities, and cooking steps help.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Camera Access Required',
        Platform.OS === 'ios'
          ? 'Meal Plan needs camera access to photograph recipes. Tap Open Settings and enable Camera under Meal Plan.'
          : 'Meal Plan needs camera access to photograph recipes. Tap Open Settings and enable the Camera permission.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    imageStore.set(asset.base64 ?? '', asset.uri);
    router.push({
      pathname: '/add-recipe-review' as never,
      params: { inputMode: 'camera', imageUri: asset.uri },
    });
  };

  const handleVoiceExtracted = (result: ExtractedRecipe) => {
    setShowVoiceSheet(false);
    router.push({
      pathname: '/add-recipe-review' as never,
      params: {
        inputMode: 'voice',
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
  };

  return (
    <View style={[styles.root, { backgroundColor: Colors.background }]}>
      {/* ─── Header ─────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <ChevronLeft size={24} color={Colors.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a Recipe</Text>
        <View style={styles.backBtn} />
      </View>

      {/* ─── Mode toggle ────────────────────────────────── */}
      <View style={styles.toggleWrap}>
        <View style={styles.toggleTrack}>
          {/* Pill always sits on AI Mode since this screen IS AI Mode */}
          <View style={[styles.togglePill, styles.togglePillRight]} />
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => router.push('/add-recipe-manual' as never)}
            activeOpacity={0.8}
          >
            <Text style={styles.toggleLabel}>✏️  Manual</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleOption}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleLabel, styles.toggleLabelActive]}>✨  AI Mode</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── AI Mode ─────────────────────────────────────── */}
      <KeyboardAvoidingView
        style={styles.aiContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Chat area */}
        <ScrollView
          contentContainerStyle={styles.aiScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome bubble */}
          <View style={styles.aiBubble}>
            <View style={styles.aiBubbleIconRow}>
              <View style={styles.aiBubbleIconCircle}>
                <Sparkles size={18} color={Colors.primary} strokeWidth={2} />
              </View>
              <Text style={styles.aiBubbleName}>Meal Plan AI</Text>
            </View>
            <Text style={styles.aiBubbleIntro}>
              Hi! Share your recipe any way you like:
            </Text>
            {AI_BULLETS.map((b) => (
              <View key={b.emoji} style={styles.aiBulletRow}>
                <Text style={styles.aiBulletEmoji}>{b.emoji}</Text>
                <Text style={styles.aiBulletText}>{b.text}</Text>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Sticky input bar */}
        <View style={[styles.aiInputBar, { paddingBottom: insets.bottom + Spacing.sm }]}>
          {/* Camera shortcut */}
          <TouchableOpacity
            style={styles.aiInputAction}
            onPress={handleCamera}
            hitSlop={8}
          >
            <Camera size={22} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          {/* Mic shortcut */}
          <TouchableOpacity
            style={styles.aiInputAction}
            onPress={() => setShowVoiceSheet(true)}
            hitSlop={8}
          >
            <Mic size={22} color={Colors.textSecondary} strokeWidth={2} />
          </TouchableOpacity>

          {/* Text input */}
          <TextInput
            style={styles.aiTextInput}
            placeholder="Paste a link or describe a recipe…"
            placeholderTextColor={Colors.textSecondary}
            value={aiInput}
            onChangeText={setAiInput}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleAiSend}
            multiline={false}
          />

          {/* Send button */}
          <TouchableOpacity
            style={[
              styles.aiSendBtn,
              (!aiInput.trim() || isExtracting) && styles.aiSendBtnDisabled,
            ]}
            onPress={handleAiSend}
            disabled={!aiInput.trim() || isExtracting}
            hitSlop={8}
          >
            {isExtracting
              ? <ActivityIndicator size="small" color="#fff" />
              : <Send size={16} color="#fff" strokeWidth={2.5} />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <VoiceRecordSheet
        visible={showVoiceSheet}
        onClose={() => setShowVoiceSheet(false)}
        onExtracted={handleVoiceExtracted}
        onError={() => setShowVoiceSheet(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  backBtn: {
    width: 36,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },

  // ── Toggle ──────────────────────────────────────────────
  toggleWrap: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    backgroundColor: Colors.background,
  },
  toggleTrack: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.input,
    padding: 3,
    position: 'relative',
  },
  togglePill: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    width: '50%',
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.input - 2,
    ...Shadows.card,
  },
  togglePillRight: {
    left: '50%',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  toggleLabelActive: {
    color: Colors.primary,
  },

  // ── AI Mode ─────────────────────────────────────────────
  aiContainer: {
    flex: 1,
  },
  aiScrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  aiBubble: {
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.card,
    padding: Spacing.lg,
  },
  aiBubbleIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiBubbleIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBubbleName: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  aiBubbleIntro: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: Colors.text,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  aiBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  aiBulletEmoji: {
    fontSize: 15,
    lineHeight: 22,
    width: 24,
  },
  aiBulletText: {
    fontSize: 15,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: Colors.text,
    lineHeight: 22,
    flex: 1,
  },
  aiInputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  aiInputAction: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiTextInput: {
    flex: 1,
    height: 40,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: BorderRadius.input,
    paddingHorizontal: Spacing.md,
    fontSize: 15,
    color: Colors.text,
    fontFamily: FontFamily.regular,
  },
  aiSendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiSendBtnDisabled: {
    backgroundColor: Colors.surface,
  },
});
