/**
 * Counts practice rounds completed when Supabase save failed or was unavailable.
 * Merged with server `skills_progress` on the Skill Lab home screen so totals stay accurate.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@lumi6/skill-lab-offline-completions/v1';

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
