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
