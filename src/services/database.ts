/** SQLite (native only). Journal on native; web uses Supabase via journal-storage. */

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { JournalEntry } from '@/types';

let db: SQLite.SQLiteDatabase | null = null;

export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web platform.');
  }

  try {
    db = await SQLite.openDatabaseAsync('eq_app.db');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        entry_source TEXT NOT NULL DEFAULT 'journal_only' CHECK (entry_source IN ('reflect', 'journal_only', 'inner_ally')),
        emotions TEXT NOT NULL,
        energy_level INTEGER NOT NULL CHECK(energy_level >= 1 AND energy_level <= 5),
        pleasantness INTEGER,
        reason TEXT,
        reasons TEXT,
        journal_text_encrypted TEXT NOT NULL,
        encryption_key_id TEXT NOT NULL
      );
    `);
    try {
      await db.execAsync(`ALTER TABLE journal_entries ADD COLUMN entry_source TEXT NOT NULL DEFAULT 'journal_only';`);
    } catch { /* column may already exist */ }
    try {
      await db.execAsync(`ALTER TABLE journal_entries ADD COLUMN pleasantness INTEGER;`);
    } catch { /* column may already exist */ }
    try {
      await db.execAsync(`ALTER TABLE journal_entries ADD COLUMN reasons TEXT;`);
    } catch { /* column may already exist */ }

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_journal_user_created 
      ON journal_entries(user_id, created_at DESC);
    `);

    await migrateJournalEntriesAllowInnerAlly(db);
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/** Expand entry_source CHECK so Inner Ally auto-journal can use SQLite (existing DBs). */
async function migrateJournalEntriesAllowInnerAlly(database: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const rows = await database.getAllAsync<{ sql: string }>(
      "SELECT sql FROM sqlite_master WHERE type='table' AND name='journal_entries'"
    );
    const sql = rows[0]?.sql ?? '';
    if (!sql || sql.includes("'inner_ally'")) return;

    await database.execAsync(`
      CREATE TABLE journal_entries__inner_ally (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        entry_source TEXT NOT NULL DEFAULT 'journal_only' CHECK (entry_source IN ('reflect', 'journal_only', 'inner_ally')),
        emotions TEXT NOT NULL,
        energy_level INTEGER NOT NULL CHECK(energy_level >= 1 AND energy_level <= 5),
        pleasantness INTEGER,
        reason TEXT,
        reasons TEXT,
        journal_text_encrypted TEXT NOT NULL,
        encryption_key_id TEXT NOT NULL
      );
      INSERT INTO journal_entries__inner_ally
        SELECT id, user_id, created_at, updated_at, entry_source, emotions, energy_level, pleasantness, reason, reasons, journal_text_encrypted, encryption_key_id
        FROM journal_entries;
      DROP TABLE journal_entries;
      ALTER TABLE journal_entries__inner_ally RENAME TO journal_entries;
      CREATE INDEX IF NOT EXISTS idx_journal_user_created
        ON journal_entries(user_id, created_at DESC);
    `);
  } catch (e) {
    console.error('[database] migrateJournalEntriesAllowInnerAlly failed:', e);
  }
}

export function getDatabase(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web platform.');
  }
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const database = getDatabase();
  const id = `journal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = Date.now();
  const entrySource = entry.entrySource ?? 'journal_only';
  const pleasantness = entry.pleasantness ?? null;
  const reasons = entry.reasons != null ? JSON.stringify(entry.reasons) : null;

  await database.runAsync(
    `INSERT INTO journal_entries 
     (id, user_id, created_at, updated_at, entry_source, emotions, energy_level, pleasantness, reason, reasons, journal_text_encrypted, encryption_key_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.userId,
      now,
      now,
      entrySource,
      JSON.stringify(entry.emotions ?? []),
      entry.energyLevel ?? 1,
      pleasantness,
      entry.reason || null,
      reasons,
      entry.journalTextEncrypted,
      entry.encryptionKeyId ?? '',
    ]
  );

  return id;
}

export async function getJournalEntries(userId: string, limit: number = 50): Promise<JournalEntry[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<{
    id: string;
    user_id: string;
    created_at: number;
    updated_at: number;
    entry_source?: string;
    emotions: string;
    energy_level: number;
    pleasantness?: number | null;
    reason: string | null;
    reasons?: string | null;
    journal_text_encrypted: string;
    encryption_key_id: string;
  }>(
    `SELECT * FROM journal_entries 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );

  return result.map((row) => ({
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    entrySource: (row.entry_source === 'reflect'
      ? 'reflect'
      : row.entry_source === 'inner_ally'
        ? 'inner_ally'
        : 'journal_only') as JournalEntry['entrySource'],
    emotions: JSON.parse(row.emotions || '[]') as JournalEntry['emotions'],
    energyLevel: row.energy_level as JournalEntry['energyLevel'],
    pleasantness: row.pleasantness ?? undefined,
    reason: row.reason || undefined,
    reasons: row.reasons ? (JSON.parse(row.reasons) as string[]) : undefined,
    journalTextEncrypted: row.journal_text_encrypted,
    encryptionKeyId: row.encryption_key_id,
  }));
}

export async function getJournalEntry(id: string): Promise<JournalEntry | null> {
  const database = getDatabase();
  const result = await database.getFirstAsync<{
    id: string;
    user_id: string;
    created_at: number;
    updated_at: number;
    entry_source?: string;
    emotions: string;
    energy_level: number;
    pleasantness?: number | null;
    reason: string | null;
    reasons?: string | null;
    journal_text_encrypted: string;
    encryption_key_id: string;
  }>(`SELECT * FROM journal_entries WHERE id = ?`, [id]);
  if (!result) return null;
  return {
    id: result.id,
    userId: result.user_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    entrySource: (result.entry_source === 'reflect'
      ? 'reflect'
      : result.entry_source === 'inner_ally'
        ? 'inner_ally'
        : 'journal_only') as JournalEntry['entrySource'],
    emotions: JSON.parse(result.emotions || '[]') as JournalEntry['emotions'],
    energyLevel: result.energy_level as JournalEntry['energyLevel'],
    pleasantness: result.pleasantness ?? undefined,
    reason: result.reason || undefined,
    reasons: result.reasons ? (JSON.parse(result.reasons) as string[]) : undefined,
    journalTextEncrypted: result.journal_text_encrypted,
    encryptionKeyId: result.encryption_key_id,
  };
}

export async function updateJournalEntry(
  id: string,
  updates: { journalTextEncrypted: string; updatedAt: number }
): Promise<void> {
  const database = getDatabase();
  await database.runAsync(
    `UPDATE journal_entries SET journal_text_encrypted = ?, updated_at = ? WHERE id = ?`,
    [updates.journalTextEncrypted, updates.updatedAt, id]
  );
}

export async function deleteJournalEntry(id: string): Promise<void> {
  const database = getDatabase();
  await database.runAsync(`DELETE FROM journal_entries WHERE id = ?`, [id]);
}
