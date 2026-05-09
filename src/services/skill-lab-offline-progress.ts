/**
 * Counts practice rounds completed when Supabase save failed or was unavailable.
 * Merged with server `skills_progress` on the Skill Lab home screen so totals stay accurate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@lumi6/skill-lab-offline-completions/v1';
const ROUND_DAYS_KEY = '@lumi6/skill-lab-round-days/v1';
const QUICK_ROUND_CURSOR_KEY = '@lumi6/skill-lab-quick-round-cursor/v1';

export async function bumpOfflineSessionCount(skillId: string): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const map = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    map[skillId] = (map[skillId] ?? 0) + 1;
    await AsyncStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export async function getOfflineSessionCounts(): Promise<Record<string, number>> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, number>;
  } catch {
    return {};
  }
}

/** Mark today as a "round completed" day (used for local streak even when Supabase save succeeds). */
export async function recordRoundForToday(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ROUND_DAYS_KEY);
    const arr = raw ? (JSON.parse(raw) as string[]) : [];
    const today = new Date().toISOString().slice(0, 10);
    if (!arr.includes(today)) {
      arr.push(today);
      // Keep only the last 60 days to bound storage
      const trimmed = arr.slice(-60);
      await AsyncStorage.setItem(ROUND_DAYS_KEY, JSON.stringify(trimmed));
    }
  } catch {
    /* ignore */
  }
}

export async function getRoundDays(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(ROUND_DAYS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? (arr as string[]) : [];
  } catch {
    return [];
  }
}

/** Local round-robin cursor for the landing-page "Today's quick round" CTA. */
export async function getQuickRoundCursor(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(QUICK_ROUND_CURSOR_KEY);
    const n = raw ? Number(raw) : 0;
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  } catch {
    return 0;
  }
}

export async function setQuickRoundCursor(nextCursor: number): Promise<void> {
  try {
    const n = Number.isFinite(nextCursor) && nextCursor >= 0 ? Math.floor(nextCursor) : 0;
    await AsyncStorage.setItem(QUICK_ROUND_CURSOR_KEY, String(n));
  } catch {
    /* ignore */
  }
}
