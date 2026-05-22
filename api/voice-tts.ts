/**
 * POST /api/voice-tts
 * Body: { text: string, mode?: 'inner_ally' | 'coach', voice?: string }
 *
 * TTS order: PlayAI (default) → Orpheus if GROQ_TTS_PREFER=orpheus → device fallback payload.
 * Orpheus requires org terms: https://console.groq.com/playground?model=canopylabs%2Forpheus-v1-english
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getGroqEnv } from './_lib/groq-config';
import {
  GROQ_AUDIO_SPEECH_URL,
  GROQ_ORPHEUS_MODEL,
  GROQ_PLAYAI_TTS_MODEL,
  ORPHEUS_VOICES,
  PLAYAI_VOICES,
  chunkTextForOrpheus,
  chunkTextForPlayAi,
  isOrpheusTermsError,
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

type TtsEngine = 'playai' | 'orpheus';

function preferredEngine(): TtsEngine {
  const pref = (process.env.GROQ_TTS_PREFER ?? 'playai').trim().toLowerCase();
  return pref === 'orpheus' ? 'orpheus' : 'playai';
}

function resolvePlayAiVoice(mode: string, explicit?: string): string {
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  return mode === 'coach' ? PLAYAI_VOICES.coach : PLAYAI_VOICES.inner_ally;
}

function resolveOrpheusVoice(mode: string, explicit?: string): string {
  if (typeof explicit === 'string' && explicit.trim()) return explicit.trim();
  return mode === 'coach' ? ORPHEUS_VOICES.coach : ORPHEUS_VOICES.inner_ally;
}

async function synthesizePlayAi(apiKey: string, voice: string, input: string): Promise<Buffer> {
  const response = await fetch(GROQ_AUDIO_SPEECH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_PLAYAI_TTS_MODEL,
      voice,
      input,
      response_format: 'wav',
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(errText.slice(0, 500) || `PlayAI TTS failed (${response.status})`);
  }

  return Buffer.from(await response.arrayBuffer());
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

async function synthesizeAllParts(args: {
  apiKey: string;
  engine: TtsEngine;
  mode: 'inner_ally' | 'coach';
  parts: string[];
  voice?: string;
}): Promise<{ chunks: string[]; engine: TtsEngine }> {
  const chunks: string[] = [];
  const playVoice = resolvePlayAiVoice(args.mode, args.voice);
  const orpheusVoice = resolveOrpheusVoice(args.mode, args.voice);

  for (const part of args.parts) {
    const input =
      args.engine === 'orpheus'
        ? `${args.mode === 'inner_ally' ? '[warm] ' : ''}${part}`.slice(0, 200)
        : part;

    let wav: Buffer;
    if (args.engine === 'orpheus') {
      try {
        wav = await synthesizeOrpheus(args.apiKey, orpheusVoice, input);
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (!isOrpheusTermsError(msg)) throw e;
        wav = await synthesizePlayAi(args.apiKey, playVoice, part);
        args.engine = 'playai';
      }
    } else {
      try {
        wav = await synthesizePlayAi(args.apiKey, playVoice, part);
      } catch (playErr) {
        const msg = playErr instanceof Error ? playErr.message : '';
        if (!isOrpheusTermsError(msg)) throw playErr;
        wav = await synthesizeOrpheus(args.apiKey, orpheusVoice, input);
        args.engine = 'orpheus';
      }
    }
    chunks.push(wav.toString('base64'));
  }

  return { chunks, engine: args.engine };
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
  let engine: TtsEngine = preferredEngine();
  const parts =
    engine === 'orpheus' ? chunkTextForOrpheus(capped) : chunkTextForPlayAi(capped);

  if (parts.length === 0) {
    res.status(400).json({ error: 'No speakable text.' });
    return;
  }

  try {
    const result = await synthesizeAllParts({
      apiKey: groq.apiKey,
      engine,
      mode,
      parts,
      voice: body.voice,
    });

    res.status(200).json({
      provider: 'cloud',
      format: 'wav',
      chunks: result.chunks,
      engine: result.engine,
    });
  } catch (e) {
    console.error('[voice-tts] cloud failed, using device fallback:', e);
    const segments = chunkTextForPlayAi(capped);
    res.status(200).json({
      provider: 'device',
      segments,
      notice:
        'Cloud voice is unavailable. Using your device speaker. To enable Groq voices, accept model terms in the Groq console or set GROQ_TTS_PREFER=playai.',
    });
  }
}
