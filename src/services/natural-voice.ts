/**
 * Best available on-device English voice (free, OS/browser built-in).
 * Picks natural/neural voices when present; no cloud TTS required.
 */

import { Platform } from 'react-native';
import * as Speech from 'expo-speech';
import type { ChatMode } from '@/services/chat-storage';

const PREFERRED_NATIVE_HINTS = [
  'samantha',
  'nicky',
  'karen',
  'daniel',
  'moira',
  'tessa',
  'google us english',
  'en-us',
];

let webVoiceReady: Promise<void> | null = null;
let cachedWebVoiceName: string | null = null;

function scoreVoiceName(name: string, lang: string): number {
  const n = name.toLowerCase();
  const l = lang.toLowerCase();
  let score = 0;
  if (l.startsWith('en')) score += 10;
  for (const hint of PREFERRED_NATIVE_HINTS) {
    if (n.includes(hint)) score += 8;
  }
  if (n.includes('neural') || n.includes('natural') || n.includes('premium')) score += 14;
  if (n.includes('google')) score += 6;
  if (n.includes('microsoft')) score += 4;
  if (n.includes('compact') || n.includes('espeak') || n.includes('fred')) score -= 20;
  return score;
}

function ensureWebVoices(): Promise<void> {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.speechSynthesis) {
    return Promise.resolve();
  }
  if (webVoiceReady) return webVoiceReady;
  webVoiceReady = new Promise((resolve) => {
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const best = [...voices].sort(
        (a, b) => scoreVoiceName(b.name, b.lang) - scoreVoiceName(a.name, a.lang)
      )[0];
      if (best) cachedWebVoiceName = best.name;
    };
    pick();
    if (window.speechSynthesis.getVoices().length > 0) {
      resolve();
      return;
    }
    window.speechSynthesis.onvoiceschanged = () => {
      pick();
      resolve();
    };
    setTimeout(() => {
      pick();
      resolve();
    }, 400);
  });
  return webVoiceReady;
}

function speechRates(mode: ChatMode): { rate: number; pitch: number } {
  if (mode === 'inner_ally') {
    return Platform.OS === 'web'
      ? { rate: 0.9, pitch: 1.04 }
      : { rate: Platform.OS === 'ios' ? 0.46 : 0.88, pitch: 1.02 };
  }
  return Platform.OS === 'web'
    ? { rate: 0.94, pitch: 1 }
    : { rate: Platform.OS === 'ios' ? 0.5 : 0.92, pitch: 1 };
}

function speakWeb(text: string, mode: ChatMode): Promise<void> {
  return ensureWebVoices().then(
    () =>
      new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !window.speechSynthesis) {
          resolve();
          return;
        }
        const { rate, pitch } = speechRates(mode);
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'en-US';
        utter.rate = rate;
        utter.pitch = pitch;
        const voices = window.speechSynthesis.getVoices();
        if (cachedWebVoiceName) {
          const v = voices.find((x) => x.name === cachedWebVoiceName);
          if (v) utter.voice = v;
        }
        utter.onend = () => resolve();
        utter.onerror = () => reject(new Error('Speech failed'));
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utter);
      })
  );
}

function speakExpo(text: string, mode: ChatMode): Promise<void> {
  const { rate, pitch } = speechRates(mode);
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: 'en-US',
      rate,
      pitch,
      onDone: () => resolve(),
      onStopped: () => resolve(),
      onError: (message) =>
        reject(new Error(typeof message === 'string' ? message : 'Speech failed')),
    });
  });
}

export function stopNaturalSpeech(): void {
  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  Speech.stop();
}

export function speakNaturally(text: string, mode: ChatMode): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return Promise.resolve();
  if (Platform.OS === 'web') return speakWeb(trimmed, mode);
  return speakExpo(trimmed, mode);
}
