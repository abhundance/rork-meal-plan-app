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
  Animated,
  LayoutAnimation,
  Platform,
  Alert,
  Keyboard,
  Linking,
  UIManager,
} from 'react-native';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Send, Camera, ImageIcon, Mic, FileText, Square, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import { useAudioRecorder, RecordingPresets, setAudioModeAsync, requestRecordingPermissionsAsync } from 'expo-audio';
import Colors from '@/constants/colors';
import { FontFamily, FontSize } from '@/constants/typography';
import { BorderRadius, Spacing } from '@/constants/theme';
import { getSupabase, buildEdgeFunctionHeaders } from '@/services/supabase';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import {
  ExtractedRecipe,
  extractRecipeFromVideoUrl,
} from '@/services/recipeExtraction';

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

let messageCounter = 0;
function nextId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}

// ── Inspiration cards ─────────────────────────────────────────────────────────

const INSPIRATIONS = [
  {
    icon: '💬',
    bgColor: Colors.inspirationTintRed,
    text: '"I have chicken and rice, need something quick"',
    subtitle: 'Describe ingredients or cravings',
  },
  {
    icon: '🔗',
    bgColor: Colors.inspirationTintBlue,
    text: 'Paste a YouTube, TikTok, or blog link',
    subtitle: 'Extracts full recipe from any URL',
  },
  {
    icon: '📷',
    bgColor: Colors.inspirationTintGreen,
    text: 'Snap a photo of a recipe or menu',
    subtitle: 'AI reads and structures the recipe',
  },
  {
    icon: '🎤',
    bgColor: Colors.inspirationTintOrange,
    text: 'Speak your recipe or describe a dish',
    subtitle: 'Voice to structured recipe',
  },
  {
    icon: '📄',
    bgColor: Colors.inspirationTintSky,
    text: 'Attach a recipe PDF or document',
    subtitle: 'Extract recipes from files',
  },
  {
    icon: '🍽️',
    bgColor: Colors.inspirationTintPurple,
    text: '"A lighter version of Butter Chicken"',
    subtitle: 'Modify or reinvent any dish',
  },
];

// ── Refinement suggestion chips ───────────────────────────────────────────────

