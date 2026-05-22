/**
 * On-device TTS fallback when Groq cloud voices are unavailable.
 */

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';

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
