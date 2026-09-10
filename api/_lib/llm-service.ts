import { extractJsonText } from './extract-json';
import { getGroqEnv, GROQ_CHAT_COMPLETIONS_URL } from './groq-config';

export const GEMINI_DEFAULT_MODEL = 'gemini-2.5-flash';

export function getGeminiEnv(): { apiKey: string; model: string } | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return null;
  const model = (process.env.GEMINI_MODEL ?? GEMINI_DEFAULT_MODEL).trim();
  return { apiKey, model };
}

/**
 * Translates OpenAI / Groq standard messages schema to Gemini API schema
 */
export function convertMessagesToGemini(messages: any[]) {
  const contents: any[] = [];
  let systemInstructionText = '';

  for (const m of messages) {
    if (m.role === 'system') {
      systemInstructionText += (systemInstructionText ? '\n' : '') + m.content;
    } else {
      const role = m.role === 'assistant' ? 'model' : 'user';
      
      // Prevent consecutive identical roles by appending contents
      if (contents.length > 0 && contents[contents.length - 1].role === role) {
        contents[contents.length - 1].parts[0].text += '\n' + m.content;
      } else {
        contents.push({
          role,
          parts: [{ text: m.content }]
        });
      }
    }
  }

  const payload: any = { contents };
  
  if (systemInstructionText) {
    payload.systemInstruction = {
      parts: [{ text: systemInstructionText }]
    };
  }

  return payload;
}

/**
 * Robust caller that uses Gemini as primary and falls back to Groq if needed.
 */
export async function callSmartLlm(messages: any[], maxTokens = 1000): Promise<any> {
  const geminiEnv = getGeminiEnv();
  const groqEnv = getGroqEnv();

  // 1. Try Gemini first
  if (geminiEnv?.apiKey) {
    try {
      const geminiPayload = convertMessagesToGemini(messages);
      
      // Configure generation options
      geminiPayload.generationConfig = {
        responseMimeType: 'application/json',
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      };

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiEnv.model}:generateContent?key=${geminiEnv.apiKey}`;

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiPayload),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP ${res.status}: ${errText}`);
      }

      const data = await res.json();
      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!rawText) {
        throw new Error('Gemini API returned an empty text generation response.');
      }

      return JSON.parse(extractJsonText(rawText));
    } catch (err: any) {
      console.warn(`[LLM-Service] Gemini primary call failed. Falling back to Groq... Error: ${err.message}`);
    }
  } else {
    console.info('[LLM-Service] Gemini API key not found in environment. Using Groq directly.');
  }

  // 2. Fall back to Groq
  if (groqEnv?.apiKey) {
    const body = {
      model: groqEnv.model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.7,
      response_format: { type: 'json_object' }
    };

    const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${groqEnv.apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Groq fallback failed (HTTP ${res.status}): ${text}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content ?? '{}';
    return JSON.parse(extractJsonText(rawContent));
  }

  throw new Error('No working LLM provider (Gemini or Groq) is configured with a valid API key.');
}
