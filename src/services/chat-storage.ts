/**
 * Chat Storage — save and load AI chat messages from Supabase
 *
 * Works with the ai_chat_messages table (migration 00007).
 * Requires the user to be authenticated.
 */

import { Platform } from 'react-native';
import type { JournalEntry } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { createJournalEntry } from '@/services/journal-storage';

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
  const em = (emotions ?? []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
  const ctx = (lifeContexts ?? []).filter((s) => typeof s === 'string' && s.trim()).map((s) => s.trim());
  const saveReflection = Boolean(suggestSaveAsReflection);
  if (em.length === 0 && ctx.length === 0 && !saveReflection) return;

  if (Platform.OS === 'web' && !isSupabaseConfigured()) return;

  try {
    await createJournalEntry({
      userId,
      entrySource: 'inner_ally',
      emotions: em.length > 0 ? (em as JournalEntry['emotions']) : [],
      reasons: ctx.length > 0 ? ctx : undefined,
      energyLevel: 3,
      journalTextEncrypted: userMessage.trim() || '(Inner Ally check-in)',
      encryptionKeyId: undefined,
      chatMessageId: chatMessageId ?? null,
    });
  } catch (e) {
    console.error('[ChatStorage] Failed to auto-journal from chat:', e);
  }
}

/**
 * Persist the assistant turn after the UI already shows the reply (so typing can stop immediately).
 * Runs Supabase insert + Inner Ally auto-journal; failures are logged only.
 */
export async function persistAssistantTurnAfterReply(params: {
  userId: string;
  mode: ChatMode;
  reply: string;
  suggestion: Record<string, unknown>;
  userMessageForJournal: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .insert({
      user_id: params.userId,
      mode: params.mode,
      role: 'assistant',
      content: params.reply,
      metadata: { suggestion: params.suggestion },
    })
    .select('id')
    .single();

  if (error) {
    console.error('[ChatStorage] Failed to save assistant message:', error);
    return;
  }

  const assistantMsgId = (data as { id?: string } | null)?.id;

  if (params.mode !== 'inner_ally') return;

  const raw = params.suggestion;
  const emotions = Array.isArray(raw.emotions)
    ? raw.emotions.filter((x): x is string => typeof x === 'string')
    : undefined;
  const lifeContexts = Array.isArray(raw.lifeContexts)
    ? raw.lifeContexts.filter((x): x is string => typeof x === 'string')
    : undefined;

  await autoJournalFromChat({
    userId: params.userId,
    userMessage: params.userMessageForJournal,
    emotions,
    lifeContexts,
    suggestSaveAsReflection: Boolean(raw.suggestSaveAsReflection),
    chatMessageId: assistantMsgId,
  });
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

export interface ChatSession {
  date: string;
  preview: string;
  messageCount: number;
  emotions: string[];
  firstMessageAt: string;
}

/**
 * Group chat messages into daily sessions for the history panel.
 */
export async function getChatSessions(
  userId: string,
  mode: ChatMode,
  limit = 30
): Promise<ChatSession[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('[ChatStorage] Failed to load sessions:', error);
    return [];
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const byDate = new Map<string, typeof rows>();

  for (const row of rows) {
    const dateStr = new Date(row.created_at as string).toLocaleDateString('en-CA');
    const bucket = byDate.get(dateStr) ?? [];
    bucket.push(row);
    byDate.set(dateStr, bucket);
  }

  const sessions: ChatSession[] = [];
  for (const [date, msgs] of byDate) {
    const userMsgs = msgs.filter((m) => m.role === 'user');
    const preview = userMsgs.length > 0
      ? (userMsgs[userMsgs.length - 1].content as string).slice(0, 80)
      : '(no messages)';

    const emotions: string[] = [];
    for (const m of msgs) {
      const meta = m.metadata as Record<string, unknown> | null;
      const suggestion = meta?.suggestion as Record<string, unknown> | undefined;
      const ems = suggestion?.emotions;
      if (Array.isArray(ems)) {
        for (const e of ems) {
          if (typeof e === 'string' && !emotions.includes(e)) emotions.push(e);
        }
      }
    }

    sessions.push({
      date,
      preview,
      messageCount: msgs.length,
      emotions: emotions.slice(0, 3),
      firstMessageAt: msgs[msgs.length - 1].created_at as string,
    });

    if (sessions.length >= limit) break;
  }

  return sessions;
}

/**
 * Load messages for a specific date session.
 */
export async function getChatSessionMessages(
  userId: string,
  mode: ChatMode,
  date: string
): Promise<ChatMessage[]> {
  if (!isSupabaseConfigured()) return [];

  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, user_id, mode, role, content, metadata, created_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .gte('created_at', startOfDay)
    .lte('created_at', endOfDay)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('[ChatStorage] Failed to load session messages:', error);
    return [];
  }

  return ((data ?? []) as Record<string, unknown>[]).map((row) => ({
    id: row.id as string,
    userId: row.user_id as string,
    mode: row.mode as ChatMode,
    role: row.role as ChatRole,
    content: row.content as string,
    metadata: row.metadata as Record<string, unknown> | null,
    createdAt: row.created_at as string,
  }));
}