const REFINE_SUGGESTIONS = [
  'Make it spicier',
  'Fewer ingredients',
  'Make it vegetarian',
  'Quicker version',
  'Make it healthier',
  'Kid-friendly version',
  'Double the servings',
  'Make it gluten-free',
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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [voiceState, setVoiceState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [voiceElapsed, setVoiceElapsed] = useState(0);

  // Audio recorder (expo-audio)
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const voiceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef<Animated.CompositeAnimation | null>(null);

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
  const isSendingRef = useRef(false);

  // Auto-send initial prompt once — deferred to next tick so messagesRef is populated
  const handleSendRef = useRef(handleSend);
  handleSendRef.current = handleSend;
  useEffect(() => {
    if (initialPrompt && !hasAutoSent.current && messages.length === 0) {
      hasAutoSent.current = true;
      // Defer to next tick to avoid stale closure over messages
      setTimeout(() => handleSendRef.current(initialPrompt), 0);
    }
  }, [initialPrompt, messages.length]);

  // ── Scroll helper ─────────────────────────────────────────────────────────

  const scrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToBottom = useCallback(() => {
    // Clear any pending scroll to avoid leak
    if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    scrollTimerRef.current = setTimeout(() => {
      scrollTimerRef.current = null;
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
      const { data: sessionData } = await supabase.auth.getSession();

      const apiMessages = allMessages
        .filter((m) => m.type !== 'loading' && m.type !== 'error')
        .map((m) => ({
          role: m.role,
          content: m.content,
          ...(m.imageBase64 ? { image_base64: m.imageBase64 } : {}),
        }));

      // Build dietary context from family settings
      const dietaryContext: Record<string, unknown> = {};
      if (familySettings.dietary_preferences?.length) {
        dietaryContext.dietary_preferences = familySettings.dietary_preferences;
      }
      if (familySettings.allergens?.length) {
        dietaryContext.allergens = familySettings.allergens;
      }
      if (familySettings.default_serving_size) {
        dietaryContext.default_serving_size = familySettings.default_serving_size;
      }

      // Retry transient failures (network blips, 502/503) up to 2 times
      const MAX_RETRIES = 2;
      let response: { data: any; error: any } | undefined;
      let lastError: Error | undefined;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          response = await supabase.functions.invoke('ai-chef', {
            body: {
              messages: apiMessages,
              language: familySettings.language || 'English',
              ...(Object.keys(dietaryContext).length > 0 ? { family_context: dietaryContext } : {}),
            },
            headers: buildEdgeFunctionHeaders(sessionData?.session ?? null),
          });
          // If we got a response (even an error response), break — only retry on thrown exceptions
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const isRetryable =
            lastError instanceof TypeError && lastError.message === 'Network request failed';
          if (!isRetryable || attempt === MAX_RETRIES) throw lastError;
          // Brief backoff before retry: 500ms, 1000ms
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }

      if (!response || response.error) {
        throw new Error(response?.error?.message || 'AI Chef request failed');
      }

      const data = response.data;

      // Validate response shape — Edge Function must return an object
      if (!data || typeof data !== 'object') {
        throw new Error('Invalid response from AI Chef. Please try again.');
      }

      if (data.error === 'quota_exceeded') {
        return { reply: data.reply || 'Monthly limit reached.', error: 'quota_exceeded' };
      }
      if (data.error) {
        throw new Error(typeof data.error === 'string' ? data.error : 'AI Chef returned an error.');
      }

      // Validate recipe shape if present
      if (data.recipe && typeof data.recipe === 'object') {
        if (!data.recipe.name || typeof data.recipe.name !== 'string') {
          console.warn('[AiChefChat] Recipe missing name, treating as text response');
          return { reply: data.reply || '' };
        }
      }

      return {
        reply: typeof data.reply === 'string' ? data.reply : '',
        recipe: data.recipe || undefined,
        changesSummary: data.changes_summary || undefined,
        extractUrl: data.extract_url || undefined,
      };
    },
    [familySettings.language, familySettings.dietary_preferences, familySettings.allergens, familySettings.default_serving_size],
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
      if (isSendingRef.current) return;
      isSendingRef.current = true;

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
          // Reset thinking/sending state before delegating to URL extraction
          // (handleUrlExtraction manages its own loading indicator)
          setIsThinking(false);
          isSendingRef.current = false;
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

  // ── Document/PDF picker ─────────────────────────────────────────────────

  const pickDocument = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'text/plain', 'text/html'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const isPdf = asset.mimeType === 'application/pdf' || asset.name?.toLowerCase().endsWith('.pdf');

      if (isPdf) {
        // PDFs are binary — read as base64 and send to AI Chef Edge Function
        // which can use GPT-4o Vision to parse the document
        const fileResponse = await fetch(asset.uri);
        const blob = await fileResponse.blob();
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1]); // Strip data: prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64 || base64.length < 100) {
          Alert.alert('Empty PDF', 'The selected PDF appears to be empty. Try a different file.');
          return;
        }

        // Send as a structured message — the Edge Function can process the base64 PDF
        const docMessage = `[Attached PDF: ${asset.name}]\n\nThis is a PDF document. Please extract any recipes from it.\n\n[PDF_BASE64:${base64.slice(0, 10000)}]`;
        setShowAttachments(false);
        void handleSend(docMessage);
      } else {
        // Text/HTML files — read as plain text
        const fileResponse = await fetch(asset.uri);
        const fileText = await fileResponse.text();

        if (!fileText.trim()) {
          Alert.alert('Empty Document', 'The selected file appears to be empty. Try a different file.');
          return;
        }

        const truncated = fileText.length > 5000 ? fileText.slice(0, 5000) + '...' : fileText;
        const docMessage = `[Attached document: ${asset.name}]\n\n${truncated}\n\nPlease extract any recipes from this document.`;
        setShowAttachments(false);
        void handleSend(docMessage);
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (err) {
      console.error('[AiChefChat] Document picker error:', err);
      Alert.alert('Could Not Read Document', 'There was a problem reading the file. Try a different format (PDF or text).');
    }
  }, [handleSend]);

  // ── Inline voice recording ──────────────────────────────────────────────

  const startPulse = useCallback(() => {
    pulseAnim.setValue(1);
    pulseLoopRef.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 500, useNativeDriver: true }),
      ]),
    );
    pulseLoopRef.current.start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseLoopRef.current?.stop();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const clearVoiceTimer = useCallback(() => {
    if (voiceTimerRef.current) {
      clearInterval(voiceTimerRef.current);
      voiceTimerRef.current = null;
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearVoiceTimer();
      stopPulse();
      if (scrollTimerRef.current) clearTimeout(scrollTimerRef.current);
    };
  }, [clearVoiceTimer, stopPulse]);

  const handleVoiceStart = useCallback(async () => {
    if (voiceState !== 'idle') return;

    const { status } = await requestRecordingPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Microphone Access Required',
        Platform.OS === 'ios'
          ? 'Meal Plan needs microphone access to record your voice. Tap Open Settings and enable Microphone.'
          : 'Meal Plan needs microphone access. Tap Open Settings and enable the Microphone permission.',
        [
          { text: 'Not Now', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return;
    }

    try {
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setVoiceElapsed(0);
      setVoiceState('recording');
      startPulse();
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      voiceTimerRef.current = setInterval(() => {
        setVoiceElapsed(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('[AiChefChat] Failed to start recording:', err);
      Alert.alert('Error', 'Could not start recording. Please try again.');
    }
  }, [voiceState, audioRecorder, startPulse]);

  const handleVoiceStop = useCallback(async () => {
    if (voiceState !== 'recording') return;

    clearVoiceTimer();
    stopPulse();
    setVoiceState('transcribing');

    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (!uri) throw new Error('No URI from recording');

      // Read audio file as base64
      const audioResponse = await fetch(uri);
      if (!audioResponse.ok) throw new Error('Could not read audio file.');
      const blob = await audioResponse.blob();
      const base64Audio = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]); // Strip data: prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
      const audioMimeType = blob.type || 'audio/m4a';

      // Call ai-chef Edge Function in transcribe-only mode
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('ai-chef', {
        body: { type: 'transcribe', base64Audio, audioMimeType },
        headers: buildEdgeFunctionHeaders(sessionData?.session ?? null),
      });

      if (response.error) throw new Error(response.error.message);
      const transcribedText = response.data?.text?.trim() ?? '';

      // Clean up temp audio file — expo-audio writes to cache dir which the OS
      // will eventually purge, but we proactively release it to free space sooner.
      // expo-file-system is not installed; the recorder reuses the same temp path
      // on subsequent recordings, so leakage is bounded to one file per session.

      if (transcribedText.length > 0) {
        setInputText(transcribedText);
        // Focus the input so the user can review/edit before sending
        setTimeout(() => inputRef.current?.focus(), 100);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert('No speech detected', 'Could not detect any speech. Please try again.');
      }
    } catch (err) {
      console.error('[AiChefChat] Voice transcription error:', err);
      Alert.alert('Transcription Failed', 'Could not transcribe your voice. Check your connection and try again.');
    } finally {
      setVoiceState('idle');
      setVoiceElapsed(0);
    }
  }, [voiceState, audioRecorder, clearVoiceTimer, stopPulse]);

  const handleVoiceCancel = useCallback(async () => {
    clearVoiceTimer();
    stopPulse();
    try { await audioRecorder.stop(); } catch { /* ignore */ }
    setVoiceState('idle');
    setVoiceElapsed(0);
  }, [audioRecorder, clearVoiceTimer, stopPulse]);

  const formatVoiceTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const handleRefine = useCallback(
    (suggestion?: string) => {
      if (suggestion) {
        // Quick-refine: send the suggestion as a message immediately
        void handleSend(suggestion);
      } else {
        // Custom refine: focus input for user to type
        inputRef.current?.focus();
        setInputText('');
      }
    },
    [handleSend],
  );

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
                // Voice card → start inline recording
                handleVoiceStart();
              } else if (idx === 4) {
                // PDF/document card → open document picker
                pickDocument();
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

  // Animated thinking dots
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
          /* ── Recording state: red dot + timer + cancel/stop ── */
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
          /* ── Transcribing state: spinner + text ── */
          <View style={styles.inputRow}>
            <View style={styles.voiceTranscribingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.voiceTranscribingText}>Transcribing...</Text>
            </View>
          </View>
        ) : (
          /* ── Normal input state ── */
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={() => pickImage(true)} activeOpacity={0.6}>
              <Camera size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={() => pickImage(false)} activeOpacity={0.6}>
              <ImageIcon size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={handleVoiceStart} activeOpacity={0.6}>
              <Mic size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.inlineActionBtn} onPress={pickDocument} activeOpacity={0.6}>
              <FileText size={20} color={Colors.textSecondary} />
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
        )}
      </View>
    );
  };

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
    </View>
  );
}

