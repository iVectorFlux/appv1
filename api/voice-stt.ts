/**
 * POST /api/voice-stt
 * Body: { audioBase64: string, mimeType?: string, language?: string }
 * Returns: { text: string }
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { getGroqEnv } from './_lib/groq-config';
import {
  GROQ_AUDIO_TRANSCRIPTIONS_URL,
  GROQ_WHISPER_MODEL,
  mimeToGroqFilename,
} from './_lib/groq-voice';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function readJsonBody(req: VercelRequest): {
  audioBase64?: string;
  mimeType?: string;
  language?: string;
} | null {
  const raw = req.body;
  if (raw == null) return null;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as { audioBase64?: string; mimeType?: string; language?: string };
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as { audioBase64?: string; mimeType?: string; language?: string };
    } catch {
      return null;
    }
  }
  return null;
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
  if (!body?.audioBase64?.trim()) {
    res.status(400).json({ error: 'audioBase64 is required.' });
    return;
  }

  let audioBuffer: Buffer;
  try {
    audioBuffer = Buffer.from(body.audioBase64.trim(), 'base64');
  } catch {
    res.status(400).json({ error: 'Invalid audioBase64 encoding.' });
    return;
  }

  if (audioBuffer.length === 0) {
    res.status(400).json({ error: 'Empty audio payload.' });
    return;
  }
  if (audioBuffer.length > MAX_AUDIO_BYTES) {
    res.status(413).json({ error: 'Audio file too large. Keep recordings under about 60 seconds.' });
    return;
  }

  const mimeType = typeof body.mimeType === 'string' && body.mimeType.trim()
    ? body.mimeType.trim()
    : 'audio/m4a';
  const filename = mimeToGroqFilename(mimeType);
  const language = typeof body.language === 'string' && body.language.trim()
    ? body.language.trim()
    : 'en';

  const form = new FormData();
  form.append('model', GROQ_WHISPER_MODEL);
  form.append('language', language);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  form.append(
    'file',
    new Blob([new Uint8Array(audioBuffer)], { type: mimeType }),
    filename
  );

  try {
    const upstream = await fetch(GROQ_AUDIO_TRANSCRIPTIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${groq.apiKey}` },
      body: form,
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('[voice-stt] Groq error:', errText.slice(0, 500));
      let message = 'Speech recognition failed.';
      try {
        const j = JSON.parse(errText) as { error?: { message?: string } };
        if (typeof j?.error?.message === 'string') message = j.error.message;
      } catch {
        if (errText.length > 0 && errText.length < 400) message = errText;
      }
      res.status(502).json({ error: message });
      return;
    }

    const data = (await upstream.json()) as { text?: string };
    const text = typeof data.text === 'string' ? data.text.trim() : '';
    if (!text) {
      res.status(422).json({ error: 'Could not understand the audio. Please try again.' });
      return;
    }

    res.status(200).json({ text });
  } catch (e) {
    console.error('[voice-stt]', e);
    res.status(500).json({ error: 'Speech recognition request failed.' });
  }
}
