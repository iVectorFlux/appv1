/**
 * Inner Ally long-term memory — load for prompts, merge after chat turns.
 * Coach mode intentionally does not use this module.
 *
 * Fresh chat sessions each visit; memory drives proactive follow-ups and nudges.
 */

import { getSupabaseAdmin } from './supabase-admin';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './groq-config';

const ONBOARDING_GOAL_LABELS: Record<string, string> = {
  feel_better: 'Feel better day to day',
  build_skills: 'Build emotional and professional skills',
  manage_stress: 'Manage stress and anxiety',
  ai_growth: 'Grow with coaching support',
  explore: 'Just exploring',
};

const LIFE_SITUATION_LABELS: Record<string, string> = {
  student: 'Student',
  entrepreneur: 'Entrepreneur / founder',
  employed: 'Employed',
  between_roles: 'Between roles',
  other: 'Other',
};

/** Days before first nudge; min gap between repeat nudges on same topic. */
const MIN_DAYS_BEFORE_FIRST_NUDGE = 1;
const MIN_DAYS_BETWEEN_NUDGES = 3;

export interface FollowUpItem {
  topic: string;
  notedAt: string;
  lastNudgedAt: string | null;
  resolved: boolean;
}

export interface InnerAllyMemoryRow {
  summary: string | null;
  goals: string[];
  openConcerns: string[];
  recurringThemes: string[];
  followUps: FollowUpItem[];
  turnCount: number;
  updatedAt: string | null;
}

function asStringArray(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim())
    .slice(0, max);
}

function parseFollowUps(raw: unknown): FollowUpItem[] {
  if (!Array.isArray(raw)) return [];
  const out: FollowUpItem[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const topic = typeof o.topic === 'string' ? o.topic.trim() : '';
    const notedAt =
      typeof o.noted_at === 'string'
        ? o.noted_at
        : typeof o.notedAt === 'string'
          ? o.notedAt
          : '';
    if (!topic || !notedAt) continue;
    out.push({
      topic: topic.slice(0, 160),
      notedAt,
      lastNudgedAt:
        typeof o.last_nudged_at === 'string'
          ? o.last_nudged_at
          : typeof o.lastNudgedAt === 'string'
            ? o.lastNudgedAt
            : null,
      resolved: Boolean(o.resolved),
    });
  }
  return out.slice(0, 10);
}

function followUpsToDb(items: FollowUpItem[]): Record<string, unknown>[] {
  return items.map((f) => ({
    topic: f.topic,
    noted_at: f.notedAt,
    last_nudged_at: f.lastNudgedAt,
    resolved: f.resolved,
  }));
}

function daysSince(iso: string): number {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return 0;
  return (Date.now() - t) / (1000 * 60 * 60 * 24);
}

function dueFollowUps(items: FollowUpItem[]): FollowUpItem[] {
  return items.filter((f) => {
    if (f.resolved) return false;
    if (daysSince(f.notedAt) < MIN_DAYS_BEFORE_FIRST_NUDGE) return false;
    if (!f.lastNudgedAt) return true;
    return daysSince(f.lastNudgedAt) >= MIN_DAYS_BETWEEN_NUDGES;
  });
}

function emptyMemory(): InnerAllyMemoryRow {
  return {
    summary: null,
    goals: [],
    openConcerns: [],
    recurringThemes: [],
    followUps: [],
    turnCount: 0,
    updatedAt: null,
  };
}

function rowFromDb(data: Record<string, unknown> | null): InnerAllyMemoryRow {
  if (!data) return emptyMemory();
  return {
    summary: typeof data.summary === 'string' ? data.summary : null,
    goals: asStringArray(data.goals),
    openConcerns: asStringArray(data.open_concerns),
    recurringThemes: asStringArray(data.recurring_themes),
    followUps: parseFollowUps(data.follow_ups),
    turnCount: typeof data.turn_count === 'number' ? data.turn_count : 0,
    updatedAt: typeof data.updated_at === 'string' ? data.updated_at : null,
  };
}

