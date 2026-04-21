/**
 * Chat Storage — AI chat messages in AsyncStorage (always) and Supabase when configured.
 *
 * Local copy keeps history available offline and when the cloud sync is unavailable.
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

const LOCAL_KEY_PREFIX = '@eqapp/chat-messages/v1';
const LOCAL_MAX_MESSAGES = 500;

function localStorageKey(userId: string, mode: ChatMode): string {
  return `${LOCAL_KEY_PREFIX}/${userId}/${mode}`;
}

function generateLocalId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function readLocalMessages(userId: string, mode: ChatMode): Promise<ChatMessage[]> {
  try {
    const raw = await AsyncStorage.getItem(localStorageKey(userId, mode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as ChatMessage[];
  } catch {
    return [];
  }
}

async function writeLocalMessages(userId: string, mode: ChatMode, messages: ChatMessage[]): Promise<void> {
  const trimmed =
    messages.length > LOCAL_MAX_MESSAGES ? messages.slice(-LOCAL_MAX_MESSAGES) : messages;
  await AsyncStorage.setItem(localStorageKey(userId, mode), JSON.stringify(trimmed));
}

async function appendLocalMessage(userId: string, mode: ChatMode, message: ChatMessage): Promise<void> {
  const prev = await readLocalMessages(userId, mode);
  prev.push(message);
  await writeLocalMessages(userId, mode, prev);
}

/** Dedupe overlapping local + server copies; prefer rows with richer metadata / stable server ids. */
function mergeChatMessagesDeduped(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const keyOf = (m: ChatMessage) =>
    `${m.role}|${m.createdAt ?? ''}|${(m.content ?? '').slice(0, 200)}`;

  const map = new Map<string, ChatMessage>();
  const put = (m: ChatMessage) => {
    const k = keyOf(m);
    const cur = map.get(k);
    if (!cur) {
      map.set(k, m);
      return;
    }
    const preferNew =
      (m.metadata && !cur.metadata) ||
      ((m.id?.length ?? 0) > (cur.id?.length ?? 0) && (m.id?.includes('-') ?? false));
    if (preferNew) map.set(k, m);
  };

  for (const m of a) put(m);
  for (const m of b) put(m);

  return Array.from(map.values()).sort(
    (x, y) => new Date(x.createdAt ?? 0).getTime() - new Date(y.createdAt ?? 0).getTime()
  );
}

function takeRecentChronological(merged: ChatMessage[], limit: number): ChatMessage[] {
  if (merged.length <= limit) return merged;
  return merged.slice(-limit);
}

async function fetchRemoteChatHistory(
  userId: string,
  mode: ChatMode,
  limit: number
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
    console.error('[ChatStorage] Failed to load remote history:', error);
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

async function fetchRemoteMessagesRaw(
  userId: string,
  mode: ChatMode,
  limit: number
): Promise<Record<string, unknown>[]> {
  if (!isSupabaseConfigured()) return [];

  const { data, error } = await supabase
    .from('ai_chat_messages')
    .select('id, role, content, metadata, created_at')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('[ChatStorage] Failed to load remote messages:', error);
    return [];
  }

  return (data ?? []) as Record<string, unknown>[];
}

/**
 * Persist a single chat message (user or assistant turn) to local storage and Supabase.
 */
