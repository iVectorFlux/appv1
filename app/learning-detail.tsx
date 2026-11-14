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
import { isIntroEpisodeTitle, resolveDetailModuleFromCatalogId } from '@/services/learning-content-catalog';
import { ScreenHeader } from '@/components/ui/screen-header';
import {
  recordEpisodeLastAccessed,
  recordEpisodeVideoCompleted,
  recordEpisodeAudioCompleted,
} from '@/services/learning-content-progress';
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
  const params = useLocalSearchParams<{ id: string; returnTo?: string | string[] }>();
  const colors = useColors();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, isLoading: authLoading } = useAuthStore();

  const mediaHorizontalPaddingTotal = Spacing.lg * 2;
  const { width: videoWidth, height: videoHeight } = computeVideoPlayerLayout(
    windowWidth,
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
    const id = typeof params.id === 'string' ? params.id : Array.isArray(params.id) ? params.id[0] : '';
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
        startMode = fromCatalog.module.videoUrl ? 'video' : 'audio';
        setModule(fromCatalog.module);
        setCatalogEpisodeKey(fromCatalog.episodeKey);
        setMediaMode(startMode);
      } else {
        const found = getModuleById(id);
        startMode = found?.videoUrl ? 'video' : 'audio';
        setModule(found ?? null);
        setCatalogEpisodeKey(null);
        setMediaMode(startMode);
      }
      // Video starts loading immediately via the player element.
      // Audio on web is eagerly pre-created so it's ready for the first play tap.
      // Audio on native is initialized below via a dedicated effect.
      // On web, native <video controls> handles its own initial UI/loading state so clicks are never blocked.
      setIsLoading(startMode === 'video' && Platform.OS !== 'web');
      setVideoUseProxyFallback(false);
      setError(null);
      setProgress(0);
      setDuration(0);
      setIsPlaying(false);
      pendingPlayRef.current = false;
      setDetailLoading(false);
    })();
    return () => {
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
  }, [params.id]);

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
        if (Platform.OS === 'web') {
          webVideoRef.current?.pause();
        } else {
          videoRef.current?.pauseAsync().catch(() => {});
        }
      };
    }, [])
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

  const handleVideoEnded = () => {
    setIsPlaying(false);
    setProgress(0);
    if (module?.id && user?.id) {
      if (catalogEpisodeKey) recordEpisodeVideoCompleted(user.id, catalogEpisodeKey).catch(() => {});
      else recordVideoCompleted(user.id, module.id).catch(() => {});
    }
  };

  const handleBack = async () => {
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
      setProgress(status.positionMillis);
      setDuration(status.durationMillis || 0);
      if (status.didJustFinish) {
        setIsPlaying(false);
        setProgress(0);
        if (module?.id && user?.id) {
          if (mediaMode === 'video') {
            if (catalogEpisodeKey) recordEpisodeVideoCompleted(user.id, catalogEpisodeKey).catch(() => {});
            else recordVideoCompleted(user.id, module.id).catch(() => {});
          } else {
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
        setDuration(audio.duration * 1000);
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
    audio.ontimeupdate = () => setProgress(audio.currentTime * 1000);
    audio.onplay = () => {
      setIsPlaying(true);
      setIsLoading(false);
    };
    audio.onpause = () => setIsPlaying(false);
    audio.onwaiting = () => setIsLoading(true);
    audio.onplaying = () => setIsLoading(false);
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
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

    if (Platform.OS === 'web') {
      webVideoRef.current?.pause();
    } else {
      await videoRef.current?.pauseAsync().catch(() => {});
    }

    setMediaMode('audio');
    setIsPlaying(false);
    setProgress(0);
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
    setMediaMode('video');
    setIsLoading(Platform.OS !== 'web');
    setIsPlaying(false);
    setProgress(0);
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

  const dimensionInfo = DIMENSION_INFO[module.dimension];
  const headerDimensionLabel = isIntroEpisodeTitle(module.title)
    ? module.subtitle
    : module.catalogEqType === 'B2B' && module.subtitle.includes(' · ')
      ? module.subtitle.split(' · ')[0]!
      : dimensionInfo.name;

  return (
    <View style={styles.container}>
      <ScreenHeader
        title={headerDimensionLabel}
        onBackPress={handleBack}
        showHomeButton
        backFallbackHref="/(tabs)/learn"
      />

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android' ? false : undefined}
      >
        {/* Media Tabs - only when both video and podcast exist */}
        {hasVideo && hasAudio ? (
          <View style={styles.mediaTabs}>
            <TouchableOpacity
              style={[styles.mediaTab, mediaMode === 'video' && styles.mediaTabActive]}
              onPress={switchToVideo}
            >
              <Ionicons
                name="videocam"
                size={20}
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
                size={20}
                color={mediaMode === 'audio' ? colors.primaryForeground : colors.textSecondary}
              />
              <Text style={[styles.mediaTabText, mediaMode === 'audio' && styles.mediaTabTextActive]}>
                Deep Dive Podcast
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Media Player */}
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
                    onLoadedMetadata: () => setIsLoading(false),
                    onLoadedData: () => setIsLoading(false),
                    onCanPlay: () => setIsLoading(false),
                    onWaiting: () => setIsLoading(true),
                    onPlaying: () => { setIsPlaying(true); setIsLoading(false); },
                    onPlay: () => { setIsPlaying(true); setIsLoading(false); },
                    onPause: () => setIsPlaying(false),
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
                      if (!isNaN(el.duration)) setDuration(el.duration * 1000);
                      setProgress(el.currentTime * 1000);
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
              <View style={[styles.audioArt, { backgroundColor: module.color + '20' }]}>
                <Ionicons name={module.icon as any} size={64} color={module.color} />
              </View>
              
              {/* Audio Controls */}
              <View style={styles.audioControls}>
                <Text style={styles.audioTitle}>{module.title}</Text>
                <Text style={styles.audioSubtitle}>{module.subtitle}</Text>
                
                {/* Progress Bar */}
                <View style={styles.progressContainer}>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          width: duration > 0 ? `${(progress / duration) * 100}%` : '0%',
                          backgroundColor: module.color,
                        }
                      ]} 
                    />
                  </View>
                  <View style={styles.timeLabels}>
                    <Text style={styles.timeText}>{formatTime(progress)}</Text>
                    <Text style={styles.timeText}>{formatTime(duration)}</Text>
                  </View>
                </View>
                
                {/* Play Button */}
                <TouchableOpacity 
                  style={[styles.playButton, { backgroundColor: module.color }]}
                  onPress={togglePlayPause}
                  disabled={Platform.OS !== 'web' && isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Ionicons 
                      name={isPlaying ? 'pause' : 'play'} 
                      size={32} 
                      color="#fff" 
                    />
                  )}
                </TouchableOpacity>
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
        </View>

        {/* Content Info */}
        <View style={styles.contentInfo}>
          <Text style={styles.moduleTitle}>{module.title}</Text>
          <Text style={styles.moduleSubtitle}>{module.subtitle}</Text>
          
          <View style={styles.durationBadges}>
            {hasVideo ? (
              <View style={styles.durationBadge}>
                <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.durationText}>{module.videoDuration}</Text>
              </View>
            ) : null}
            {hasAudio ? (
              <View style={styles.durationBadge}>
                <Ionicons name="headset-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.durationText}>{module.audioDuration}</Text>
              </View>
            ) : null}
          </View>
          
          <Text style={styles.description}>{module.description}</Text>
        </View>

        {module.keyTakeaways.length > 0 ? (
          <View style={styles.takeawaysCard}>
            <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
            {module.keyTakeaways.map((takeaway, index) => (
              <View key={index} style={styles.takeawayItem}>
                <View style={[styles.takeawayBullet, { backgroundColor: module.color }]} />
                <Text style={styles.takeawayText}>{takeaway}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </View>
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
  },
  // Media Tabs
  mediaTabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  mediaTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: colors.surface,
  },
  mediaTabActive: {
    backgroundColor: colors.primary,
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
    paddingHorizontal: mediaHorizontalPaddingTotal / 2,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    width: videoWidth,
    maxWidth: '100%' as const,
    height: videoHeight,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    alignSelf: 'center',
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
});