async function loadStoredMemory(userId: string): Promise<InnerAllyMemoryRow> {
  const sb = getSupabaseAdmin();
  if (!sb) return emptyMemory();

  const { data, error } = await sb
    .from('inner_ally_memory')
    .select(
      'summary, goals, open_concerns, recurring_themes, follow_ups, turn_count, updated_at'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('[inner-ally-memory] load stored failed:', error.message);
    return emptyMemory();
  }

  return rowFromDb((data as Record<string, unknown> | null) ?? null);
}

async function loadProfileHints(userId: string): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];

  const { data, error } = await sb
    .from('profiles')
    .select('display_name, profile_interests, life_situation, professional_role')
    .eq('id', userId)
    .maybeSingle();

  if (error || !data) return [];

  const hints: string[] = [];
  const name = (data.display_name as string | null)?.trim();
  if (name) hints.push(`Preferred name: ${name}`);
  const interests = (data.profile_interests as string | null)?.trim();
  if (interests) hints.push(`Interests: ${interests}`);
  const life = data.life_situation as string | null;
  if (life && LIFE_SITUATION_LABELS[life]) {
    hints.push(`Life situation: ${LIFE_SITUATION_LABELS[life]}`);
  }
  const role = (data.professional_role as string | null)?.trim();
  if (role) hints.push(`Role: ${role}`);
  return hints;
}

async function loadOnboardingGoals(userId: string): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];

  const { data, error } = await sb
    .from('user_preferences')
    .select('goals')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return [];

  const ids = asStringArray(data.goals, 6);
  return ids.map((id) => ONBOARDING_GOAL_LABELS[id] ?? id.replace(/_/g, ' '));
}

async function loadRecentJournalSnippets(userId: string): Promise<string[]> {
  const sb = getSupabaseAdmin();
  if (!sb) return [];

  const { data, error } = await sb
    .from('journal_entries')
    .select('emotions, reasons, journal_text_encrypted, created_at')
    .eq('user_id', userId)
    .in('entry_source', ['inner_ally', 'reflect'])
    .order('created_at', { ascending: false })
    .limit(6);

  if (error || !data?.length) return [];

  return (data as Record<string, unknown>[]).map((row) => {
    const when = typeof row.created_at === 'string' ? row.created_at.slice(0, 10) : '';
    const em = asStringArray(row.emotions, 3).join(', ');
    const reasons = asStringArray(row.reasons, 3).join(', ');
    const text = String(row.journal_text_encrypted ?? '').trim().slice(0, 80);
    const parts = [when && `[${when}]`, em && `felt ${em}`, reasons && `re: ${reasons}`, text && `"${text}"`].filter(
      Boolean
    );
    return parts.join(' ') || '(check-in)';
  });
}

export interface BuildMemoryOpts {
  /** True when this is the user's first message in a fresh session (no transcript restored). */
  isNewSession?: boolean;
}

/**
 * Build a compact memory block for the Inner Ally system prompt.
 */
