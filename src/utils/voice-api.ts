/**
 * Voice AI API — Whisper v3 STT + cloud/device TTS via Vercel /api routes.
 */

import { Platform } from 'react-native';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import type { ChatMode } from '@/services/chat-storage';
import { speakDeviceSegments } from '@/services/device-speech';

const VOICE_FETCH_TIMEOUT_MS = 90_000;

export type VoiceSpeechResult =
  | { provider: 'cloud'; format: string; chunks: string[]; engine?: string }
  | { provider: 'device'; segments: string[]; notice?: string };

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
      if (res.status === 404) {
        throw new Error(
          'Voice API is not on the server yet (404). Redeploy your Vercel project from the latest main branch, then try again.'
        );
      }
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
  const res = await fetch(uri);
  const blob = await res.blob();
  return blobToBase64(blob, mimeType);
}

function blobToBase64(blob: Blob, mimeType: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') {
        reject(new Error('Failed to read audio.'));
        return;
      }
      const comma = dataUrl.indexOf(',');
      const b64 = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
      if (!b64 || b64.length < 8) {
        reject(new Error('Recording was empty. Please try again.'));
        return;
      }
      void mimeType;
      resolve(b64);
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
}): Promise<VoiceSpeechResult> {
  const data = await postVoiceJson<Record<string, unknown>>('/api/voice-tts', {
    text: args.text,
    mode: args.mode,
  });

  if (data.provider === 'device') {
    const segments = Array.isArray(data.segments)
      ? data.segments.filter((s): s is string => typeof s === 'string' && s.length > 0)
      : [];
    if (segments.length === 0) {
      throw new Error('No speakable text for device voice.');
    }
    return {
      provider: 'device',
      segments,
      notice: typeof data.notice === 'string' ? data.notice : undefined,
    };
  }

  const chunks = Array.isArray(data.chunks)
    ? data.chunks.filter((c): c is string => typeof c === 'string' && c.length > 0)
    : [];
  if (chunks.length === 0) {
    throw new Error('No audio was generated.');
  }
  return {
    provider: 'cloud',
    format: typeof data.format === 'string' ? data.format : 'wav',
    chunks,
    engine: typeof data.engine === 'string' ? data.engine : undefined,
  };
}

/** Play cloud WAV chunks or device TTS segments from /api/voice-tts. */
export async function playVoiceSpeechResult(
  result: VoiceSpeechResult,
  playWavChunks: (chunks: string[]) => Promise<void>
): Promise<void> {
  if (result.provider === 'device') {
    await speakDeviceSegments(result.segments, 'inner_ally');
    return;
  }
  await playWavChunks(result.chunks);
}
