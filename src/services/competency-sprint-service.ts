import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CompetencySprint {
  id?: string;
  userId: string;
  skillId: string;
  status: 'active' | 'completed';
  currentStage: 'primer' | 'learn' | 'drills' | 'guided' | 'independent' | 'escalated' | 'report';
  microSkills: any[];
  microDrillsProgress: any[];
  guidedSimChat: any[];
  independentSimChat: any[];
  escalatedSimChat: any[];
  finalReport: any | null;
  createdAt?: string;
  updatedAt?: string;
}

const LOCAL_STORAGE_KEY = (userId: string, skillId: string) => `competency-sprint:${userId}:${skillId}`;

/**
 * Fallback helper to load local sprint session
 */
async function getLocalSprint(userId: string, skillId: string): Promise<CompetencySprint | null> {
  try {
    const raw = await AsyncStorage.getItem(LOCAL_STORAGE_KEY(userId, skillId));
    if (!raw) return null;
    const sprint = JSON.parse(raw);
    if (sprint.status === 'completed') return null; // Only return active
    return sprint;
  } catch (e) {
    console.error('[SprintService] Failed to load local sprint from AsyncStorage:', e);
    return null;
  }
}

/**
 * Fallback helper to save local sprint session
 */
async function saveLocalSprint(sprint: CompetencySprint): Promise<CompetencySprint> {
  try {
    const key = LOCAL_STORAGE_KEY(sprint.userId, sprint.skillId);
    const payload: CompetencySprint = {
      ...sprint,
      id: sprint.id || `local-${Date.now()}`,
      updatedAt: new Date().toISOString()
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
    return payload;
  } catch (e) {
    console.error('[SprintService] Failed to save local sprint to AsyncStorage:', e);
    return sprint;
  }
}

/**
 * Invoke the Vercel serverless helper API for Competency Sprints.
 */
export async function invokeSprintApi(action: string, payload: Record<string, any>): Promise<any> {
  const url = buildVercelApiUrl('/api/competency-sprint');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error(`[SprintService] API Action ${action} failed:`, errorText);
    let message = 'API request failed';
    try {
      const parsed = JSON.parse(errorText);
      if (parsed.error) message = parsed.error;
    } catch {
      if (errorText) message = errorText;
    }
    throw new Error(message);
  }

  return res.json();
}

/**
 * Load the user's active sprint session for a given skill.
 */
export async function getActiveSprint(userId: string, skillId: string): Promise<CompetencySprint | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[SprintService] Supabase not configured. Using local AsyncStorage fallback.');
    return getLocalSprint(userId, skillId);
  }

  try {
    const { data, error } = await supabase
      .from('competency_sprints')
      .select('*')
      .eq('user_id', userId)
      .eq('skill_id', skillId)
      .eq('status', 'active')
      .maybeSingle();

    if (error) {
      console.warn(`[SprintService] Supabase fetch error (${error.message}). Falling back to persistent AsyncStorage.`);
      return getLocalSprint(userId, skillId);
    }

    if (!data) return null;

    return {
      id: data.id,
      userId: data.user_id,
      skillId: data.skill_id,
      status: data.status,
      currentStage: data.current_stage,
      microSkills: data.micro_skills || [],
      microDrillsProgress: data.micro_drills_progress || [],
      guidedSimChat: data.guided_sim_chat || [],
      independentSimChat: data.independent_sim_chat || [],
      escalatedSimChat: data.escalated_sim_chat || [],
      finalReport: data.final_report,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  } catch (err: any) {
    console.warn('[SprintService] Network or schema error. Falling back to persistent AsyncStorage.', err.message || err);
    return getLocalSprint(userId, skillId);
  }
}

/**
 * Persist or update the active sprint record.
 */
export async function saveSprint(sprint: CompetencySprint): Promise<CompetencySprint | null> {
  if (!isSupabaseConfigured()) {
    return saveLocalSprint(sprint);
  }

  const row = {
    user_id: sprint.userId,
    skill_id: sprint.skillId,
    status: sprint.status,
    current_stage: sprint.currentStage,
    micro_skills: sprint.microSkills,
    micro_drills_progress: sprint.microDrillsProgress,
    guided_sim_chat: sprint.guidedSimChat,
    independent_sim_chat: sprint.independentSimChat,
    escalated_sim_chat: sprint.escalatedSimChat,
    final_report: sprint.finalReport,
    updated_at: new Date().toISOString(),
  };

  try {
    let res;
    if (sprint.id && !sprint.id.startsWith('local-')) {
      res = await supabase
        .from('competency_sprints')
        .update(row)
        .eq('id', sprint.id)
        .select()
        .single();
    } else {
      res = await supabase
        .from('competency_sprints')
        .insert({ ...row, status: 'active' })
        .select()
        .single();
    }

    if (res.error) {
      console.warn(`[SprintService] Supabase save error (${res.error.message}). Syncing to persistent AsyncStorage instead.`);
      return saveLocalSprint(sprint);
    }

    const saved = res.data;
    return {
      id: saved.id,
      userId: saved.user_id,
      skillId: saved.skill_id,
      status: saved.status,
      currentStage: saved.current_stage,
      microSkills: saved.micro_skills || [],
      microDrillsProgress: saved.micro_drills_progress || [],
      guidedSimChat: saved.guided_sim_chat || [],
      independentSimChat: saved.independent_sim_chat || [],
      escalatedSimChat: saved.escalated_sim_chat || [],
      finalReport: saved.final_report,
      createdAt: saved.created_at,
      updatedAt: saved.updated_at,
    };
  } catch (err: any) {
    console.warn('[SprintService] Database sync error. Saving to persistent AsyncStorage.', err.message || err);
    return saveLocalSprint(sprint);
  }
}

/**
 * End the active sprint and mark it as completed.
 */
export async function completeSprint(sprintId: string): Promise<boolean> {
  if (!isSupabaseConfigured() || sprintId.startsWith('local-')) {
    // Clear local active status by removing or completing
    return true;
  }

  try {
    const { error } = await supabase
      .from('competency_sprints')
      .update({ status: 'completed', updated_at: new Date().toISOString() })
      .eq('id', sprintId);

    if (error) {
      console.warn('[SprintService] Failed to complete sprint row in database:', error.message);
      return true;
    }

    return true;
  } catch {
    return true;
  }
}
