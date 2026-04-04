/**
 * Skills Coach API — POST /api/skills-coach
 * Default export for @vercel/node.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

function buildScenarioPrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;
  return `You are an expert practice coach for the skill: "${focus}".

Generate a short, realistic workplace scenario (2-4 sentences) and ask the learner one focused, open-ended question about how they would handle it.

The scenario should feel real and specific — not generic. Use everyday professional contexts (a team meeting, a difficult email, a leadership decision, a data interpretation task, etc.).

Respond in this exact JSON format (no markdown, no code fences):
{
  "scenario": "...",
  "question": "..."
}`;
}

function buildFeedbackPrompt(
  skillName: string,
  atomicSkillName: string | undefined,
  scenario: string,
  question: string,
  userAnswer: string,
  attemptNumber: number
): string {
  const focus = atomicSkillName ? `${skillName} — "${atomicSkillName}"` : skillName;
  const isRetry = attemptNumber > 1;

  return `You are an expert practice coach evaluating a learner's response on the skill: "${focus}".

Scenario:
${scenario}

Question asked:
${question}

Learner's answer (attempt ${attemptNumber}):
${userAnswer}

${isRetry ? 'This is a retry — acknowledge their improvement or persistence. Be encouraging.' : ''}

Provide structured feedback. Be specific, encouraging, and direct. Reference what they actually said.

Respond in this exact JSON format (no markdown, no code fences):
{
  "feedback": "A 2-3 sentence overall response that validates effort and gives honest assessment.",
  "strengths": ["Specific strength 1 from their answer", "Specific strength 2"],
  "growthAreas": ["One specific area to develop"],
  "refinementPrompt": "A single targeted question or prompt to help them go deeper or improve one thing.",
  "nextScenarioAvailable": true
}

Keep strengths to 2 items. Keep growthAreas to 1-2 items. refinementPrompt should be actionable.`;
}

async function callGroqJson(prompt: string, apiKey: string, model: string): Promise<string> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.75,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq error: ${errText}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices?.[0]?.message?.content ?? '{}';
}

type SkillsBody = {
  skillId?: string;
  skillName?: string;
  atomicSkillId?: string;
  atomicSkillName?: string;
  scenario?: string;
  question?: string;
  userAnswer?: string;
  attemptNumber?: number;
  generateScenario?: boolean;
};

function readJsonBody(req: VercelRequest): SkillsBody | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw as SkillsBody;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as SkillsBody;
    } catch {
      return null;
    }
  }
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const groq = getGroqEnv();
  if (!groq) {
    res.status(500).json({ error: 'Groq API key not configured.' });
    return;
  }
  const { apiKey, model } = groq;

  const body = readJsonBody(req);
  if (!body) {
    res.status(400).json({ error: 'Invalid JSON body.' });
    return;
  }

  const { skillName, atomicSkillName, scenario, question, userAnswer, attemptNumber = 1, generateScenario } = body;

  if (!skillName) {
    res.status(400).json({ error: 'skillName is required.' });
    return;
  }

  try {
    if (generateScenario || !userAnswer) {
      const prompt = buildScenarioPrompt(skillName, atomicSkillName);
      const raw = await callGroqJson(prompt, apiKey, model);
      const parsed = JSON.parse(raw);
      res.status(200).json(parsed);
      return;
    }

    if (!scenario || !question) {
      res.status(400).json({ error: 'scenario and question are required for feedback.' });
      return;
    }

    const prompt = buildFeedbackPrompt(
      skillName,
      atomicSkillName,
      scenario,
      question,
      userAnswer,
      attemptNumber
    );
    const raw = await callGroqJson(prompt, apiKey, model);
    const parsed = JSON.parse(raw);
    res.status(200).json(parsed);
  } catch (err) {
    console.error('[skills-coach] Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
