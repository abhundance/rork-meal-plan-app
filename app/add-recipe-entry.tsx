import React, { useRef, useState } from 'react';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
import { transcribeAndExtract, ExtractedRecipe, detectVideoUrlType, extractRecipeFromVideoUrl, extractRecipeFromText } from '@/services/recipeExtraction';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
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
import { Ionicons } from '@expo/vector-icons'; // kept for logo-youtube / logo-tiktok brand icons only
import { ChevronLeft, Link as LinkIcon, Globe, FileText, PenLine, Image as LucideImage, Video, Mic, Camera, Send, Sparkles } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { imageStore } from '@/services/imageStore';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';

type MethodKey = 'camera' | 'photos' | 'paste' | 'voice' | 'manual' | 'video';
type Mode = 'manual' | 'ai';

const ICON_PROPS = { size: 24, color: Colors.primary, strokeWidth: 2 } as const;

const METHODS: {
  key: MethodKey;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}[] = [
  { key: 'paste',  icon: <FileText    {...ICON_PROPS} />, title: 'Paste Text',   subtitle: 'Paste a recipe from anywhere' },
  { key: 'manual', icon: <PenLine     {...ICON_PROPS} />, title: 'Manual Entry', subtitle: 'Fill in every detail yourself' },
  { key: 'photos', icon: <LucideImage {...ICON_PROPS} />, title: 'Photos',       subtitle: 'Pick from your library' },
  { key: 'video',  icon: <Video       {...ICON_PROPS} />, title: 'Video Link',   subtitle: 'YouTube or TikTok recipe' },
  { key: 'voice',  icon: <Mic         {...ICON_PROPS} />, title: 'Voice',        subtitle: 'Describe the recipe aloud' },
  { key: 'camera', icon: <Camera      {...ICON_PROPS} />, title: 'Camera',       subtitle: 'Take a photo of a recipe' },
];

const AI_BULLETS = [
  { emoji: '🔗', text: 'Paste a link from the web' },
  { emoji: '🎙️', text: 'Describe it by voice' },
  { emoji: '📷', text: 'Share a photo' },
  { emoji: '▶️', text: 'Paste a YouTube or TikTok link' },
];

function MethodCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scale, { toValue: 0.97, duration: 150, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  return (
    <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.methodCardOuter}>
      <Animated.View style={[styles.methodCard, { transform: [{ scale }] }]}>
        <View style={styles.methodIconCircle}>
          {icon}
        </View>
        <Text style={styles.methodTitle}>{title}</Text>
        <Text style={styles.methodSubtitle}>{subtitle}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function AddMealEntryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('manual');
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [aiInput, setAiInput] = useState<string>('');
  const [urlFeedback, setUrlFeedback] = useState<{ type: string; iconNode: React.ReactNode; message: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractScale = useRef(new Animated.Value(1)).current;

  const detectUrl = (text: string) => {
    if (text.length < 10) { setUrlFeedback(null); return; }
    const lower = text.toLowerCase();
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) {
      setUrlFeedback({ type: 'youtube', iconNode: <Ionicons name="logo-youtube" size={16} color="#FF0000" />, message: 'YouTube video — we\'ll extract from the description' });
    } else if (lower.includes('tiktok.com/')) {
      setUrlFeedback({ type: 'tiktok', iconNode: <Ionicons name="logo-tiktok" size={16} color="#111827" />, message: 'TikTok video — we\'ll extract from the caption' });
    } else if (lower.startsWith('http://') || lower.startsWith('https://')) {
      try {
        const hostname = new URL(text).hostname.replace('www.', '');
        setUrlFeedback({ type: 'web', iconNode: <Globe size={16} color="#7C3AED" strokeWidth={2} />, message: 'We\'ll extract the recipe from ' + hostname });
      } catch {
        setUrlFeedback({ type: 'web', iconNode: <Globe size={16} color="#7C3AED" strokeWidth={2} />, message: 'We\'ll extract the recipe from this page' });
      }
    } else {
      setUrlFeedback(null);
    }
  };

  const handleExtract = async () => {
    if (!pastedText.trim() || isExtracting) return;
    setIsExtracting(true);
    Animated.sequence([
      Animated.timing(extractScale, { toValue: 0.95, duration: 80, useNativeDriver: true }),
      Animated.timing(extractScale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    try {
      const result = await extractRecipeFromVideoUrl(pastedText.trim());
      router.push({
        pathname: '/add-recipe-review' as never,
        params: {
          inputMode: 'url',
          inputUrl: pastedText.trim(),
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
      console.error('[AddMealEntry] extract error:', err);
      const isVideo = urlFeedback?.type === 'youtube' || urlFeedback?.type === 'tiktok';
      Alert.alert(
        'Extraction Failed',
        isVideo
          ? 'Could not extract a recipe from this video. Make sure the full recipe is in the video description or caption.'
          : 'Could not extract a recipe from this page. Make sure it contains a full recipe with ingredients and steps, or try copying the recipe text and using Paste Text instead.'
      );
    } finally {
      setIsExtracting(false);
    }
  };

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

  const handleMethod = async (key: MethodKey) => {
    if (key === 'video') {
      router.push('/add-recipe-video' as never);
      return;
    }
    if (key === 'manual') {
      router.push('/add-recipe-manual' as never);
      return;
    }
    if (key === 'paste') {
      router.push('/add-recipe-paste' as never);
      return;
    }
    if (key === 'voice') {
      setShowVoiceSheet(true);
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;
    if (key === 'camera') {
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
      result = await ImagePicker.launchCameraAsync(pickerOptions);
    } else {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Photo Library Access Required',
          Platform.OS === 'ios'
            ? 'Meal Plan needs photo library access to import recipe photos. Tap Open Settings and enable Photos under Meal Plan.'
            : 'Meal Plan needs photo library access to import recipe photos. Tap Open Settings and enable the Storage permission.',
          [
            { text: 'Not Now', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    imageStore.set(asset.base64 ?? '', asset.uri);

    router.push({
      pathname: '/add-recipe-review' as never,
      params: {
        inputMode: key,
        imageUri: asset.uri,
      },
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
          <Animated.View
            style={[
              styles.togglePill,
              mode === 'manual' ? styles.togglePillLeft : styles.togglePillRight,
            ]}
          />
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => setMode('manual')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleLabel, mode === 'manual' && styles.toggleLabelActive]}>
              ✏️  Manual
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toggleOption}
            onPress={() => setMode('ai')}
            activeOpacity={0.8}
          >
            <Text style={[styles.toggleLabel, mode === 'ai' && styles.toggleLabelActive]}>
              ✨  AI Mode
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Manual mode ─────────────────────────────────── */}
      {mode === 'manual' && (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pasteSection}>
            <Text style={styles.sectionLabel}>PASTE A LINK</Text>
            <View style={styles.inputRow}>
              <View style={styles.inputWrapper}>
                <LinkIcon size={18} color={Colors.textSecondary} strokeWidth={2} style={styles.inputIcon} />
                <TextInput
                  style={styles.textInput}
                  placeholder="Recipe blog, website, YouTube, TikTok..."
                  placeholderTextColor={Colors.textSecondary}
                  value={pastedText}
                  onChangeText={(text) => {
                    setPastedText(text);
                    detectUrl(text);
                  }}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  returnKeyType="go"
                  onSubmitEditing={handleExtract}
                />
                {pastedText.trim().length > 0 && (
                  <Animated.View style={[styles.extractBtnWrapper, { transform: [{ scale: extractScale }] }]}>
                    <TouchableOpacity style={styles.extractBtn} onPress={handleExtract} disabled={isExtracting}>
                      {isExtracting
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.extractBtnText}>Extract →</Text>
                      }
                    </TouchableOpacity>
                  </Animated.View>
                )}
              </View>
              {urlFeedback && (
                <View style={styles.urlHintRow}>
                  {urlFeedback.iconNode}
                  <Text style={styles.urlHintText}>{urlFeedback.message}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.methodSection}>
            <Text style={styles.sectionLabel}>CHOOSE A METHOD</Text>
            <View style={styles.methodGrid}>
              {METHODS.map((m) => (
                <MethodCard
                  key={m.key}
                  icon={m.icon}
                  title={m.title}
                  subtitle={m.subtitle}
                  onPress={() => handleMethod(m.key)}
                />
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {/* ─── AI Mode ─────────────────────────────────────── */}
      {mode === 'ai' && (
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
              onPress={() => handleMethod('camera')}
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
      )}

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
  togglePillLeft: {
    left: 3,
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

  // ── Manual mode (existing styles, unchanged) ────────────
  scrollContent: {
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  pasteSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  inputRow: {
    marginTop: Spacing.sm,
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
    color: Colors.text,
    height: '100%' as unknown as number,
  },
  extractBtnWrapper: {
    marginLeft: 6,
  },
  extractBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 90,
    alignItems: 'center',
    justifyContent: 'center',
  },
  extractBtnText: {
    fontSize: 14,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#fff',
  },
  urlHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  urlHintText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontFamily: FontFamily.semiBold,
    fontWeight: '500',
  },
  methodSection: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  methodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.md,
  },
  methodCardOuter: {
    width: '48%',
  },
  methodCard: {
    backgroundColor: Colors.card,
    borderRadius: BorderRadius.card,
    ...Shadows.card,
    padding: Spacing.lg,
    minHeight: 120,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  methodIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodTitle: {
    fontSize: 15,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm + 2,
  },
  methodSubtitle: {
    fontSize: 12,
    fontFamily: FontFamily.regular,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 3,
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
