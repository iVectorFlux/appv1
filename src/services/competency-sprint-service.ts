import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildVercelApiUrl } from '@/utils/vercel-api';

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
    console.warn('[SprintService] Supabase is not configured. Local mock session will be used.');
    return null;
  }

  const { data, error } = await supabase
    .from('competency_sprints')
    .select('*')
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .eq('status', 'active')
    .maybeSingle();

  if (error) {
    console.error('[SprintService] Failed to load active sprint:', error);
    return null;
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
}

/**
 * Persist or update the active sprint record.
 */
export async function saveSprint(sprint: CompetencySprint): Promise<CompetencySprint | null> {
  if (!isSupabaseConfigured()) {
    console.warn('[SprintService] Supabase not configured. Sprint state saved in memory only.');
    return sprint;
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

  let res;
  if (sprint.id) {
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
    console.error('[SprintService] Failed to save sprint:', res.error);
    return null;
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
}

/**
 * End the active sprint and mark it as completed.
 */
export async function completeSprint(sprintId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return true;

  const { error } = await supabase
    .from('competency_sprints')
    .update({ status: 'completed', updated_at: new Date().toISOString() })
    .eq('id', sprintId);

  if (error) {
    console.error('[SprintService] Failed to complete sprint:', error);
    return false;
  }

  return true;
}
