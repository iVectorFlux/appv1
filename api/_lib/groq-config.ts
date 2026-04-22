/**
 * Groq (OpenAI-compatible) - serverless only. Env: GROQ_API_KEY, optional GROQ_MODEL.
 * Lives under api/_lib so Vercel bundles it with functions (underscore = not a route).
 */

export const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function getGroqEnv(): { apiKey: string; model: string } | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  const model = (process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL).trim();
  return { apiKey, model };
}
