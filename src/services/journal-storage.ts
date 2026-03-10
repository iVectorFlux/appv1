/** Journal storage: SQLite on native, Supabase on web. Same API for both. */

import { Platform } from 'react-native';
import type { JournalEntry } from '@/types';
import * as db from '@/services/database';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

function encryptedToStorage(encrypted: string): string {
  return encrypted || '';
}

/** Read journal text from DB: store and display as plain text (no encryption). */
function journalTextFromRow(value: unknown): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (value instanceof ArrayBuffer) {
    try {
      return new TextDecoder('utf-8').decode(new Uint8Array(value));
    } catch {
      return '';
    }
  }
  if (typeof value === 'object' && value !== null && 'byteLength' in value) {
    try {
      return new TextDecoder('utf-8').decode(new Uint8Array(value as ArrayBuffer));
    } catch {
      return '';
    }
  }
  return '';
}

function normalizeEmotions(value: unknown): JournalEntry['emotions'] {
  if (Array.isArray(value)) return value as JournalEntry['emotions'];
  if (value == null) return [];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return Array.isArray(parsed) ? (parsed as JournalEntry['emotions']) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function mapSupabaseRowToEntry(row: Record<string, unknown>): JournalEntry {
  const createdAt = row.created_at != null ? new Date(row.created_at as string).getTime() : Date.now();
  const updatedAt = row.updated_at != null ? new Date(row.updated_at as string).getTime() : Date.now();
  return {
    id: row.id as string,
    userId: row.user_id as string,
    createdAt,
    updatedAt,
    entrySource: (row.entry_source === 'reflect' ? 'reflect' : 'journal_only') as JournalEntry['entrySource'],
    pleasantness: row.pleasantness as number | undefined,
    emotions: normalizeEmotions(row.emotions),
    energyLevel: (row.energy_level as JournalEntry['energyLevel']) ?? 1,
    reasons: row.reasons as string[] | undefined,
    journalTextEncrypted: journalTextFromRow(row.journal_text_encrypted),
    encryptionKeyId: row.encryption_key_id as string | undefined,
  };
}

const JOURNAL_SAVE_RETRIES = 3;
const JOURNAL_SAVE_RETRY_DELAY_MS = 1200;

async function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (Platform.OS === 'web') {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart (expo start --web).');
    }
    let lastError: Error | null = null;
    const row = {
      user_id: entry.userId,
      entry_source: entry.entrySource ?? 'journal_only',
      pleasantness: entry.pleasantness ?? null,
      energy_level: entry.energyLevel ?? 1,
      emotions: entry.emotions ?? [],
      reasons: entry.reasons ?? null,
      journal_text_encrypted: encryptedToStorage(entry.journalTextEncrypted ?? ''),
      encryption_key_id: null,
    };
    for (let attempt = 1; attempt <= JOURNAL_SAVE_RETRIES; attempt++) {
      try {
        const { data, error } = await supabase
          .from('journal_entries')
          .insert(row)
          .select('id')
          .single();
        if (error) throw new Error(error.message);
        return data.id as string;
      } catch (e) {
        lastError = e instanceof Error ? e : new Error(String(e));
        if (attempt < JOURNAL_SAVE_RETRIES) await delay(JOURNAL_SAVE_RETRY_DELAY_MS);
      }
    }
    throw lastError ?? new Error('Could not save journal entry.');
  }
  return db.createJournalEntry(entry);
}

export async function getJournalEntries(userId: string, limit: number = 50): Promise<JournalEntry[]> {
  if (Platform.OS === 'web') {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart (expo start --web).');
    }
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, user_id, created_at, updated_at, entry_source, pleasantness, energy_level, emotions, reasons, journal_text_encrypted, encryption_key_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    if (!data) return [];
    return (data as Record<string, unknown>[]).map(mapSupabaseRowToEntry);
  }
  return db.getJournalEntries(userId, limit);
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  if (Platform.OS === 'web') {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
    }
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, user_id, created_at, updated_at, entry_source, pleasantness, energy_level, emotions, reasons, journal_text_encrypted, encryption_key_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapSupabaseRowToEntry(data as Record<string, unknown>);
  }
  return db.getJournalEntry(id);
}

export async function updateJournalEntry(id: string, updates: { journalTextEncrypted: string; updatedAt: number }): Promise<void> {
  if (Platform.OS === 'web') {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
    }
    const { error } = await supabase
      .from('journal_entries')
      .update({
        journal_text_encrypted: encryptedToStorage(updates.journalTextEncrypted),
        updated_at: new Date(updates.updatedAt).toISOString(),
      })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  return db.updateJournalEntry(id, updates);
}

export async function deleteJournalEntry(id: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase not configured. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY to .env and restart.');
    }
    const { error } = await supabase
      .from('journal_entries')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  return db.deleteJournalEntry(id);
}
