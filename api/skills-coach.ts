/**
 * Skills Coach API — POST /api/skills-coach
 *
 * Supports five practice modes, each with its own scenario + feedback prompts:
 *
 *  decision_simulator  → scenario + A–D choice + reasoning → feedback
 *  output_audit        → flawed AI output to evaluate → critique → feedback
 *  open_reflection     → interpersonal/systemic situation → open response → coaching
 *  generative_brainstorm → creative constraint → ideas list → originality feedback
 *  draft_and_refine    → communication brief → draft message → audience-fit feedback
 *
 * Phase 1 (generateScenario: true):
 *   decision_simulator → { scenario, decisionOptions, reasoningPrompt }
 *   all other modes   → { scenario, question }
 *
 * Phase 2 (feedback):
 *   decision_simulator → requires selectedDecisionId + decisionOptions + userAnswer
 *   all other modes   → requires scenario + question + userAnswer
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

type PracticeMode =
  | 'decision_simulator'
  | 'output_audit'
  | 'open_reflection'
  | 'generative_brainstorm'
  | 'draft_and_refine';

interface DecisionOption {
  id: string;
  label: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function buildDecisionSimulatorPrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;
  return `You are designing a SHORT practice session for the skill: "${focus}".

This is a decision simulator. The learner must COMMIT to one option before explaining their reasoning.

Output a realistic workplace scenario (2-4 sentences, specific not generic).

Then output EXACTLY 4 mutually exclusive options the learner might choose. Each option is a different plausible path with different trade-offs. Labels must be concrete actions or stances, not vague descriptions.

Then output a reasoningPrompt: ONE sentence asking them to explain their reasoning using the specific skill "${focus}". Do NOT ask them to choose — they already chose. Ask only for reasoning.

JSON only, no markdown:
{
  "scenario": "...",
  "decisionOptions": [
    { "id": "a", "label": "Concrete option A" },
    { "id": "b", "label": "Concrete option B" },
    { "id": "c", "label": "Concrete option C" },
    { "id": "d", "label": "Concrete option D" }
  ],
  "reasoningPrompt": "Explain your reasoning using ${focus}…"
}

Use ids exactly a, b, c, d in order.`;
}

/**
 * output_audit: each atomic under AI Literacy must be a DIFFERENT exercise shape.
 * Do NOT copy example "question" text from this file — the model must invent a fresh,
 * short (1–2 sentence) task line each time, matched to the sub-skill.
 */
function buildOutputAuditPrompt(
  skillId: string | undefined,
  skillName: string,
  atomicSkillId?: string,
  atomicSkillName?: string
): string {
  const focus = atomicSkillName ? `${skillName} — "${atomicSkillName}"` : skillName;

  const jsonShape = `JSON only, no markdown, exactly two keys "scenario" and "question":
{
  "scenario": "...",
  "question": "..."
}

CRITICAL for "question": write ONE or TWO short sentences unique to THIS exercise. Do NOT reuse generic boilerplate like "Audit this AI output" every time. Tie the ask directly to the sub-skill below.`;

  if (skillId === 'ai_literacy' && atomicSkillId === 'prompt_craft') {
    return `You are designing a PROMPT CRAFTING exercise for "${focus}".

The "scenario" field must contain TWO labeled parts in plain text:
(1) A weak or vague USER PROMPT someone might send to an AI (1-3 sentences).
(2) A MEDIOCRE AI REPLY that follows from that bad prompt (2-4 sentences) — shallow, generic, or guessing.

Flaws should mainly be fixable by improving the USER PROMPT (missing context, unclear goal, no constraints, wrong format request).

The "question" must ask ONLY about improving the prompt: what is wrong with how the user asked, and how would they rewrite the prompt (not a full essay — concise).

${jsonShape}`;
  }

  if (skillId === 'ai_literacy' && atomicSkillId === 'output_evaluation') {
    return `You are designing an OUTPUT EVALUATION exercise for "${focus}".

The "scenario" is ONLY the AI-generated block (no meta commentary): 3-6 sentences of plausible workplace text (summary, analysis, or recommendation) with 2-4 subtle issues: overconfidence, missing caveats, weak sourcing, logical gaps, or misleading framing.

The "question" must ask them to critique the OUTPUT only: accuracy, what's overstated, what's missing, and what they would verify before trusting or sharing it.

${jsonShape}`;
  }

  if (skillId === 'ai_literacy' && atomicSkillId === 'ai_ethics') {
    return `You are designing an AI ETHICS exercise for "${focus}".

The "scenario" is AI-generated or policy-style workplace text (3-6 sentences) that embeds 2-3 ethical risks among: demographic bias, privacy/PII mishandling, surveillance, intellectual property, misinformation, automation harm, or dual-use / misuse. Keep flaws plausible, not cartoonish.

The "question" must ask specifically about ETHICAL risks and safeguards — not generic "is it accurate".

${jsonShape}`;
  }

  if (skillId === 'ai_literacy' && atomicSkillId === 'tool_fluency') {
    return `You are designing a TOOL FLUENCY exercise for "${focus}".

The "scenario" describes a real task and how someone plans to use AI tools (3-5 sentences). Include a poor fit: wrong tool for the job, redundant tools, missing human step, API/data leakage risk, or workflow that won't scale. Do not name real vendors as villains; keep it generic ("a chat assistant", "an image model", "a code copilot").

The "question" must ask which tool choice or workflow they'd change and why — trade-offs included.

${jsonShape}`;
  }

  // AI Literacy — full skill (no sub-skill): rotate emphasis each generation
  if (skillId === 'ai_literacy' && !atomicSkillId) {
    return `You are designing an AI LITERACY practice for the FULL skill "${skillName}" (no single sub-skill).

Pick ONE emphasis at random for THIS JSON only: (A) weak user prompt + mediocre reply — ask how to fix the prompt, OR (B) flawed AI output only — ask for output critique, OR (C) ethical risk in AI use — ask for ethics/guardrails, OR (D) wrong tool/workflow — ask what they'd use instead.

State the emphasis in the "question" in one short phrase so the learner knows what lens to use.

${jsonShape}`;
  }

  // Any other skill using output_audit (fallback)
  return `You are designing an AI output evaluation exercise for: "${focus}".

"scenario": plausible-but-flawed AI-style workplace content (3-6 sentences) with subtle issues.

"question": ONE or TWO sentences, unique, asking what is wrong and what they would verify or change. Do NOT copy canned audit wording.

${jsonShape}`;
}

function buildOpenReflectionPrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;

  const isEQ = skillName.toLowerCase().includes('emotional');
  const isSystems = skillName.toLowerCase().includes('systems');

  if (isEQ) {
    return `You are designing an emotional intelligence reflection exercise for: "${focus}".

Create a short, realistic workplace situation (3-5 sentences) with genuine emotional complexity — a conflict, misunderstanding, power dynamic, someone under pressure, or a moment requiring empathy. Make it feel real and human, not textbook.

Then write a reflection question that asks the learner to: (1) name the emotions present, (2) consider the other person's perspective, and (3) describe how they would respond.

JSON only, no markdown:
{
  "scenario": "[The interpersonal situation]",
  "question": "What emotions do you notice in this situation — yours and theirs? What might be driving their behaviour? How would you respond, and why?"
}`;
  }

  if (isSystems) {
    return `You are designing a systems thinking reflection exercise for: "${focus}".

Create a realistic organisational or social situation (3-5 sentences) where something is happening on the surface but the deeper system dynamics are not immediately obvious. Include at least one visible effect and hint at some hidden causes or feedback loops.

Then write a question asking the learner to: (1) identify the feedback loops or second-order effects at play, (2) explain what would happen if someone intervened at a specific point, and (3) note what they'd watch for to know if the system is shifting.

JSON only, no markdown:
{
  "scenario": "[The organisational/social situation]",
  "question": "What feedback loops or second-order effects can you identify? If you intervened at one point, what would ripple outward — and what signals would tell you whether it's working?"
}`;
  }

  // Generic open reflection fallback
  return `You are designing a reflection exercise for the skill: "${focus}".

Create a realistic workplace situation (3-5 sentences) that calls for this skill in a non-obvious way.

Then write a focused open question that asks the learner to apply "${focus}" specifically — not just describe what happened.

JSON only, no markdown:
{
  "scenario": "[The situation]",
  "question": "[Focused question tied to ${focus}]"
}`;
}

function buildGenerativeBrainstormPrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;
  return `You are designing a creative brainstorming exercise for the skill: "${focus}".

Create a specific, constrained creative challenge (2-3 sentences). The challenge should have a real tension or constraint that makes obvious solutions unhelpful. It should be grounded in a workplace or everyday context.

Then write a question that asks the learner to generate at least 4 distinct ideas, with explicit instructions to: (1) prioritise range over polish, (2) include at least one idea that challenges an assumption, and (3) include at least one idea borrowed from a completely different domain or context.

JSON only, no markdown:
{
  "scenario": "[The creative challenge with constraint]",
  "question": "Generate at least 4 distinct ideas. Prioritise range over polish — include one that challenges an obvious assumption, and one inspired by a completely different domain or field."
}`;
}