export async function saveChatMessage(message: ChatMessage): Promise<void> {
  const full: ChatMessage = {
    id: message.id ?? generateLocalId(),
    userId: message.userId,
    mode: message.mode,
    role: message.role,
    content: message.content,
    metadata: message.metadata ?? null,
    createdAt: message.createdAt ?? new Date().toISOString(),
  };

  await appendLocalMessage(message.userId, message.mode, full);

  if (!isSupabaseConfigured()) return;

  const { error } = await supabase.from('ai_chat_messages').insert({
    user_id: full.userId,
    mode: full.mode,
    role: full.role,
    content: full.content,
    metadata: full.metadata ?? null,
  });

  if (error) {
    console.error('[ChatStorage] Failed to save message to Supabase:', error);
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
  const local = await readLocalMessages(userId, mode);
  const remote = await fetchRemoteChatHistory(userId, mode, limit);
  const merged = mergeChatMessagesDeduped(local, remote);
  return takeRecentChronological(merged, limit);
}

const CHAT_HISTORY_TIMEOUT_MS = 12_000;

/** Same as getChatHistory but never hangs indefinitely (UI can clear loading state). */
export async function getChatHistoryWithTimeout(
  userId: string,
  mode: ChatMode,
  limit = 50,
  timeoutMs = CHAT_HISTORY_TIMEOUT_MS
): Promise<ChatMessage[]> {
  const local = await readLocalMessages(userId, mode);
  const remote = await Promise.race([
    fetchRemoteChatHistory(userId, mode, limit),
    new Promise<ChatMessage[]>((resolve) => {
      setTimeout(() => resolve([]), timeoutMs);
    }),
  ]);
  const merged = mergeChatMessagesDeduped(local, remote);
  return takeRecentChronological(merged, limit);
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
 * Writes to AsyncStorage always; runs Supabase insert + Inner Ally auto-journal when configured.
 */
export async function persistAssistantTurnAfterReply(params: {
  userId: string;
  mode: ChatMode;
  reply: string;
  suggestion: Record<string, unknown>;
  userMessageForJournal: string;
  assistantMessageId?: string;
  createdAt?: string;
}): Promise<void> {
  const createdAt = params.createdAt ?? new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const id = params.assistantMessageId ?? generateLocalId();
    await appendLocalMessage(params.userId, params.mode, {
      id,
      userId: params.userId,
      mode: params.mode,
      role: 'assistant',
      content: params.reply,
      metadata: { suggestion: params.suggestion },
      createdAt,
    });
    if (params.mode === 'inner_ally') {
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
        chatMessageId: undefined,
      });
    }
    return;
  }

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

  const assistantMsgId = !error && data ? (data as { id?: string }).id : params.assistantMessageId ?? generateLocalId();

  if (error) {
    console.error('[ChatStorage] Failed to save assistant message to Supabase:', error);
  }

  await appendLocalMessage(params.userId, params.mode, {
    id: assistantMsgId,
    userId: params.userId,
    mode: params.mode,
    role: 'assistant',
    content: params.reply,
    metadata: { suggestion: params.suggestion },
    createdAt,
  });

  if (error || params.mode !== 'inner_ally') return;

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
    chatMessageId: !error && data ? (data as { id: string }).id : undefined,
  });
}

/**
 * Delete all chat messages for a user in a given mode (clear conversation).
 */
export async function clearChatHistory(userId: string, mode: ChatMode): Promise<void> {
  try {
    await AsyncStorage.removeItem(localStorageKey(userId, mode));
  } catch {
    /* ignore */
  }

  if (!isSupabaseConfigured()) return;

  const { error } = await supabase
    .from('ai_chat_messages')
    .delete()
    .eq('user_id', userId)
    .eq('mode', mode);

  if (error) {
    console.error('[ChatStorage] Failed to clear remote history:', error);
  }
}

export interface ChatSession {
  date: string;
  preview: string;
  messageCount: number;
  emotions: string[];
  firstMessageAt: string;
}

function rowsToSessions(rows: Record<string, unknown>[], limit: number): ChatSession[] {
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
    const preview =
      userMsgs.length > 0
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
 * Group chat messages into daily sessions for the history panel.
 */
export async function getChatSessions(
  userId: string,
  mode: ChatMode,
  limit = 30
): Promise<ChatSession[]> {
  const local = await readLocalMessages(userId, mode);
  const remoteRows = await fetchRemoteMessagesRaw(userId, mode, 500);

  const localRows: Record<string, unknown>[] = local.map((m) => ({
    id: m.id,
    role: m.role,
    content: m.content,
    metadata: m.metadata,
    created_at: m.createdAt,
  }));

  const seen = new Set<string>();
  const combined: Record<string, unknown>[] = [];
  for (const r of remoteRows) {
    const k = `${r.role}|${r.created_at}|${String(r.content).slice(0, 120)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    combined.push(r);
  }
  for (const r of localRows) {
    const k = `${r.role}|${r.created_at}|${String(r.content).slice(0, 120)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    combined.push(r);
  }

  combined.sort(
    (a, b) =>
      new Date(b.created_at as string).getTime() - new Date(a.created_at as string).getTime()
  );

  return rowsToSessions(combined, limit);
}

/**
 * Load messages for a specific date session.
 */
export async function getChatSessionMessages(
  userId: string,
  mode: ChatMode,
  date: string
): Promise<ChatMessage[]> {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;

  const local = await readLocalMessages(userId, mode);
  let remote: ChatMessage[] = [];

  if (isSupabaseConfigured()) {
    const { data, error } = await supabase
      .from('ai_chat_messages')
      .select('id, user_id, mode, role, content, metadata, created_at')
      .eq('user_id', userId)
      .eq('mode', mode)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[ChatStorage] Failed to load session messages from Supabase:', error);
    } else {
      remote = ((data ?? []) as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        userId: row.user_id as string,
        mode: row.mode as ChatMode,
        role: row.role as ChatRole,
        content: row.content as string,
        metadata: row.metadata as Record<string, unknown> | null,
        createdAt: row.created_at as string,
      }));
    }
  }

  const inRange = (createdAt?: string) => {
    if (!createdAt) return false;
    return createdAt >= startOfDay && createdAt <= endOfDay;
  };

  const localFiltered = local.filter((m) => inRange(m.createdAt));
  const merged = mergeChatMessagesDeduped(localFiltered, remote);
  return merged.filter((m) => inRange(m.createdAt));
}
