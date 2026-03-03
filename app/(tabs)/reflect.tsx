/**
 * Reflect Screen (Check-in)
 *
 * Multi-step flow:
 * Step 1: Feeling slider (unpleasant to pleasant) + Energy level
 * Step 2: Emotion selection (1-3 max)
 * Step 3: Reason tags (optional)
 * Step 4: Optional journal note → Save
 */

import React, { useMemo, useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Animated,
  TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { TagChip } from '@/components/ui/tag-chip';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { emotionColors } from '@/constants/themes';
import type { EmotionTag, EnergyLevel } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { createJournalEntry } from '@/services/journal-storage';

const ALL_EMOTIONS: EmotionTag[] = [
  'Relaxed', 'Grounded', 'Peaceful', 'Anxious', 'Overwhelmed', 'On edge',
  'Lonely', 'Empty', 'Exhausted', 'Irritated', 'Angry', 'Upset', 'Confused',
  'Mixed', 'Unsure', 'Restless', 'Happy', 'Calm', 'Tense', 'Stressed', 'Sad',
  'Frustrated', 'Neutral', 'Excited', 'Hopeful', 'Grateful', 'Content', 'Worried',
  'Energized', 'Disappointed', 'Proud', 'Tired', 'Confident', 'Uncertain'
];

type ValenceBand = 'unpleasant' | 'neutral' | 'pleasant';
type EnergyBand = 'low' | 'mid' | 'high';

const EMOTION_POOLS: Record<string, EmotionTag[]> = {
  unpleasant_low: ['Sad', 'Tired', 'Exhausted', 'Empty', 'Lonely', 'Disappointed'],
  unpleasant_mid: ['Stressed', 'Anxious', 'Worried', 'Overwhelmed', 'Tense', 'On edge', 'Confused', 'Upset'],
  unpleasant_high: ['Angry', 'Irritated', 'Frustrated', 'Restless', 'On edge', 'Tense', 'Stressed', 'Upset'],
  neutral_low: ['Neutral', 'Unsure', 'Mixed', 'Confused', 'Uncertain'],
  neutral_mid: ['Neutral', 'Mixed', 'Unsure', 'Confused', 'Uncertain', 'Grounded'],
  neutral_high: ['Neutral', 'Mixed', 'Unsure', 'Confused', 'Uncertain', 'Restless'],
  pleasant_low: ['Calm', 'Relaxed', 'Peaceful', 'Content', 'Grounded', 'Grateful'],
  pleasant_mid: ['Content', 'Grateful', 'Happy', 'Calm', 'Confident', 'Hopeful'],
  pleasant_high: ['Happy', 'Excited', 'Energized', 'Hopeful', 'Confident', 'Proud', 'Grateful'],
};

function getValenceBand(pleasantness: number): ValenceBand {
  if (pleasantness <= 40) return 'unpleasant';
  if (pleasantness >= 60) return 'pleasant';
  return 'neutral';
}

function getEnergyBand(energyLevel: EnergyLevel): EnergyBand {
  if (energyLevel <= 2) return 'low';
  if (energyLevel >= 4) return 'high';
  return 'mid';
}

function getEmotionPool(pleasantness: number, energyLevel: EnergyLevel): EmotionTag[] {
  const v = getValenceBand(pleasantness);
  const e = getEnergyBand(energyLevel);
  const key = `${v}_${e}`;
  const pool = EMOTION_POOLS[key] ?? [];
  // Safety: only show emotions we actually support
  return pool.filter((x) => ALL_EMOTIONS.includes(x));
}

const REASONS = [
  'Work / School', 'Family', 'Relationships', 'Health & Body', 'Self',
  'Money', 'Environment', 'Life changes', 'World', 'Other',
  'Sleep & Rest', 'Identity & Purpose', 'Conflict & Boundaries', 'Loss & Grief', 'Creativity & Hobbies', 'News & Society'
];


type ReflectStep = 1 | 2 | 3 | 4 | 'success';

export default function ReflectScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const colors = useColors();
  const [currentStep, setCurrentStep] = useState<ReflectStep>(1);
  const [pleasantness, setPleasantness] = useState(50); // 0 = highly unpleasant, 100 = highly pleasant
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel>(3);
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionTag[]>([]);
  const [journalText, setJournalText] = useState('');
  const filteredEmotionPool = useMemo(() => {
    const pool = getEmotionPool(pleasantness, energyLevel);
    // Always include already-selected emotions so users can unselect even after changing sliders
    const merged: EmotionTag[] = [];
    for (const e of [...pool, ...selectedEmotions]) {
      if (!merged.includes(e)) merged.push(e);
    }
    return merged;
  }, [pleasantness, energyLevel, selectedEmotions]);

  const topEmotions = useMemo(() => filteredEmotionPool.slice(0, 12), [filteredEmotionPool]);
  const moreEmotions = useMemo(
    () => filteredEmotionPool.filter((e) => !topEmotions.includes(e)),
    [filteredEmotionPool, topEmotions],
  );
  const [showMoreEmotions, setShowMoreEmotions] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Animation for success state
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  const toggleEmotion = (emotion: EmotionTag) => {
    if (selectedEmotions.includes(emotion)) {
      setSelectedEmotions(selectedEmotions.filter(e => e !== emotion));
    } else if (selectedEmotions.length < 3) {
      setSelectedEmotions([...selectedEmotions, emotion]);
    }
  };

  const toggleReason = (reason: string) => {
    if (selectedReasons.includes(reason)) {
      setSelectedReasons(selectedReasons.filter(r => r !== reason));
    } else {
      setSelectedReasons([...selectedReasons, reason]);
    }
  };

  const handleNext = () => {
    if (typeof currentStep === 'number' && currentStep < 4) {
      setCurrentStep((currentStep + 1) as ReflectStep);
    }
  };

  const handleBack = () => {
    if (typeof currentStep === 'number' && currentStep > 1) {
      setCurrentStep((currentStep - 1) as ReflectStep);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;
    setIsSaving(true);
    setError(null);
    let saved = false;
    try {
      await createJournalEntry({
        userId: user.id,
        entrySource: 'reflect',
        pleasantness,
        energyLevel,
        emotions: selectedEmotions,
        reasons: selectedReasons.length > 0 ? selectedReasons : undefined,
        journalTextEncrypted: journalText.trim(),
        encryptionKeyId: undefined,
      });
      saved = true;
      setCurrentStep('success');
    } catch (e) {
      console.error('[Reflect] Journal save failed:', e);
      setError('Could not save. Try again.');
    } finally {
      setIsSaving(false);
    }
    if (!saved) return;

    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        friction: 5,
        tension: 80,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    setTimeout(() => {
      resetForm();
      router.replace('/(tabs)/home');
    }, 2000);
  };
  
  const resetForm = () => {
    setCurrentStep(1);
    setPleasantness(50);
    setEnergyLevel(3);
    setSelectedEmotions([]);
    setSelectedReasons([]);
    setJournalText('');
    setShowMoreEmotions(false);
    successScale.setValue(0);
    successOpacity.setValue(0);
  };
  
  const getEmotionColor = (emotion: EmotionTag): string => {
    const colorKey = emotionColors[emotion] || 'primary';
    return colors[colorKey as keyof typeof colors] as string;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return true;
      case 2:
        return selectedEmotions.length > 0;
      case 3:
      case 4:
        return true; // Reasons and journal are optional
      default:
        return false;
    }
  };

  const getPleasantnessLabel = (value: number) => {
    if (value <= 20) return 'Highly Unpleasant';
    if (value <= 40) return 'Unpleasant';
    if (value <= 60) return 'Neutral';
    if (value <= 80) return 'Pleasant';
    return 'Highly Pleasant';
  };

  const styles = createStyles(colors);

  // Success Screen
  if (currentStep === 'success') {
    return (
      <View style={styles.container}>
        <View style={styles.successContainer}>
          <Animated.View 
            style={[
              styles.successContent,
              {
                opacity: successOpacity,
                transform: [{ scale: successScale }],
              },
            ]}
          >
            <View style={[styles.successIconCircle, { backgroundColor: colors.success }]}>
              <Ionicons name="checkmark" size={48} color={colors.successForeground} />
            </View>
            <Text style={styles.successTitle}>You showed up for yourself today.</Text>
            <Text style={styles.successSubtitle}>
              You took a moment to notice how you feel. That matters.
            </Text>
            {selectedEmotions.length > 0 && (
              <View style={styles.successEmotions}>
                {selectedEmotions.map((emotion) => (
                  <View 
                    key={emotion}
                    style={[
                      styles.successEmotionChip,
                      { backgroundColor: getEmotionColor(emotion) + '20', borderColor: getEmotionColor(emotion) }
                    ]}
                  >
                    <Text style={[styles.successEmotionText, { color: getEmotionColor(emotion) }]}>
                      {emotion}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </View>
    );
  }

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>How are you feeling?</Text>

      {/* Pleasantness Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pleasant or unpleasant?</Text>
        <View style={styles.sliderContainer}>
          <View style={styles.sliderLabels}>
            <Text style={styles.sliderLabel}>Highly Unpleasant</Text>
            <Text style={styles.sliderLabel}>Highly Pleasant</Text>
          </View>
          <Slider
            value={pleasantness}
            onValueChange={setPleasantness}
            minimumValue={0}
            maximumValue={100}
            step={1}
          />
          <Text style={styles.sliderValue}>{getPleasantnessLabel(pleasantness)}</Text>
        </View>
      </View>

      {/* Energy Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Energy level</Text>
        <View style={styles.energyButtons}>
          {[1, 2, 3, 4, 5].map((level) => (
            <TouchableOpacity
              key={level}
              onPress={() => setEnergyLevel(level as EnergyLevel)}
              style={[
                styles.energyButton,
                energyLevel === level && styles.energyButtonSelected,
              ]}
            >
              <Text
                style={[
                  styles.energyButtonText,
                  energyLevel === level && styles.energyButtonTextSelected,
                ]}
              >
                {level}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.energyLabels}>
          <Text style={styles.energyLabelText}>Low</Text>
          <Text style={styles.energyLabelText}>High</Text>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What emotions are you feeling right now?</Text>
      <Text style={styles.stepSubtitle}>Pick up to 3</Text>

      {selectedEmotions.length > 0 && (
        <View style={styles.selectedEmotionsTagGrid}>
          {selectedEmotions.map((emotion) => {
            const emotionColor = getEmotionColor(emotion);
            return (
              <TagChip
                key={emotion}
                label={emotion}
                selected
                selectedColor={emotionColor}
                onPress={() => toggleEmotion(emotion)}
                rightElement={<Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.9)" />}
              />
            );
          })}
        </View>
      )}

      <View style={styles.tagGrid}>
        {topEmotions.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion);
          const emotionColor = getEmotionColor(emotion);
          return (
            <TagChip
              key={emotion}
              label={emotion}
              selected={isSelected}
              selectedColor={emotionColor}
              onPress={() => toggleEmotion(emotion)}
              disabled={!isSelected && selectedEmotions.length >= 3}
            />
          );
        })}
      </View>

      {!showMoreEmotions && (
        <TouchableOpacity
          style={styles.moreEmotionsButton}
          onPress={() => setShowMoreEmotions(true)}
        >
          <Text style={styles.moreEmotionsText}>More emotions</Text>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {showMoreEmotions && (
        <View style={styles.moreEmotionsContainer}>
          <View style={styles.tagGrid}>
            {moreEmotions.map((emotion) => {
              const isSelected = selectedEmotions.includes(emotion);
              const emotionColor = getEmotionColor(emotion);
              return (
                <TagChip
                  key={emotion}
                  label={emotion}
                  selected={isSelected}
                  selectedColor={emotionColor}
                  onPress={() => toggleEmotion(emotion)}
                  disabled={!isSelected && selectedEmotions.length >= 3}
                />
              );
            })}
          </View>
          <TouchableOpacity
            style={styles.lessEmotionsButton}
            onPress={() => setShowMoreEmotions(false)}
          >
            <Text style={styles.lessEmotionsText}>Show less</Text>
            <Ionicons name="chevron-up" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What's this related to?</Text>
      <Text style={styles.stepSubtitle}>Optional — pick any that apply</Text>

      <View style={styles.tagGrid}>
        {REASONS.map((reason) => (
          <TagChip
            key={reason}
            label={reason}
            selected={selectedReasons.includes(reason)}
            onPress={() => toggleReason(reason)}
          />
        ))}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Add a note?</Text>
      <Text style={styles.stepSubtitle}>Optional — private and encrypted. Skip if you prefer.</Text>
      <TextInput
        value={journalText}
        onChangeText={setJournalText}
        placeholder="How are you really doing? What’s on your mind?"
        placeholderTextColor={colors.textMuted}
        style={[styles.journalInput, { color: colors.textPrimary, borderColor: colors.borderLight, backgroundColor: colors.surface }]}
        multiline
        textAlignVertical="top"
        numberOfLines={4}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        {currentStep > 1 && (
          <TouchableOpacity onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        {currentStep === 1 && <View style={{ width: 24 }} />}
        <Text style={styles.headerTitle}>Reflect</Text>
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
          <Ionicons name="person-outline" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {[1, 2, 3, 4].map((step) => (
          <View
            key={step}
            style={[
              styles.progressDot,
              currentStep >= step && styles.progressDotActive,
            ]}
          />
        ))}
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* Step Content */}
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}

        {/* Navigation Buttons */}
        <View style={styles.navigationContainer}>
          {currentStep > 1 && (
            <Button
              title="Back"
              onPress={handleBack}
              variant="ghost"
              size="lg"
              fullWidth
            />
          )}
          {currentStep < 4 ? (
            <Button
              title="Next"
              onPress={handleNext}
              size="lg"
              fullWidth
              disabled={!canProceed()}
            />
          ) : (
            <>
              {error ? (
                <Text style={[styles.errorText, { color: colors.destructive }]}>{error}</Text>
              ) : null}
              <Button
                title={isSaving ? "Saving..." : "Save Entry"}
                onPress={handleSave}
                size="lg"
                fullWidth
                loading={isSaving}
              />
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? Spacing['2xl'] : Spacing.xl,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  headerTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.primary,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  stepContainer: {
    marginBottom: Spacing['2xl'],
  },
  stepTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.heading,
  },
  stepSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.lg,
  },
  journalInput: {
    borderWidth: 1,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    minHeight: 120,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
  },
  card: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...Shadows.sm,
  },
  cardTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.lg,
    fontFamily: Typography.fontFamily.heading,
  },
  sliderContainer: {
    marginBottom: Spacing.sm,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  sliderLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  sliderValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.primary,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontFamily: Typography.fontFamily.heading,
  },
  navigationContainer: {
    gap: Spacing.md,
    marginTop: Spacing.xl,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  selectedEmotionsTagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  moreEmotionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  moreEmotionsText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  moreEmotionsContainer: {
    marginTop: Spacing.md,
  },
  lessEmotionsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    marginTop: Spacing.sm,
  },
  lessEmotionsText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  insightsLink: {
    alignItems: 'center',
    marginBottom: Spacing['2xl'],
  },
  insightsLinkText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textDecorationLine: 'underline',
    fontFamily: Typography.fontFamily.primary,
  },
  energyLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.primary,
  },
  energyButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  energyButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: Radius.md,
    backgroundColor: colors.floating,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  energyButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  energyButtonText: {
    fontSize: Typography.fontSize.lg,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.primary,
  },
  energyButtonTextSelected: {
    color: colors.primaryForeground,
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyLabelText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  // Success styles
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: colors.background,
  },
  successContent: {
    alignItems: 'center',
    maxWidth: 300,
  },
  successIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing['2xl'],
  },
  successTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
  },
  successEmotions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  successEmotionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  successEmotionText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
});
