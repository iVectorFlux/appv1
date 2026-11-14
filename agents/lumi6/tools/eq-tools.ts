/**
 * LumixEQ agent tools — ADK FunctionTool (not prompt wrappers).
 * Google ADK runs the tool loop; Gemini decides when to invoke each tool.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod';

const GROUNDING_IDS = [
  'breath_extended_exhale',
  'breath_coherent',
  'breath_regulation_flow',
  'box_breathing',
  'physiological_sigh',
  'quick_reset',
  'body_scan',
  'release',
] as const;

const SKILL_IDS = [
  'emotional_intelligence',
  'ai_literacy',
  'critical_thinking',
  'problem_solving',
  'adaptability',
  'creative_thinking',
  'systems_thinking',
  'communication_influence',
] as const;

const LIFE_CONTEXTS = [
  'Work / School',
  'Family',
  'Relationships',
  'Health & Body',
  'Self',
  'Money',
  'Environment',
  'Life changes',
  'World',
  'Other',
] as const;

export const recordEmotionalState = new FunctionTool({
  name: 'record_emotional_state',
  description:
    'Record 0-3 detected emotions and up to 3 life contexts for this turn. Call when the user clearly expresses feelings.',
  parameters: z.object({
    emotions: z
      .array(z.string())
      .max(3)
      .describe('Lowercase emotion words, e.g. sad, anxious. Empty if neutral.'),
    lifeContexts: z
      .array(z.enum(LIFE_CONTEXTS))
      .max(3)
      .describe('Life domains relevant to this message.'),
  }),
  execute: ({ emotions, lifeContexts }) => ({
    status: 'recorded',
    emotions,
    lifeContexts,
  }),
});

export const recommendGrounding = new FunctionTool({
  name: 'recommend_grounding',
  description:
    'Recommend exactly one in-app grounding exercise when the user shows distress. The mobile app will open this flow.',
  parameters: z.object({
    groundingId: z
      .enum(GROUNDING_IDS)
      .describe('One allowed grounding technique ID.'),
    inviteLine: z
      .string()
      .max(120)
      .describe('One short sentence inviting the user to try it.'),
  }),
  execute: ({ groundingId, inviteLine }) => ({
    status: 'grounding_recommended',
    groundingId,
    inviteLine,
    appRoute: '/grounding',
  }),
});

export const recommendLearningPath = new FunctionTool({
  name: 'recommend_learning_path',
  description:
    'Suggest a Skill Lab skill when the conversation clearly maps to professional growth in the LumixEQ catalog.',
  parameters: z.object({
    skillId: z.enum(SKILL_IDS),
    label: z.string().describe('Human-readable skill name for the UI.'),
    reason: z.string().max(200).describe('Why this skill fits, one sentence.'),
  }),
  execute: ({ skillId, label, reason }) => ({
    status: 'path_recommended',
    skillId,
    label,
    reason,
    appRoute: '/skill-lab',
  }),
});

export const proposeReframe = new FunctionTool({
  name: 'propose_reframe',
  description:
    'Offer one concrete cognitive reframe tied to what the user said. Omit if nothing new or no distress.',
  parameters: z.object({
    reframe: z
      .string()
      .max(120)
      .nullable()
      .describe('One sentence alternative lens, or null to skip.'),
  }),
  execute: ({ reframe }) => ({
    status: 'reframe_set',
    reframe,
  }),
});

export const fetchEqContext = new FunctionTool({
  name: 'fetch_eq_context',
  description:
    'Load summarized EQ assessment context for the signed-in user (when user id is in session).',
  parameters: z.object({
    userId: z.string().uuid().optional().describe('Supabase user id from session.'),
  }),
  execute: async ({ userId }) => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!userId || !url || !key) {
      return {
        status: 'unavailable',
        summary: null,
        message: 'EQ context not configured or user not identified.',
      };
    }
    try {
      const res = await fetch(
        `${url}/rest/v1/profiles?select=display_name&id=eq.${userId}`,
        {
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
          },
        }
      );
      if (!res.ok) {
        return { status: 'error', summary: null };
      }
      const rows = (await res.json()) as { display_name?: string }[];
      return {
        status: 'ok',
        summary: {
          displayName: rows[0]?.display_name ?? null,
          note: 'Extend this tool with eq_assessments, big5, and learning_progress tables.',
        },
      };
    } catch {
      return { status: 'error', summary: null };
    }
  },
});

export const allEqTools = [
  recordEmotionalState,
  recommendGrounding,
  recommendLearningPath,
  proposeReframe,
  fetchEqContext,
];
