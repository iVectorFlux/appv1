/**
 * AI Chat API — Inner Ally & Coach modes
 *
 * POST /api/chat
 * Body: { mode: 'inner_ally' | 'coach', messages: {role, content}[], userId?: string }
 * Returns: { reply, emotions?, groundingOptions?, learningPathway? }
 *
 * Deployed as a Vercel serverless function.
 * Uses Groq (OpenAI-compatible API). Env: GROQ_API_KEY, optional GROQ_MODEL.
 */

import {
  GROQ_CHAT_COMPLETIONS_URL,
  getGroqEnv,
} from '../src/lib/groq-config';

const INNER_ALLY_SYSTEM_PROMPT = `You are Inner Ally — a warm, grounding companion inside a wellbeing app.

Your role:
- When the user shares how they feel, gently reflect their emotion back and validate it.
- Identify 1-3 core emotions the user seems to be experiencing (use words like anxious, overwhelmed, sad, frustrated, lonely, hopeful, grateful, calm, excited, confused, etc.).
- Suggest 1-2 grounding or recovery techniques the user can try right now. Choose from:
  - "box_breathing" (calm the nervous system with structured breath)
  - "body_scan" (ground through physical awareness)
  - "release" (write out and release a difficult feeling)
  - "physiological_sigh" (double inhale + long exhale to reduce stress fast)
  - "quick_reset" (a short mindfulness pause)
- When relevant, suggest a learning pathway (e.g. naming emotions, self-regulation).
- If the user's message suggests they want to reflect or check in, offer to save as a reflection.
- Keep responses concise, warm, and supportive. 2-4 short paragraphs maximum.
- Never diagnose, prescribe, or make clinical claims.
- If you detect crisis language (self-harm, suicidal ideation), respond with compassion, validate their pain, and gently encourage them to contact a crisis line (e.g. 988 in the US, or a local hotline).

At the end of each response, include a JSON block on its own line in this exact format (do not include it in a code fence):
SUGGESTION_JSON: {"emotions":["emotion1"],"groundingOptions":["technique_id"],"learningPathway":null,"suggestSaveAsReflection":false}

Only populate fields that are genuinely relevant. groundingOptions should be an array of 1-2 technique IDs from the list above, or an empty array. learningPathway should be null or a string like "naming emotions" or "self-regulation". suggestSaveAsReflection should be true only if the user is clearly describing a moment worth capturing.`;

const COACH_SYSTEM_PROMPT = `You are an expert leadership and professional growth coach inside a learning app.

Your role:
- Answer leadership, career, communication, and professional development questions with structured insight.
- Give 2-3 concrete, actionable points or frameworks the user can apply immediately.
- Use real examples and scenarios where helpful.
- When the user's question connects to one of these future skills, suggest exploring it:
  AI Literacy, Critical Thinking, Problem Solving, Emotional Intelligence, Adaptability,
  Digital Collaboration, Data Literacy, Creative Thinking, Systems Thinking, Communication & Influence.
- Keep responses focused and practical. 3-5 paragraphs maximum.
- Avoid generic motivational content — be specific, nuanced, and direct.

At the end of each response, include a JSON block on its own line in this exact format (do not include it in a code fence):
SUGGESTION_JSON: {"learningPathway":null,"skillId":null}

learningPathway: a brief description of a topic to explore, or null.
skillId: one of the future skill IDs if relevant (e.g. "systems_thinking", "critical_thinking", "communication_influence", "adaptability", "problem_solving", "emotional_intelligence", "ai_literacy", "digital_collaboration", "data_literacy", "creative_thinking"), or null.`;

function parseMode(mode: string): 'inner_ally' | 'coach' {
  return mode === 'coach' ? 'coach' : 'inner_ally';
}

function extractSuggestion(content: string): {
  cleanContent: string;
  suggestion: Record<string, unknown> | null;
} {
  const marker = 'SUGGESTION_JSON:';
  const idx = content.lastIndexOf(marker);
  if (idx === -1) return { cleanContent: content.trim(), suggestion: null };

  const jsonPart = content.slice(idx + marker.length).trim();
  const cleanContent = content.slice(0, idx).trim();

  try {
    const suggestion = JSON.parse(jsonPart);
    return { cleanContent, suggestion };
  } catch {
    return { cleanContent, suggestion: null };
  }
}

export async function POST(request: Request): Promise<Response> {
  const groq = getGroqEnv();
  if (!groq) {
    return new Response(JSON.stringify({ error: 'Groq API key not configured.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const { apiKey, model } = groq;

  let body: { mode?: string; messages?: { role: string; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const mode = parseMode(body.mode ?? 'inner_ally');
  const userMessages = Array.isArray(body.messages) ? body.messages : [];

  if (userMessages.length === 0) {
    return new Response(JSON.stringify({ error: 'No messages provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const systemPrompt = mode === 'inner_ally' ? INNER_ALLY_SYSTEM_PROMPT : COACH_SYSTEM_PROMPT;

  const chatMessages = [
    { role: 'system', content: systemPrompt },
    ...userMessages.map((m) => ({ role: m.role, content: m.content })),
  ];

  try {
    const response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: chatMessages,
        max_tokens: 600,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[chat] Groq error:', errText);
      return new Response(JSON.stringify({ error: 'AI request failed.' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };

    const rawContent = data.choices?.[0]?.message?.content ?? '';
    const { cleanContent, suggestion } = extractSuggestion(rawContent);

    return new Response(
      JSON.stringify({
        reply: cleanContent,
        mode,
        ...(suggestion ?? {}),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error.' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
