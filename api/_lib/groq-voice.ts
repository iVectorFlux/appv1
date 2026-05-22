/**
 * Groq voice: Whisper Large v3 (STT) + Canopy Labs Orpheus (TTS).
 * Serverless only — uses GROQ_API_KEY from env.
 */

export const GROQ_AUDIO_TRANSCRIPTIONS_URL =
  'https://api.groq.com/openai/v1/audio/transcriptions';

export const GROQ_AUDIO_SPEECH_URL = 'https://api.groq.com/openai/v1/audio/speech';

export const GROQ_WHISPER_MODEL = 'whisper-large-v3';

export const GROQ_ORPHEUS_MODEL = 'canopylabs/orpheus-v1-english';

/** Orpheus input limit per request */
export const ORPHEUS_MAX_INPUT_CHARS = 200;

export const ORPHEUS_VOICES = {
  inner_ally: 'hannah',
  coach: 'austin',
} as const;

/** Remove wire-format JSON and markdown noise before TTS. */
export function textForSpeech(raw: string): string {
  let t = raw.trim();
  const jsonIdx = t.search(/\nSUGGESTION_JSON:\s*\{/i);
  if (jsonIdx >= 0) t = t.slice(0, jsonIdx).trim();
  t = t.replace(/\*\*(.+?)\*\*/g, '$1');
  t = t.replace(/\*(.+?)\*/g, '$1');
  t = t.replace(/^•\s+/gm, '');
  t = t.replace(/\n{2,}/g, '. ');
  t = t.replace(/\s+/g, ' ').trim();
  return t;
}

/** Split text into Orpheus-safe chunks (≤ maxLen), preferring sentence boundaries. */
export function chunkTextForOrpheus(text: string, maxLen = ORPHEUS_MAX_INPUT_CHARS): string[] {
  const cleaned = textForSpeech(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxLen) return [cleaned];

  const chunks: string[] = [];
  let rest = cleaned;

  while (rest.length > 0) {
    if (rest.length <= maxLen) {
      chunks.push(rest);
      break;
    }
    let slice = rest.slice(0, maxLen);
    const breakAt = Math.max(
      slice.lastIndexOf('. '),
      slice.lastIndexOf('? '),
      slice.lastIndexOf('! '),
      slice.lastIndexOf(', ')
    );
    if (breakAt > maxLen * 0.4) {
      slice = rest.slice(0, breakAt + 1).trim();
      rest = rest.slice(breakAt + 1).trim();
    } else {
      const space = slice.lastIndexOf(' ');
      if (space > maxLen * 0.5) {
        slice = rest.slice(0, space).trim();
        rest = rest.slice(space + 1).trim();
      } else {
        slice = rest.slice(0, maxLen);
        rest = rest.slice(maxLen).trim();
      }
    }
    if (slice) chunks.push(slice);
  }

  return chunks;
}

export function mimeToGroqFilename(mime: string): string {
  const m = mime.toLowerCase().split(';')[0].trim();
  if (m.includes('webm')) return 'audio.webm';
  if (m.includes('wav')) return 'audio.wav';
  if (m.includes('mp3') || m.includes('mpeg')) return 'audio.mp3';
  if (m.includes('mp4') || m.includes('m4a')) return 'audio.m4a';
  if (m.includes('ogg')) return 'audio.ogg';
  return 'audio.m4a';
}
