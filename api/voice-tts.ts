/**
 * POST /api/voice-tts
 * Body: { text: string, mode?: 'inner_ally' | 'coach', voice?: string }
 * Returns: { format: 'wav', chunks: string[] } — base64 WAV segments in order
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getGroqEnv } from './_lib/groq-config';
import {
  GROQ_AUDIO_SPEECH_URL,
  GROQ_ORPHEUS_MODEL,
  ORPHEUS_VOICES,
  chunkTextForOrpheus,
  textForSpeech,
} from './_lib/groq-voice';

const MAX_SPEECH_CHARS = 2400;

function readJsonBody(req: VercelRequest): {
  text?: string;
  mode?: string;
  voice?: string;
} | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as { text?: string; mode?: string; voice?: string };
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { text?: string; mode?: string; voice?: string };
    } catch {
      return null;
    }
  }
  return null;
}

function resolveVoice(mode: string | undefined, explicit?: string): string {
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  if (mode === 'coach') return ORPHEUS_VOICES.coach;
  return ORPHEUS_VOICES.inner_ally;
}

async function synthesizeChunk(apiKey: string, voice: string, input: string): Promise<Buffer> {
  const response = await fetch(GROQ_AUDIO_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_ORPHEUS_MODEL,
      voice,
      input,
      response_format: 'wav',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText.slice(0, 400) || `TTS failed (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
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

  const body = readJsonBody(req);
  if (!body?.text?.trim()) {
    res.status(400).json({ error: 'text is required.' });
    return;
  }

  const spoken = textForSpeech(body.text);
  if (!spoken) {
    res.status(400).json({ error: 'No speakable text.' });
    return;
  }

  const capped = spoken.length > MAX_SPEECH_CHARS
    ? `${spoken.slice(0, MAX_SPEECH_CHARS).trim()}…`
    : spoken;

  const mode = body.mode === 'coach' ? 'coach' : 'inner_ally';
  const voice = resolveVoice(mode, body.voice);
  const parts = chunkTextForOrpheus(capped);

  if (parts.length === 0) {
    res.status(400).json({ error: 'No speakable text.' });
    return;
  }

  try {
    const chunks: string[] = [];
    for (const part of parts) {
      const prefix = mode === 'inner_ally' ? '[warm] ' : '';
      const input = `${prefix}${part}`.slice(0, 200);
      const wav = await synthesizeChunk(groq.apiKey, voice, input);
      chunks.push(wav.toString('base64'));
    }

    res.status(200).json({ format: 'wav', chunks, voice });
  } catch (e) {
    console.error('[voice-tts]', e);
    const message = e instanceof Error ? e.message : 'Text-to-speech failed.';
    res.status(502).json({ error: message });
  }
}