function buildDraftAndRefinePrompt(skillName: string, atomicSkillName?: string): string {
  const focus = atomicSkillName ? `${skillName} — specifically "${atomicSkillName}"` : skillName;
  return `You are designing a communication drafting exercise for the skill: "${focus}".

Create a realistic communication brief (3-5 sentences) with a specific audience, goal, and context. The brief should include a real tension — a sceptical audience, a sensitive topic, a difficult ask, or a high-stakes moment. Make the context specific enough that generic messages won't work.

Then write a drafting question that asks the learner to write a short message (email, Slack, memo, or presentation opening — their choice) that achieves the goal and fits the audience. Remind them to keep it focused (under 150 words) and audience-aware.

JSON only, no markdown:
{
  "scenario": "[The communication brief — audience, goal, context, tension]",
  "question": "Draft your message (email, Slack, memo — your choice of format). Keep it under 150 words. Show you understand your audience and the tension in this situation."
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Feedback prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function buildDecisionFeedbackPrompt(
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

The learner committed to one option before writing. Evaluate whether their reasoning shows real use of the skill — NOT polished writing, NOT sounding smart without decision logic.

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
- strengths must reference what they actually did well in their reasoning.
- growthAreas: where their reasoning skipped steps, ignored trade-offs, or missed the skill.
- consequences: 2-4 short lines (use \\n between lines). Plausible downstream effects of THEIR chosen option — upsides, risks, second-order effects. Frame as simulation ("Often…", "One risk is…").
- reflectionQuestion: ONE sharp meta question (e.g. "What assumption in your reasoning is most likely wrong?"). No fluff.
- refinementPrompt: one actionable micro-prompt for next time.

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

function buildOpenFeedbackPrompt(
  skillName: string,
  atomicSkillName: string | undefined,
  practiceMode: PracticeMode,
  scenario: string,
  question: string,
  userAnswer: string,
  attemptNumber: number
): string {
  const focus = atomicSkillName ? `${skillName} — "${atomicSkillName}"` : skillName;
  const isRetry = attemptNumber > 1;

  const modeInstructions: Record<string, string> = {
    output_audit: `The learner was asked to audit a piece of AI-generated content and identify issues. Evaluate: (1) how many real issues they caught, (2) whether they explained WHY each is a problem, (3) what they missed. Reward precision and specificity over vague concerns.`,
    open_reflection: `The learner responded to an open reflective situation. Evaluate the depth of their emotional/systemic awareness, whether they considered multiple perspectives, and whether their response shows real skill — not just empathy-sounding language.`,
    generative_brainstorm: `The learner generated ideas in response to a creative challenge. Evaluate: (1) range and diversity of ideas, (2) whether any challenge assumptions, (3) cross-domain inspiration, (4) originality vs. obvious answers. Reward breadth and boldness over polish.`,
    draft_and_refine: `The learner drafted a message for a specific communication context. Evaluate: clarity, audience-fit, framing, whether they addressed the tension in the brief, and persuasive effectiveness. Reward precision and audience awareness over length or style.`,
  };

  const consequencesInstruction: Record<string, string> = {
    output_audit: 'consequences: 2-3 lines on what could go wrong if the AI output was used as-is without their suggested fixes. Use \\n between lines.',
    open_reflection: 'consequences: 2-3 lines on what might realistically happen if they responded the way they described. Frame as plausible outcomes, not judgement. Use \\n between lines.',
    generative_brainstorm: 'consequences: 2-3 lines on what the most promising idea(s) could unlock — and what gaps remain in their ideation. Use \\n between lines.',
    draft_and_refine: 'consequences: 2-3 lines on how the audience is likely to receive this draft — what will land, what might not. Use \\n between lines.',
  };

  const instruction = modeInstructions[practiceMode] ?? modeInstructions.open_reflection;
  const consequenceRule = consequencesInstruction[practiceMode] ?? consequencesInstruction.open_reflection;

  return `You are an expert coach evaluating a "${focus}" practice exercise (mode: ${practiceMode}).

${instruction}

${practiceMode === 'output_audit' ? 'AI output they were asked to evaluate:' : 'Situation / Challenge / Brief:'}
${scenario}

Question they were answering:
${question}

Their response (attempt ${attemptNumber}):
${userAnswer}

${isRetry ? 'This is a retry — acknowledge persistence; focus on quality improvement.' : ''}

Rules:
- strengths: what they actually did well — be specific, reference their words.
- growthAreas: where they were shallow, missed something important, or could go deeper.
- ${consequenceRule}
- reflectionQuestion: ONE sharp question that pushes their thinking further. No fluff.
- refinementPrompt: one actionable thing to try in the next round.

JSON only:
{
  "feedback": "2-3 sentences on the quality of their response.",
  "strengths": ["...", "..."],
  "growthAreas": ["..."],
  "consequences": "line1\\nline2",
  "reflectionQuestion": "One sentence question.",
  "refinementPrompt": "Short actionable prompt.",
  "nextScenarioAvailable": true
}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq call
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Normalisers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_DECISION_OPTIONS: DecisionOption[] = [
  { id: 'a', label: 'Move fast with a small, reversible experiment' },
  { id: 'b', label: 'Commit to a bolder stance and accept higher risk' },
  { id: 'c', label: 'Delay the call until you have more data or input' },
  { id: 'd', label: 'Align stakeholders first, then decide together' },
];

function normalizeDecisionScenario(parsed: Record<string, unknown>): {
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

  if (decisionOptions.length < 2) {
    decisionOptions = [...DEFAULT_DECISION_OPTIONS];
  }

  let reasoningPrompt = String(
    parsed.reasoningPrompt ?? parsed.reasoning_prompt ?? parsed.question ?? ''
  ).trim();
  if (!reasoningPrompt && scenario) {
    reasoningPrompt = 'Explain your reasoning for the path you chose, using the skill you are practising.';
  }

  if (!scenario) throw new Error('Invalid scenario payload from model');

  return { scenario, decisionOptions: decisionOptions.slice(0, 6), reasoningPrompt };
}

function normalizeOpenScenario(parsed: Record<string, unknown>): {
  scenario: string;
  question: string;
} {
  const scenario = String(
    parsed.scenario ?? parsed.aiContent ?? parsed.challenge ?? parsed.brief ?? ''
  ).trim();
  const question = String(
    parsed.question ?? parsed.auditPrompt ?? parsed.ideaPrompt ?? parsed.draftPrompt ?? ''
  ).trim();

  if (!scenario) throw new Error('Invalid scenario payload from model');

  return {
    scenario,
    question: question || 'Respond to the situation above using the skill you are practising.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Request types
// ─────────────────────────────────────────────────────────────────────────────

type SkillsBody = {
  skillId?: string;
  skillName?: string;
  atomicSkillId?: string;
  atomicSkillName?: string;
  practiceMode?: PracticeMode;
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

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

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

  const {
    skillId,
    skillName,
    atomicSkillId,
    atomicSkillName,
    scenario,
    userAnswer,
    attemptNumber = 1,
    generateScenario,
    practiceMode = 'decision_simulator',
  } = body;

  if (!skillName) {
    res.status(400).json({ error: 'skillName is required.' });
    return;
  }

  try {
    // ── Phase 1: Generate scenario ──────────────────────────────────────────
    if (generateScenario || !userAnswer) {
      let promptText: string;
      switch (practiceMode) {
        case 'output_audit':
          promptText = buildOutputAuditPrompt(skillId, skillName, atomicSkillId, atomicSkillName);
          break;
        case 'open_reflection':
          promptText = buildOpenReflectionPrompt(skillName, atomicSkillName);
          break;
        case 'generative_brainstorm':
          promptText = buildGenerativeBrainstormPrompt(skillName, atomicSkillName);
          break;
        case 'draft_and_refine':
          promptText = buildDraftAndRefinePrompt(skillName, atomicSkillName);
          break;
        default:
          promptText = buildDecisionSimulatorPrompt(skillName, atomicSkillName);
      }

      const raw = await callGroqJson(promptText, apiKey, model, 1000);
      const parsed = JSON.parse(raw) as Record<string, unknown>;

      if (practiceMode === 'decision_simulator') {
        const normalized = normalizeDecisionScenario(parsed);
        res.status(200).json(normalized);
      } else {
        const normalized = normalizeOpenScenario(parsed);
        res.status(200).json(normalized);
      }
      return;
    }

    // ── Phase 2: Feedback ───────────────────────────────────────────────────
    if (!scenario) {
      res.status(400).json({ error: 'scenario is required for feedback.' });
      return;
    }

    if (practiceMode === 'decision_simulator') {
      const reasoningPrompt = (body.reasoningPrompt ?? body.question ?? '').trim();
      const decisionOptions = Array.isArray(body.decisionOptions) ? body.decisionOptions : [];
      const selectedDecisionId = (body.selectedDecisionId ?? '').trim().toLowerCase();

      if (!reasoningPrompt || !selectedDecisionId || decisionOptions.length === 0) {
        res.status(400).json({
          error: 'reasoningPrompt, selectedDecisionId, and decisionOptions are required for decision_simulator feedback.',
        });
        return;
      }

      const selected = decisionOptions.find((o) => o.id.toLowerCase() === selectedDecisionId);
      const selectedLabel = selected?.label ?? selectedDecisionId;

      const prompt = buildDecisionFeedbackPrompt(
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
    } else {
      const question = (body.question ?? body.reasoningPrompt ?? '').trim();
      if (!question) {
        res.status(400).json({ error: 'question is required for feedback.' });
        return;
      }

      const prompt = buildOpenFeedbackPrompt(
        skillName,
        atomicSkillName,
        practiceMode,
        scenario,
        question,
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
    }
  } catch (err) {
    console.error('[skills-coach] Error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
}
