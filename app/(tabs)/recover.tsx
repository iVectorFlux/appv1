/**
 * Recover Screen
 * 
 * Includes:
 * - Breathing techniques
 * - "Release & Let Go" flow
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  TextInput,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Audio } from 'expo-av';
import { Button } from '@/components/ui/button';
import { ListCard } from '@/components/ui/list-card';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

type RecoverView = 'main' | 'release';

const AFFIRMATIONS = [
  "You are releasing what no longer serves you.",
  "This weight is not yours to carry.",
  "You are safe to let this go.",
  "Peace is available to you right now.",
  "You are stronger than this moment.",
  "Let it dissolve like mist in the morning sun.",
];

export default function RecoverScreen() {
  const router = useRouter();
  const colors = useColors();
  const [view, setView] = useState<RecoverView>('main');
  const [releaseText, setReleaseText] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);
  const [hasReleased, setHasReleased] = useState(false);
  
  // Animation refs for release flow
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const scaleReleaseAnim = useRef(new Animated.Value(1)).current;
  const textOpacityAnim = useRef(new Animated.Value(1)).current;
  const [currentAffirmation, setCurrentAffirmation] = useState('');
  const [showText, setShowText] = useState(false);
  const soundRef = useRef<Audio.Sound | null>(null);

  const playReleaseSound = async () => {
    try {
      // Optional: add a release sound file or expo-haptics for feedback
    } catch {
      // Fail silently
    }
  };

  // Cleanup sound on unmount
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => {});
      }
    };
  }, []);

  const handleRelease = async () => {
    if (!releaseText.trim()) return;

    setIsReleasing(true);
    setShowText(true);
    setCurrentAffirmation(AFFIRMATIONS[Math.floor(Math.random() * AFFIRMATIONS.length)]);
    
    // Reset animations to starting state
    fadeAnim.setValue(1);
    scaleReleaseAnim.setValue(0.85);
    textOpacityAnim.setValue(0);
    
    // Play sound (optional)
    playReleaseSound();

    // Phase 1: Fade in and scale up text (1 second)
    Animated.parallel([
      Animated.timing(textOpacityAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleReleaseAnim, {
        toValue: 1,
        friction: 7,
        tension: 50,
        useNativeDriver: true,
      }),
    ]).start();

    // Phase 2: Hold and let user read (4 seconds)
    setTimeout(() => {
      // Phase 3: Fade out everything gracefully (3 seconds)
      Animated.parallel([
        Animated.timing(textOpacityAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(scaleReleaseAnim, {
          toValue: 0.7,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Phase 4: Show completion message
        setShowText(false);
        setReleaseText('');
        setIsReleasing(false);
        setHasReleased(true);
        // Reset animations for next time
        fadeAnim.setValue(1);
        scaleReleaseAnim.setValue(1);
        textOpacityAnim.setValue(1);
        
        // Stop sound
        if (soundRef.current) {
          soundRef.current.unloadAsync().catch(() => {});
        }
        
        // Navigate to home after showing completion message briefly
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 2000);
      });
    }, 4000);
  };

  const styles = createStyles(colors);

  if (view === 'release') {
    return (
      <View style={styles.container}>
        {!isReleasing && (
          <TouchableOpacity
            onPress={() => {
              setView('main');
              setHasReleased(false);
              setReleaseText('');
            }}
            style={styles.backButton}
          >
            <Ionicons name="arrow-back" size={20} color={colors.textSecondary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}

        {isReleasing && showText ? (
          <View style={styles.releaseAnimationContainer}>
            <Animated.View
              style={[
                styles.releaseTextContainer,
                {
                  opacity: textOpacityAnim,
                  transform: [{ scale: scaleReleaseAnim }],
                },
              ]}
            >
              <Text style={styles.releaseInstruction}>
                Read this one more time, then let it go...
              </Text>
              
              <Animated.View
                style={[
                  styles.releaseTextCard,
                  {
                    opacity: fadeAnim,
                  },
                ]}
              >
                <Text style={styles.releaseTextDisplay}>{releaseText}</Text>
              </Animated.View>

              <Animated.View
                style={[
                  styles.affirmationContainer,
                  {
                    opacity: textOpacityAnim,
                  },
                ]}
              >
                <Ionicons name="heart" size={24} color={colors.primary} />
                <Text style={styles.affirmationText}>{currentAffirmation}</Text>
              </Animated.View>

              <Text style={styles.releaseGuidance}>
                Take a deep breath. Watch these words fade away. They don't have to stay with you.
              </Text>
            </Animated.View>
          </View>
        ) : !isReleasing ? (
          <ScrollView 
            style={styles.releaseContainer}
            contentContainerStyle={styles.releaseContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.releaseHeader}>
              <Text style={styles.releaseTitle}>Release & Let Go</Text>
            </View>

            <View style={styles.textInputContainer}>
              <TextInput
                value={releaseText}
                onChangeText={setReleaseText}
                placeholder="What's weighing on you?"
                placeholderTextColor={colors.textMuted}
                multiline
                style={styles.releaseInput}
                textAlignVertical="top"
              />
            </View>
            
            {releaseText.length > 0 && (
              <Button
                title="Release"
                onPress={handleRelease}
                fullWidth
                size="lg"
              />
            )}

            {!isReleasing && releaseText === '' && hasReleased && (
              <View style={styles.releasedContainer}>
                <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
                <Text style={styles.releasedTitle}>
                  You don't have to carry this right now
                </Text>
                <Text style={styles.releasedText}>
                  Take a breath. You're doing okay.
                </Text>
                <Button
                  title="Release Something Else"
                  onPress={() => {
                    setHasReleased(false);
                    setReleaseText('');
                  }}
                  variant="ghost"
                  fullWidth
                  size="md"
                />
              </View>
            )}

            <Text style={styles.releaseNote}>
              Nothing is saved. This space is temporary.
            </Text>
          </ScrollView>
        ) : (
          <View style={styles.releasingContainer}>
            <Text style={styles.releasingText}>Letting go...</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Recover</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick calm</Text>
        <View style={styles.cardList}>
          <ListCard
            onPress={() => router.push('/grounding')}
            title="Grounding"
            icon="leaf-outline"
            iconBackgroundColor={colors.accentCalm + '20'}
            iconColor={colors.accentCalm}
            compact
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Release & let go</Text>
        <ListCard
          onPress={() => setView('release')}
          title="Let go of heavy thoughts"
          icon="heart-outline"
          iconBackgroundColor={colors.primary + '20'}
          leftBorderColor={colors.primary}
          compact
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.heading,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  cardList: {
    gap: Spacing.sm,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.lg,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  breathingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  breathingTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.heading,
  },
  breathingDescription: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing['3xl'],
    maxWidth: 280,
    fontFamily: Typography.fontFamily.primary,
  },
  breathingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: colors.accentCalm,
    marginBottom: Spacing['3xl'],
  },
  breathingInstruction: {
    fontSize: Typography.fontSize.lg,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.primary,
  },
  breathCount: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  releaseContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  releaseContent: {
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing['2xl'],
  },
  releaseHeader: {
    marginBottom: Spacing.lg,
  },
  releaseTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.heading,
  },
  releaseDescription: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  textInputContainer: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    marginBottom: Spacing.lg,
    minHeight: 120,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Shadows.sm,
  },
  releaseInput: {
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
    minHeight: 120,
  },
  releaseAnimationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  releaseTextContainer: {
    width: '100%',
    alignItems: 'center',
  },
  releaseInstruction: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  releaseTextCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing['2xl'],
    width: '100%',
    maxWidth: 400,
    borderWidth: 2,
    borderColor: colors.primary,
    ...Shadows.lg,
  },
  releaseTextDisplay: {
    fontSize: Typography.fontSize.lg,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.normal,
  },
  affirmationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.full,
    marginBottom: Spacing['2xl'],
    maxWidth: '90%',
  },
  affirmationText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
    fontWeight: Typography.fontWeight.medium,
    fontStyle: 'italic',
  },
  releaseGuidance: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    maxWidth: 300,
    fontFamily: Typography.fontFamily.primary,
  },
  releasingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  releasingText: {
    fontSize: Typography.fontSize.lg,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  releasedContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.md,
  },
  releasedTitle: {
    fontSize: Typography.fontSize.xl,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
  },
  releasedText: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.primary,
  },
  releaseNote: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing['2xl'],
    fontFamily: Typography.fontFamily.primary,
  },
});