export async function buildInnerAllyMemoryBlock(
  userId: string,
  opts?: BuildMemoryOpts
): Promise<string | null> {
  const [stored, profileHints, onboardingGoals, journalSnippets] = await Promise.all([
    loadStoredMemory(userId),
    loadProfileHints(userId),
    loadOnboardingGoals(userId),
    loadRecentJournalSnippets(userId),
  ]);

  const allGoals = [...new Set([...onboardingGoals, ...stored.goals])].slice(0, 6);
  const pending = dueFollowUps(stored.followUps);
  const lines: string[] = [];

  if (profileHints.length) lines.push(profileHints.join('\n'));
  if (stored.summary?.trim()) lines.push(`What you know about them:\n${stored.summary.trim()}`);
  if (allGoals.length) lines.push(`Their goals (support over time): ${allGoals.join('; ')}`);
  if (stored.openConcerns.length) {
    lines.push(`Open concerns: ${stored.openConcerns.join('; ')}`);
  }
  if (stored.recurringThemes.length) {
    lines.push(`Recurring themes: ${stored.recurringThemes.join('; ')}`);
  }
  if (journalSnippets.length) {
    lines.push(`Past check-ins (not this session):\n- ${journalSnippets.join('\n- ')}`);
  }

  if (pending.length) {
    const dueLines = pending.map((f) => {
      const days = Math.floor(daysSince(f.notedAt));
      return `- "${f.topic}" (mentioned ~${days} day(s) ago)`;
    });
    lines.push(`Due for gentle follow-up:\n${dueLines.join('\n')}`);
  }

  if (!lines.length) return null;

  const nudgeBlock = opts?.isNewSession
    ? [
        '',
        'PROACTIVE AGENT (this is a NEW session — no prior messages in this thread):',
        '- If "Due for gentle follow-up" lists something, include ONE warm check-in in your reply (e.g. they felt low days ago → "How have you been since then?").',
        '- Tie to their goals when natural (e.g. managing stress). One sentence max for the follow-up; do not lead with a memory dump.',
        '- If their first message is clearly about something new and urgent, prioritize that — follow-up can wait.',
        '- Never say "according to my notes" or "I remember from last chat" — sound like a caring person who noticed.',
      ]
    : [
        '',
        'ONGOING SESSION: weave in at most one brief callback to a goal or open concern when it truly fits — not every reply.',
      ];

  return [
    'LONG-TERM MEMORY (Inner Ally only — you know them across past sessions; this thread may be fresh):',
    ...lines,
    ...nudgeBlock,
  ].join('\n');
}

function mergeFollowUps(existing: FollowUpItem[], incoming: FollowUpItem[]): FollowUpItem[] {
  const map = new Map<string, FollowUpItem>();
  for (const f of existing) {
    map.set(f.topic.toLowerCase(), f);
  }
  for (const f of incoming) {
    const key = f.topic.toLowerCase();
    const prev = map.get(key);
    if (!prev) {
      map.set(key, f);
      continue;
    }
    map.set(key, {
      topic: f.topic,
      notedAt: prev.resolved ? f.notedAt : prev.notedAt,
      lastNudgedAt: f.resolved ? prev.lastNudgedAt : prev.lastNudgedAt,
      resolved: f.resolved,
    });
  }
  return Array.from(map.values())
    .filter((f) => !f.resolved || daysSince(f.notedAt) < 30)
    .slice(0, 10);
}

function parseMemoryJson(raw: string): Partial<InnerAllyMemoryRow> | null {
  const trimmed = raw.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(trimmed.slice(start, end + 1)) as Record<string, unknown>;
    const followRaw = parsed.followUps ?? parsed.follow_ups;
    let followUps: FollowUpItem[] | undefined;
    if (Array.isArray(followRaw)) {
      const now = new Date().toISOString();
      followUps = followRaw
        .map((item) => {
          if (!item || typeof item !== 'object') return null;
          const o = item as Record<string, unknown>;
          const topic = typeof o.topic === 'string' ? o.topic.trim() : '';
          if (!topic) return null;
          return {
            topic: topic.slice(0, 160),
            notedAt:
              typeof o.notedAt === 'string'
                ? o.notedAt
                : typeof o.noted_at === 'string'
                  ? o.noted_at
                  : now,
            lastNudgedAt: null,
            resolved: Boolean(o.resolved),
          } satisfies FollowUpItem;
        })
        .filter((x): x is FollowUpItem => x !== null);
    }
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary.slice(0, 1200) : undefined,
      goals: asStringArray(parsed.goals, 8),
      openConcerns: asStringArray(parsed.openConcerns ?? parsed.open_concerns, 8),
      recurringThemes: asStringArray(parsed.recurringThemes ?? parsed.recurring_themes, 6),
      followUps,
    };
  } catch {
    return null;
  }
}

