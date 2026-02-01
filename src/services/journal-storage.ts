/**
 * Unified journal storage: SQLite on native, Supabase on web.
 * Same API so journal and reflect work on both platforms.
 */

import { Platform } from 'react-native';
import type { JournalEntry } from '@/types';
import * as db from '@/services/database';
import { supabase } from '@/lib/supabase';

/** On web, journal_text_encrypted is stored as base64 TEXT (no BYTEA). encryption_key_id is null; key is derived from user_id. */
function encryptedToStorage(encrypted: string): string {
  return encrypted || '';
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  if (Platform.OS === 'web') {
    const { data, error } = await supabase
      .from('journal_entries')
      .insert({
        user_id: entry.userId,
        entry_source: entry.entrySource ?? 'journal_only',
        pleasantness: entry.pleasantness ?? null,
        energy_level: entry.energyLevel ?? 1,
        emotions: entry.emotions ?? [],
        reasons: entry.reasons ?? null,
        journal_text_encrypted: encryptedToStorage(entry.journalTextEncrypted ?? ''),
        encryption_key_id: null, // Supabase column is UUID; key is derived from user_id for decrypt
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  }
  return db.createJournalEntry(entry);
}

export async function getJournalEntries(userId: string, limit: number = 50): Promise<JournalEntry[]> {
  if (Platform.OS === 'web') {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, user_id, created_at, updated_at, entry_source, pleasantness, energy_level, emotions, reasons, journal_text_encrypted, encryption_key_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    if (!data) return [];
    return data.map((row: Record<string, unknown>) => ({
      id: row.id as string,
      userId: row.user_id as string,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
      entrySource: (row.entry_source === 'reflect' ? 'reflect' : 'journal_only') as JournalEntry['entrySource'],
      pleasantness: row.pleasantness as number | undefined,
      emotions: (row.emotions as JournalEntry['emotions']) ?? [],
      energyLevel: (row.energy_level as JournalEntry['energyLevel']) ?? 1,
      reasons: row.reasons as string[] | undefined,
      journalTextEncrypted: row.journal_text_encrypted != null
        ? (typeof row.journal_text_encrypted === 'string'
            ? row.journal_text_encrypted
            : btoa(String.fromCharCode(...new Uint8Array(row.journal_text_encrypted as ArrayBuffer))))
        : '',
      encryptionKeyId: row.encryption_key_id as string | undefined,
    }));
  }
  return db.getJournalEntries(userId, limit);
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  if (Platform.OS === 'web') {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('id, user_id, created_at, updated_at, entry_source, pleasantness, energy_level, emotions, reasons, journal_text_encrypted, encryption_key_id')
      .eq('id', id)
      .eq('is_deleted', false)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    const row = data as Record<string, unknown>;
    return {
      id: row.id as string,
      userId: row.user_id as string,
      createdAt: new Date(row.created_at as string).getTime(),
      updatedAt: new Date(row.updated_at as string).getTime(),
      entrySource: (row.entry_source === 'reflect' ? 'reflect' : 'journal_only') as JournalEntry['entrySource'],
      pleasantness: row.pleasantness as number | undefined,
      emotions: (row.emotions as JournalEntry['emotions']) ?? [],
      energyLevel: (row.energy_level as JournalEntry['energyLevel']) ?? 1,
      reasons: row.reasons as string[] | undefined,
      journalTextEncrypted: row.journal_text_encrypted != null
        ? (typeof row.journal_text_encrypted === 'string'
            ? row.journal_text_encrypted
            : btoa(String.fromCharCode(...new Uint8Array(row.journal_text_encrypted as ArrayBuffer))))
        : '',
      encryptionKeyId: row.encryption_key_id as string | undefined,
    };
  }
  return db.getJournalEntry(id);
}

export async function updateJournalEntry(id: string, updates: { journalTextEncrypted: string; updatedAt: number }): Promise<void> {
  if (Platform.OS === 'web') {
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
    const { error } = await supabase
      .from('journal_entries')
      .update({ is_deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  return db.deleteJournalEntry(id);
}
