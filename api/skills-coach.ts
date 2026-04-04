/**
 * Skills Coach API — POST /api/skills-coach
 *
 * Decision-simulator flow (all skills):
 * 1) generateScenario → scenario + forced decisionOptions (A–D) + reasoningPrompt
 * 2) feedback → requires selectedDecisionId + decisionOptions + user reasoning →
 *    feedback + consequences + reflectionQuestion (+ strengths, growthAreas, refinementPrompt)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

interface DecisionOption {
  id: string;
  label: string;
}

function buildScenarioPrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;
  return `You are designing a SHORT practice session for the skill: "${focus}".

This is a decision simulator, not an essay test. The learner must COMMIT to a choice before explaining reasoning.

Output a realistic workplace scenario (2-4 sentences, specific not generic).

Then output EXACTLY 4 mutually exclusive strategic or tactical options the learner might choose in that situation. Each option is a different plausible path (trade-offs differ). Labels must be concrete actions or stances, not vague.

Then output a reasoningPrompt: ONE sentence instructing them to explain their reasoning using this skill (e.g. "Explain why you chose that path, using first principles / systems thinking / etc." — match the skill "${focus}").

Do NOT ask them to choose in the reasoningPrompt — they already chose. Ask only for reasoning tied to the skill.

JSON only, no markdown:
{
  "scenario": "...",
  "decisionOptions": [
    { "id": "a", "label": "Short label for option A" },
    { "id": "b", "label": "..." },
    { "id": "c", "label": "..." },
    { "id": "d", "label": "..." }
  ],
  "reasoningPrompt": "Explain your reasoning using …"
}

Use ids exactly a, b, c, d in order.`;
}

function buildFeedbackPrompt(
  skillName: string,
  atomicSkillName: string | undefined,
  scenario: string,
  reasoningPrompt: string,
  decisionOptions: DecisionOption[],
  selectedDecisionId: string,
  selectedLabel: string,
  userAnswer: string,
  attemptNumber: number
): string {
  const focus = atomicSkillName ? `${skillName} — "${atomicSkillName}"` : skillName;
  const isRetry = attemptNumber > 1;
  const optionsBlock = decisionOptions.map((o) => `- ${o.id}: ${o.label}`).join('\n');

  return `You are an expert coach evaluating a DECISION + REASONING practice for: "${focus}".

The learner was forced to pick ONE option before writing. Evaluate whether their reasoning shows real use of the skill — NOT polished writing, NOT sounding smart without decision logic.

Scenario:
${scenario}

Options they could choose:
${optionsBlock}

They CHOSE: ${selectedDecisionId} — "${selectedLabel}"

Reasoning prompt they answered:
${reasoningPrompt}

Their written reasoning (attempt ${attemptNumber}):
${userAnswer}

${isRetry ? 'This is a retry — acknowledge persistence; focus on reasoning quality.' : ''}

Rules:
- Reward clear decision logic, trade-off awareness, and skill-specific thinking — not verbosity or tone.
- strengths must reference what they actually did well in their reasoning (or honesty about uncertainty).
- growthAreas: where their reasoning skipped steps, ignored trade-offs, or missed the skill.
- consequences: 2-4 short lines (use \\n between lines). Describe plausible downstream effects of THEIR chosen option (upsides, risks, second-order effects). Frame as simulation ("Often…", "One risk is…") not as declaring them wrong.
- reflectionQuestion: ONE sharp meta question (e.g. "What assumption in your reasoning is most likely wrong?" or equivalent for this skill). No fluff.
- refinementPrompt: one actionable micro-prompt for next time (optional depth).

JSON only:
{
  "feedback": "2-3 sentences on their reasoning and choice.",
  "strengths": ["...", "..."],
  "growthAreas": ["..."],
  "consequences": "line1\\nline2\\nline3",
  "reflectionQuestion": "One sentence question.",
  "refinementPrompt": "Short actionable prompt.",
  "nextScenarioAvailable": true
}`;
}

async function callGroqJson(
  prompt: string,
  apiKey: string,
  model: string,
  maxTokens: number
): Promise<string> {
  const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: maxTokens,
      temperature: 0.72,
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

const DEFAULT_DECISION_OPTIONS: DecisionOption[] = [
  { id: 'a', label: 'Move fast with a small, reversible experiment' },
  { id: 'b', label: 'Commit to a bolder stance and accept higher risk' },
  { id: 'c', label: 'Delay the call until you have more data or input' },
  { id: 'd', label: 'Align stakeholders first, then decide together' },
];

function normalizeScenarioPayload(parsed: Record<string, unknown>): {
  scenario: string;
  decisionOptions: DecisionOption[];
  reasoningPrompt: string;
} {
  const scenario = String(parsed.scenario ?? '').trim();
  const rawOpts =
    parsed.decisionOptions ??
    parsed.decision_options ??
    parsed.options ??
    parsed.choices;

  let decisionOptions: DecisionOption[] = [];
  if (Array.isArray(rawOpts)) {
    decisionOptions = rawOpts
      .map((o, i) => {
        const row = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
        const id = String(row.id ?? row.key ?? ['a', 'b', 'c', 'd'][i] ?? `o${i}`).toLowerCase();
        const label = String(
          row.label ?? row.text ?? row.title ?? row.option ?? row.description ?? ''
        ).trim();
        return { id, label };
      })
      .filter((o) => o.label.length > 0);
  }

  let reasoningPrompt = String(
    parsed.reasoningPrompt ?? parsed.reasoning_prompt ?? parsed.question ?? ''
  ).trim();

  if (decisionOptions.length < 2) {
    decisionOptions = [...DEFAULT_DECISION_OPTIONS];
  }

  if (!reasoningPrompt && scenario) {
    reasoningPrompt =
      'Explain your reasoning for the path you chose, using the skill you are practicing (be concise).';
  }

  if (!scenario) {
    throw new Error('Invalid scenario payload from model');
  }

  return { scenario, decisionOptions: decisionOptions.slice(0, 6), reasoningPrompt };
}

type SkillsBody = {
  skillId?: string;
  skillName?: string;
  atomicSkillId?: string;
  atomicSkillName?: string;
  scenario?: string;
  question?: string;
  reasoningPrompt?: string;
  decisionOptions?: DecisionOption[];
  selectedDecisionId?: string;
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

  const { skillName, atomicSkillName, scenario, userAnswer, attemptNumber = 1, generateScenario } = body;

  if (!skillName) {
    res.status(400).json({ error: 'skillName is required.' });
    return;
  }

  try {
    if (generateScenario || !userAnswer) {
      const prompt = buildScenarioPrompt(skillName, atomicSkillName);
      const raw = await callGroqJson(prompt, apiKey, model, 900);
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const normalized = normalizeScenarioPayload(parsed);
      res.status(200).json(normalized);
      return;
    }

    const reasoningPrompt = (body.reasoningPrompt ?? body.question ?? '').trim();
    const decisionOptions = Array.isArray(body.decisionOptions) ? body.decisionOptions : [];
    const selectedDecisionId = (body.selectedDecisionId ?? '').trim().toLowerCase();

    if (!scenario || !reasoningPrompt) {
      res.status(400).json({ error: 'scenario and reasoningPrompt (or question) are required for feedback.' });
      return;
    }
    if (!selectedDecisionId || decisionOptions.length === 0) {
      res
        .status(400)
        .json({ error: 'selectedDecisionId and decisionOptions are required for feedback.' });
      return;
    }

    const selected = decisionOptions.find(
      (o) => o.id.toLowerCase() === selectedDecisionId
    );
    const selectedLabel = selected?.label ?? selectedDecisionId;

    const prompt = buildFeedbackPrompt(
      skillName,
      atomicSkillName,
      scenario,
      reasoningPrompt,
      decisionOptions,
      selectedDecisionId,
      selectedLabel,
      userAnswer,
      attemptNumber
    );
    const raw = await callGroqJson(prompt, apiKey, model, 900);
    const parsed = JSON.parse(raw) as Record<string, unknown>;

    res.status(200).json({
      feedback: String(parsed.feedback ?? ''),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      growthAreas: Array.isArray(parsed.growthAreas) ? parsed.growthAreas : [],
      consequences: String(parsed.consequences ?? ''),
      reflectionQuestion: String(parsed.reflectionQuestion ?? ''),
      refinementPrompt: String(parsed.refinementPrompt ?? ''),
      nextScenarioAvailable: parsed.nextScenarioAvailable !== false,
    });
  } catch (err) {
    console.error('[skills-coach] Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
