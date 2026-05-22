/**
 * Push-to-talk voice loop: record → Whisper STT → chat → Orpheus TTS playback.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { ChatMode } from '@/services/chat-storage';
import {
  audioUriToBase64,
  requestVoiceSpeech,
  requestVoiceTranscription,
} from '@/utils/voice-api';

export type VoicePhase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking' | 'error';

type UseVoiceConversationArgs = {
  mode: ChatMode;
  enabled: boolean;
  onUserTranscript: (text: string) => Promise<string | null>;
};

const RECORDING_MIME =
  Platform.OS === 'web' ? 'audio/webm' : Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

export function useVoiceConversation({
  mode,
  enabled,
  onUserTranscript,
}: UseVoiceConversationArgs) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const recordingRef = useRef<Audio.Recording | null>(null);
  const soundRef = useRef<Audio.Sound | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const unmountedRef = useRef(false);

  const setError = useCallback((message: string) => {
    setPhase('error');
    setStatusDetail(message);
  }, []);

  const stopPlayback = useCallback(async () => {
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch {
        /* ignore */
      }
      soundRef.current = null;
    }
  }, []);

  const configureAudioMode = useCallback(async (forRecording: boolean) => {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: forRecording,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  const playWavChunks = useCallback(
    async (chunks: string[]) => {
      await stopPlayback();
      await configureAudioMode(false);

      for (const chunk of chunks) {
        if (unmountedRef.current) return;
        const uri = `data:audio/wav;base64,${chunk}`;
        const { sound } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false, volume: 1 });
        soundRef.current = sound;
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => resolve(), 120_000);
          sound.setOnPlaybackStatusUpdate((status) => {
            if (!status.isLoaded) return;
            if (status.didJustFinish) {
              clearTimeout(timeout);
              resolve();
            }
          });
          sound.playAsync().catch(reject);
        });
        try {
          await sound.unloadAsync();
        } catch {
          /* ignore */
        }
        if (soundRef.current === sound) soundRef.current = null;
      }
    },
    [configureAudioMode, stopPlayback]
  );

  const startNativeRecording = useCallback(async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Microphone permission is required for voice chat.');
    }
    await configureAudioMode(true);
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();
    recordingRef.current = recording;
  }, [configureAudioMode]);

  const stopNativeRecording = useCallback(async (): Promise<string | null> => {
    const recording = recordingRef.current;
    if (!recording) return null;
    recordingRef.current = null;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      return null;
    }
    await configureAudioMode(false);
    return recording.getURI();
  }, [configureAudioMode]);

  const startWebRecording = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone is not available in this browser.');
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    webStreamRef.current = stream;
    webChunksRef.current = [];
    const mimeType =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) webChunksRef.current.push(e.data);
    };
    recorder.start();
    webRecorderRef.current = recorder;
  }, []);

  const stopWebRecording = useCallback(async (): Promise<string | null> => {
    const recorder = webRecorderRef.current;
    if (!recorder) return null;
    webRecorderRef.current = null;

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const b = new Blob(webChunksRef.current, { type: RECORDING_MIME });
        webChunksRef.current = [];
        resolve(b);
      };
      recorder.onerror = () => reject(new Error('Recording failed.'));
      try {
        recorder.stop();
      } catch (e) {
        reject(e instanceof Error ? e : new Error('Recording failed.'));
      }
    });

    webStreamRef.current?.getTracks().forEach((t) => t.stop());
    webStreamRef.current = null;

    return URL.createObjectURL(blob);
  }, []);

  const startListening = useCallback(async () => {
    if (phase === 'listening') return;
    setStatusDetail(null);
    setPhase('listening');
    await stopPlayback();
    try {
      if (Platform.OS === 'web') {
        await startWebRecording();
      } else {
        await startNativeRecording();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start recording.';
      setError(msg);
    }
  }, [phase, setError, startNativeRecording, startWebRecording, stopPlayback]);

  const stopListeningAndProcess = useCallback(async () => {
    if (phase !== 'listening') return;

    let uri: string | null = null;
    try {
      uri = Platform.OS === 'web' ? await stopWebRecording() : await stopNativeRecording();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Recording failed.';
      setError(msg);
      return;
    }

    if (!uri) {
      setPhase('idle');
      setStatusDetail('No audio captured. Hold the mic and try again.');
      return;
    }

    setPhase('transcribing');
    setStatusDetail('Understanding you…');

    try {
      const audioBase64 = await audioUriToBase64(uri, RECORDING_MIME);
      if (Platform.OS === 'web' && uri.startsWith('blob:')) {
        URL.revokeObjectURL(uri);
      }

      const { text } = await requestVoiceTranscription({ audioBase64, mimeType: RECORDING_MIME });
      if (!text.trim()) {
        setPhase('idle');
        setStatusDetail('Did not catch that. Try again.');
        return;
      }

      setLastTranscript(text);
      setPhase('thinking');
      setStatusDetail(null);

      const reply = await onUserTranscript(text);
      if (!reply?.trim()) {
        setPhase('idle');
        return;
      }

      setPhase('speaking');
      setStatusDetail(null);
      const { chunks } = await requestVoiceSpeech({ text: reply, mode });
      await playWavChunks(chunks);
      if (!unmountedRef.current) setPhase('idle');
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Voice conversation failed.';
      setError(msg);
    }
  }, [
    mode,
    onUserTranscript,
    phase,
    playWavChunks,
    setError,
    stopNativeRecording,
    stopWebRecording,
  ]);

  const cancelListening = useCallback(async () => {
    if (phase !== 'listening') return;
    try {
      if (Platform.OS === 'web') {
        webRecorderRef.current?.stop();
        webStreamRef.current?.getTracks().forEach((t) => t.stop());
      } else if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        recordingRef.current = null;
      }
    } catch {
      /* ignore */
    }
    await configureAudioMode(false);
    setPhase('idle');
    setStatusDetail(null);
  }, [configureAudioMode, phase]);

  const reset = useCallback(() => {
    setPhase('idle');
    setStatusDetail(null);
    setLastTranscript(null);
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      void stopPlayback();
      void cancelListening();
    };
  }, [cancelListening, stopPlayback]);

  useEffect(() => {
    if (!enabled) {
      void cancelListening();
      void stopPlayback();
      reset();
    }
  }, [cancelListening, enabled, reset, stopPlayback]);

  return {
    phase,
    statusDetail,
    lastTranscript,
    isListening: phase === 'listening',
    isBusy: phase === 'transcribing' || phase === 'thinking' || phase === 'speaking',
    startListening,
    stopListeningAndProcess,
    cancelListening,
    reset,
  };
}
