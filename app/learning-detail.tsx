/**
 * Learning Detail Screen
 * 
 * Play audio podcasts or video lessons for EQ skills.
 * Deep dive content for each dimension.
 * 
 * Video uses expo-av on all platforms (renders HTML5 video on web).
 * Web audio still uses a hidden HTML audio element for reliable playback.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
  AppState,
  type AppStateStatus,
} from 'react-native';
import { Redirect, useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Video, Audio, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { getModuleById, DIMENSION_INFO } from '@/data/learning-content';
import type { LearningModule } from '@/data/learning-content';
import { useAuthStore } from '@/stores/auth-store';
import {
  recordLastAccessed,
  recordVideoCompleted,
  recordAudioCompleted,
} from '@/services/learning-progress';
import {
  isIntroEpisodeTitle,
  resolveDetailModuleFromCatalogId,
  fetchLearningEpisodes,
} from '@/services/learning-content-catalog';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  recordEpisodeLastAccessed,
  recordEpisodeVideoCompleted,
  recordEpisodeAudioCompleted,
  recordEpisodeVideoProgress,
  recordEpisodeAudioProgress,
  saveEpisodePlaybackPosition,
  resetEpisodePlaybackPosition,
  formatPlaybackSeconds,
  fetchUserLearningContentProgress,
} from '@/services/learning-content-progress';
import { getEQScores } from '@/services/eq-storage';
import { buildSequencedCatalog, type SequencedEpisode } from '@/services/learning-sequence';
import { getCurriculumGuide } from '@/data/eq-curriculum';
import { EnterpriseShell } from '@/components/layout/desktop-sidebar';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/shadcn-primitives';
import { buildAudioProxyUrl } from '@/utils/vercel-api';

type MediaMode = 'video' | 'audio';

/** 16:9 landscape player; size derived from screen + safe area (see computeVideoPlayerLayout). */
const VIDEO_ASPECT_W = 16;
const VIDEO_ASPECT_H = 9;

function computeVideoPlayerLayout(
  windowWidth: number,
  windowHeight: number,
  horizontalPaddingTotal: number,
  safeTop: number,
  safeBottom: number
): { width: number; height: number } {
  const innerMaxW = Math.max(200, windowWidth - horizontalPaddingTotal);
  /** Cap width on tablets / desktop web so the player does not dominate the viewport */
  const availW = Math.min(innerMaxW, 720);
  const viewportH = Math.max(320, windowHeight - safeTop - safeBottom);
  /** Leave room for header, tabs, and scroll content below the player */
  const maxH = Math.min(viewportH * 0.5, viewportH - 140);

  let w = availW;
  let h = (w * VIDEO_ASPECT_H) / VIDEO_ASPECT_W;
  if (h > maxH) {
    h = maxH;
    w = (h * VIDEO_ASPECT_W) / VIDEO_ASPECT_H;
  }
  if (w > innerMaxW) {
    w = innerMaxW;
    h = (w * VIDEO_ASPECT_H) / VIDEO_ASPECT_W;
  }
  return { width: Math.round(w), height: Math.round(Math.max(160, h)) };
}

