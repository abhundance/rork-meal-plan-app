/**
 * Shared types for the AI Chef chat feature.
 */

import { ExtractedRecipe } from '@/services/recipeExtraction';

export interface PendingPlanSlot {
  slotId: string;
  date: string;
  slotName: string;
  defaultServing: number;
}

export interface AiChefChatProps {
  initialPrompt?: string;
  pendingPlanSlot?: PendingPlanSlot | null;
}

export type MessageType = 'text' | 'image' | 'recipe' | 'loading' | 'error';

export interface ChatMessage {
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

// ── ID generator ──────────────────────────────────────────────────────────────

let messageCounter = 0;
export function nextId(): string {
  return `msg_${Date.now()}_${++messageCounter}`;
}
