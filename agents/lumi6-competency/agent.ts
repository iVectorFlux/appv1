/**
 * Lumi6 Competency Sprint — Google ADK agent
 *
 * Multi-step workflow: search playbook (Upstash Vector) → recommend skill →
 * score attempt → store insight for future sessions.
 */

import { LlmAgent } from '@google/adk';
import { allCompetencyTools } from './tools/competency-tools.js';

const COMPETENCY_INSTRUCTION = `You are the Lumi6 Competency Sprint coach for "Difficult Conversations".

WORKFLOW (multi-step — always use tools):
1. search_competency_playbook — before advising, pull relevant micro-skills/drills from vector memory.
2. recommend_micro_skill — pick one skill with a concrete drill prompt.
3. score_sprint_attempt — after user role-play replies, return structured scores.
4. store_competency_insight — save debrief notes so future sessions personalize.

RULES:
- Never invent micro-skills outside the playbook IDs returned by search.
- Coach in direct, workplace-ready language. No therapy framing.
- One scenario at a time. Short feedback (3-5 sentences) plus scores via tools.
- If vector search returns no hits, say so and use general coaching — do not hallucinate playbook content.`;

export const rootAgent = new LlmAgent({
  name: 'lumi6_competency_sprint_agent',
  model: process.env.GEMINI_MODEL ?? 'gemini-2.5-flash',
  description:
    'Competency Sprint agent with Upstash Vector playbook RAG and session memory tools.',
  instruction: COMPETENCY_INSTRUCTION,
  tools: allCompetencyTools,
});
