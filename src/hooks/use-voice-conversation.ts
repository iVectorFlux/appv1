/**
 * Hands-free voice loop: spoken intro → listen → STT → chat → TTS → listen again.
 * Ends your turn automatically after ~1.2s of silence (no tap).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import type { ChatMode } from '@/services/chat-storage';
import { audioUriToBase64, requestVoiceTranscription } from '@/utils/voice-api';
import { speakAssistantReply, stopDeviceSpeech } from '@/services/device-speech';

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

const MAX_LISTEN_MS = 25_000;
/** Poll interval for voice-activity detection */
const VAD_TICK_MS = 100;
/** ~1.2s of silence after speech → send to AI */
const SILENCE_TICKS_TO_END = 12;
const MIN_SPEECH_MS = 450;
const NATIVE_SPEECH_DB = -40;

export function useVoiceConversation({
  mode,
  enabled,
  introText,
  onUserTranscript,
}: UseVoiceConversationArgs) {
  const [phase, setPhase] = useState<VoicePhase>('idle');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [lastTranscript, setLastTranscript] = useState<string | null>(null);

  const phaseRef = useRef<VoicePhase>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const webRecorderRef = useRef<MediaRecorder | null>(null);
  const webChunksRef = useRef<Blob[]>([]);
  const webStreamRef = useRef<MediaStream | null>(null);
  const vadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingMimeRef = useRef(DEFAULT_RECORDING_MIME);
  const maxListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const listenStartedAtRef = useRef(0);
  const heardSpeechRef = useRef(false);
  const silenceTicksRef = useRef(0);
  const noiseFloorRef = useRef(0.008);
  const vadCalibratedRef = useRef(false);
  const sessionActiveRef = useRef(false);
  const processingRef = useRef(false);
  const unmountedRef = useRef(false);

  const setPhaseSafe = useCallback((p: VoicePhase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  const clearListenTimers = useCallback(() => {
    if (maxListenTimerRef.current) {
      clearTimeout(maxListenTimerRef.current);
      maxListenTimerRef.current = null;
    }
    if (vadIntervalRef.current) {
      clearInterval(vadIntervalRef.current);
      vadIntervalRef.current = null;
    }
  }, []);

  const setError = useCallback(
    (message: string) => {
      sessionActiveRef.current = false;
      setPhaseSafe('error');
      setStatusDetail(message);
    },
    [setPhaseSafe]
  );

  const stopMicCapture = useCallback(async (): Promise<string | null> => {
    clearListenTimers();

    if (Platform.OS === 'web') {
      if (vadIntervalRef.current) {
        clearInterval(vadIntervalRef.current);
        vadIntervalRef.current = null;
      }
      const recorder = webRecorderRef.current;
      webRecorderRef.current = null;
      webStreamRef.current?.getTracks().forEach((t) => t.stop());
      webStreamRef.current = null;

      if (!recorder || recorder.state === 'inactive') return null;

      const blob = await new Promise<Blob>((resolve, reject) => {
        recorder.onstop = () => {
          resolve(new Blob(webChunksRef.current, { type: recordingMimeRef.current }));
          webChunksRef.current = [];
        };
        recorder.onerror = () => reject(new Error('Recording failed.'));
        try {
          recorder.stop();
        } catch (e) {
          reject(e instanceof Error ? e : new Error('Recording failed.'));
        }
      });
      return URL.createObjectURL(blob);
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    if (!recording) return null;
    try {
      await recording.stopAndUnloadAsync();
    } catch {
      return null;
    }
    return recording.getURI();
  }, [clearListenTimers]);

  const stopPlayback = useCallback(async () => {
    stopDeviceSpeech();
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });
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

  const speakText = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      setPhaseSafe('speaking');
      await configureAudioMode(false);
      await speakAssistantReply(trimmed, mode);
    },
    [configureAudioMode, mode, setPhaseSafe]
  );

  const finishListeningRef = useRef<(() => Promise<void>) | null>(null);
  const beginListenTurnRef = useRef<(() => Promise<void>) | null>(null);

  const processRecording = useCallback(
    async (uri: string | null) => {
      if (!uri) {
        processingRef.current = false;
        if (sessionActiveRef.current) {
          setStatusDetail('Say something when you are ready.');
          void beginListenTurnRef.current?.();
        }
        return;
      }

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
        setPhaseSafe('thinking');
        setStatusDetail(null);

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
    [onUserTranscript, setError, setPhaseSafe, speakText]
  );

  finishListeningRef.current = async () => {
    if (processingRef.current) return;
    if (phaseRef.current !== 'listening') return;
    if (!recordingRef.current && !webRecorderRef.current) return;

    processingRef.current = true;
    heardSpeechRef.current = false;
    silenceTicksRef.current = 0;
    setPhaseSafe('transcribing');
    setStatusDetail(null);

    let uri: string | null = null;
    try {
      await configureAudioMode(false);
      uri = await stopMicCapture();
    } catch (e) {
      processingRef.current = false;
      const msg = e instanceof Error ? e.message : 'Recording failed.';
      setError(msg);
      return;
    }

    await processRecording(uri);
  };

  const handleVadSample = useCallback((isSpeech: boolean) => {
    if (phaseRef.current !== 'listening' || processingRef.current) return;

    if (isSpeech) {
      heardSpeechRef.current = true;
      silenceTicksRef.current = 0;
      return;
    }

    if (!heardSpeechRef.current) return;
    if (Date.now() - listenStartedAtRef.current < MIN_SPEECH_MS) return;

    silenceTicksRef.current += 1;
    if (silenceTicksRef.current >= SILENCE_TICKS_TO_END) {
      void finishListeningRef.current?.();
    }
  }, []);

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
    recording.setProgressUpdateInterval(VAD_TICK_MS);
    recording.setOnRecordingStatusUpdate((status) => {
      if (!status.isRecording || status.metering == null) return;
      handleVadSample(status.metering > NATIVE_SPEECH_DB);
    });
    await recording.startAsync();
    recordingRef.current = recording;
  }, [configureAudioMode, handleVadSample]);

  const startWebRecording = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Microphone is not available in this browser.');
    }

    vadCalibratedRef.current = false;
    noiseFloorRef.current = 0.008;

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
    recorder.start(200);
    webRecorderRef.current = recorder;

    const ctx = new AudioContext();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    source.connect(analyser);
    const data = new Uint8Array(analyser.fftSize);

    vadIntervalRef.current = setInterval(() => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);

      if (!vadCalibratedRef.current) {
        noiseFloorRef.current = Math.max(noiseFloorRef.current, rms);
        if (Date.now() - listenStartedAtRef.current > 500) {
          vadCalibratedRef.current = true;
          noiseFloorRef.current *= 1.35;
        }
      }

      const threshold = Math.max(noiseFloorRef.current * 2.8, 0.012);
      handleVadSample(rms > threshold);
    }, VAD_TICK_MS);
  }, [handleVadSample]);

  beginListenTurnRef.current = async () => {
    if (!sessionActiveRef.current || unmountedRef.current || processingRef.current) return;

    heardSpeechRef.current = false;
    silenceTicksRef.current = 0;
    vadCalibratedRef.current = false;
    listenStartedAtRef.current = Date.now();
    setStatusDetail(null);
    setPhaseSafe('listening');

    await stopPlayback();
    clearListenTimers();

    try {
      if (Platform.OS === 'web') {
        await startWebRecording();
      } else {
        await startNativeRecording();
      }
      maxListenTimerRef.current = setTimeout(() => {
        void finishListeningRef.current?.();
      }, MAX_LISTEN_MS);
    } catch (e) {
      processingRef.current = false;
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
        setPhaseSafe('intro');
        await speakText(introText);
      }
      if (!sessionActiveRef.current || unmountedRef.current) return;
      await beginListenTurnRef.current?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not start voice chat.';
      setError(msg);
    }
  }, [introText, setError, setPhaseSafe, speakText]);

  const endSession = useCallback(async () => {
    sessionActiveRef.current = false;
    processingRef.current = false;
    clearListenTimers();
    try {
      await stopMicCapture();
    } catch {
      /* ignore */
    }
    await configureAudioMode(false);
    await stopPlayback();
    setPhaseSafe('idle');
    setStatusDetail(null);
  }, [clearListenTimers, configureAudioMode, setPhaseSafe, stopMicCapture, stopPlayback]);

  const retrySession = useCallback(() => {
    void endSession().then(() => startSession());
  }, [endSession, startSession]);

  const reset = useCallback(() => {
    setLastTranscript(null);
    setStatusDetail(null);
    setPhaseSafe('idle');
  }, [setPhaseSafe]);

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
    retrySession,
    endSession,
    reset,
  };
}
