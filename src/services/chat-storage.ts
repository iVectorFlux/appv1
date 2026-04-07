/**
 * Chat Storage — save and load AI chat messages from Supabase
 *
 * Works with the ai_chat_messages table (migration 00007).
 * Requires the user to be authenticated.
 */

import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export type ChatMode = 'inner_ally' | 'coach';
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id?: string;
  userId: string;
  mode: ChatMode;
  role: ChatRole;
  content: string;
  metadata?: Record<string, unknown> | null;
  createdAt?: string;
}

/**
 * Persist a single chat message (user or assistant turn) to Supabase.
 */
export async function saveChatMessage(message: ChatMessage): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.from('ai_chat_messages').insert({
    user_id: message.userId,
    mode: message.mode,
    role: message.role,
    content: message.content,
    metadata: message.metadata ?? null,
  });

  if (error) {
    console.error('[ChatStorage] Failed to save message:', error);
  }
}

/**
 * Load recent chat history for a user in a given mode.
 * Returns messages in ascending order (oldest first) for display.
 */
export async function getChatHistory(
  userId: string,
  mode: ChatMode,
  limit = 50
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, user_id, mode, role, content, metadata, created_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ChatStorage] Failed to load history:', error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[])
    .reverse()
    .map((row) => ({
      id: row.id as string,
      userId: row.user_id as string,
      mode: row.mode as ChatMode,
      role: row.role as ChatRole,
      content: row.content as string,
      metadata: row.metadata as Record<string, unknown> | null,
      createdAt: row.created_at as string,
    }));
}

const CHAT_HISTORY_TIMEOUT_MS = 12_000;

/** Same as getChatHistory but never hangs indefinitely (UI can clear loading state). */
export async function getChatHistoryWithTimeout(
  userId: string,
  mode: ChatMode,
  limit = 50,
  timeoutMs = CHAT_HISTORY_TIMEOUT_MS
): Promise<ChatMessage[]> {
  return Promise.race([
    getChatHistory(userId, mode, limit),
    new Promise<ChatMessage[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    }),
  ]);
}

/**
 * Auto-save Inner Ally turns as journal metadata (same table as Reflect).
 *
 * Saves when the model infers emotions, life contexts (work/family/etc.), or flags
 * the message as reflection-worthy. User text is stored as plain text with
 * encryption_key_id NULL (inner_ally source). Not written to onboarding_emotional_check
 * or eq_check_ins — those are separate flows.
 */
export async function autoJournalFromChat({
  userId,
  userMessage,
  emotions,
  lifeContexts,
  suggestSaveAsReflection,
  chatMessageId,
}: {
  userId: string;
  userMessage: string;
  emotions?: string[];
  lifeContexts?: string[];
  suggestSaveAsReflection?: boolean;
  chatMessageId?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  const em = (emotions ?? []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
  const ctx = (lifeContexts ?? []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
  const saveReflection = Boolean(suggestSaveAsReflection);
  if (em.length === 0 && ctx.length === 0 && !saveReflection) return;

  const { error } = await supabase.from('journal_entries').insert({
    user_id: userId,
    entry_source: 'inner_ally',
    emotions: em.length > 0 ? em : null,
    reasons: ctx.length > 0 ? ctx : null,
    journal_text_encrypted: userMessage.trim() || '(Inner Ally check-in)',
    encryption_key_id: null,
    word_count: userMessage.trim().split(/\s+/).filter(Boolean).length,
    chat_message_id: chatMessageId ?? null,
  });

  if (error) {
    console.error('[ChatStorage] Failed to auto-journal from chat:', error);
  }
}

/**
 * Delete all chat messages for a user in a given mode (clear conversation).
 */
export async function clearChatHistory(userId: string, mode: ChatMode): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('ai_chat_messages')
    .delete()
    .eq('user_id', userId)
    .eq('mode', mode);

  if (error) {
    console.error('[ChatStorage] Failed to clear history:', error);
  }
}
