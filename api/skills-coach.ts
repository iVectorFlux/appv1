/**
 * Skills Coach API — AI-powered practice for Future Skills
 *
 * POST /api/skills-coach
 * Body: { skillId, skillName, atomicSkillId?, atomicSkillName?, userAnswer?, attemptNumber?, generateScenario? }
 *
 * Two modes:
 *  1. generateScenario: true  → AI returns a scenario + opening question
 *  2. userAnswer provided     → AI evaluates the answer and returns feedback
 *
 * Returns: { question?, scenario?, feedback?, strengths?, growthAreas?, refinementPrompt?, nextScenarioAvailable? }
 *
 * Deployed as a Vercel serverless function.
 */

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

function buildScenarioPrompt(
  skillName: string,
  atomicSkillName?: string
): string {
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

async function callOpenAI(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  const response = await fetch(OPENAI_API_URL, {
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
    throw new Error(`OpenAI error: ${errText}`);
  }

  const data = (await response.json()) as {
    choices: { message: { content: string } }[];
  };

  return data.choices?.[0]?.message?.content ?? '{}';
}

export async function POST(request: Request): Promise<Response> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o';

  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'OpenAI API key not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body: {
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

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { skillName, atomicSkillName, scenario, question, userAnswer, attemptNumber = 1, generateScenario } = body;

  if (!skillName) {
    return new Response(JSON.stringify({ error: 'skillName is required.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    if (generateScenario || !userAnswer) {
      // Mode 1: generate scenario + opening question
      const prompt = buildScenarioPrompt(skillName, atomicSkillName);
      const raw = await callOpenAI(prompt, apiKey, model);
      const parsed = JSON.parse(raw);

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } else {
      // Mode 2: evaluate user's answer
      if (!scenario || !question) {
        return new Response(JSON.stringify({ error: 'scenario and question are required for feedback.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const prompt = buildFeedbackPrompt(
        skillName,
        atomicSkillName,
        scenario,
        question,
        userAnswer,
        attemptNumber
      );
      const raw = await callOpenAI(prompt, apiKey, model);
      const parsed = JSON.parse(raw);

      return new Response(JSON.stringify(parsed), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (err) {
    console.error('[skills-coach] Error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
