/**
 * AiChefChat — ChatGPT-style conversational recipe assistant.
 *
 * Embeddable component used inside add-recipe-entry.tsx (AI Chef tab).
 * Supports: text chat, image attachments (camera/library), voice input,
 * URL detection (delegates to extract-recipe), recipe cards with save/refine.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Platform,
  Alert,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Camera, ImageIcon, Mic, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getSupabase } from '@/services/supabase';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import {
  ExtractedRecipe,
  extractRecipeFromVideoUrl,
} from '@/services/recipeExtraction';
import VoiceRecordSheet from '@/components/VoiceRecordSheet';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PendingPlanSlot {
  slotId: string;
  date: string;
  slotName: string;
  defaultServing: number;
}

interface AiChefChatProps {
  initialPrompt?: string;
  pendingPlanSlot?: PendingPlanSlot | null;
}

type MessageType = 'text' | 'image' | 'recipe' | 'loading' | 'error';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  type: MessageType;
  content: string;
  imageUri?: string;
  imageBase64?: string;
  recipe?: ExtractedRecipe;
  changesSummary?: string;
  timestamp: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSupabaseAnonKey(): string {
  return process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';
}

let messageCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// ── Inspiration cards ─────────────────────────────────────────────────────────

const INSPIRATIONS = [
  {
    icon: '💬',
    bgColor: '#FDEBED',
    text: '"I have chicken and rice, need something quick"',
    subtitle: 'Describe ingredients or cravings',
  },
  {
    icon: '🔗',
    bgColor: '#E8F0FE',
    text: 'Paste a YouTube, TikTok, or blog link',
    subtitle: 'Extracts full recipe from any URL',
  },
  {
    icon: '📷',
    bgColor: '#E6F4EA',
    text: 'Snap a photo of a recipe or menu',
    subtitle: 'AI reads and structures the recipe',
  },
  {
    icon: '🎤',
    bgColor: '#FFF3E0',
    text: 'Speak your recipe or describe a dish',
    subtitle: 'Voice to structured recipe',
  },
  {
    icon: '🍽️',
    bgColor: '#F3E8FD',
    text: '"A lighter version of Butter Chicken"',
    subtitle: 'Modify or reinvent any dish',
  },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiChefChat({ initialPrompt, pendingPlanSlot }: AiChefChatProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { familySettings } = useFamilySettings();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string } | null>(null);
  const [showVoiceSheet, setShowVoiceSheet] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  // Track keyboard visibility so we can drop bottom safe-area padding when keyboard is up
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = () => setKeyboardVisible(true);
    const onHide = () => setKeyboardVisible(false);
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  // Ref to always have latest messages (avoids stale closure in callbacks)
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const hasAutoSent = useRef(false);

  // Auto-send initial prompt once
  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true;
      void handleSend(initialPrompt);
    }
  }, [initialPrompt]);

  // ── Scroll helper ─────────────────────────────────────────────────────────

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  // ── Edge Function call ────────────────────────────────────────────────────

  const callAiChef = useCallback(
    async (allMessages: ChatMessage[]): Promise<{
      reply: string;
      recipe?: ExtractedRecipe;
      changesSummary?: string;
      extractUrl?: string;
      error?: string;
    }> => {
      const supabase = getSupabase();
      const session = await supabase.auth.getSession();

      const apiMessages = allMessages
        .filter((m) => m.type !== 'loading' && m.type !== 'error')
        .map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.imageBase64 ? { image_base64: m.imageBase64 } : {}),
        }));

      const response = await supabase.functions.invoke('ai-chef', {
        body: {
          messages: apiMessages,
          language: familySettings.language || 'English',
        },
        headers: session.data.session
          ? { Authorization: `Bearer ${session.data.session.access_token}` }
          : { apikey: getSupabaseAnonKey() },
      });

      if (response.error) {
        throw new Error(response.error.message || 'AI Chef request failed');
      }

      const data = response.data;
      if (data?.error === 'quota_exceeded') {
        return { reply: data.reply || 'Monthly limit reached.', error: 'quota_exceeded' };
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      return {
        reply: data?.reply || '',
        recipe: data?.recipe || undefined,
        changesSummary: data?.changes_summary || undefined,
        extractUrl: data?.extract_url || undefined,
      };
    },
    [familySettings.language],
  );

  // ── URL extraction (client-side) ──────────────────────────────────────────

  const handleUrlExtraction = useCallback(
    async (url: string, userMsgId: string) => {
      // Add loading message
      const loadingMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        type: 'loading',
        content: 'Extracting recipe from link...',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, loadingMsg]);
      scrollToBottom();

      try {
        const extracted = await extractRecipeFromVideoUrl(url, familySettings.language || 'English');

        // Replace loading with recipe message
        const recipeMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'recipe',
          content: `Here's the recipe I found from that link!`,
          recipe: extracted,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id).concat(recipeMsg));
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: `Couldn't extract a recipe from that link. ${err instanceof Error ? err.message : 'Try pasting the recipe text instead.'}`,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id).concat(errorMsg));
        scrollToBottom();
      }
    },
    [familySettings.language, scrollToBottom],
  );

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputText).trim();
      if (!text && !pendingImage) return;
      if (isThinking) return;

      // Create user message
      const userMsg: ChatMessage = {
        id: nextId(),
        role: 'user',
        type: pendingImage ? 'image' : 'text',
        content: text || (pendingImage ? 'What recipe can you make from this?' : ''),
        imageUri: pendingImage?.uri,
        imageBase64: pendingImage?.base64,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInputText('');
      setPendingImage(null);
      setShowAttachments(false);
      setIsThinking(true);
      Keyboard.dismiss();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      scrollToBottom();

      try {
        const allMessages = [...messagesRef.current, userMsg];
        const result = await callAiChef(allMessages);

        // Handle URL extraction delegation
        if (result.extractUrl) {
          await handleUrlExtraction(result.extractUrl, userMsg.id);
          return;
        }

        // Handle quota exceeded
        if (result.error === 'quota_exceeded') {
          const quotaMsg: ChatMessage = {
            id: nextId(),
            role: 'assistant',
            type: 'error',
            content: result.reply,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, quotaMsg]);
          scrollToBottom();
          return;
        }

        // Normal response
        const assistantMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: result.recipe ? 'recipe' : 'text',
          content: result.reply,
          recipe: result.recipe,
          changesSummary: result.changesSummary,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, assistantMsg]);
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        const errorMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: err instanceof Error ? err.message : 'Something went wrong. Tap to retry.',
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsThinking(false);
      }
    },
    [inputText, pendingImage, isThinking, callAiChef, handleUrlExtraction, scrollToBottom],
  );

  // ── Image picker ──────────────────────────────────────────────────────────

  const pickImage = useCallback(async (fromCamera: boolean) => {
    const fn = fromCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await fn({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      base64: true,
      allowsEditing: false,
    });

    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setPendingImage({ uri: asset.uri, base64: asset.base64 });
        setShowAttachments(false);
        inputRef.current?.focus();
      }
    }
  }, []);

  // ── Voice handler ─────────────────────────────────────────────────────────

  const handleVoiceExtracted = useCallback(
    (result: ExtractedRecipe) => {
      setShowVoiceSheet(false);

      // If voice returned a full recipe, show it directly as a recipe card
      if (result.name && result.ingredients?.length > 0) {
        const userMsg: ChatMessage = {
          id: nextId(),
          role: 'user',
          type: 'text',
          content: '🎤 Voice recording',
          timestamp: Date.now(),
        };
        const recipeMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'recipe',
          content: `I heard your recipe for ${result.name}! Here it is:`,
          recipe: result,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg, recipeMsg]);
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (result.description) {
        // Just transcription text — send as chat message
        handleSend(result.description);
      }
    },
    [handleSend, scrollToBottom],
  );

  // ── Save recipe → Review screen ──────────────────────────────────────────

  const handleSaveRecipe = useCallback(
    (recipe: ExtractedRecipe) => {
      // Navigate to review screen with prefill params
      // IMPORTANT: param names must match add-recipe-review.tsx Params type
      const params: Record<string, string> = {
        inputMode: 'text',
        prefillName: recipe.name || '',
        prefillDescription: recipe.description || '',
        prefillCuisine: recipe.cuisine || '',
        prefillMealType: recipe.meal_type || '',
        prefillCookingTimeBand: recipe.cooking_time_band || '',
        prefillServingSize: String(recipe.recipe_serving_size || 4),
        prefillIngredients: JSON.stringify(recipe.ingredients || []),
        prefillMethodSteps: JSON.stringify(recipe.method_steps || []),
        prefillDietaryTags: JSON.stringify(recipe.dietary_tags || []),
      };

      // Plan slot is handled via the pendingPlanSlot service (already set)
      // — review screen reads it from peekPendingPlanSlot()

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({ pathname: '/add-recipe-review', params });
    },
    [router],
  );

  // ── Refine handler ────────────────────────────────────────────────────────

  const handleRefine = useCallback(() => {
    inputRef.current?.focus();
    setInputText('');
  }, []);

  // ── Retry handler ─────────────────────────────────────────────────────────

  const handleRetry = useCallback(
    (errorMsgId: string) => {
      // Find the last user message before this error
      const currentMessages = messagesRef.current;
      const errorIdx = currentMessages.findIndex((m) => m.id === errorMsgId);
      if (errorIdx < 0) return;

      // Remove the error message and re-send
      const lastUserMsg = currentMessages.slice(0, errorIdx).reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
        void handleSend(lastUserMsg.content);
      }
    },
    [handleSend],
  );

  // ── Render: Welcome state ─────────────────────────────────────────────────

  const renderWelcome = () => (
    <View style={styles.welcomeContainer}>
      <View style={styles.chefAvatarLarge}>
        <Text style={styles.chefAvatarEmoji}>👨‍🍳</Text>
      </View>
      <Text style={styles.welcomeTitle}>AI Chef</Text>
      <Text style={styles.welcomeSubtitle}>
        Tell me what you have, what you're craving, or share a recipe link, photo, or voice note
      </Text>

      <View style={styles.inspirationGrid}>
        {INSPIRATIONS.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={[styles.inspirationCard, { backgroundColor: item.bgColor }]}
            onPress={() => {
              if (idx === 2) {
                // Photo card → open camera
                pickImage(true);
              } else if (idx === 3) {
                // Voice card → open mic
                setShowVoiceSheet(true);
              } else {
                // Text cards → send as message
                handleSend(item.text.replace(/^"|"$/g, ''));
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.inspirationIcon}>{item.icon}</Text>
            <Text style={styles.inspirationText} numberOfLines={2}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  // RecipeCard rendering — uses stable handlers via refs below

  // ── Render: Message bubble ────────────────────────────────────────────────

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isUser = item.role === 'user';

    if (item.type === 'loading') {
      return (
        <View style={styles.assistantRow}>
          <View style={styles.chefAvatarSmall}>
            <Text style={styles.chefAvatarSmallEmoji}>👨‍🍳</Text>
          </View>
          <View style={styles.loadingBubble}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.loadingText}>{item.content}</Text>
          </View>
        </View>
      );
    }

    if (isUser) {
      return (
        <View style={styles.userRow}>
          {item.imageUri ? (
            <View style={styles.userImageContainer}>
              <Image source={{ uri: item.imageUri }} style={styles.userImage} />
              {item.content ? (
                <View style={styles.userBubble}>
                  <Text style={styles.userText}>{item.content}</Text>
                </View>
              ) : null}
            </View>
          ) : (
            <View style={styles.userBubble}>
              <Text style={styles.userText}>{item.content}</Text>
            </View>
          )}
        </View>
      );
    }

    // Assistant message
    return (
      <View style={styles.assistantRow}>
        <View style={styles.chefAvatarSmall}>
          <Text style={styles.chefAvatarSmallEmoji}>👨‍🍳</Text>
        </View>
        <View style={styles.assistantColumn}>
          {item.type === 'error' ? (
            <TouchableOpacity
              style={styles.errorBubble}
              onPress={() => handleRetry(item.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.errorText}>{item.content}</Text>
              <Text style={styles.errorRetry}>Tap to retry</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.assistantBubble}>
              <Text style={styles.assistantText}>{item.content}</Text>
            </View>
          )}

          {item.recipe ? (
            <RecipeCard
              recipe={item.recipe}
              changesSummary={item.changesSummary}
              onSave={handleSaveRecipe}
              onRefine={handleRefine}
            />
          ) : null}
        </View>
      </View>
    );
  };

  // ── Render: Thinking indicator ────────────────────────────────────────────

  const renderThinking = () => {
    if (!isThinking) return null;
    return (
      <View style={styles.assistantRow}>
        <View style={styles.chefAvatarSmall}>
          <Text style={styles.chefAvatarSmallEmoji}>👨‍🍳</Text>
        </View>
        <View style={styles.thinkingBubble}>
          <View style={styles.thinkingDots}>
            <View style={[styles.dot, styles.dot1]} />
            <View style={[styles.dot, styles.dot2]} />
            <View style={[styles.dot, styles.dot3]} />
          </View>
          <Text style={styles.thinkingText}>AI Chef is thinking...</Text>
        </View>
      </View>
    );
  };

  // ── Render: Input bar ─────────────────────────────────────────────────────

  const renderInputBar = () => (
    <View style={[styles.inputBarContainer, { paddingBottom: keyboardVisible ? Spacing.xs : insets.bottom }]}>
      {/* Pending image preview */}
      {pendingImage && (
        <View style={styles.pendingImageRow}>
          <Image source={{ uri: pendingImage.uri }} style={styles.pendingImageThumb} />
          <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.pendingImageRemove}>
            <Text style={styles.pendingImageRemoveText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Main input row — action icons inline to the left */}
      <View style={styles.inputRow}>
        <TouchableOpacity style={styles.inlineActionBtn} onPress={() => pickImage(true)} activeOpacity={0.6}>
          <Camera size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.inlineActionBtn} onPress={() => pickImage(false)} activeOpacity={0.6}>
          <ImageIcon size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.inlineActionBtn} onPress={() => setShowVoiceSheet(true)} activeOpacity={0.6}>
          <Mic size={20} color={Colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={styles.textInput}
          placeholder="Ask AI Chef..."
          placeholderTextColor={Colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
          multiline
          maxLength={1000}
          editable={!isThinking}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            (inputText.trim() || pendingImage) && !isThinking
              ? styles.sendButtonActive
              : styles.sendButtonInactive,
          ]}
          onPress={() => handleSend()}
          disabled={(!inputText.trim() && !pendingImage) || isThinking}
          activeOpacity={0.7}
        >
          <Send
            size={18}
            color={(inputText.trim() || pendingImage) && !isThinking ? Colors.white : Colors.textSecondary}
            strokeWidth={2.5}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.messagesList,
          messages.length === 0 && styles.messagesListEmpty,
        ]}
        ListEmptyComponent={!isThinking ? renderWelcome : null}
        ListFooterComponent={renderThinking}
        onContentSizeChange={scrollToBottom}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
      />

      {renderInputBar()}

      <VoiceRecordSheet
        visible={showVoiceSheet}
        onClose={() => setShowVoiceSheet(false)}
        onExtracted={handleVoiceExtracted}
        onError={() => {
          setShowVoiceSheet(false);
          Alert.alert('Error', 'Could not process voice input. Please try again.');
        }}
        language={familySettings.language}
      />
    </View>
  );
}

