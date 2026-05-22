/**
 * On-device TTS for voice chat (free OS / browser voices).
 */

import type { ChatMode } from '@/services/chat-storage';
import { chunkTextForDeviceSpeech } from '@/utils/voice-text';
import { speakNaturally, stopNaturalSpeech } from '@/services/natural-voice';

export function stopDeviceSpeech(): void {
  stopNaturalSpeech();
}

export async function speakDeviceSegments(segments: string[], mode: ChatMode = 'inner_ally'): Promise<void> {
  for (const segment of segments) {
    await speakNaturally(segment, mode);
  }
}

export async function speakAssistantReply(raw: string, mode: ChatMode): Promise<void> {
  const segments = chunkTextForDeviceSpeech(raw);
  await speakDeviceSegments(segments, mode);
}
