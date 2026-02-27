import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { X, Utensils, Heart } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import Colors from '@/constants/colors';
import { BorderRadius } from '@/constants/theme';
import { PlannedMeal } from '@/types';
import { DISCOVER_MEALS } from '@/mocks/discover';
import { useFavs } from '@/providers/FavsProvider';
import PrimaryButton from './PrimaryButton';

interface MealPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectMeal: (meal: PlannedMeal) => void;
  onCreateNewRecipe: () => void;
  date: string;
  slotId: string;
  slotName: string;
  defaultServing: number;
}

export default function MealPickerSheet({
  visible,
  onClose,
  onSelectMeal,
  onCreateNewRecipe,
  date,
  slotId,
  slotName,
  defaultServing,
}: MealPickerSheetProps) {
  const [mode, setMode] = useState<'choose' | 'manual' | 'recipe_methods'>('choose');
  const [manualName, setManualName] = useState<string>('');
  const [recipeUrl, setRecipeUrl] = useState<string>('');
  const { meals: favMeals } = useFavs();
  const router = useRouter();

  const formattedDate = useMemo(() => {
    return new Date(date + 'T00:00:00').toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
  }, [date]);

  const handleAddManual = useCallback(() => {
    if (!manualName.trim()) return;
    const planned: PlannedMeal = {
      id: `meal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      slot_id: slotId,
      date,
      meal_name: manualName.trim(),
      serving_size: defaultServing,
      ingredients: [],
      recipe_serving_size: defaultServing,
    };
    onSelectMeal(planned);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    resetAndClose();
  }, [manualName, slotId, date, defaultServing, onSelectMeal]);

  const resetAndClose = useCallback(() => {
    setMode('choose');
    setManualName('');
    setRecipeUrl('');
    onClose();
  }, [onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={resetAndClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.handle} />
        <View style={styles.header}>
          {mode === 'manual' || mode === 'recipe_methods' ? (
            <TouchableOpacity onPress={() => setMode('choose')} style={styles.closeBtn} testID="back-to-choose-btn">
              <Ionicons name="chevron-back" size={22} color={Colors.text} />
            </TouchableOpacity>
          ) : (
            <View style={styles.closeBtn} />
          )}
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>{mode === 'recipe_methods' ? 'Add a Recipe' : `Add to ${slotName}`}</Text>
            <Text style={styles.headerSubtitle}>{formattedDate}</Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn}>
            <X size={20} color={Colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {mode === 'recipe_methods' ? (
          <ScrollView
            style={styles.chooseScroll}
            contentContainerStyle={styles.recipesScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.sectionLabel}>PASTE A LINK</Text>
            <View style={styles.urlInputRow}>
              <Ionicons name="link-outline" size={18} color={Colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.urlInput}
                placeholder="Recipe blog, website, YouTube, TikTok..."
                placeholderTextColor={Colors.textSecondary}
                value={recipeUrl}
                onChangeText={setRecipeUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {recipeUrl.trim().length > 0 && (
                <TouchableOpacity
                  style={styles.extractBtn}
                  activeOpacity={0.82}
                  onPress={() => { resetAndClose(); router.push('/add-meal-entry' as never); }}
                  testID="extract-url-btn"
                >
                  <Text style={styles.extractBtnText}>Extract</Text>
                </TouchableOpacity>
              )}
            </View>

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>CHOOSE A METHOD</Text>
            <View style={styles.methodCardsGrid}>
              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal-paste' as never); }}
                testID="recipe-method-paste-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#FEF9EE' }]}>
                    <Ionicons name="document-text-outline" size={22} color="#D97706" />
                  </View>
                  <Text style={styles.methodCardTitle}>Paste Text</Text>
                  <Text style={styles.methodCardSubtitle}>Paste a recipe from anywhere</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal' as never); }}
                testID="recipe-method-manual-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#ECFDF5' }]}>
                    <Ionicons name="create-outline" size={22} color="#059669" />
                  </View>
                  <Text style={styles.methodCardTitle}>Manual Entry</Text>
                  <Text style={styles.methodCardSubtitle}>Fill in every detail yourself</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal-entry' as never); }}
                testID="recipe-method-photos-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#EDE9FE' }]}>
                    <Ionicons name="image" size={22} color={Colors.primary} />
                  </View>
                  <Text style={styles.methodCardTitle}>Photos</Text>
                  <Text style={styles.methodCardSubtitle}>Pick from your library</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal-video' as never); }}
                testID="recipe-method-video-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="videocam" size={22} color="#2563EB" />
                  </View>
                  <Text style={styles.methodCardTitle}>Video Link</Text>
                  <Text style={styles.methodCardSubtitle}>YouTube or TikTok recipe</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal-entry' as never); }}
                testID="recipe-method-voice-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#FDF2F8' }]}>
                    <Ionicons name="mic" size={22} color="#DB2777" />
                  </View>
                  <Text style={styles.methodCardTitle}>Voice</Text>
                  <Text style={styles.methodCardSubtitle}>Describe aloud</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/add-meal-entry' as never); }}
                testID="recipe-method-camera-btn"
              >
                <View style={styles.methodCard}>
                  <View style={[styles.methodCardIcon, { backgroundColor: '#FFFBEB' }]}>
                    <Ionicons name="camera" size={22} color="#D97706" />
                  </View>
                  <Text style={styles.methodCardTitle}>Camera</Text>
                  <Text style={styles.methodCardSubtitle}>Take a photo</Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : mode === 'choose' ? (
          <ScrollView
            style={styles.chooseScroll}
            contentContainerStyle={styles.chooseScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.browseCardsRow}>
              <TouchableOpacity
                style={styles.browseCardLeft}
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/(tabs)/favs'); }}
                testID="browse-favs-btn"
              >
                <Heart size={22} color="#7B68CC" fill="#7B68CC" strokeWidth={2} />
                <Text style={styles.browseCardTitle}>From My Favourites</Text>
                <Text style={styles.browseCardSubtitle}>
                  {favMeals.length > 0 ? `${favMeals.length} saved recipes` : 'Your saved recipes'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.browseCardRight}
                activeOpacity={0.82}
                onPress={() => { resetAndClose(); router.push('/(tabs)/discover'); }}
                testID="browse-discover-btn"
              >
                <Ionicons name="compass-outline" size={22} color="#059669" />
                <Text style={styles.browseCardTitle}>Try Something New</Text>
                <Text style={styles.browseCardSubtitle}>
                  {DISCOVER_MEALS.length} curated recipes
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or create new</Text>
              <View style={styles.dividerLine} />
            </View>

            <View testID="option-rows">
              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.82}
                onPress={() => setMode('manual')}
                testID="add-without-recipe-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#FEF3C7' }]}>
                  <Ionicons name="pencil-outline" size={16} color="#D97706" />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add without Recipe</Text>
                  <Text style={styles.optionSubtitle}>Just a name - add steps later</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.82}
                onPress={() => setMode('recipe_methods')}
                testID="add-with-recipe-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#EDE9FE' }]}>
                  <Ionicons name="sparkles-outline" size={16} color="#7B68CC" />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add with Recipe</Text>
                  <Text style={styles.optionSubtitle}>URL, camera, YouTube & more</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>

              <View style={styles.optionSeparator} />

              <TouchableOpacity
                style={styles.optionRow}
                activeOpacity={0.82}
                onPress={onCreateNewRecipe}
                testID="add-delivery-btn"
              >
                <View style={[styles.optionIconCircle, { backgroundColor: '#DBEAFE' }]}>
                  <Ionicons name="bicycle-outline" size={16} color="#2563EB" />
                </View>
                <View style={styles.optionTextBlock}>
                  <Text style={styles.optionTitle}>Add from Delivery App</Text>
                  <Text style={styles.optionSubtitle}>Paste a delivery link</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#D1D5DB" />
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.manualForm}>
            <View style={styles.manualIconWrap}>
              <Utensils size={32} color={Colors.primary} strokeWidth={1.5} />
            </View>
            <Text style={styles.manualFormHeading}>Add Without Recipe</Text>
            <Text style={styles.manualLabel}>Meal name</Text>
            <TextInput
              style={styles.manualInput}
              placeholder="e.g. Mum's Special Pasta"
              placeholderTextColor={Colors.textSecondary}
              value={manualName}
              onChangeText={setManualName}
              autoCapitalize="words"
              autoFocus
              testID="manual-meal-input"
            />
            <Text style={styles.manualHint}>
              You can add ingredients later from the meal detail screen.
            </Text>
            <View style={styles.manualActions}>
              <PrimaryButton
                label="Add Meal"
                onPress={handleAddManual}
                disabled={!manualName.trim()}
              />
              <TouchableOpacity onPress={() => setMode('choose')} style={styles.backLink}>
                <Text style={styles.backLinkText}>Browse meals instead</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.divider,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  headerTitleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chooseScroll: {
    flex: 1,
  },
  chooseScrollContent: {
    paddingBottom: 48,
  },
  recipesScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    color: Colors.textSecondary,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
    marginBottom: 8,
  },
  urlInputRow: {
    height: 52,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.card,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 8,
  },
  urlInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
  },
  extractBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 6,
  },
  extractBtnText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: '#FFFFFF',
  },
  methodCardsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginTop: 8,
  },
  methodCard: {
    width: '47%' as const,
    backgroundColor: Colors.card,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
    minHeight: 110,
    alignItems: 'flex-start' as const,
  },
  methodCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  methodCardTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginTop: 8,
  },
  methodCardSubtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  browseCardsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  browseCardLeft: {
    flex: 1,
    backgroundColor: '#EDE9FE',
    borderRadius: 14,
    padding: 14,
  },
  browseCardRight: {
    flex: 1,
    backgroundColor: '#D1FAE5',
    borderRadius: 14,
    padding: 14,
  },
  browseCardTitle: {
    fontSize: 13,
    fontWeight: '700' as const,
    color: '#111827',
    marginTop: 8,
  },
  browseCardSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '500' as const,
    color: '#9CA3AF',
    paddingHorizontal: 12,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  optionSeparator: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginLeft: 66,
  },
  optionIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionTextBlock: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: '#111827',
  },
  optionSubtitle: {
    fontSize: 12,
    fontWeight: '400' as const,
    color: '#6B7280',
    marginTop: 1,
  },
  manualForm: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
    alignItems: 'center',
  },
  manualIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  manualFormHeading: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: Colors.text,
    marginBottom: 20,
  },
  manualLabel: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.textSecondary,
    alignSelf: 'flex-start',
    marginBottom: 6,
  },
  manualInput: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.button,
    borderWidth: 1.5,
    borderColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
  },
  manualHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 18,
  },
  manualActions: {
    width: '100%',
    gap: 16,
    alignItems: 'center',
  },
  backLink: {
    paddingVertical: 8,
  },
  backLinkText: {
    fontSize: 14,
    fontWeight: '600' as const,
    color: Colors.primary,
  },
});
