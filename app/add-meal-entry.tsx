import React, { useRef, useState, useEffect, useCallback } from 'react';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
import { transcribeAndExtract, ExtractedRecipe, detectVideoUrlType, extractRecipeFromVideoUrl } from '@/services/recipeExtraction';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
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
  { key: 'camera',  icon: 'camera',                title: 'Camera',     subtitle: 'Take a photo of a recipe' },
  { key: 'photos',  icon: 'image',                 title: 'Photos',     subtitle: 'Pick from your library' },
  { key: 'paste',   icon: 'document-text-outline', title: 'Paste Text', subtitle: 'Paste a recipe from anywhere' },
  { key: 'voice',   icon: 'mic',                   title: 'Voice',      subtitle: 'Describe the recipe aloud' },
  { key: 'manual',  icon: 'create-outline',        title: 'Manual',     subtitle: 'Fill in every detail yourself' },
  { key: 'video',   icon: 'videocam',              title: 'Video Link', subtitle: 'Recipe must be in the video description' },
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
  const scrollRef = useRef<ScrollView>(null);
  const urlInputRef = useRef<TextInput>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [detectedUrlType, setDetectedUrlType] = useState<'youtube' | 'tiktok' | 'other' | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const hintOpacity = useRef(new Animated.Value(0)).current;
  const extractScale = useRef(new Animated.Value(1)).current;

  const handleExtractPressIn = () => {
    Animated.timing(extractScale, { toValue: 0.96, duration: 150, useNativeDriver: true }).start();
  };
  const handleExtractPressOut = () => {
    Animated.timing(extractScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  useEffect(() => {
    if (detectedUrlType !== null) {
      Animated.timing(hintOpacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
    } else {
      Animated.timing(hintOpacity, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    }
  }, [detectedUrlType, hintOpacity]);

  const handleExtract = async () => {
    if (!pastedText.trim() || isExtracting) return;
    setIsExtracting(true);
    try {
      const result = await extractRecipeFromVideoUrl(pastedText.trim());
      router.push({
        pathname: '/add-meal-review' as never,
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
    } catch (e) {
      console.error('[AddMealEntry] URL extraction failed:', e);
      Alert.alert('Extraction Failed', 'We could not extract a recipe from that URL. Try pasting the recipe text instead.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleMethod = async (key: MethodKey) => {
    if (key === 'video') {
      scrollRef.current?.scrollTo({ y: 0, animated: true });
      setTimeout(() => urlInputRef.current?.focus(), 300);
      return;
    }
    if (key === 'manual') {
      router.push('/add-meal' as never);
      return;
    }
    if (key === 'paste') {
      router.push('/add-meal-paste' as never);
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
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
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
      const { status, canAskAgain } = await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    // Store image in memory — never pass base64 through route params
    imageStore.set(asset.base64 ?? '', asset.uri);

    router.push({
      pathname: '/add-meal-review' as never,
      params: {
        inputMode: key,
        imageUri: asset.uri,
      },
    });
  };

  const handleVoiceExtracted = (result: ExtractedRecipe) => {
    setShowVoiceSheet(false);
    router.push({
      pathname: '/add-meal-review' as never,
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
        <Text style={styles.headerTitle}>Add a Meal</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pasteSection}>
          <Text style={styles.sectionLabel}>PASTE A RECIPE URL</Text>
          <View style={styles.urlDisclaimer}>
            <Ionicons name="information-circle" size={20} color="#D97706" />
            <Text style={styles.urlDisclaimerText}>
              Video links only work if the full recipe and ingredients are listed in the video description or caption.
            </Text>
          </View>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="link-outline"
                size={18}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                ref={urlInputRef}
                style={styles.textInput}
                placeholder="https://..."
                placeholderTextColor={Colors.textSecondary}
                value={pastedText}
                onChangeText={(text) => {
                  setPastedText(text);
                  if (text.length > 10) {
                    const type = detectVideoUrlType(text);
                    setDetectedUrlType(type.length > 0 ? type : null);
                  } else {
                    setDetectedUrlType(null);
                  }
                }}
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={handleExtract}
                editable={!isExtracting}
              />
              {pastedText.length > 0 && (
                <Pressable
                  onPress={handleExtract}
                  onPressIn={handleExtractPressIn}
                  onPressOut={handleExtractPressOut}
                  style={styles.extractBtnWrapper}
                  disabled={isExtracting}
                >
                  <Animated.View
                    style={[styles.extractBtn, { transform: [{ scale: extractScale }] }]}
                  >
                    {isExtracting
                      ? <ActivityIndicator size="small" color={Colors.white} />
                      : <Text style={styles.extractBtnText}>Extract →</Text>
                    }
                  </Animated.View>
                </Pressable>
              )}
            </View>
            {(detectedUrlType === 'youtube' || detectedUrlType === 'tiktok') && (
              <Animated.View style={[styles.urlHintRow, { opacity: hintOpacity }]}>
                {detectedUrlType === 'youtube' ? (
                  <>
                    <Ionicons name="logo-youtube" size={16} color="#FF0000" />
                    <Text style={styles.urlHintText}>YouTube recipe detected — we'll read the description</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="logo-tiktok" size={16} color={Colors.text} />
                    <Text style={styles.urlHintText}>TikTok link detected — we'll read the caption</Text>
                  </>
                )}
              </Animated.View>
            )}
          </View>
        </View>

        <View style={styles.methodSection}>
          <Text style={styles.sectionLabel}>OR CHOOSE A METHOD</Text>
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
  pasteSection: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  inputRow: {
    marginTop: 8,
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
    paddingRight: 6,
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
  extractBtnWrapper: {
    marginLeft: 6,
  },
  extractBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.button,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  extractBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.white,
  },
  methodSection: {
    marginTop: Spacing.xxxl,
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
  urlHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: Spacing.xs,
    marginLeft: Spacing.md,
  },
  urlHintText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.textSecondary,
  },
  urlDisclaimer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#FFFBEB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
    padding: 12,
    marginBottom: 12,
  },
  urlDisclaimerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#92400E',
    lineHeight: 18,
  },
});
