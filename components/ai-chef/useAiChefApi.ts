/**
 * useAiChefApi — Hook encapsulating Edge Function communication.
 *
 * Handles: chat messages, URL extraction delegation, retry logic,
 * dietary context injection, and response validation.
 */

import { useCallback } from 'react';
import { getSupabase, buildEdgeFunctionHeaders } from '@/services/supabase';
import { useFamilySettings } from '@/providers/FamilySettingsProvider';
import {
  ExtractedRecipe,
  extractRecipeFromVideoUrl,
} from '@/services/recipeExtraction';
import { ChatMessage, nextId } from './types';

// ── Return types ────────────────────────────────────────────────────────────

export interface AiChefResponse {
  reply: string;
  recipe?: ExtractedRecipe;
  changesSummary?: string;
  extractUrl?: string;
  error?: string;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useAiChefApi() {
  const { familySettings } = useFamilySettings();

  /**
   * Call the ai-chef Edge Function with the full message history.
   * Includes retry logic for transient network failures (max 2 retries).
   */
  const callAiChef = useCallback(
    async (allMessages: ChatMessage[]): Promise<AiChefResponse> => {
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
          break;
        } catch (err) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const isRetryable =
            lastError instanceof TypeError && lastError.message === 'Network request failed';
          if (!isRetryable || attempt === MAX_RETRIES) throw lastError;
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }

      if (!response || response.error) {
        throw new Error(response?.error?.message || 'AI Chef request failed');
      }

      const data = response.data;

      // Validate response shape
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

  /**
   * Handle URL extraction via the extract-recipe service (client-side).
   * Returns a ChatMessage to append to the conversation.
   */
  const extractFromUrl = useCallback(
    async (url: string): Promise<ChatMessage> => {
      const extracted = await extractRecipeFromVideoUrl(url, familySettings.language || 'English');
      return {
        id: nextId(),
        role: 'assistant',
        type: 'recipe',
        content: "Here's the recipe I found from that link!",
        recipe: extracted,
        timestamp: Date.now(),
      };
    },
    [familySettings.language],
  );

  /**
   * Transcribe audio via the ai-chef Edge Function (transcribe-only mode).
   */
  const transcribeAudio = useCallback(
    async (base64Audio: string, audioMimeType: string): Promise<string> => {
      const supabase = getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('ai-chef', {
        body: { type: 'transcribe', base64Audio, audioMimeType },
        headers: buildEdgeFunctionHeaders(sessionData?.session ?? null),
      });
      if (response.error) throw new Error(response.error.message);
      return response.data?.text?.trim() ?? '';
    },
    [],
  );

  return { callAiChef, extractFromUrl, transcribeAudio };
}
