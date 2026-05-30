/**
 * Groq (OpenAI-compatible) - serverless only. Env: GROQ_API_KEY, optional GROQ_MODEL.
 * Lives under api/_lib so Vercel bundles it with functions (underscore = not a route).
 */

export const GROQ_CHAT_COMPLETIONS_URL =
  'https://api.groq.com/openai/v1/chat/completions';

export const GROQ_DEFAULT_MODEL = 'llama-3.3-70b-versatile';

export function getGroqEnv(): { apiKey: string; model: string } | null {
  let apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) return null;

  // Clean apiKey if a database connection URL or other string got appended
  if (apiKey.includes(':')) {
    const match = apiKey.match(/(gsk_[A-Za-z0-9]+)/);
    if (match) {
      apiKey = match[1];
    }
  }

  const model = (process.env.GROQ_MODEL ?? GROQ_DEFAULT_MODEL).trim();
  return { apiKey, model };
}