export default function LearningDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    mode?: string | string[];
    restart?: string | string[];
    returnTo?: string | string[];
  }>();
  const colors = useColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isDesktop = useWebLaptopLayout();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const mediaHorizontalPaddingTotal = Spacing.lg * 2;
  const effectivePlayerAvailW = isDesktop
    ? Math.max(360, Math.min(680, Math.round((windowWidth - 248 - 64) * 0.54)))
    : windowWidth;
  const { width: videoWidth, height: videoHeight } = computeVideoPlayerLayout(
    effectivePlayerAvailW,
    windowHeight,
    mediaHorizontalPaddingTotal,
    insets.top,
    insets.bottom
  );

  const [module, setModule] = useState<LearningModule | null>(null);
  /** When set, progress is stored in learning_content_progress (DB catalog). */
  const [catalogEpisodeKey, setCatalogEpisodeKey] = useState<string | null>(null);
  const [detailLoading, setDetailLoading] = useState(true);
  const [mediaMode, setMediaMode] = useState<MediaMode>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoUseProxyFallback, setVideoUseProxyFallback] = useState(false);
  const [readingSkipped, setReadingSkipped] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(false);
  const [markingComplete, setMarkingComplete] = useState(false);
  const [resumedBannerSeconds, setResumedBannerSeconds] = useState<Record<'video' | 'audio', number>>({
    video: 0,
    audio: 0,
  });
  const [sequenceGate, setSequenceGate] = useState<{
    locked: boolean;
    lockedReason: string | null;
    sequenceNumber: number | null;
    prevEpisode: SequencedEpisode | null;
    nextEpisode: SequencedEpisode | null;
    nextUnlockedRouteId: string | null;
  }>({
    locked: false,
    lockedReason: null,
    sequenceNumber: null,
    prevEpisode: null,
    nextEpisode: null,
    nextUnlockedRouteId: null,
  });
  const lastVideoPctReportedRef = useRef(0);
  const lastAudioPctReportedRef = useRef(0);
  const lastVideoSavedAtRef = useRef(0);
  const lastAudioSavedAtRef = useRef(0);
  const pendingVideoSeekSecRef = useRef(0);
  const pendingAudioSeekSecRef = useRef(0);
  const liveProgressMsRef = useRef(0);
  const liveDurationMsRef = useRef(0);
  const activeEpisodeKeyRef = useRef<string | null>(null);
  const activeMediaModeRef = useRef<MediaMode>('video');
  const scrollViewRef = useRef<ScrollView | null>(null);
  /** Bumps when screen refocuses or app returns foreground - remounts native <Video> to recover stuck decoders. */
  const [videoMountNonce, setVideoMountNonce] = useState(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  /** When the user taps play before the media element is ready, we queue it here. */
  const pendingPlayRef = useRef(false);

  // expo-av ref for native platforms
  const videoRef = useRef<Video>(null);
  // native audio ref
  const audioRef = useRef<Audio.Sound | null>(null);
  // Web: direct HTML element refs - bypassing expo-av shim which has broken web wiring
  const webVideoRef = useRef<HTMLVideoElement | null>(null);
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    activeEpisodeKeyRef.current = catalogEpisodeKey;
  }, [catalogEpisodeKey]);

  useEffect(() => {
    activeMediaModeRef.current = mediaMode;
  }, [mediaMode]);

  const flushPlaybackPosition = useCallback((kindOverride?: MediaMode) => {
    const uid = useAuthStore.getState().user?.id;
    const epKey = activeEpisodeKeyRef.current;
    const kind = kindOverride ?? activeMediaModeRef.current;
    if (!uid || !epKey) return;

    let posSec = liveProgressMsRef.current / 1000;
    let durSec = liveDurationMsRef.current / 1000;
    if (Platform.OS === 'web') {
      const el = kind === 'video' ? webVideoRef.current : webAudioRef.current;
      if (el && !Number.isNaN(el.currentTime) && el.currentTime > 0) {
        posSec = el.currentTime;
      }
      if (el && !Number.isNaN(el.duration) && el.duration > 0) {
        durSec = el.duration;
      }
    }
    if (posSec >= 1) {
      void saveEpisodePlaybackPosition(uid, epKey, kind, posSec, durSec);
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    const onPageHide = () => flushPlaybackPosition();
    window.addEventListener('pagehide', onPageHide);
    return () => window.removeEventListener('pagehide', onPageHide);
  }, [flushPlaybackPosition]);

  useEffect(() => {
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
    const requestedModeRaw = Array.isArray(params.mode) ? params.mode[0] : params.mode;
    const shouldRestart = (Array.isArray(params.restart) ? params.restart[0] : params.restart) === '1';

    if (!id) {
      setDetailLoading(false);
      setModule(null);
      setCatalogEpisodeKey(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setCatalogEpisodeKey(null);
    (async () => {
      const fromCatalog = await resolveDetailModuleFromCatalogId(id);
      if (cancelled) return;
      let startMode: MediaMode = 'video';
      if (fromCatalog) {
        startMode =
          requestedModeRaw === 'audio' && fromCatalog.module.audioUrl
            ? 'audio'
            : requestedModeRaw === 'video' && fromCatalog.module.videoUrl
              ? 'video'
              : fromCatalog.module.videoUrl
                ? 'video'
                : 'audio';
        setModule(fromCatalog.module);
        setCatalogEpisodeKey(fromCatalog.episodeKey);
        activeEpisodeKeyRef.current = fromCatalog.episodeKey;
        setMediaMode(startMode);
      } else {
        const found = getModuleById(id);
        startMode =
          requestedModeRaw === 'audio' && found?.audioUrl
            ? 'audio'
            : found?.videoUrl
              ? 'video'
              : 'audio';
        setModule(found ?? null);
        setCatalogEpisodeKey(null);
        activeEpisodeKeyRef.current = null;
        setMediaMode(startMode);
      }
      setIsLoading(startMode === 'video' && Platform.OS !== 'web');
      setVideoUseProxyFallback(false);
      setError(null);
      setProgress(0);
      setDuration(0);
      liveProgressMsRef.current = 0;
      liveDurationMsRef.current = 0;
      setIsPlaying(false);
      setReadingSkipped(false);
      lastVideoPctReportedRef.current = 0;
      lastAudioPctReportedRef.current = 0;
      lastVideoSavedAtRef.current = 0;
      lastAudioSavedAtRef.current = 0;
      pendingVideoSeekSecRef.current = 0;
      pendingAudioSeekSecRef.current = 0;
      setResumedBannerSeconds({ video: 0, audio: 0 });
      pendingPlayRef.current = false;

      const resolvedKey = fromCatalog?.episodeKey ?? null;
      const uid = useAuthStore.getState().user?.id;
      const progressMap = uid ? await fetchUserLearningContentProgress(uid) : {};
      if (cancelled) return;

      if (resolvedKey && uid) {
        const savedRow = progressMap[resolvedKey];
        if (shouldRestart) {
          const restartKind: MediaMode = startMode === 'audio' ? 'audio' : 'video';
          await resetEpisodePlaybackPosition(uid, resolvedKey, restartKind);
          pendingVideoSeekSecRef.current = restartKind === 'video' ? 0 : (savedRow?.videoPositionSeconds ?? 0);
          pendingAudioSeekSecRef.current = restartKind === 'audio' ? 0 : (savedRow?.audioPositionSeconds ?? 0);
          setResumedBannerSeconds({
            video: pendingVideoSeekSecRef.current >= 3 ? pendingVideoSeekSecRef.current : 0,
            audio: pendingAudioSeekSecRef.current >= 3 ? pendingAudioSeekSecRef.current : 0,
          });
        } else {
          const savedVidSec = savedRow?.videoPositionSeconds ?? 0;
          const savedAudSec = savedRow?.audioPositionSeconds ?? 0;
          pendingVideoSeekSecRef.current = savedVidSec >= 3 ? savedVidSec : 0;
          pendingAudioSeekSecRef.current = savedAudSec >= 3 ? savedAudSec : 0;
          setResumedBannerSeconds({
            video: savedVidSec >= 3 ? savedVidSec : 0,
            audio: savedAudSec >= 3 ? savedAudSec : 0,
          });
          const activeSec = startMode === 'video' ? savedVidSec : savedAudSec;
          if (activeSec >= 3) {
            setProgress(activeSec * 1000);
            liveProgressMsRef.current = activeSec * 1000;
          }
        }
      }

      // Evaluate adaptive sequence gate and previous/next lesson links for B2B curriculum
      if (resolvedKey && fromCatalog?.module.catalogEqType === 'B2B') {
        try {
          const [allEps, eqScores] = await Promise.all([
            fetchLearningEpisodes('en'),
            uid ? getEQScores(uid) : Promise.resolve([]),
          ]);
          if (cancelled) return;
          const b2bEps = allEps.filter((e) => e.eqType === 'B2B');
          const latestScore = eqScores.length > 0 ? Math.round(eqScores[0]!.overallScore) : null;
          const seq = buildSequencedCatalog(b2bEps, progressMap, latestScore);
          const idx = seq.items.findIndex((item) => item.episode.episodeKey === resolvedKey);
          const cur = idx >= 0 ? seq.items[idx]! : null;
          setLessonCompleted(Boolean(cur?.completed));
          setSequenceGate({
            locked: cur ? !cur.unlocked : false,
            lockedReason: cur?.lockedReason ?? null,
            sequenceNumber: cur?.sequenceNumber ?? null,
            prevEpisode: idx > 0 ? seq.items[idx - 1]! : null,
            nextEpisode: idx >= 0 && idx + 1 < seq.items.length ? seq.items[idx + 1]! : null,
            nextUnlockedRouteId: seq.nextUnlockedRouteId,
          });
        } catch {
          setSequenceGate({
            locked: false,
            lockedReason: null,
            sequenceNumber: null,
            prevEpisode: null,
            nextEpisode: null,
            nextUnlockedRouteId: null,
          });
        }
      } else {
        setLessonCompleted(false);
        setSequenceGate({
          locked: false,
          lockedReason: null,
          sequenceNumber: null,
          prevEpisode: null,
          nextEpisode: null,
          nextUnlockedRouteId: null,
        });
      }
      setDetailLoading(false);
    })();
    return () => {
      flushPlaybackPosition();
      pendingPlayRef.current = false;
      if (Platform.OS === 'web') {
        if (webAudioRef.current) {
          webAudioRef.current.pause();
          if (webAudioRef.current.parentNode) {
            webAudioRef.current.parentNode.removeChild(webAudioRef.current);
          }
          webAudioRef.current = null;
        }
        if (webVideoRef.current) {
          webVideoRef.current.pause();
          webVideoRef.current = null;
        }
      }
      if (Platform.OS !== 'web' && audioRef.current) {
        audioRef.current.unloadAsync().catch(() => {});
        audioRef.current = null;
      }
    };
  }, [params.id, params.mode, params.restart, flushPlaybackPosition]);

  // Native: routing + expo-av often stalls the first decoder attach; remount on focus / app resume fixes “blank until I background the app”.
  useEffect(() => {
    if (Platform.OS === 'web') return;
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      // Only remount native <Video> to recover stuck hardware decoders; web <video> must stay mounted.
      if (Platform.OS !== 'web') {
        setVideoMountNonce((n) => n + 1);
      }
      return () => {
        flushPlaybackPosition();
        if (Platform.OS === 'web') {
          webVideoRef.current?.pause();
        } else {
          videoRef.current?.pauseAsync().catch(() => {});
        }
      };
    }, [flushPlaybackPosition])
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      const prev = appStateRef.current;
      if (
        Platform.OS !== 'web' &&
        (prev === 'background' || prev === 'inactive') &&
        next === 'active' &&
        mediaMode === 'video'
      ) {
        setVideoMountNonce((n) => n + 1);
      }
      appStateRef.current = next;
    });
    return () => sub.remove();
  }, [mediaMode]);

  // Native: eagerly load audio when the lesson starts in audio mode
  useEffect(() => {
    if (Platform.OS === 'web') return;
    if (mediaMode !== 'audio' || !module?.audioUrl?.trim()) return;
    if (audioRef.current) return; // already loaded from a previous switchToAudio

    let cancelled = false;
    const url = module.audioUrl.trim();
    setIsLoading(true);

    (async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: url },
          { shouldPlay: false },
          handlePlaybackStatusUpdate
        );
        if (cancelled) {
          sound.unloadAsync().catch(() => {});
        } else {
          audioRef.current = sound;
        }
      } catch {
        if (!cancelled) {
          setError('Unable to load audio. Please try again.');
          setIsLoading(false);
        }
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.audioUrl, mediaMode]);

  // Track last accessed when module is loaded (authenticated user)
  useEffect(() => {
    if (!module || !user?.id) return;
    if (catalogEpisodeKey) {
      recordEpisodeLastAccessed(user.id, catalogEpisodeKey).catch(() => {});
    } else {
      recordLastAccessed(user.id, module.id).catch(() => {});
    }
  }, [module?.id, user?.id, catalogEpisodeKey]); // eslint-disable-line react-hooks/exhaustive-deps -- record once per lesson id

  const reportMediaProgress = (kind: 'video' | 'audio', posMs: number, durMs: number) => {
    liveProgressMsRef.current = posMs;
    if (durMs > 0) liveDurationMsRef.current = durMs;

    if (!module?.id || !user?.id || !durMs || durMs <= 0) return;
    const pct = Math.min(100, Math.round((posMs / durMs) * 100));
    const ref = kind === 'video' ? lastVideoPctReportedRef : lastAudioPctReportedRef;
    const savedAtRef = kind === 'video' ? lastVideoSavedAtRef : lastAudioSavedAtRef;
    const now = Date.now();

    if (catalogEpisodeKey && posMs >= 2000 && now - savedAtRef.current >= 4000) {
      savedAtRef.current = now;
      saveEpisodePlaybackPosition(user.id, catalogEpisodeKey, kind, posMs / 1000, durMs / 1000).catch(
        () => {}
      );
    }

    if (pct >= ref.current + 15 || (pct >= 85 && ref.current < 85)) {
      ref.current = pct;
      if (catalogEpisodeKey) {
        if (kind === 'video') recordEpisodeVideoProgress(user.id, catalogEpisodeKey, pct).catch(() => {});
        else recordEpisodeAudioProgress(user.id, catalogEpisodeKey, pct).catch(() => {});
      }
      if (pct >= 85) {
        setLessonCompleted(true);
      }
    }
  };

  const handleRestartMedia = async () => {
    const kind: 'video' | 'audio' = mediaMode === 'audio' ? 'audio' : 'video';
    setProgress(0);
    liveProgressMsRef.current = 0;
    if (kind === 'video') {
      pendingVideoSeekSecRef.current = 0;
      setResumedBannerSeconds((prev) => ({ ...prev, video: 0 }));
      if (Platform.OS === 'web' && webVideoRef.current) {
        webVideoRef.current.currentTime = 0;
        webVideoRef.current.play().catch(() => {});
      } else if (videoRef.current) {
        await videoRef.current.setPositionAsync(0).catch(() => {});
        await videoRef.current.playAsync().catch(() => {});
      }
    } else {
      pendingAudioSeekSecRef.current = 0;
      setResumedBannerSeconds((prev) => ({ ...prev, audio: 0 }));
      if (Platform.OS === 'web' && webAudioRef.current) {
        webAudioRef.current.currentTime = 0;
        webAudioRef.current.play().catch(() => {});
      } else if (audioRef.current) {
        await audioRef.current.setPositionAsync(0).catch(() => {});
        await audioRef.current.playAsync().catch(() => {});
      }
    }
    if (user?.id && catalogEpisodeKey) {
      await resetEpisodePlaybackPosition(user.id, catalogEpisodeKey, kind).catch(() => {});
    }
  };

  const seekAudioBySeconds = async (deltaSec: number) => {
    if (Platform.OS === 'web' && webAudioRef.current) {
      const el = webAudioRef.current;
      const dur = !Number.isNaN(el.duration) && el.duration > 0 ? el.duration : duration / 1000;
      const nextSec = Math.max(0, Math.min(dur > 0 ? dur : el.currentTime + deltaSec, el.currentTime + deltaSec));
      el.currentTime = nextSec;
      setProgress(nextSec * 1000);
      liveProgressMsRef.current = nextSec * 1000;
      flushPlaybackPosition('audio');
    } else if (audioRef.current) {
      const nextMs = Math.max(0, Math.min(duration > 0 ? duration : progress + deltaSec * 1000, progress + deltaSec * 1000));
      await audioRef.current.setPositionAsync(nextMs).catch(() => {});
      setProgress(nextMs);
      liveProgressMsRef.current = nextMs;
      flushPlaybackPosition('audio');
    }
  };

  const handleMarkLessonComplete = async () => {
    if (!module?.id || !user?.id || markingComplete) return;
    setMarkingComplete(true);
    try {
      if (mediaMode === 'video') {
        if (catalogEpisodeKey) await recordEpisodeVideoCompleted(user.id, catalogEpisodeKey);
        else await recordVideoCompleted(user.id, module.id);
      } else {
        if (catalogEpisodeKey) await recordEpisodeAudioCompleted(user.id, catalogEpisodeKey);
        else await recordAudioCompleted(user.id, module.id);
      }
      setLessonCompleted(true);
    } finally {
      setMarkingComplete(false);
    }
  };

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    liveProgressMsRef.current = 0;
    pendingVideoSeekSecRef.current = 0;
    setResumedBannerSeconds((prev) => ({ ...prev, video: 0 }));
    setLessonCompleted(true);
    if (module?.id && user?.id) {
      if (catalogEpisodeKey) recordEpisodeVideoCompleted(user.id, catalogEpisodeKey).catch(() => {});
      else recordVideoCompleted(user.id, module.id).catch(() => {});
    }
  };

  const handleBack = async () => {
    flushPlaybackPosition();
    if (Platform.OS === 'web') {
      webVideoRef.current?.pause();
      webAudioRef.current?.pause();
    } else {
      await videoRef.current?.pauseAsync().catch(() => {});
      await audioRef.current?.pauseAsync().catch(() => {});
    }
    
    const ret = params.returnTo;
    const r = Array.isArray(ret) ? ret[0] : ret;
    if (r === 'chat') {
      router.replace('/chat');
      return;
    }
    if (r === 'assist') {
      router.replace('/(tabs)/companion');
      return;
    }
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/learn');
    }
  };

  const handlePlaybackStatusUpdate = (status: AVPlaybackStatus) => {
    if (status.isLoaded) {
      setIsLoading(false);
      setIsPlaying(status.isPlaying);

      // Apply pending resume position once media duration is known on native
      const durMs = status.durationMillis || 0;
      if (durMs > 3000) {
        if (mediaMode === 'video' && pendingVideoSeekSecRef.current >= 3) {
          const targetMs = Math.min(pendingVideoSeekSecRef.current * 1000, durMs - 2000);
          pendingVideoSeekSecRef.current = 0;
          if (targetMs > 1000) {
            videoRef.current?.setPositionAsync(targetMs).catch(() => {});
            setProgress(targetMs);
            liveProgressMsRef.current = targetMs;
          }
        } else if (mediaMode === 'audio' && pendingAudioSeekSecRef.current >= 3) {
          const targetMs = Math.min(pendingAudioSeekSecRef.current * 1000, durMs - 2000);
          pendingAudioSeekSecRef.current = 0;
          if (targetMs > 1000) {
            audioRef.current?.setPositionAsync(targetMs).catch(() => {});
            setProgress(targetMs);
            liveProgressMsRef.current = targetMs;
          }
        }
      }

      setProgress(status.positionMillis);
      setDuration(durMs);
      if (durMs) {
        reportMediaProgress(mediaMode, status.positionMillis, durMs);
      }
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
        liveProgressMsRef.current = 0;
        setLessonCompleted(true);
        if (module?.id && user?.id) {
          if (mediaMode === 'video') {
            pendingVideoSeekSecRef.current = 0;
            setResumedBannerSeconds((prev) => ({ ...prev, video: 0 }));
            if (catalogEpisodeKey) recordEpisodeVideoCompleted(user.id, catalogEpisodeKey).catch(() => {});
            else recordVideoCompleted(user.id, module.id).catch(() => {});
          } else {
            pendingAudioSeekSecRef.current = 0;
            setResumedBannerSeconds((prev) => ({ ...prev, audio: 0 }));
            if (catalogEpisodeKey) recordEpisodeAudioCompleted(user.id, catalogEpisodeKey).catch(() => {});
            else recordAudioCompleted(user.id, module.id).catch(() => {});
          }
        }
      }
    } else if (status.error) {
      setError('Unable to load media. Please check your connection.');
      setIsLoading(false);
    }
  };

  // Web audio: create and append to DOM so play() works (browsers often require media in DOM).
  // Called eagerly on mount AND on switchToAudio so the element is warm when the user taps play.
  const setupWebAudio = (audioUrl: string) => {
    if (Platform.OS !== 'web') return;
    if (webAudioRef.current) {
      webAudioRef.current.pause();
      if (webAudioRef.current.parentNode) {
        webAudioRef.current.parentNode.removeChild(webAudioRef.current);
      }
      webAudioRef.current = null;
    }
    const audio = document.createElement('audio');
    audio.dataset.sourceUrl = audioUrl;
    audio.src = buildAudioProxyUrl(audioUrl);
    audio.preload = 'metadata';
    // The proxy adds CORS + Range headers; keep anonymous so browsers expose metadata consistently.
    audio.crossOrigin = 'anonymous';
    audio.style.position = 'fixed';
    audio.style.left = '-9999px';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    const clearLoadingAndHonorPlay = () => {
      if (!Number.isNaN(audio.duration) && audio.duration > 0) {
        const durMs = audio.duration * 1000;
        setDuration(durMs);
        liveDurationMsRef.current = durMs;
        if (pendingAudioSeekSecRef.current >= 3 && audio.duration > 3) {
          const targetSec = Math.min(pendingAudioSeekSecRef.current, Math.max(0, audio.duration - 2));
          pendingAudioSeekSecRef.current = 0;
          if (targetSec > 1) {
            audio.currentTime = targetSec;
            setProgress(targetSec * 1000);
            liveProgressMsRef.current = targetSec * 1000;
          }
        }
      }
      setIsLoading(false);
      if (pendingPlayRef.current) {
        pendingPlayRef.current = false;
        audio.play().catch((err) => {
          setError('Audio didn\u2019t start. Tap Play again or try the Video tab.');
          console.error('Audio deferred-play error:', err);
        });
      }
    };
    audio.onloadedmetadata = clearLoadingAndHonorPlay;
    audio.onloadeddata = clearLoadingAndHonorPlay;
    audio.ontimeupdate = () => {
      const posMs = audio.currentTime * 1000;
      const durMs = !Number.isNaN(audio.duration) && audio.duration > 0 ? audio.duration * 1000 : 0;
      if (durMs > 0) setDuration(durMs);
      setProgress(posMs);
      reportMediaProgress('audio', posMs, durMs);
    };
    audio.onplay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    audio.onpause = () => {
      setIsPlaying(false);
      flushPlaybackPosition('audio');
    };
    audio.onwaiting = () => setIsLoading(true);
    audio.onplaying = () => setIsLoading(false);
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
      liveProgressMsRef.current = 0;
      pendingAudioSeekSecRef.current = 0;
      setResumedBannerSeconds((prev) => ({ ...prev, audio: 0 }));
      setLessonCompleted(true);
      if (module?.id && user?.id) {
        if (catalogEpisodeKey) recordEpisodeAudioCompleted(user.id, catalogEpisodeKey).catch(() => {});
        else recordAudioCompleted(user.id, module.id).catch(() => {});
      }
    };
    audio.onerror = () => {
      pendingPlayRef.current = false;
      setError('Unable to load audio. Please try again.');
      setIsLoading(false);
    };
    // When the element becomes playable, honor any queued play intent
    audio.oncanplay = clearLoadingAndHonorPlay;
    document.body.appendChild(audio);
    audio.load();
    webAudioRef.current = audio;
  };

  // Eagerly pre-create the web audio element when the module loads (so it's warm by first tap)
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    if (!module?.audioUrl?.trim()) return;
    // Only pre-create if not already set up (switchToAudio also calls setupWebAudio)
    if (!webAudioRef.current) {
      setupWebAudio(module.audioUrl.trim());
    }
    return () => {
      if (webAudioRef.current) {
        webAudioRef.current.pause();
        if (webAudioRef.current.parentNode) {
          webAudioRef.current.parentNode.removeChild(webAudioRef.current);
        }
        webAudioRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [module?.audioUrl]);

  const togglePlayPause = async () => {
    if (mediaMode === 'video') {
      if (Platform.OS === 'web' && webVideoRef.current) {
        try {
          if (isPlaying) {
            webVideoRef.current.pause();
          } else {
            // If the video isn't ready yet, wait for it
            if (webVideoRef.current.readyState < 2) {
              setIsLoading(true);
              await new Promise<void>((resolve) => {
                const el = webVideoRef.current;
                if (!el) { resolve(); return; }
                const handler = () => {
                  el.removeEventListener('canplay', handler);
                  resolve();
                };
                el.addEventListener('canplay', handler);
                // Safety timeout - don't wait forever
                setTimeout(() => { el.removeEventListener('canplay', handler); resolve(); }, 8000);
              });
              setIsLoading(false);
            }
            await webVideoRef.current.play();
          }
        } catch (err) {
          setError('Unable to play video. Try again.');
          console.error('Video play error:', err);
        }
      } else if (videoRef.current) {
        try {
          if (isPlaying) {
            await videoRef.current.pauseAsync();
          } else {
            await videoRef.current.playAsync();
          }
        } catch (err) {
          setError('Unable to play video.');
          console.error('Video play error:', err);
        }
      }
    } else if (mediaMode === 'audio') {
      if (Platform.OS === 'web') {
        // Ensure audio element exists (should already be pre-created, but guard just in case)
        if (!webAudioRef.current && module?.audioUrl?.trim()) {
          setupWebAudio(module.audioUrl.trim());
        }
        if (webAudioRef.current) {
          if (isPlaying) {
            pendingPlayRef.current = false;
            webAudioRef.current.pause();
          } else {
            // If element is ready (readyState >= 2 = HAVE_CURRENT_DATA), play immediately.
            // Otherwise queue play intent - oncanplay will fire it.
            if (webAudioRef.current.readyState >= 2) {
              webAudioRef.current.play().catch((err) => {
                setError('Audio didn\u2019t start. Tap Play again or try the Video tab.');
                console.error('Audio play error:', err);
              });
            } else {
              // Queue the play for when audio becomes ready
              pendingPlayRef.current = true;
              setIsLoading(true);
              // Also attempt play() now - on some browsers this will succeed once data arrives
              webAudioRef.current.play().catch(() => {
                // Expected to fail if not ready - oncanplay handler will retry
              });
            }
          }
        }
      } else if (audioRef.current) {
        const status = await audioRef.current.getStatusAsync();
        if (status.isLoaded) {
          if (status.isPlaying) {
            await audioRef.current.pauseAsync();
          } else {
            await audioRef.current.playAsync();
          }
        }
      } else if (module?.audioUrl?.trim()) {
        // Still initializing - show loading so the user knows it's working
        setIsLoading(true);
      }
    }
  };

  const switchToAudio = async () => {
    if (!module) return;
    if (!module.audioUrl?.trim()) {
      setError('No podcast is available for this lesson.');
      return;
    }

    flushPlaybackPosition('video');
    if (Platform.OS === 'web') {
      webVideoRef.current?.pause();
    } else {
      await videoRef.current?.pauseAsync().catch(() => {});
    }

    setMediaMode('audio');
    setIsPlaying(false);
    const savedAudMs = Math.max(pendingAudioSeekSecRef.current, resumedBannerSeconds.audio) * 1000;
    setProgress(savedAudMs);
    liveProgressMsRef.current = savedAudMs;
    setError(null);

    try {
      if (Platform.OS === 'web') {
        const targetAudioUrl = module.audioUrl.trim();
        const existing = webAudioRef.current;
        if (existing && existing.dataset.sourceUrl === targetAudioUrl) {
          if (!Number.isNaN(existing.duration) && existing.duration > 0) {
            setDuration(existing.duration * 1000);
          }
          setIsLoading(false);
        } else {
          setIsLoading(true);
          setupWebAudio(targetAudioUrl);
        }
      } else {
        setIsLoading(true);
        // Use expo-av Audio for native platforms
        // Unload previous audio if exists
        if (audioRef.current) {
          await audioRef.current.unloadAsync();
        }
        
        const { sound } = await Audio.Sound.createAsync(
          { uri: module.audioUrl.trim() },
          { shouldPlay: false },
          handlePlaybackStatusUpdate
        );
        audioRef.current = sound;
        setIsLoading(false);
      }
    } catch (err) {
      setError('Unable to load audio. Please try again.');
      setIsLoading(false);
      console.error('Audio loading error:', err);
    }
  };

  const switchToVideo = async () => {
    if (!module?.videoUrl?.trim()) {
      setError('No video is available for this lesson.');
      return;
    }
    flushPlaybackPosition('audio');
    setMediaMode('video');
    setIsLoading(Platform.OS !== 'web');
    setIsPlaying(false);
    const savedVidMs = Math.max(pendingVideoSeekSecRef.current, resumedBannerSeconds.video) * 1000;
    setProgress(savedVidMs);
    liveProgressMsRef.current = savedVidMs;
    setError(null);
    if (Platform.OS !== 'web') {
      setVideoMountNonce((n) => n + 1);
    }

    if (Platform.OS === 'web') {
      pendingPlayRef.current = false;
      webAudioRef.current?.pause();
    } else {
      await audioRef.current?.pauseAsync().catch(() => {});
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(
    colors,
    module?.color ?? colors.primary,
    videoWidth,
    videoHeight,
    mediaHorizontalPaddingTotal
  );

  if (!authLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  if (!module) {
    return (
      <EnterpriseShell>
        <View style={styles.container}>
          <View style={styles.loadingContainer}>
            {detailLoading ? (
              <>
                <ActivityIndicator size="large" color={colors.primary} />
                <Text style={styles.loadingText}>Loading content...</Text>
              </>
            ) : (
              <>
                <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
                <Text style={styles.loadingText}>This lesson could not be found.</Text>
                <TouchableOpacity onPress={handleBack} style={styles.retryButton}>
                  <Text style={styles.retryText}>Go back</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </EnterpriseShell>
    );
  }

  const rawVideoSrc = module.videoUrl?.trim() ?? '';
  const videoSrc =
    Platform.OS === 'web' && rawVideoSrc && videoUseProxyFallback
      ? buildAudioProxyUrl(rawVideoSrc)
      : rawVideoSrc;
  const audioSrc = module.audioUrl?.trim() ?? '';
  const hasVideo = Boolean(rawVideoSrc);
  const hasAudio = Boolean(audioSrc);
  const showVideoPlayer = hasVideo && mediaMode === 'video';
  const showAudioPlayer = hasAudio && !showVideoPlayer;

  const readingGuide = getCurriculumGuide(module.competencyKey, module.domainKey);
  const dimensionInfo = DIMENSION_INFO[module.dimension];
  const headerDimensionLabel = isIntroEpisodeTitle(module.title)
    ? module.subtitle
    : module.catalogEqType === 'B2B' && module.subtitle.includes(' · ')
      ? module.subtitle.split(' · ')[0]!
      : dimensionInfo.name;

  if (sequenceGate.locked) {
    return (
      <EnterpriseShell>
        <View style={styles.container}>
          <ScreenHeader
            title={headerDimensionLabel}
            onBackPress={handleBack}
            showHomeButton
            backFallbackHref="/(tabs)/learn"
          />
          <View style={styles.lockedWrap}>
            <GlassCard style={styles.lockedCard}>
              <View style={[styles.lockedIconCircle, { backgroundColor: colors.warning + '18' }]}>
                <Ionicons name="lock-closed" size={28} color={colors.warning} />
              </View>
              <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>
                Complete Previous Step First
              </Text>
              <Text style={[styles.lockedBody, { color: colors.textSecondary }]}>
                {sequenceGate.lockedReason ??
                  'Your current EQ pathway follows the structured sequence. Complete the previous competency lesson to unlock this module, or score 65+ on the Full EQ Test for Free Browse.'}
              </Text>
              <View style={styles.lockedActions}>
                {sequenceGate.nextUnlockedRouteId ? (
                  <Button
                    title="Go to Current Lesson"
                    icon="play-outline"
                    onPress={() =>
                      router.replace(
                        `/learning-detail?id=${encodeURIComponent(sequenceGate.nextUnlockedRouteId!)}`
                      )
                    }
                  />
                ) : null}
                <Button
                  title="Back to Curriculum"
                  variant="outline"
                  onPress={() => router.replace('/(tabs)/learn')}
                />
              </View>
            </GlassCard>
          </View>
        </View>
      </EnterpriseShell>
    );
  }

  const playerSection = (
    <View style={isDesktop ? styles.desktopLeftCol : undefined}>
      {/* Media Tabs - only when both video and podcast exist */}
      {hasVideo && hasAudio ? (
        <View style={styles.mediaTabs}>
          <TouchableOpacity
            style={[styles.mediaTab, mediaMode === 'video' && styles.mediaTabActive]}
            onPress={switchToVideo}
          >
            <Ionicons
              name="videocam"
              size={18}
              color={mediaMode === 'video' ? colors.primaryForeground : colors.textSecondary}
            />
            <Text style={[styles.mediaTabText, mediaMode === 'video' && styles.mediaTabTextActive]}>
              Video Lesson
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mediaTab, mediaMode === 'audio' && styles.mediaTabActive]}
            onPress={switchToAudio}
          >
            <Ionicons
              name="headset"
              size={18}
              color={mediaMode === 'audio' ? colors.primaryForeground : colors.textSecondary}
            />
            <Text style={[styles.mediaTabText, mediaMode === 'audio' && styles.mediaTabTextActive]}>
              Deep Dive Podcast
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Media Player */}
      <GlassCard noPadding style={styles.playerCardWrap}>
        <View style={styles.mediaContainer}>
          {showVideoPlayer ? (
            <View style={styles.videoContainer}>
              {Platform.OS === 'web'
                ? React.createElement('video', {
                    key: `${videoSrc}-${videoMountNonce}`,
                    ref: (el: HTMLVideoElement | null): void => { webVideoRef.current = el; },
                    src: videoSrc,
                    controls: true,
                    playsInline: true,
                    controlsList: 'nodownload',
                    preload: 'metadata',
                    style: {
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                      backgroundColor: '#000',
                    } as React.CSSProperties,
                    onLoadStart: () => { setError(null); },
                    onLoadedMetadata: (e: React.SyntheticEvent<HTMLVideoElement>) => {
                      setIsLoading(false);
                      const el = e.currentTarget;
                      if (!Number.isNaN(el.duration) && el.duration > 0) {
                        const durMs = el.duration * 1000;
                        setDuration(durMs);
                        liveDurationMsRef.current = durMs;
                        if (pendingVideoSeekSecRef.current >= 3 && el.duration > 3) {
                          const targetSec = Math.min(pendingVideoSeekSecRef.current, Math.max(0, el.duration - 2));
                          pendingVideoSeekSecRef.current = 0;
                          if (targetSec > 1) {
                            el.currentTime = targetSec;
                            setProgress(targetSec * 1000);
                            liveProgressMsRef.current = targetSec * 1000;
                          }
                        }
                      }
                    },
                    onLoadedData: () => setIsLoading(false),
                    onCanPlay: () => setIsLoading(false),
                    onWaiting: () => setIsLoading(true),
                    onPlaying: () => { setIsPlaying(true); setIsLoading(false); },
                    onPlay: () => { setIsPlaying(true); setIsLoading(false); },
                    onPause: () => {
                      setIsPlaying(false);
                      flushPlaybackPosition('video');
                    },
                    onEnded: handleVideoEnded,
                    onError: () => {
                      if (!videoUseProxyFallback && rawVideoSrc) {
                        setVideoUseProxyFallback(true);
                        setError(null);
                        setIsLoading(true);
                        return;
                      }
                      setError('Unable to load video. Please try again.');
                      setIsLoading(false);
                    },
                    onTimeUpdate: (e: React.SyntheticEvent<HTMLVideoElement>) => {
                      const el = e.currentTarget;
                      const durMs = !isNaN(el.duration) && el.duration > 0 ? el.duration * 1000 : 0;
                      const posMs = el.currentTime * 1000;
                      if (durMs > 0) setDuration(durMs);
                      setProgress(posMs);
                      reportMediaProgress('video', posMs, durMs);
                    },
                  })
                : (
                  <Video
                    key={`${videoSrc}-${videoMountNonce}`}
                    ref={videoRef}
                    source={{ uri: videoSrc }}
                    style={styles.video}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                    onLoadStart={() => { setIsLoading(true); setError(null); }}
                    onReadyForDisplay={() => setIsLoading(false)}
                    onError={() => { setError('Unable to load video'); setIsLoading(false); }}
                  />
                )
              }
              {isLoading ? (
                <View style={styles.mediaOverlay} pointerEvents="none">
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              ) : null}
            </View>
          ) : showAudioPlayer ? (
            <View style={styles.audioContainer}>
              <View style={[styles.audioArt, { backgroundColor: colors.primary + '14' }]}>
                <Ionicons name={module.icon as any} size={56} color={colors.primary} />
              </View>

              <View style={styles.audioControls}>
                <Text style={styles.audioTitle}>{module.title}</Text>
                <Text style={styles.audioSubtitle}>{module.subtitle}</Text>

                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: duration > 0 ? `${(progress / duration) * 100}%` : '0%',
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <View style={styles.timeLabels}>
                    <Text style={styles.timeText}>{formatTime(progress)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                </View>

                <View style={styles.audioTransportRow}>
                  <TouchableOpacity
                    style={[styles.seekStepBtn, { borderColor: colors.border, backgroundColor: colors.floating }]}
                    onPress={() => void seekAudioBySeconds(-15)}
                    accessibilityLabel="Rewind 15 seconds"
                  >
                    <Ionicons name="play-back" size={16} color={colors.textPrimary} />
                    <Text style={[styles.seekStepText, { color: colors.textSecondary }]}>15s</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.playButton, { backgroundColor: colors.primary }]}
                    onPress={togglePlayPause}
                    disabled={Platform.OS !== 'web' && isLoading}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Ionicons name={isPlaying ? 'pause' : 'play'} size={28} color="#fff" />
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.seekStepBtn, { borderColor: colors.border, backgroundColor: colors.floating }]}
                    onPress={() => void seekAudioBySeconds(15)}
                    accessibilityLabel="Forward 15 seconds"
                  >
                    <Text style={[styles.seekStepText, { color: colors.textSecondary }]}>15s</Text>
                    <Ionicons name="play-forward" size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>No playable media for this lesson.</Text>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  if (mediaMode === 'video') {
                    setVideoUseProxyFallback(false);
                    if (Platform.OS !== 'web') {
                      setIsLoading(true);
                      setVideoMountNonce((n) => n + 1);
                    } else if (webVideoRef.current) {
                      setIsLoading(false);
                      webVideoRef.current.load();
                    }
                  } else if (Platform.OS === 'web' && module?.audioUrl?.trim()) {
                    setIsLoading(true);
                    setupWebAudio(module.audioUrl.trim());
                  } else {
                    switchToAudio();
                  }
                }}
              >
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Watch-time auto-resume indicator + explicit Restart button */}
          {(showVideoPlayer || showAudioPlayer) &&
          (progress >= 3000 ||
            (mediaMode === 'video' ? resumedBannerSeconds.video : resumedBannerSeconds.audio) >= 3) ? (
            <View style={[styles.resumeBar, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.resumeInfo}>
                <Ionicons name="bookmark-outline" size={15} color={colors.primary} />
                <Text style={[styles.resumeText, { color: colors.textSecondary }]}>
                  {(mediaMode === 'video' ? resumedBannerSeconds.video : resumedBannerSeconds.audio) >= 3
                    ? `Resumed from ${formatPlaybackSeconds(mediaMode === 'video' ? resumedBannerSeconds.video : resumedBannerSeconds.audio)}`
                    : `Progress saved at ${formatTime(progress)}`}
                </Text>
              </View>
              <Button
                title="Restart from 0:00"
                size="sm"
                variant="outline"
                icon="refresh"
                onPress={() => void handleRestartMedia()}
              />
            </View>
          ) : null}
        </View>
      </GlassCard>

      {/* Sequence & Completion Action Bar */}
      <GlassCard style={styles.actionBarCard}>
        <View style={styles.actionBarRow}>
          <View style={styles.actionStatus}>
            <Badge
              label={lessonCompleted ? 'Completed' : 'In Progress'}
              variant={lessonCompleted ? 'success' : 'secondary'}
              icon={lessonCompleted ? 'checkmark-circle' : 'time-outline'}
            />
            {sequenceGate.sequenceNumber ? (
              <Badge label={`Step ${sequenceGate.sequenceNumber}`} variant="outline" />
            ) : null}
          </View>
          <View style={styles.actionBtns}>
            {!lessonCompleted ? (
              <Button
                title="Mark Complete"
                icon="checkmark-circle-outline"
                size="sm"
                variant="outline"
                loading={markingComplete}
                onPress={() => void handleMarkLessonComplete()}
              />
            ) : null}
            {sequenceGate.prevEpisode ? (
              <Button
                title="Previous"
                size="sm"
                variant="ghost"
                onPress={() =>
                  router.replace(
                    `/learning-detail?id=${encodeURIComponent(sequenceGate.prevEpisode!.episode.routeId)}`
                  )
                }
              />
            ) : null}
            {sequenceGate.nextEpisode ? (
              <Button
                title="Next Lesson"
                icon="arrow-forward"
                size="sm"
                disabled={!sequenceGate.nextEpisode.unlocked && !lessonCompleted}
                onPress={() =>
                  router.replace(
                    `/learning-detail?id=${encodeURIComponent(sequenceGate.nextEpisode!.episode.routeId)}`
                  )
                }
              />
            ) : null}
          </View>
        </View>
      </GlassCard>
    </View>
  );

  const summaryAndReadingSection = (
    <View style={isDesktop ? styles.desktopRightCol : styles.mobileContentCol}>
      {/* Executive Short Summary */}
      <GlassCard>
        <View style={styles.summaryTopRow}>
          <Badge label={readingGuide.domainLabel} variant="default" />
          <View style={styles.durationBadgesInline}>
            {hasVideo ? <Badge label={module.videoDuration} icon="videocam-outline" variant="secondary" /> : null}
            {hasAudio ? <Badge label={module.audioDuration} icon="headset-outline" variant="secondary" /> : null}
          </View>
        </View>
        <Text style={styles.moduleTitle}>{module.title}</Text>
        <Text style={styles.moduleSubtitle}>{readingGuide.title}</Text>
        <Text style={[styles.shortSummaryText, { color: colors.textPrimary }]}>
          {module.shortContent || readingGuide.shortSummary}
        </Text>
        {module.description ? (
          <Text style={styles.description}>{module.description}</Text>
        ) : null}
      </GlassCard>

      {/* First-Principles Reading Material (Skippable) */}
      <GlassCard>
        <View style={styles.readingHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.readingTitle, { color: colors.textPrimary }]}>
              First-Principles Study Guide
            </Text>
            <Text style={[styles.readingMeta, { color: colors.textMuted }]}>
              {module.estimatedReadMinutes ?? readingGuide.estimatedReadMinutes} min deep dive · Optional reading
            </Text>
          </View>
          <Button
            title={readingSkipped ? 'Show Reading' : 'Skip Reading'}
            size="sm"
            variant={readingSkipped ? 'outline' : 'secondary'}
            icon={readingSkipped ? 'book-outline' : 'play-skip-forward-outline'}
            onPress={() => {
              const next = !readingSkipped;
              setReadingSkipped(next);
              if (next && !isDesktop) {
                scrollViewRef.current?.scrollTo({ y: 0, animated: true });
              }
            }}
          />
        </View>

        {readingSkipped ? (
          <Text style={[styles.skippedHint, { color: colors.textSecondary }]}>
            Reading guide collapsed — jump straight into the video or Deep Dive Podcast.
          </Text>
        ) : (
          <View style={styles.readingSections}>
            {module.longContent ? (
              <View style={styles.readingBlock}>
                <Text style={[styles.readingSubhead, { color: colors.primary }]}>
                  Episode Deep Dive
                </Text>
                <Text style={[styles.readingBody, { color: colors.textSecondary }]}>
                  {module.longContent}
                </Text>
              </View>
            ) : null}

            <View style={styles.readingBlock}>
              <Text style={[styles.readingSubhead, { color: colors.primary }]}>
                1. What {readingGuide.title} Is
              </Text>
              <Text style={[styles.readingBody, { color: colors.textSecondary }]}>
                {readingGuide.whatItIs}
              </Text>
            </View>

            {readingGuide.longContent ? (
              <View style={styles.readingBlock}>
                <Text style={[styles.readingSubhead, { color: colors.primary }]}>
                  First-Principles Overview
                </Text>
                <Text style={[styles.readingBody, { color: colors.textSecondary }]}>
                  {readingGuide.longContent}
                </Text>
              </View>
            ) : null}

            <View style={styles.readingBlock}>
              <Text style={[styles.readingSubhead, { color: colors.primary }]}>
                2. Why It Matters
              </Text>
              <Text style={[styles.readingBody, { color: colors.textSecondary }]}>
                {readingGuide.whyItMatters}
              </Text>
            </View>

            <View style={styles.readingBlock}>
              <Text style={[styles.readingSubhead, { color: colors.primary }]}>
                3. How to Measure It
              </Text>
              {readingGuide.howToMeasure.map((m, idx) => (
                <View key={idx} style={styles.measureRow}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} style={{ marginTop: 2 }} />
                  <Text style={[styles.measureText, { color: colors.textSecondary }]}>{m}</Text>
                </View>
              ))}
            </View>

            <View style={[styles.drillBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.drillLabel, { color: colors.textPrimary }]}>Practical Drill</Text>
              <Text style={[styles.drillText, { color: colors.textSecondary }]}>
                {readingGuide.practicePrompt}
              </Text>
            </View>
          </View>
        )}
      </GlassCard>
    </View>
  );

  return (
    <EnterpriseShell>
      <View style={styles.container}>
        <ScreenHeader
          title={headerDimensionLabel}
          onBackPress={handleBack}
          showHomeButton
          backFallbackHref="/(tabs)/learn"
        />

        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, isDesktop && styles.scrollContentDesktop]}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
        >
          <View style={[styles.detailGrid, isDesktop && styles.detailGridDesktop]}>
            {playerSection}
            {summaryAndReadingSection}
          </View>
        </ScrollView>
      </View>
    </EnterpriseShell>
  );
}

