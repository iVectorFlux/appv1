/**
 * Database Service
 * 
 * SQLite database setup with clear separation between:
 * - Journal System (private, encrypted)
 * - EQ System (measurement, can sync)
 * - Insights System (derived data)
 * 
 * PRIVACY RULES ENFORCED:
 * - Journal text is encrypted before storage
 * - Journal text is NEVER queried for analysis
 * - Only structured metadata is used for insights
 */

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';
import type { JournalEntry, Insight, RecoverySession, MeditationSession } from '@/types';
import type { EQResponse } from '@/types';

/** Local type for eq_check_ins table rows */
interface EQCheckInRow {
  id: string;
  userId: string;
  createdAt: number;
  questionId: string;
  questionType: 'trait' | 'slider' | 'binary';
  response: EQResponse;
  domain: string;
  score?: number;
}

let db: SQLite.SQLiteDatabase | null = null;

/**
 * Initialize database and create tables
 * 
 * NOTE: SQLite only works on native platforms (iOS/Android), not web.
 * On web, this function will throw an error. Use Platform.OS check before calling.
 */
export async function initializeDatabase(): Promise<void> {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web platform. Use Platform.OS check before calling initializeDatabase().');
  }

  try {
    db = await SQLite.openDatabaseAsync('eq_app.db');
    
    // Enable foreign keys
    await db.execAsync('PRAGMA foreign_keys = ON;');

    // ============================================================================
    // JOURNAL SYSTEM TABLES (PRIVATE, ENCRYPTED)
    // ============================================================================
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        emotions TEXT NOT NULL, -- JSON array of EmotionTag
        energy_level INTEGER NOT NULL CHECK(energy_level >= 1 AND energy_level <= 5),
        reason TEXT,
        journal_text_encrypted TEXT NOT NULL, -- Encrypted journal text (NEVER analyzed)
        encryption_key_id TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_journal_user_created 
      ON journal_entries(user_id, created_at DESC);
    `);

    // ============================================================================
    // EQ SYSTEM TABLES (MEASUREMENT, CAN SYNC)
    // ============================================================================
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS eq_check_ins (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        question_id TEXT NOT NULL,
        question_type TEXT NOT NULL CHECK(question_type IN ('trait', 'slider', 'binary')),
        response TEXT NOT NULL, -- JSON EQResponse
        domain TEXT NOT NULL,
        score INTEGER, -- Internal only, never shown to user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_eq_user_created 
      ON eq_check_ins(user_id, created_at DESC);
    `);

    // ============================================================================
    // INSIGHTS SYSTEM TABLES (DERIVED DATA)
    // ============================================================================
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS insights (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE INDEX IF NOT EXISTS idx_insights_user_created 
      ON insights(user_id, created_at DESC);
    `);

    // ============================================================================
    // RECOVERY & MEDITATION TABLES
    // ============================================================================
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS recovery_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        duration INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS meditation_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        audio_id TEXT NOT NULL,
        started_at INTEGER NOT NULL,
        completed_at INTEGER,
        duration INTEGER,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    // ============================================================================
    // USERS TABLE
    // ============================================================================
    
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT,
        created_at INTEGER NOT NULL,
        is_demo_mode INTEGER NOT NULL DEFAULT 0
      );
    `);

    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database instance
 * 
 * NOTE: Only works on native platforms. Will throw on web.
 */
export function getDatabase(): SQLite.SQLiteDatabase {
  if (Platform.OS === 'web') {
    throw new Error('SQLite is not available on web platform.');
  }
  if (!db) {
    throw new Error('Database not initialized. Call initializeDatabase() first.');
  }
  return db;
}

// ============================================================================
// JOURNAL SYSTEM FUNCTIONS (PRIVATE, ENCRYPTED)
// ============================================================================

export async function createJournalEntry(entry: Omit<JournalEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const database = getDatabase();
  const id = `journal_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const now = Date.now();

  await database.runAsync(
    `INSERT INTO journal_entries 
     (id, user_id, created_at, updated_at, emotions, energy_level, reason, journal_text_encrypted, encryption_key_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      entry.userId,
      now,
      now,
      JSON.stringify(entry.emotions ?? []),
      entry.energyLevel ?? 1,
      entry.reason || null,
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
    emotions: string;
    energy_level: number;
    reason: string | null;
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
    entrySource: 'journal_only' as const,
    emotions: JSON.parse(row.emotions || '[]') as JournalEntry['emotions'],
    energyLevel: row.energy_level as JournalEntry['energyLevel'],
    reason: row.reason || undefined,
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
    emotions: string;
    energy_level: number;
    reason: string | null;
    journal_text_encrypted: string;
    encryption_key_id: string;
  }>(`SELECT * FROM journal_entries WHERE id = ?`, [id]);
  if (!result) return null;
  return {
    id: result.id,
    userId: result.user_id,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
    entrySource: 'journal_only',
    emotions: JSON.parse(result.emotions || '[]') as JournalEntry['emotions'],
    energyLevel: result.energy_level as JournalEntry['energyLevel'],
    reason: result.reason || undefined,
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

// ============================================================================
// EQ SYSTEM FUNCTIONS (MEASUREMENT, CAN SYNC)
// ============================================================================

export async function createEQCheckIn(checkIn: Omit<EQCheckInRow, 'id' | 'createdAt'>): Promise<string> {
  const database = getDatabase();
  const id = `eq_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await database.runAsync(
    `INSERT INTO eq_check_ins 
     (id, user_id, created_at, question_id, question_type, response, domain, score)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      checkIn.userId,
      Date.now(),
      checkIn.questionId,
      checkIn.questionType,
      JSON.stringify(checkIn.response),
      checkIn.domain,
      checkIn.score || null,
    ]
  );

  return id;
}

export async function getEQCheckIns(userId: string, limit: number = 100): Promise<EQCheckInRow[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<{
    id: string;
    user_id: string;
    created_at: number;
    question_id: string;
    question_type: string;
    response: string;
    domain: string;
    score: number | null;
  }>(
    `SELECT * FROM eq_check_ins 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );

  return result.map((row) => ({
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    questionId: row.question_id,
    questionType: row.question_type as EQCheckInRow['questionType'],
    response: JSON.parse(row.response) as EQCheckInRow['response'],
    domain: row.domain as EQCheckInRow['domain'],
    score: row.score || undefined,
  }));
}

// ============================================================================
// INSIGHTS SYSTEM FUNCTIONS (DERIVED DATA)
// ============================================================================

export async function createInsight(insight: Omit<Insight, 'id' | 'createdAt'>): Promise<string> {
  const database = getDatabase();
  const id = `insight_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  await database.runAsync(
    `INSERT INTO insights 
     (id, user_id, created_at, type, title, description, category)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      insight.userId,
      Date.now(),
      insight.type,
      insight.title,
      insight.description,
      insight.category,
    ]
  );

  return id;
}

export async function getInsights(userId: string, limit: number = 20): Promise<Insight[]> {
  const database = getDatabase();
  const result = await database.getAllAsync<{
    id: string;
    user_id: string;
    created_at: number;
    type: string;
    title: string;
    description: string;
    category: string;
  }>(
    `SELECT * FROM insights 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT ?`,
    [userId, limit]
  );

  return result.map((row) => ({
    id: row.id,
    userId: row.user_id,
    createdAt: row.created_at,
    type: row.type as Insight['type'],
    title: row.title,
    description: row.description,
    category: row.category as Insight['category'],
  }));
}
