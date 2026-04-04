/**
 * Groq (OpenAI-compatible) chat — used by Vercel `/api/*` serverless routes only.
 * Set GROQ_API_KEY in Vercel (never EXPO_PUBLIC_*).
 */

export const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';

/** Override with env GROQ_MODEL if this id changes on Groq’s side */
export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function getGroqEnv(): { apiKey: string; model: string } | null {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;
  const model = (process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL).trim();
  return { apiKey, model };
}
