/**
 * On-device TTS — default for voice chat (no Groq Orpheus/PlayAI terms required).
 */

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import { chunkTextForDeviceSpeech } from '@/utils/voice-text';

export function stopDeviceSpeech(): void {
  Speech.stop();
}

export function speakOnDevice(text: string): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();

  return new Promise((resolve, reject) => {
    Speech.speak(trimmed, {
      language: 'en-US',
      rate: Platform.select({ ios: 0.48, android: 0.92, default: 1 }),
      pitch: 1,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (message) => reject(new Error(typeof message === 'string' ? message : 'Speech failed')),
    });
  });
}

export async function speakDeviceSegments(segments: string[]): Promise<void> {
  for (const segment of segments) {
    await speakOnDevice(segment);
  }
}

/** Speak assistant reply using the device voice (primary path for Inner Ally / Coach). */
export async function speakAssistantReply(raw: string): Promise<void> {
  const segments = chunkTextForDeviceSpeech(raw);
  if (segments.length === 0) return;
  await speakDeviceSegments(segments);
}