export async function markDueFollowUpsNudged(userId: string): Promise<void> {
  const sb = getSupabaseAdmin();
  if (!sb) return;

  const current = await loadStoredMemory(userId);
  const pending = dueFollowUps(current.followUps);
  if (!pending.length) return;

  const now = new Date().toISOString();
  const pendingTopics = new Set(pending.map((f) => f.topic.toLowerCase()));
  const followUps = current.followUps.map((f) =>
    pendingTopics.has(f.topic.toLowerCase()) ? { ...f, lastNudgedAt: now } : f
  );

  await sb.from('inner_ally_memory').upsert(
    {
      user_id: userId,
      follow_ups: followUpsToDb(followUps),
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );
}

/**
 * Merge this exchange into stored memory using a lightweight LLM pass.
 */
export async function updateInnerAllyMemoryAfterTurn(params: {
  userId: string;
  userMessage: string;
  assistantReply: string;
  emotions?: string[];
  lifeContexts?: string[];
  /** First message in a fresh session where due follow-ups were available. */
  markFollowUpsNudged?: boolean;
}): Promise<void> {
  if (params.markFollowUpsNudged) {
    await markDueFollowUpsNudged(params.userId);
  }

  const sb = getSupabaseAdmin();
  const groq = getGroqEnv();
  if (!sb || !groq) return;

  const current = await loadStoredMemory(params.userId);
  const nextTurn = current.turnCount + 1;
  const now = new Date().toISOString();

  const prompt = `You maintain long-term wellbeing memory for Inner Ally (not a therapist). Sessions are fresh each visit — memory must persist across days.

Current memory JSON:
${JSON.stringify({
  summary: current.summary,
  goals: current.goals,
  openConcerns: current.openConcerns,
  recurringThemes: current.recurringThemes,
  followUps: current.followUps,
})}

New exchange:
User: ${params.userMessage.slice(0, 800)}
Assistant: ${params.assistantReply.slice(0, 800)}
Detected emotions: ${(params.emotions ?? []).join(', ') || 'none'}
Life contexts: ${(params.lifeContexts ?? []).join(', ') || 'none'}

Return ONLY valid JSON:
{"summary":"2-4 sentences","goals":["..."],"openConcerns":["..."],"recurringThemes":["..."],"followUps":[{"topic":"short label","notedAt":"ISO8601","resolved":false}]}

Rules:
- summary: merge new facts; drop stale resolved items
- goals: wellbeing intentions (max 6)
- openConcerns: unresolved worries worth a future check-in (max 6)
- followUps: topics needing a follow-up days later if user shared distress, low mood, ongoing conflict, or a goal they're working on. Add new items with notedAt="${now}". Set resolved:true when clearly fixed in this exchange. Max 8 items.
- If user shared feeling low/sad/stressed, ensure a followUp exists for gentle check-in later`;

  try {
    const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groq.apiKey}`,
      },
      body: JSON.stringify({
        model: groq.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 520,
        temperature: 0.35,
      }),
    });

    if (!res.ok) {
      console.error('[inner-ally-memory] LLM update failed:', await res.text());
      return;
    }

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = parseMemoryJson(content);
    if (!parsed) {
      console.error('[inner-ally-memory] Could not parse memory JSON');
      return;
    }

    const followUps = parsed.followUps?.length
      ? mergeFollowUps(current.followUps, parsed.followUps)
      : current.followUps;

    const row = {
      user_id: params.userId,
      summary: parsed.summary ?? current.summary,
      goals: parsed.goals?.length ? parsed.goals : current.goals,
      open_concerns: parsed.openConcerns?.length ? parsed.openConcerns : current.openConcerns,
      recurring_themes: parsed.recurringThemes?.length ? parsed.recurringThemes : current.recurringThemes,
      follow_ups: followUpsToDb(followUps),
      turn_count: nextTurn,
      updated_at: now,
    };

    const { error } = await sb.from('inner_ally_memory').upsert(row, { onConflict: 'user_id' });
    if (error) console.error('[inner-ally-memory] upsert failed:', error.message);
  } catch (e) {
    console.error('[inner-ally-memory] update error:', e);
  }
}
