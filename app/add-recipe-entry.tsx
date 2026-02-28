import React, { useRef, useState, useEffect } from 'react';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
import { transcribeAndExtract, ExtractedRecipe, detectVideoUrlType, extractRecipeFromVideoUrl } from '@/services/recipeExtraction';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { imageStore } from '@/services/imageStore';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';

type MethodKey = 'camera' | 'photos' | 'paste' | 'voice' | 'manual' | 'video';

const METHODS: {
  key: MethodKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  { key: 'paste',  icon: 'document-text-outline', title: 'Paste Text',   subtitle: 'Paste a recipe from anywhere' },
  { key: 'manual', icon: 'create-outline',        title: 'Manual Entry', subtitle: 'Fill in every detail yourself' },
  { key: 'photos', icon: 'image',                 title: 'Photos',       subtitle: 'Pick from your library' },
  { key: 'video',  icon: 'videocam',              title: 'Video Link',   subtitle: 'YouTube or TikTok recipe' },
  { key: 'voice',  icon: 'mic',                   title: 'Voice',        subtitle: 'Describe the recipe aloud' },
  { key: 'camera', icon: 'camera',                title: 'Camera',       subtitle: 'Take a photo of a recipe' },
];

function MethodCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
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
          <Ionicons name={icon} size={24} color={Colors.primary} />
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
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [pastedText, setPastedText] = useState<string>('');
  const [urlFeedback, setUrlFeedback] = useState<{ type: string; icon: string; iconColor: string; message: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const extractScale = useRef(new Animated.Value(1)).current;

  const detectUrl = (text: string) => {
    if (text.length < 10) { setUrlFeedback(null); return; }
    const lower = text.toLowerCase();
    if (lower.includes('youtube.com/watch') || lower.includes('youtu.be/')) {
      setUrlFeedback({ type: 'youtube', icon: 'logo-youtube', iconColor: '#FF0000', message: 'YouTube video — we\'ll extract from the description' });
    } else if (lower.includes('tiktok.com/')) {
      setUrlFeedback({ type: 'tiktok', icon: 'logo-tiktok', iconColor: '#111827', message: 'TikTok video — we\'ll extract from the caption' });
    } else if (lower.startsWith('http://') || lower.startsWith('https://')) {
      try {
        const hostname = new URL(text).hostname.replace('www.', '');
        setUrlFeedback({ type: 'web', icon: 'globe-outline', iconColor: '#7C3AED', message: 'We\'ll extract the recipe from ' + hostname });
      } catch {
        setUrlFeedback({ type: 'web', icon: 'globe-outline', iconColor: '#7C3AED', message: 'We\'ll extract the recipe from this page' });
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
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add a Recipe</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pasteSection}>
          <Text style={styles.sectionLabel}>PASTE A LINK</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Ionicons name="link-outline" size={18} color={Colors.textSecondary} style={styles.inputIcon} />
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
                <Ionicons name={urlFeedback.icon as any} size={16} color={urlFeedback.iconColor} />
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
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  scrollContent: {
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 12,
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
    fontWeight: '600',
    color: Colors.text,
    marginTop: Spacing.sm + 2,
  },
  methodSubtitle: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.textSecondary,
    marginTop: 3,
  },
});
