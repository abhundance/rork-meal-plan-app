/**
 * AiChefChat — ChatGPT-style conversational recipe assistant.
 *
 * Embeddable component used inside add-recipe-entry.tsx (AI Chef tab).
 * Supports: text chat, image attachments (camera/library), voice input,
 * URL detection (delegates to extract-recipe), recipe cards with save/refine.
 *
 * Architecture: thin orchestrator that wires together hooks and sub-components
 * from the `./ai-chef/` module. Business logic lives in the hooks; UI in the
 * sub-components; this file handles state management and composition.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  Animated,
  Platform,
  Keyboard,
} from 'react-native';

import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Mic, Square, Plus } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { Spacing } from '@/constants/theme';
import { ExtractedRecipe, extractRecipeFromPdf } from '@/services/recipeExtraction';

import {
  styles,
  RecipeCard,
  RecipeCardErrorBoundary,
  useAiChefApi,
  useVoiceRecorder,
  useAttachments,
  INSPIRATIONS,
  nextId,
} from './ai-chef';
import type { ChatMessage, AiChefChatProps } from './ai-chef';

// Re-export PendingPlanSlot so existing consumers don't break
export type { PendingPlanSlot } from './ai-chef';

// ── Component ─────────────────────────────────────────────────────────────────

export default function AiChefChat({ initialPrompt, pendingPlanSlot }: AiChefChatProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ uri: string; base64: string } | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [showAttachments, setShowAttachments] = useState(false);

  // Hooks
  const { callAiChef, extractFromUrl, transcribeAudio } = useAiChefApi();

  // Ref to always have latest messages (avoids stale closure in callbacks)
  const messagesRef = useRef<ChatMessage[]>([]);
  messagesRef.current = messages;

  const flatListRef = useRef<FlatList<ChatMessage> | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const hasAutoSent = useRef(false);
  const isSendingRef = useRef(false);

  // Track keyboard visibility + height for manual keyboard avoidance
  // (KeyboardAvoidingView is unreliable with modal presentations on iOS)
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const onShow = (e: { endCoordinates: { height: number } }) => {
      setKeyboardVisible(true);
      setKeyboardHeight(e.endCoordinates.height);
      // (no action menu state to collapse — "+" uses native Alert)
    };
    const onHide = () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    };
    const sub1 = Keyboard.addListener(showEvent, onShow);
    const sub2 = Keyboard.addListener(hideEvent, onHide);
    return () => { sub1.remove(); sub2.remove(); };
  }, []);

  // ── Scroll helper ─────────────────────────────────────────────────────────

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 150);
  }, []);

  // Clean up scroll timer on unmount
  useEffect(() => {
    return () => {
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, []);

  // ── URL extraction (client-side) ──────────────────────────────────────────

  const handleUrlExtraction = useCallback(
    async (url: string) => {
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
        const recipeMsg = await extractFromUrl(url);
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
    [extractFromUrl, scrollToBottom],
  );

  // ── Send message ──────────────────────────────────────────────────────────

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText ?? inputText).trim();
      if (!text && !pendingImage) return;
      if (isThinking) return;
      if (isSendingRef.current) return;
      isSendingRef.current = true;

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

        // Handle URL extraction delegation — keep isSendingRef locked until
        // extraction finishes so the user can't double-send during the async work
        if (result.extractUrl) {
          setIsThinking(false);
          try {
            await handleUrlExtraction(result.extractUrl);
          } finally {
            isSendingRef.current = false;
          }
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
          setIsThinking(false);
          isSendingRef.current = false;
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
        const isNetworkError = err instanceof TypeError && err.message === 'Network request failed';
        const errorContent = isNetworkError
          ? 'You appear to be offline. Check your connection and tap to retry.'
          : err instanceof Error && err.message
          ? `${err.message}. Tap to retry.`
          : 'Something went wrong — check your connection and tap to retry.';
        const errorMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: errorContent,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } finally {
        setIsThinking(false);
        isSendingRef.current = false;
      }
    },
    [inputText, pendingImage, isThinking, callAiChef, handleUrlExtraction, scrollToBottom],
  );

  // Auto-send initial prompt once — deferred to next tick so messagesRef is populated
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;
  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true;
      setTimeout(() => handleSendRef.current(initialPrompt), 0);
    }
  }, [initialPrompt, messages.length]);

  // ── Voice recording (delegated to hook) ───────────────────────────────────

  const onTranscribed = useCallback((text: string) => {
    setInputText(text);
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  const {
    voiceState,
    voiceElapsed,
    pulseAnim,
    handleVoiceStart,
    handleVoiceStop,
    handleVoiceCancel,
    formatVoiceTime,
  } = useVoiceRecorder(transcribeAudio, onTranscribed);

  // ── Attachments (delegated to hook) ───────────────────────────────────────

  const onDocumentReady = useCallback((message: string) => {
    void handleSend(message);
  }, [handleSend]);

  const onPdfExtraction = useCallback(
    async (fileUri: string, filename: string) => {
      // Show loading message while PDF is being extracted server-side
      const loadingMsg: ChatMessage = {
        id: nextId(),
        role: 'assistant',
        type: 'loading',
        content: `Extracting recipe from ${filename}...`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, loadingMsg]);
      scrollToBottom();

      try {
        const recipe = await extractRecipeFromPdf(fileUri, filename);
        const recipeMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'recipe',
          content: recipe.description
            ? `Here's what I found in ${filename}:`
            : `I extracted a recipe from ${filename}:`,
          recipe,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id).concat(recipeMsg));
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        const errorContent =
          err instanceof Error ? err.message : 'Could not extract a recipe from this PDF.';
        const errorMsg: ChatMessage = {
          id: nextId(),
          role: 'assistant',
          type: 'error',
          content: `${errorContent} Try taking a photo of the recipe page instead.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => prev.filter((m) => m.id !== loadingMsg.id).concat(errorMsg));
        scrollToBottom();
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [scrollToBottom],
  );

  const { pickImage, pickDocument } = useAttachments(
    setPendingImage,
    setShowAttachments,
    onDocumentReady,
    onPdfExtraction,
  );

  // ── Action button handlers (collapse actions after selection) ────────────

  // Camera/Photo/Doc actions are now in handlePlusMenu (Alert).
  // Voice (mic) is a direct button on the input row.

  // ── Save recipe → Review screen ──────────────────────────────────────────

  const handleSaveRecipe = useCallback(
    (recipe: ExtractedRecipe) => {
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
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.push({ pathname: '/add-recipe-review', params });
    },
    [router],
  );

  // ── "+" menu — Camera, Photos, PDF via native Alert ──────────────────────

  const handlePlusMenu = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();
    Alert.alert('Add to conversation', undefined, [
      { text: 'Camera', onPress: () => pickImage(true) },
      { text: 'Photo Library', onPress: () => pickImage(false) },
      { text: 'PDF / Document', onPress: () => pickDocument() },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [pickImage, pickDocument]);

  // ── Refine handler ────────────────────────────────────────────────────────

  const handleRefine = useCallback(
    (suggestion?: string) => {
      if (suggestion) {
        void handleSend(suggestion);
      } else {
        inputRef.current?.focus();
        setInputText('');
      }
    },
    [handleSend],
  );

  // ── Retry handler ─────────────────────────────────────────────────────────

  const handleRetry = useCallback(
    (errorMsgId: string) => {
      const currentMessages = messagesRef.current;
      const errorIdx = currentMessages.findIndex((m) => m.id === errorMsgId);
      if (errorIdx < 0) return;
      const lastUserMsg = currentMessages.slice(0, errorIdx).reverse().find((m) => m.role === 'user');
      if (lastUserMsg) {
        // Replace error message with a loading indicator while retrying;
        // if the retry itself fails, handleSend will append a new error message
        setMessages((prev) => prev.filter((m) => m.id !== errorMsgId));
        void handleSend(lastUserMsg.content).catch(() => {
          // handleSend already appends its own error message in the catch block,
          // so no additional action needed here
        });
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
                pickImage(true);
              } else if (idx === 3) {
                handleVoiceStart();
              } else if (idx === 4) {
                pickDocument();
              } else {
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
            <RecipeCardErrorBoundary>
              <RecipeCard
                recipe={item.recipe}
                changesSummary={item.changesSummary}
                onSave={handleSaveRecipe}
                onRefine={handleRefine}
              />
            </RecipeCardErrorBoundary>
          ) : null}
        </View>
      </View>
    );
  };

  // ── Render: Thinking indicator ────────────────────────────────────────────

  const dotAnim1 = useRef(new Animated.Value(0.3)).current;
  const dotAnim2 = useRef(new Animated.Value(0.3)).current;
  const dotAnim3 = useRef(new Animated.Value(0.3)).current;
  const thinkingLoopRef = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (isThinking) {
      const createDotAnim = (dot: Animated.Value, delay: number) =>
        Animated.sequence([
          Animated.delay(delay),
          Animated.loop(
            Animated.sequence([
              Animated.timing(dot, { toValue: 1, duration: 400, useNativeDriver: true }),
              Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
            ]),
          ),
        ]);
      thinkingLoopRef.current = Animated.parallel([
        createDotAnim(dotAnim1, 0),
        createDotAnim(dotAnim2, 150),
        createDotAnim(dotAnim3, 300),
      ]);
      thinkingLoopRef.current.start();
    } else {
      thinkingLoopRef.current?.stop();
      dotAnim1.setValue(0.3);
      dotAnim2.setValue(0.3);
      dotAnim3.setValue(0.3);
    }
    return () => { thinkingLoopRef.current?.stop(); };
  }, [isThinking, dotAnim1, dotAnim2, dotAnim3]);

  const renderThinking = () => {
    if (!isThinking) return null;
    return (
      <View style={styles.assistantRow}>
        <View style={styles.chefAvatarSmall}>
          <Text style={styles.chefAvatarSmallEmoji}>👨‍🍳</Text>
        </View>
        <View style={styles.thinkingBubble}>
          <View style={styles.thinkingDots}>
            <Animated.View style={[styles.dot, { opacity: dotAnim1 }]} />
            <Animated.View style={[styles.dot, { opacity: dotAnim2 }]} />
            <Animated.View style={[styles.dot, { opacity: dotAnim3 }]} />
          </View>
          <Text style={styles.thinkingText}>AI Chef is thinking...</Text>
        </View>
      </View>
    );
  };

  // ── Render: Input bar ─────────────────────────────────────────────────────

  const renderInputBar = () => {
    const isRecording = voiceState === 'recording';
    const isTranscribing = voiceState === 'transcribing';

    return (
      <View style={[styles.inputBarContainer, { paddingBottom: keyboardVisible ? Spacing.xs : insets.bottom }]}>
        {/* Pending image preview */}
        {pendingImage && !isRecording && !isTranscribing && (
          <View style={styles.pendingImageRow}>
            <Image source={{ uri: pendingImage.uri }} style={styles.pendingImageThumb} />
            <TouchableOpacity onPress={() => setPendingImage(null)} style={styles.pendingImageRemove}>
              <Text style={styles.pendingImageRemoveText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording ? (
          <View style={styles.inputRow}>
            <TouchableOpacity onPress={handleVoiceCancel} style={styles.voiceCancelBtn} activeOpacity={0.7}>
              <Text style={styles.voiceCancelText}>Cancel</Text>
            </TouchableOpacity>

            <View style={styles.voiceRecordingCenter}>
              <Animated.View style={[styles.voiceDot, { transform: [{ scale: pulseAnim }] }]} />
              <Text style={styles.voiceTimer}>{formatVoiceTime(voiceElapsed)}</Text>
            </View>

            <TouchableOpacity onPress={handleVoiceStop} style={styles.voiceStopBtn} activeOpacity={0.7}>
              <Square size={18} color={Colors.white} fill={Colors.white} />
            </TouchableOpacity>
          </View>
        ) : isTranscribing ? (
          <View style={styles.inputRow}>
            <View style={styles.voiceTranscribingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.voiceTranscribingText}>Transcribing...</Text>
            </View>
          </View>
        ) : (
          <View style={styles.inputRow}>
            {/* "+" button — opens Alert with Camera / Photos / PDF */}
            <TouchableOpacity
              style={styles.toggleActionsBtn}
              onPress={handlePlusMenu}
              activeOpacity={0.7}
            >
              <Plus size={20} color={Colors.white} strokeWidth={2.5} />
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

            {/* Right button: Send when typing/image attached, Mic when empty */}
            {(inputText.trim() || pendingImage) ? (
              <TouchableOpacity
                style={[styles.sendButton, !isThinking ? styles.sendButtonActive : styles.sendButtonInactive]}
                onPress={() => handleSend()}
                disabled={isThinking}
                activeOpacity={0.7}
              >
                <Send
                  size={18}
                  color={!isThinking ? Colors.white : Colors.textSecondary}
                  strokeWidth={2.5}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.micButton}
                onPress={handleVoiceStart}
                disabled={isThinking}
                activeOpacity={0.7}
              >
                <Mic size={20} color={isThinking ? Colors.textSecondary : Colors.primary} strokeWidth={2} />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, keyboardVisible && { paddingBottom: keyboardHeight }]}>
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
    </View>
  );
}