// ── RecipeCard (extracted outside main component to preserve expand state) ──

interface RecipeCardProps {
  recipe: ExtractedRecipe;
  changesSummary?: string;
  onSave: (recipe: ExtractedRecipe) => void;
  onRefine: (suggestion?: string) => void;
}

function RecipeCard({ recipe, changesSummary, onSave, onRefine }: RecipeCardProps) {
  const [showIngredients, setShowIngredients] = useState(false);
  const [showSteps, setShowSteps] = useState(false);
  const [showRefineChips, setShowRefineChips] = useState(false);

  const toggleIngredients = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowIngredients(!showIngredients);
  };
  const toggleSteps = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowSteps(!showSteps);
  };
  const toggleRefineChips = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowRefineChips(!showRefineChips);
  };

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
            onPress={toggleIngredients}
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
            onPress={toggleSteps}
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
          onPress={toggleRefineChips}
          activeOpacity={0.7}
        >
          <Text style={styles.refineButtonText}>
            {showRefineChips ? 'Hide Options' : 'Refine'}
          </Text>
        </TouchableOpacity>
      </View>

      {showRefineChips && (
        <View style={styles.refineChipsContainer}>
          <View style={styles.refineChipsWrap}>
            {REFINE_SUGGESTIONS.map((suggestion, i) => (
              <TouchableOpacity
                key={i}
                style={styles.refineChip}
                onPress={() => {
                  setShowRefineChips(false);
                  onRefine(suggestion);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.refineChipText}>{suggestion}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity
            style={styles.refineCustomBtn}
            onPress={() => {
              setShowRefineChips(false);
              onRefine();
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.refineCustomBtnText}>Type your own change...</Text>
          </TouchableOpacity>
        </View>
      )}
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
  // dot1/2/3 opacity is now animated — no static overrides needed
  thinkingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },

  // Error bubble
  errorBubble: {
    maxWidth: '90%',
    backgroundColor: Colors.dangerLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: Colors.dangerBorder,
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
    backgroundColor: Colors.successLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.pill,
  },
  dietaryChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.successText,
  },
  changesSummary: {
    backgroundColor: Colors.warningLight,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.button,
    marginBottom: Spacing.sm,
  },
  changesSummaryText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.warningText,
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

  // Refine suggestion chips
  refineChipsContainer: {
    marginTop: Spacing.sm,
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  refineChipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  refineChip: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  refineChipText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  refineCustomBtn: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  refineCustomBtnText: {
    fontSize: FontSize.xs,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
    textDecorationLine: 'underline',
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
    width: 44,
    height: 44,
    borderRadius: 22,
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
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.sm,
    gap: 2,
  },
  inlineActionBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    // 44px hit area, visually compact via the 20px icon inside
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
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonActive: {
    backgroundColor: Colors.primary,
  },
  sendButtonInactive: {
    backgroundColor: Colors.surface,
  },

  // Voice recording inline states
  voiceCancelBtn: {
    minWidth: 44,
    minHeight: 44,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  voiceCancelText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  voiceRecordingCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  voiceDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  voiceTimer: {
    fontSize: FontSize.base,
    fontFamily: FontFamily.semiBold,
    fontWeight: '600',
    color: Colors.primary,
  },
  voiceStopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceTranscribingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  voiceTranscribingText: {
    fontSize: FontSize.sm,
    fontFamily: FontFamily.regular,
    color: Colors.textSecondary,
  },
});
