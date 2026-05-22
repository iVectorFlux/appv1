/**
 * Hands-free voice loop: spoken intro → listen → STT → chat → TTS → listen again.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { ChatMode } from '@/services/chat-storage';
import {
  audioUriToBase64,
  playVoiceSpeechResult,
  requestVoiceSpeech,
  requestVoiceTranscription,
} from '@/utils/voice-api';
import { stopDeviceSpeech } from '@/services/device-speech';

export type VoicePhase =
  | 'idle'
  | 'intro'
  | 'listening'
  | 'transcribing'
  | 'thinking'
  | 'speaking'
  | 'error';

type UseVoiceConversationArgs = {
  mode: ChatMode;
  enabled: boolean;
  introText: string;
  onUserTranscript: (text: string) => Promise<string | null>;
};

const DEFAULT_RECORDING_MIME =
  Platform.OS === 'web' ? 'audio/webm' : Platform.OS === 'ios' ? 'audio/m4a' : 'audio/mp4';

const MAX_LISTEN_MS = 22_000;
const SILENCE_END_MS = 2_000;
const MIN_SPEECH_BEFORE_SILENCE_MS = 1_000;
/** Metering / RMS below this counts as silence (platform-specific scales). */
const NATIVE_SILENCE_DB = -38;
const WEB_SILENCE_RMS = 0.014;

