import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/colors';
import { Shadows, BorderRadius, Spacing } from '@/constants/theme';

type MethodKey = 'camera' | 'photos' | 'voice' | 'manual';

const METHODS: {
  key: MethodKey;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
}[] = [
  { key: 'camera',  icon: 'camera',          title: 'Camera', subtitle: 'Take a photo of a recipe' },
  { key: 'photos',  icon: 'image',            title: 'Photos', subtitle: 'Pick from your library' },
  { key: 'voice',   icon: 'mic',              title: 'Voice',  subtitle: 'Describe the recipe aloud' },
  { key: 'manual',  icon: 'create-outline',   title: 'Manual', subtitle: 'Fill in every detail yourself' },
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
  const [pastedText, setPastedText] = useState<string>('');
  const extractScale = useRef(new Animated.Value(1)).current;

  const handleExtractPressIn = () => {
    Animated.timing(extractScale, { toValue: 0.96, duration: 150, useNativeDriver: true }).start();
  };
  const handleExtractPressOut = () => {
    Animated.timing(extractScale, { toValue: 1, duration: 150, useNativeDriver: true }).start();
  };

  const handleExtract = () => {
    if (!pastedText.trim()) return;
    router.push({
      pathname: '/add-meal-review' as never,
      params: { inputMode: 'text', inputText: pastedText.trim() },
    });
  };

  const handleMethod = async (key: MethodKey) => {
    if (key === 'manual') {
      router.push('/add-meal' as never);
      return;
    }
    if (key === 'voice') {
      router.push({ pathname: '/add-meal-review' as never, params: { inputMode: 'voice' } });
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      base64: true,
      quality: 0.8,
    };

    let result: ImagePicker.ImagePickerResult;
    if (key === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') return;
      result = await ImagePicker.launchCameraAsync(pickerOptions);
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') return;
      result = await ImagePicker.launchImageLibraryAsync(pickerOptions);
    }

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];
    router.push({
      pathname: '/add-meal-review' as never,
      params: {
        inputMode: key,
        imageBase64: asset.base64 ?? '',
        imageUri: asset.uri,
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
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.pasteSection}>
          <Text style={styles.sectionLabel}>PASTE A RECIPE URL OR TEXT</Text>
          <View style={styles.inputRow}>
            <View style={styles.inputWrapper}>
              <Ionicons
                name="link-outline"
                size={18}
                color={Colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.textInput}
                placeholder="URL or paste recipe text here..."
                placeholderTextColor={Colors.textSecondary}
                value={pastedText}
                onChangeText={setPastedText}
                multiline={false}
                returnKeyType="done"
                onSubmitEditing={handleExtract}
              />
              {pastedText.length > 0 && (
                <Pressable
                  onPress={handleExtract}
                  onPressIn={handleExtractPressIn}
                  onPressOut={handleExtractPressOut}
                  style={styles.extractBtnWrapper}
                >
                  <Animated.View
                    style={[styles.extractBtn, { transform: [{ scale: extractScale }] }]}
                  >
                    <Text style={styles.extractBtnText}>Extract →</Text>
                  </Animated.View>
                </Pressable>
              )}
            </View>
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
});