// ── RecipeCard (extracted outside main component to preserve expand state) ──

interface RecipeCardProps {
  recipe: ExtractedRecipe;
  changesSummary?: string;
  onSave: (recipe: ExtractedRecipe) => void;
  onRefine: () => void;
}

function RecipeCard({ recipe, changesSummary, onSave, onRefine }: RecipeCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSteps, setShowSteps] = useState(false);

  return (
    <View style={styles.recipeCard}>
      <View style={styles.recipeHeader}>
        <View style={styles.recipeEmojiContainer}>
          <Text style={styles.recipeEmoji}>🍽️</Text>
        </View>
        <View style={styles.recipeHeaderText}>
          <Text style={styles.recipeName}>{recipe.name}</Text>
          {recipe.description ? (
            <Text style={styles.recipeDescription} numberOfLines={2}>{recipe.description}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.recipeMetaRow}>
        {recipe.prep_time ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>⏱ {recipe.prep_time + (recipe.cook_time || 0)} min</Text>
          </View>
        ) : null}
        {recipe.recipe_serving_size ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>👥 {recipe.recipe_serving_size} servings</Text>
          </View>
        ) : null}
        {recipe.cuisine ? (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText}>{recipe.cuisine}</Text>
          </View>
        ) : null}
      </View>

      {recipe.dietary_tags?.length > 0 && (
        <View style={styles.dietaryRow}>
          {recipe.dietary_tags.map((tag, i) => (
            <View key={i} style={styles.dietaryChip}>
              <Text style={styles.dietaryChipText}>{tag}</Text>
            </View>
          ))}
        </View>
      )}

      {changesSummary ? (
        <View style={styles.changesSummary}>
          <Text style={styles.changesSummaryText}>✏️ {changesSummary}</Text>
        </View>
      ) : null}

      {recipe.ingredients?.length > 0 && (
        <View>
          <TouchableOpacity
            style={styles.expandableHeader}
            onPress={() => setShowIngredients(!showIngredients)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandableTitle}>
              Ingredients ({recipe.ingredients.length})
            </Text>
            {showIngredients ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          {showIngredients && (
            <View style={styles.ingredientsList}>
              {recipe.ingredients.map((ing, i) => (
                <Text key={i} style={styles.ingredientItem}>
                  • {ing.quantity} {ing.unit} {ing.name}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}

      {recipe.method_steps?.length > 0 && (
        <View>
          <TouchableOpacity
            style={styles.expandableHeader}
            onPress={() => setShowSteps(!showSteps)}
            activeOpacity={0.7}
          >
            <Text style={styles.expandableTitle}>
              Method ({recipe.method_steps.length} steps)
            </Text>
            {showSteps ? (
              <ChevronUp size={18} color={Colors.textSecondary} />
            ) : (
              <ChevronDown size={18} color={Colors.textSecondary} />
            )}
          </TouchableOpacity>
          {showSteps && (
            <View style={styles.stepsList}>
              {recipe.method_steps.map((step, i) => (
                <View key={i} style={styles.stepItem}>
                  <Text style={styles.stepNumber}>{i + 1}</Text>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      <View style={styles.recipeActions}>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={() => onSave(recipe)}
          activeOpacity={0.7}
        >
          <Text style={styles.saveButtonText}>Save Recipe</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.refineButton}
          onPress={onRefine}
          activeOpacity={0.7}
        >
          <Text style={styles.refineButtonText}>Refine</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Messages list
  messagesList: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  messagesListEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Welcome state
  welcomeContainer: {
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xxl,
  },
  chefAvatarLarge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  chefAvatarEmoji: {
    fontSize: 36,
  },
  welcomeTitle: {
    fontSize: FontSize.lg,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },

  // Inspiration cards
  inspirationGrid: {
    width: '100%',
    gap: Spacing.sm,
  },
  inspirationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.card,
    gap: Spacing.md,
  },
  inspirationIcon: {
    fontSize: 24,
  },
  inspirationText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  // inspirationSubtitle removed — cards kept compact without it

  // User message
  userRow: {
    alignItems: 'flex-end',
    marginBottom: Spacing.md,
  },
  userBubble: {
    maxWidth: '80%',
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomRightRadius: 4,
  },
  userText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.white,
    lineHeight: 22,
  },
  userImageContainer: {
    alignItems: 'flex-end',
    gap: Spacing.xs,
  },
  userImage: {
    width: 200,
    height: 200,
    borderRadius: BorderRadius.card,
  },

  // Assistant message
  assistantRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  chefAvatarSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  chefAvatarSmallEmoji: {
    fontSize: 16,
  },
  assistantColumn: {
    flex: 1,
    gap: Spacing.sm,
  },
  assistantBubble: {
    maxWidth: '90%',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  assistantText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 22,
  },

  // Loading bubble
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  loadingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Thinking indicator
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.textSecondary,
  },
  dot1: { opacity: 0.4 },
  dot2: { opacity: 0.6 },
  dot3: { opacity: 0.8 },
  thinkingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Error bubble
  errorBubble: {
    maxWidth: '90%',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorText: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.danger,
    lineHeight: 22,
  },
  errorRetry: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    color: Colors.primary,
    marginTop: Spacing.xs,
  },

  // Recipe card
  recipeCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    maxWidth: '95%',
  },
  recipeHeader: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.sm,
  },
  recipeEmojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recipeEmoji: {
    fontSize: 24,
  },
  recipeHeaderText: {
    flex: 1,
  },
  recipeName: {
    fontSize: FontSize.md,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.text,
  },
  recipeDescription: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  recipeMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  metaChip: {
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.pill,
  },
  metaChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.text,
  },
  dietaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  dietaryChip: {
    backgroundColor: '#E6F4EA',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  dietaryChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: '#1B5E20',
  },
  changesSummary: {
    backgroundColor: '#FFF8E1',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.sm,
  },
  changesSummaryText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: '#F57F17',
  },

  // Expandable sections
  expandableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  expandableTitle: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },
  ingredientsList: {
    paddingBottom: Spacing.sm,
  },
  ingredientItem: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 22,
    paddingLeft: Spacing.xs,
  },
  stepsList: {
    paddingBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  stepItem: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  stepNumber: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.bold,
    fontWeight: '700',
    color: Colors.primary,
    width: 20,
  },
  stepText: {
    flex: 1,
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    lineHeight: 20,
  },

  // Recipe action buttons
  recipeActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: Spacing.md,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.white,
  },
  refineButton: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.button,
    alignItems: 'center',
  },
  refineButtonText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.text,
  },

  // Input bar
  inputBarContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.background,
  },
  pendingImageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    gap: Spacing.sm,
  },
  pendingImageThumb: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  pendingImageRemove: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingImageRemoveText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 6,
  },
  inlineActionBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    fontSize: FontSize.base,
    fontFamily: FontFamily.regular,
    color: Colors.text,
    maxHeight: 100,
    minHeight: 36,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.surface,
  },
});
