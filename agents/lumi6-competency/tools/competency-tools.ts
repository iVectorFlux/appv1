/**
 * Competency Sprint ADK tools — includes Upstash Vector for playbook RAG + session memory.
 */

import { FunctionTool } from '@google/adk';
import { z } from 'zod';
import {
  isVectorConfigured,
  queryCompetencyPlaybook,
  upsertCompetencyDocument,
} from '../lib/upstash-vector.js';

const MICRO_SKILL_IDS = [
  'active_validation',
  'objective_framing',
  'clear_assertion',
  'emotional_containment',
  'co_creative_problem_solving',
] as const;

export const searchCompetencyPlaybook = new FunctionTool({
  name: 'search_competency_playbook',
  description:
    'Retrieve relevant micro-skills, drills, or past session insights from Upstash Vector before coaching or simulating.',
  parameters: z.object({
    query: z.string().describe('Situation or skill topic to search, e.g. difficult conversation validation.'),
    topK: z.number().int().min(1).max(5).default(3),
    competency: z
      .string()
      .default('difficult_conversations')
      .describe('Competency domain filter.'),
  }),
  execute: async ({ query, topK, competency }) => {
    if (!isVectorConfigured()) {
      return {
        status: 'unavailable',
        hits: [],
        message: 'Upstash Vector not configured. Run scripts/seed-playbook.mjs after setting UPSTASH_VECTOR_* env.',
      };
    }
    const hits = await queryCompetencyPlaybook(
      query,
      topK,
      `competency = '${competency}'`
    );
    return {
      status: 'ok',
      hitCount: hits.length,
      hits: hits.map((h) => ({
        id: h.id,
        score: h.score,
        type: h.metadata?.type,
        skillId: h.metadata?.skillId,
        excerpt: h.data?.slice(0, 280),
      })),
    };
  },
});

export const storeCompetencyInsight = new FunctionTool({
  name: 'store_competency_insight',
  description:
    'Persist a sprint insight, debrief note, or user attempt to Upstash Vector for future retrieval and Google demo of agent memory.',
  parameters: z.object({
    userId: z.string().optional(),
    sprintId: z.string().optional(),
    skillId: z.enum(MICRO_SKILL_IDS).optional(),
    insight: z.string().max(500).describe('What happened and what to practice next.'),
    score: z.number().min(0).max(100).optional(),
  }),
  execute: async ({ userId, sprintId, skillId, insight, score }) => {
    const id = `insight_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const result = await upsertCompetencyDocument(id, insight, {
      type: 'session_insight',
      competency: 'difficult_conversations',
      userId,
      sprintId,
      skillId,
      score,
      createdAt: new Date().toISOString(),
    });
    if (!result.ok) {
      return { status: 'error', message: result.error };
    }
    return { status: 'stored', id };
  },
});

export const recommendMicroSkill = new FunctionTool({
  name: 'recommend_micro_skill',
  description:
    'Pick the best micro-skill for the current difficult-conversation scenario after searching the playbook.',
  parameters: z.object({
    skillId: z.enum(MICRO_SKILL_IDS),
    rationale: z.string().max(200),
    drillPrompt: z.string().max(300).describe('One practice scenario question for the user.'),
  }),
  execute: ({ skillId, rationale, drillPrompt }) => ({
    status: 'skill_recommended',
    skillId,
    rationale,
    drillPrompt,
    appRoute: '/competency-sprint',
  }),
});

export const scoreSprintAttempt = new FunctionTool({
  name: 'score_sprint_attempt',
  description:
    'Return structured feedback scores after a role-play turn. App displays telemetry from this output.',
  parameters: z.object({
    validationScore: z.number().min(0).max(100),
    clarityScore: z.number().min(0).max(100),
    deescalationScore: z.number().min(0).max(100),
    feedback: z.string().max(400),
    nextStep: z.enum(['drill', 'simulation', 'debrief', 'complete']),
  }),
  execute: (scores) => ({
    status: 'scored',
    ...scores,
    overall: Math.round(
      (scores.validationScore + scores.clarityScore + scores.deescalationScore) / 3
    ),
  }),
});

export const allCompetencyTools = [
  searchCompetencyPlaybook,
  storeCompetencyInsight,
  recommendMicroSkill,
  scoreSprintAttempt,
];
