/**
 * POST /api/voice-tts
 * Body: { text: string, mode?: 'inner_ally' | 'coach' }
 *
 * Default: returns device TTS segments (200) — client speaks via expo-speech.
 * Optional cloud (set GROQ_CLOUD_TTS=1 on Vercel): tries Orpheus; falls back to device on any error.
 * Orpheus requires terms: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getGroqEnv } from './_lib/groq-config';
import {
  GROQ_AUDIO_SPEECH_URL,
  GROQ_ORPHEUS_MODEL,
  ORPHEUS_VOICES,
  chunkTextForOrpheus,
  chunkTextForPlayAi,
  isOrpheusTermsError,
  textForSpeech,
} from './_lib/groq-voice';

const MAX_SPEECH_CHARS = 2400;

const DEVICE_NOTICE =
  'Using your device speaker. For Groq cloud voice, accept Orpheus terms in the Groq console and set GROQ_CLOUD_TTS=1 on Vercel.';

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

function resolveOrpheusVoice(mode: string, explicit?: string): string {
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  return mode === 'coach' ? ORPHEUS_VOICES.coach : ORPHEUS_VOICES.inner_ally;
}

function respondDevice(
  res: VercelResponse,
  capped: string,
  notice?: string
): void {
  const segments = chunkTextForPlayAi(capped);
  res.status(200).json({
    provider: 'device',
    segments,
    notice: notice ?? DEVICE_NOTICE,
  });
}

async function synthesizeOrpheus(apiKey: string, voice: string, input: string): Promise<Buffer> {
  const response = await fetch(GROQ_AUDIO_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_ORPHEUS_MODEL,
      voice,
      input: input.slice(0, 200),
      response_format: 'wav',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText.slice(0, 500) || `Orpheus TTS failed (${response.status})`);
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
  const tryCloud = process.env.GROQ_CLOUD_TTS === '1';

  if (!tryCloud) {
    respondDevice(res, capped);
    return;
  }

  const groq = getGroqEnv();
  if (!groq) {
    respondDevice(res, capped, 'Groq API key not configured; using device speaker.');
    return;
  }

  const parts = chunkTextForOrpheus(capped);
  if (parts.length === 0) {
    res.status(400).json({ error: 'No speakable text.' });
    return;
  }

  const voice = resolveOrpheusVoice(mode, body.voice);

  try {
    const chunks: string[] = [];
    for (const part of parts) {
      const input = `${mode === 'inner_ally' ? '[warm] ' : ''}${part}`.slice(0, 200);
      const wav = await synthesizeOrpheus(groq.apiKey, voice, input);
      chunks.push(wav.toString('base64'));
    }

    res.status(200).json({
      provider: 'cloud',
      format: 'wav',
      chunks,
      engine: 'orpheus',
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    console.error('[voice-tts] cloud failed:', msg.slice(0, 300));
    const notice = isOrpheusTermsError(msg)
      ? 'Orpheus terms not accepted on Groq. Using device speaker.'
      : 'Cloud voice unavailable. Using device speaker.';
    respondDevice(res, capped, notice);
  }
}
