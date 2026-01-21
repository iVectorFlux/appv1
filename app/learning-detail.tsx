/**
 * Learning Detail Screen
 * 
 * Play audio podcasts or video lessons for EQ skills.
 * Deep dive content for each dimension.
 * 
 * Uses native HTML5 audio/video on web for better compatibility.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Video, ResizeMode, AVPlaybackStatus } from 'expo-av';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { getModuleById, DIMENSION_INFO } from '@/data/learning-content';
import type { LearningModule } from '@/data/learning-content';

type MediaMode = 'video' | 'audio';

export default function LearningDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  
  const [module, setModule] = useState<LearningModule | null>(null);
  const [mediaMode, setMediaMode] = useState<MediaMode>('video');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  const videoRef = useRef<Video>(null);
  // Web audio element ref
  const webAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (params.id) {
      const foundModule = getModuleById(params.id);
      if (foundModule) {
        setModule(foundModule);
      }
    }
    
    // Cleanup on unmount
    return () => {
      if (Platform.OS === 'web' && webAudioRef.current) {
        webAudioRef.current.pause();
        webAudioRef.current = null;
      }
    };
  }, [params.id]);

  const handleBack = () => {
    // Stop media before navigating back
    if (videoRef.current) {
      videoRef.current.pauseAsync();
    }
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.pause();
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
      }
    } else if (status.error) {
      setError('Unable to load media. Please check your connection.');
      setIsLoading(false);
    }
  };

  // Web audio handlers
  const setupWebAudio = (audioUrl: string) => {
    if (Platform.OS !== 'web') return;
    
    // Clean up existing audio
    if (webAudioRef.current) {
      webAudioRef.current.pause();
    }
    
    const audio = new Audio(audioUrl);
    webAudioRef.current = audio;
    
    audio.onloadedmetadata = () => {
      setDuration(audio.duration * 1000);
      setIsLoading(false);
    };
    
    audio.ontimeupdate = () => {
      setProgress(audio.currentTime * 1000);
    };
    
    audio.onplay = () => setIsPlaying(true);
    audio.onpause = () => setIsPlaying(false);
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    audio.onerror = () => {
      setError('Unable to load audio. Please try again.');
      setIsLoading(false);
    };
  };

  const togglePlayPause = async () => {
    if (mediaMode === 'video' && videoRef.current) {
      if (isPlaying) {
        await videoRef.current.pauseAsync();
      } else {
        await videoRef.current.playAsync();
      }
    } else if (mediaMode === 'audio') {
      if (Platform.OS === 'web' && webAudioRef.current) {
        if (isPlaying) {
          webAudioRef.current.pause();
        } else {
          webAudioRef.current.play();
        }
      }
    }
  };

  const switchToAudio = async () => {
    if (!module) return;
    
    // Pause video
    if (videoRef.current) {
      await videoRef.current.pauseAsync();
    }
    
    setMediaMode('audio');
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setError(null);
    
    try {
      // Unload previous audio if exists
      if (audioRef.current) {
        await audioRef.current.unloadAsync();
      }
      
      const { sound } = await Audio.Sound.createAsync(
        { uri: module.audioUrl },
        { shouldPlay: false },
        handlePlaybackStatusUpdate
      );
      audioRef.current = sound;
      setIsLoading(false);
    } catch (err) {
      setError('Unable to load audio. Please try again.');
      setIsLoading(false);
    }
  };

  const switchToVideo = async () => {
    setMediaMode('video');
    setIsLoading(true);
    setIsPlaying(false);
    setProgress(0);
    setError(null);
    
    // Pause web audio
    if (Platform.OS === 'web' && webAudioRef.current) {
      webAudioRef.current.pause();
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const styles = createStyles(colors, module?.color || colors.primary);

  if (!module) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading content...</Text>
        </View>
      </View>
    );
  }

  const dimensionInfo = DIMENSION_INFO[module.dimension];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={handleBack}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.dimensionLabel}>{dimensionInfo.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Media Tabs */}
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

        {/* Media Player */}
        <View style={styles.mediaContainer}>
          {mediaMode === 'video' ? (
            <View style={styles.videoContainer}>
              <Video
                ref={videoRef}
                source={{ uri: module.videoUrl }}
                style={styles.video}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
                onLoadStart={() => setIsLoading(true)}
                onError={() => setError('Unable to load video')}
              />
              {isLoading && (
                <View style={styles.mediaOverlay}>
                  <ActivityIndicator size="large" color="#fff" />
                </View>
              )}
            </View>
          ) : (
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
                  disabled={isLoading}
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
          )}
          
          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={24} color={colors.destructive} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity 
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setIsLoading(true);
                  if (mediaMode === 'video') {
                    videoRef.current?.playAsync();
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
            <View style={styles.durationBadge}>
              <Ionicons name="videocam-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.durationText}>{module.videoDuration}</Text>
            </View>
            <View style={styles.durationBadge}>
              <Ionicons name="headset-outline" size={14} color={colors.textSecondary} />
              <Text style={styles.durationText}>{module.audioDuration}</Text>
            </View>
          </View>
          
          <Text style={styles.description}>{module.description}</Text>
        </View>

        {/* Key Takeaways */}
        <View style={styles.takeawaysCard}>
          <Text style={styles.takeawaysTitle}>Key Takeaways</Text>
          {module.keyTakeaways.map((takeaway, index) => (
            <View key={index} style={styles.takeawayItem}>
              <View style={[styles.takeawayBullet, { backgroundColor: module.color }]} />
              <Text style={styles.takeawayText}>{takeaway}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// Fixed video dimensions for mobile frame (16:9 aspect ratio)
const VIDEO_WIDTH = 353; // Mobile frame width - padding
const VIDEO_HEIGHT = Math.round(VIDEO_WIDTH * (9 / 16)); // ~198px

const createStyles = (colors: ReturnType<typeof useColors>, accentColor: string) => StyleSheet.create({
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
  // Media Container
  mediaContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  videoContainer: {
    borderRadius: Radius.xl,
    overflow: 'hidden',
    backgroundColor: '#000',
    aspectRatio: 16 / 9,
    width: '100%',
  },
  video: {
    width: '100%',
    height: '100%',
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