export function useVoiceConversation({
  mode,
  enabled,
  introText,
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
  const webAnalyserRef = useRef<{ ctx: AudioContext; interval: ReturnType<typeof setInterval> } | null>(
    null
  );
  const recordingMimeRef = useRef(DEFAULT_RECORDING_MIME);
  const listenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const listenStartedAtRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const processingRef = useRef(false);
  const unmountedRef = useRef(false);

  const clearListenTimers = useCallback(() => {
    if (listenTimerRef.current) {
      clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const setError = useCallback((message: string) => {
    sessionActiveRef.current = false;
    setPhase('error');
    setStatusDetail(message);
  }, []);

  const stopPlayback = useCallback(async () => {
    stopDeviceSpeech();
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
        if (unmountedRef.current || !sessionActiveRef.current) return;
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

  const speakText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPhase('speaking');
      const speech = await requestVoiceSpeech({ text: trimmed, mode });
      await playVoiceSpeechResult(speech, playWavChunks);
    },
    [mode, playWavChunks]
  );

  const stopWebAnalyser = useCallback(() => {
    if (webAnalyserRef.current) {
      clearInterval(webAnalyserRef.current.interval);
      void webAnalyserRef.current.ctx.close().catch(() => undefined);
      webAnalyserRef.current = null;
    }
  }, []);

  const scheduleSilenceEnd = useCallback(() => {
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = setTimeout(() => {
      if (heardSpeechRef.current) {
        void finishListeningRef.current?.();
      }
    }, SILENCE_END_MS);
  }, []);

  const onSpeechActivity = useCallback(() => {
    heardSpeechRef.current = true;
    if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    silenceTimerRef.current = null;
  }, []);

  const onSilenceActivity = useCallback(() => {
    if (!heardSpeechRef.current) return;
    if (Date.now() - listenStartedAtRef.current < MIN_SPEECH_BEFORE_SILENCE_MS) return;
    scheduleSilenceEnd();
  }, [scheduleSilenceEnd]);

  const startNativeRecording = useCallback(async () => {
    const perm = await Audio.requestPermissionsAsync();
    if (!perm.granted) {
      throw new Error('Microphone permission is required for voice chat.');
    }
    await configureAudioMode(true);
    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      ...Audio.RecordingOptionsPresets.HIGH_QUALITY,
      isMeteringEnabled: true,
    });
    recording.setProgressUpdateInterval(200);
    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording || status.metering == null) return;
      if (status.metering > NATIVE_SILENCE_DB) onSpeechActivity();
      else onSilenceActivity();
    });
    await recording.startAsync();
    recordingRef.current = recording;
  }, [configureAudioMode, onSilenceActivity, onSpeechActivity]);

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
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
      },
    });
    webStreamRef.current = stream;
    webChunksRef.current = [];

    const mimeType =
      typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : 'audio/mp4';
    recordingMimeRef.current = mimeType.split(';')[0] ?? DEFAULT_RECORDING_MIME;
    const recorder = new MediaRecorder(stream, { mimeType });
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) webChunksRef.current.push(e.data);
    };
    recorder.start(250);
    webRecorderRef.current = recorder;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);
    const interval = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      if (rms > WEB_SILENCE_RMS) onSpeechActivity();
      else onSilenceActivity();
    }, 200);
    webAnalyserRef.current = { ctx, interval };
  }, [onSilenceActivity, onSpeechActivity]);

  const stopWebRecording = useCallback(async (): Promise<string | null> => {
    stopWebAnalyser();
    const recorder = webRecorderRef.current;
    if (!recorder) return null;
    webRecorderRef.current = null;

    const blob = await new Promise<Blob>((resolve, reject) => {
      recorder.onstop = () => {
        const b = new Blob(webChunksRef.current, { type: recordingMimeRef.current });
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
  }, [stopWebAnalyser]);

  const finishListeningRef = useRef<(() => Promise<void>) | null>(null);

  const processRecording = useCallback(
    async (uri: string | null) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearListenTimers();

      if (!uri) {
        processingRef.current = false;
        if (sessionActiveRef.current) {
          setPhase('listening');
          setStatusDetail('Say something when you are ready.');
          void beginListenTurnRef.current?.();
        }
        return;
      }

      setPhase('transcribing');
      setStatusDetail(null);

      try {
        const mime = recordingMimeRef.current;
        const audioBase64 = await audioUriToBase64(uri, mime);
        if (Platform.OS === 'web' && uri.startsWith('blob:')) {
          URL.revokeObjectURL(uri);
        }

        const { text } = await requestVoiceTranscription({ audioBase64, mimeType: mime });
        if (!text.trim()) {
          processingRef.current = false;
          if (sessionActiveRef.current) {
            setStatusDetail('Did not catch that — listening again.');
            void beginListenTurnRef.current?.();
          }
          return;
        }

        setLastTranscript(text);
        setPhase('thinking');

        const reply = await onUserTranscript(text);
        if (!reply?.trim()) {
          processingRef.current = false;
          if (sessionActiveRef.current) void beginListenTurnRef.current?.();
          return;
        }

        await speakText(reply);
        processingRef.current = false;
        if (sessionActiveRef.current && !unmountedRef.current) {
          void beginListenTurnRef.current?.();
        }
      } catch (e) {
        processingRef.current = false;
        const msg = e instanceof Error ? e.message : 'Voice conversation failed.';
        setError(msg);
      }
    },
    [clearListenTimers, mode, onUserTranscript, setError, speakText]
  );

  finishListeningRef.current = async () => {
    if (processingRef.current) return;
    if (!recordingRef.current && !webRecorderRef.current) return;
    clearListenTimers();
    setPhase('transcribing');
    let uri: string | null = null;
    try {
      uri = Platform.OS === 'web' ? await stopWebRecording() : await stopNativeRecording();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Recording failed.';
      setError(msg);
      return;
    }
    await processRecording(uri);
  };

  const beginListenTurnRef = useRef<(() => Promise<void>) | null>(null);

  beginListenTurnRef.current = async () => {
    if (!sessionActiveRef.current || unmountedRef.current || processingRef.current) return;
    heardSpeechRef.current = false;
    listenStartedAtRef.current = Date.now();
    setStatusDetail(null);
    setPhase('listening');
    await stopPlayback();
    clearListenTimers();

    try {
      if (Platform.OS === 'web') {
        await startWebRecording();
      } else {
        await startNativeRecording();
      }
      listenTimerRef.current = setTimeout(() => {
        void finishListeningRef.current?.();
      }, MAX_LISTEN_MS);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start recording.';
      setError(msg);
    }
  };

  const startSession = useCallback(async () => {
    sessionActiveRef.current = true;
    processingRef.current = false;
    setLastTranscript(null);
    setStatusDetail(null);

    try {
      if (introText.trim()) {
        setPhase('intro');
        await speakText(introText);
      }
      if (!sessionActiveRef.current || unmountedRef.current) return;
      await beginListenTurnRef.current?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start voice chat.';
      setError(msg);
    }
  }, [introText, setError, speakText]);

  const endSession = useCallback(async () => {
    sessionActiveRef.current = false;
    processingRef.current = false;
    clearListenTimers();
    stopWebAnalyser();
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
    await stopPlayback();
    setPhase('idle');
    setStatusDetail(null);
  }, [clearListenTimers, configureAudioMode, stopPlayback, stopWebAnalyser]);

  const finishTurnEarly = useCallback(() => {
    if (phase === 'listening') void finishListeningRef.current?.();
  }, [phase]);

  const retrySession = useCallback(() => {
    void endSession().then(() => startSession());
  }, [endSession, startSession]);

  const reset = useCallback(() => {
    setLastTranscript(null);
    setStatusDetail(null);
    setPhase('idle');
  }, []);

  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
      void endSession();
    };
  }, [endSession]);

  useEffect(() => {
    if (enabled) {
      void startSession();
    } else {
      void endSession();
      reset();
    }
  }, [enabled, mode, introText]);

  return {
    phase,
    statusDetail,
    lastTranscript,
    isListening: phase === 'listening',
    isBusy:
      phase === 'intro' ||
      phase === 'transcribing' ||
      phase === 'thinking' ||
      phase === 'speaking',
    finishTurnEarly,
    retrySession,
    endSession,
    reset,
  };
}
