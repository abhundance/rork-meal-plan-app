import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { ChevronLeft, Send, Mic } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getSupabase } from '@/services/supabase';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import { useRecipes } from '@/providers/RecipesProvider';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';
import { Recipe, Ingredient } from '@/types';
import { generateUUID } from '@/utils/uuid';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  recipe?: Partial<Recipe>;
};

type ChatRequest = {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  language: string;
};

function getSupabaseUrl(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
}

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

export default function AiChefScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ prompt?: string }>();
  const { familySettings } = useFamilySettings();
  const { addRecipe } = useRecipes();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showVoiceSheet, setShowVoiceSheet] = useState<boolean>(false);

  const flatListRef = useRef<FlatList<Message> | null>(null);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-send initial prompt on mount
  useEffect(() => {
    if (params.prompt && messages.length === 0) {
      void handleSendMessage(params.prompt);
    }
  }, [params.prompt]);

  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  const callAiChefEdgeFunction = useCallback(
    async (allMessages: Message[]): Promise<string> => {
      const supabase = getSupabase();
      const session = await supabase.auth.getSession();

      const body: ChatRequest = {
        messages: allMessages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        language: familySettings.language || 'English',
      };

      const response = await supabase.functions.invoke('ai-chef', {
        body,
        headers: session.data.session
          ? {
              Authorization: `Bearer ${session.data.session.access_token}`,
            }
          : {
              apikey: getSupabaseAnonKey(),
            },
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI Chef request failed');
      }

      return response.data?.content || '';
    },
    [familySettings.language]
  );

  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: Message = {
        role: 'user',
        content: text.trim(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsThinking(true);
      setError(null);

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        const allMessages = [...messages, userMessage];
        const aiResponse = await callAiChefEdgeFunction(allMessages);

        // Parse AI response for inline recipe object (if present)
        let recipe: Partial<Recipe> | undefined;
        let displayContent = aiResponse;

        try {
          const parsed = JSON.parse(aiResponse);
          if (parsed.recipe) {
            recipe = parsed.recipe;
            displayContent = parsed.message || aiResponse;
          }
        } catch {
          // Not JSON, treat as plain text
        }

        const assistantMessage: Message = {
          role: 'assistant',
          content: displayContent,
          recipe,
        };

        setMessages((prev) => [...prev, assistantMessage]);
        void Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
        scrollToBottom();
      } catch (err) {
        const errorMsg =
          err instanceof Error ? err.message : 'Failed to get a response';
        setError(errorMsg);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsThinking(false);
      }
    },
    [messages, callAiChefEdgeFunction, scrollToBottom]
  );

  const handleSaveRecipe = useCallback(
    (recipe: Partial<Recipe>) => {
      if (!recipe.name) {
        Alert.alert('Error', 'Recipe name is required');
        return;
      }

      // Create a full recipe object with defaults
      const fullRecipe: Recipe = {
        id: generateUUID(),
        name: recipe.name,
        source: 'family_created',
        ingredients: recipe.ingredients || [],
        method_steps: recipe.method_steps || [],
        recipe_serving_size: recipe.recipe_serving_size || 2,
        dietary_tags: recipe.dietary_tags || [],
        custom_tags: recipe.custom_tags || [],
        add_to_plan_count: 0,
        created_at: new Date().toISOString(),
        is_ingredient_complete: (recipe.ingredients?.length ?? 0) > 0,
        is_recipe_complete: (recipe.method_steps?.length ?? 0) > 0,
        image_url: recipe.image_url,
        description: recipe.description,
        cuisine: recipe.cuisine,
        meal_type: recipe.meal_type,
        cooking_time_band: recipe.cooking_time_band,
      };

      addRecipe(fullRecipe);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate to the recipe detail or back to recipes
      router.push('/(tabs)/recipes');
    },
    [addRecipe, router]
  );

  const handleRefine = useCallback(() => {
    // Set input placeholder focus and scroll to input
    setInputText('');
    scrollToBottom();
  }, [scrollToBottom]);

  const handleVoiceExtracted = useCallback(
    (transcription: string) => {
      setShowVoiceSheet(false);
      void handleSendMessage(transcription);
    },
    [handleSendMessage]
  );

  const handleBackPress = useCallback(() => {
    if (messages.length > 2) {
      Alert.alert(
        'Leave AI Chef?',
        'Your conversation will be lost.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Leave',
            style: 'destructive',
            onPress: () => router.back(),
          },
        ]
      );
    } else {
      router.back();
    }
  }, [messages.length, router]);

  const renderMessage = ({ item, index }: { item: Message; index: number }) => {
    const isUser = item.role === 'user';

    return (
      <View
        key={index}
        style={[
          styles.messageBubbleContainer,
          isUser ? styles.userBubbleContainer : styles.assistantBubbleContainer,
        ]}
      >
        <View
          style={[
            styles.messageBubble,
            isUser ? styles.userBubble : styles.assistantBubble,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.userText : styles.assistantText,
            ]}
          >
            {item.content}
          </Text>
        </View>

        {/* Inline recipe card if present */}
        {item.recipe && !isUser && (
          <View style={styles.recipeCardContainer}>
            <View style={styles.recipeCard}>
              <Text style={styles.recipeName}>{item.recipe.name}</Text>
              {item.recipe.description && (
                <Text style={styles.recipeDescription}>
                  {item.recipe.description}
                </Text>
              )}

              <View style={styles.recipeMetaRow}>
                {item.recipe.ingredients && item.recipe.ingredients.length > 0 && (
                  <Text style={styles.recipeMeta}>
                    {item.recipe.ingredients.length} ingredients
                  </Text>
                )}
                {item.recipe.cook_time && (
                  <Text style={styles.recipeMeta}>
                    {item.recipe.cook_time} min
                  </Text>
                )}
              </View>

              <View style={styles.recipeButtonRow}>
                <TouchableOpacity
                  style={styles.saveButton}
                  onPress={() => handleSaveRecipe(item.recipe!)}
                >
                  <Text style={styles.saveButtonText}>Save Recipe</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.refineButton}
                  onPress={handleRefine}
                >
                  <Text style={styles.refineButtonText}>Refine</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderThinkingIndicator = () => {
    if (!isThinking) return null;
    return (
      <View style={styles.thinkingContainer}>
        <ActivityIndicator color={Colors.primary} size="small" />
        <Text style={styles.thinkingText}>AI Chef is thinking...</Text>
      </View>
    );
  };

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      <SafeAreaViewCompat insets={insets}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={handleBackPress}
          >
            <ChevronLeft size={24} color={Colors.text} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>AI Chef</Text>
          <Text style={styles.headerEmoji}>👨‍🍳</Text>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(_, idx) => idx.toString()}
          contentContainerStyle={styles.messagesList}
          scrollEnabled={true}
          onContentSizeChange={scrollToBottom}
          ListEmptyComponent={
            !isThinking ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateEmoji}>👨‍🍳</Text>
                <Text style={styles.emptyStateTitle}>
                  Hello! I'm your AI Chef
                </Text>
                <Text style={styles.emptyStateSubtitle}>
                  Ask me for recipe ideas, cooking tips, or ingredient
                  substitutions
                </Text>
              </View>
            ) : null
          }
        />

        {renderThinkingIndicator()}

        {error && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}
      </SafeAreaViewCompat>

      {/* Input bar */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={insets.bottom}
      >
        <View style={[styles.inputBar, { paddingBottom: insets.bottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask the AI Chef..."
            placeholderTextColor={Colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSendMessage(inputText)}
            returnKeyType="send"
            multiline
            maxLength={500}
          />

          {inputText.trim() ? (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => handleSendMessage(inputText)}
              disabled={isThinking}
            >
              <Send
                size={20}
                color={Colors.primary}
                strokeWidth={2.5}
                fill={Colors.primary}
              />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              onPress={() => setShowVoiceSheet(true)}
              disabled={isThinking}
            >
              <Mic size={20} color={Colors.text} strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      {/* Voice recording sheet */}
      <VoiceRecordSheet
        visible={showVoiceSheet}
        onClose={() => setShowVoiceSheet(false)}
        onExtracted={(result) => handleVoiceExtracted(result.description || '')}
        onError={() => {
          setShowVoiceSheet(false);
          Alert.alert('Error', 'Could not process voice input');
        }}
        language={familySettings.language}
      />
    </View>
  );
}

// ── SafeAreaView wrapper (handles both iOS and Android) ───────────────────
function SafeAreaViewCompat({
  children,
  insets,
}: {
  children: React.ReactNode;
  insets: ReturnType<typeof useSafeAreaInsets>;
}) {
  return (
    <View
      style={[
        styles.safeAreaView,
        { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right },
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeAreaView: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
    color: Colors.text,
  },
  headerEmoji: {
    fontSize: 24,
  },
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  messageBubbleContainer: {
    marginVertical: Spacing.sm,
    flexDirection: 'column',
  },
  userBubbleContainer: {
    alignItems: 'flex-end',
  },
  assistantBubbleContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.card,
  },
  userBubble: {
    backgroundColor: Colors.primaryLight,
  },
  assistantBubble: {
    backgroundColor: Colors.surface,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: FontFamily.regular,
  },
  userText: {
    color: Colors.text,
  },
  assistantText: {
    color: Colors.text,
  },
  recipeCardContainer: {
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    maxWidth: '85%',
  },
  recipeName: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  recipeDescription: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  recipeMeta: {
    fontSize: 13,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  recipeButtonRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
    color: Colors.white,
  },
  refineButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  refineButtonText: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  thinkingText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
  errorBanner: {
    backgroundColor: Colors.danger,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderRadius: BorderRadius.card,
  },
  errorText: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.white,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.input,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: 16,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    maxHeight: 100,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyStateEmoji: {
    fontSize: 48,
    marginBottom: Spacing.md,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: FontFamily.semiBold,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: Spacing.lg,
  },
});
