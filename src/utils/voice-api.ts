/**
 * Voice AI API — Whisper v3 STT + Orpheus TTS via Vercel /api routes.
 */

import { Platform } from 'react-native';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import type { ChatMode } from '@/services/chat-storage';

const VOICE_FETCH_TIMEOUT_MS = 90_000;

async function postVoiceJson<T>(path: string, body: object): Promise<T> {
  const url = buildVercelApiUrl(path);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), VOICE_FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text) as Record<string, unknown>;
    } catch {
      throw new Error(
        res.ok
          ? 'Voice server returned invalid JSON.'
          : `Voice request failed (${res.status}).`
      );
    }
    if (!res.ok) {
      const msg = typeof parsed.error === 'string' ? parsed.error : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return parsed as T;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') {
      throw new Error('Voice request timed out. Please try again.');
    }
    if (e instanceof Error) throw e;
    throw new Error('Could not reach the voice server.');
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Encode a local recording URI or web Blob to base64 for /api/voice-stt. */
export async function audioUriToBase64(uri: string, mimeType: string): Promise<string> {
  if (Platform.OS === 'web') {
    const res = await fetch(uri);
    const blob = await res.blob();
    return blobToBase64(blob);
  }
  const res = await fetch(uri);
  const blob = await res.blob();
  return blobToBase64(blob);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to read audio.'));
        return;
      }
      const comma = dataUrl.indexOf(',');
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error('Failed to read audio.'));
    reader.readAsDataURL(blob);
  });
}

export async function requestVoiceTranscription(args: {
  audioBase64: string;
  mimeType: string;
}): Promise<{ text: string }> {
  return postVoiceJson('/api/voice-stt', {
    audioBase64: args.audioBase64,
    mimeType: args.mimeType,
    language: 'en',
  });
}

export async function requestVoiceSpeech(args: {
  text: string;
  mode: ChatMode;
}): Promise<{ format: string; chunks: string[] }> {
  const data = await postVoiceJson<{ format?: string; chunks?: string[] }>('/api/voice-tts', {
    text: args.text,
    mode: args.mode,
  });
  const chunks = Array.isArray(data.chunks)
    ? data.chunks.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : [];
  if (chunks.length === 0) {
    throw new Error('No audio was generated.');
  }
  return { format: data.format ?? 'wav', chunks };
}