const createStyles = (
  colors: ReturnType<typeof useColors>,
  accentColor: string,
  videoWidth: number,
  videoHeight: number,
  mediaHorizontalPaddingTotal: number
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    alignItems: 'center',
  },
  dimensionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['5xl'],
    paddingTop: Spacing.md,
  },
  scrollContentDesktop: {
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: Spacing['2xl'],
    paddingTop: Spacing.lg,
  },
  detailGrid: {
    gap: Spacing.lg,
  },
  detailGridDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.xl,
  },
  desktopLeftCol: {
    width: '54%',
    minWidth: 0,
    gap: Spacing.md,
  },
  desktopRightCol: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.md,
  },
  mobileContentCol: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  playerCardWrap: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  // Media Tabs
  mediaTabs: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  mediaTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mediaTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  mediaTabText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textSecondary,
  },
  mediaTabTextActive: {
    color: colors.primaryForeground,
  },
  // Media Container - horizontal padding must match `mediaHorizontalPaddingTotal` passed into layout math
  mediaContainer: {
    paddingHorizontal: mediaHorizontalPaddingTotal > 0 ? 0 : 0,
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    width: videoWidth,
    maxWidth: '100%' as const,
    height: videoHeight,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  video: {
    width: videoWidth,
    height: videoHeight,
  },
  mediaOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Audio Player
  audioContainer: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  audioArt: {
    width: 160,
    height: 160,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  audioControls: {
    width: '100%',
    alignItems: 'center',
  },
  audioTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  audioSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  progressContainer: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.borderLight,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  timeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  timeText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
  playButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  // Error
  errorContainer: {
    alignItems: 'center',
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    backgroundColor: colors.primary,
  },
  retryText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.primaryForeground,
  },
  // Content Info
  contentInfo: {
    paddingHorizontal: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  moduleTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  moduleSubtitle: {
    fontSize: Typography.fontSize.base,
    color: accentColor,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.md,
  },
  durationBadges: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
  },
  description: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  // Takeaways
  takeawaysCard: {
    marginHorizontal: Spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
  },
  takeawaysTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
  },
  takeawayItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  takeawayBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  takeawayText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  actionBarCard: {
    padding: Spacing.md,
  },
  actionBarRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  actionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  actionBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flexWrap: 'wrap',
  },
  summaryTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    flexWrap: 'wrap',
    marginBottom: Spacing.sm,
  },
  durationBadgesInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  shortSummaryText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.sm,
  },
  readingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.md,
  },
  readingTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  readingMeta: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  skippedHint: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    marginTop: Spacing.md,
  },
  readingSections: {
    marginTop: Spacing.md,
    gap: Spacing.md,
  },
  readingBlock: {
    gap: 4,
  },
  readingSubhead: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.bold,
  },
  readingBody: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  measureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: 4,
  },
  measureText: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  drillBox: {
    marginTop: Spacing.xs,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 4,
  },
  drillLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  drillText: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  lockedWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  lockedCard: {
    width: '100%',
    maxWidth: 520,
    alignItems: 'center',
    gap: Spacing.md,
  },
  lockedIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
  },
  lockedBody: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  lockedActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    justifyContent: 'center',
  },
  audioTransportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.lg,
  },
  seekStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  seekStepText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  resumeBar: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  resumeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  resumeText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
});
