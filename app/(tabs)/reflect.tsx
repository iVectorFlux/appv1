/**
 * Reflect Screen (Journal)
 * 
 * Multi-step flow:
 * Step 1: Feeling slider (unpleasant to pleasant) + Energy level
 * Step 2: Emotion selection (1-3 max)
 * Step 3: Reason tags (optional)
 * Step 4: Private journal input
 * 
 * PRIVACY: Journal text is encrypted and never analyzed.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { emotionColors } from '@/constants/themes';
import type { EmotionTag, EnergyLevel } from '@/types';
import { Ionicons } from '@expo/vector-icons';
import { createJournalEntry } from '@/services/journal-storage';
import { encryptJournalText } from '@/services/encryption';

const ALL_EMOTIONS: EmotionTag[] = [
  'Relaxed', 'Grounded', 'Peaceful', 'Anxious', 'Overwhelmed', 'On edge',
  'Lonely', 'Empty', 'Exhausted', 'Irritated', 'Angry', 'Upset', 'Confused',
  'Mixed', 'Unsure', 'Restless', 'Happy', 'Calm', 'Tense', 'Stressed', 'Sad',
  'Frustrated', 'Neutral', 'Excited', 'Hopeful', 'Grateful', 'Content', 'Worried',
  'Energized', 'Disappointed', 'Proud', 'Tired', 'Confident', 'Uncertain'
];

// Top emotions shown first (12 most common)
const TOP_EMOTIONS: EmotionTag[] = [
  'Happy', 'Calm', 'Anxious', 'Stressed', 'Sad', 'Tired',
  'Relaxed', 'Overwhelmed', 'Frustrated', 'Peaceful', 'Worried', 'Content'
];

// Remaining emotions
const MORE_EMOTIONS: EmotionTag[] = ALL_EMOTIONS.filter(emotion => !TOP_EMOTIONS.includes(emotion));

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
  const [showMoreEmotions, setShowMoreEmotions] = useState(false);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [journalText, setJournalText] = useState('');
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

  const getPlaceholder = () => {
    if (selectedEmotions.length === 0) return "What's on your mind?";
    if (selectedEmotions.length === 1) return `You're feeling ${selectedEmotions[0]}. Want to write about it?`;
    return `You're feeling ${selectedEmotions.join(' and ')}. Want to write about it?`;
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
      const textToSave = journalText.trim();
      const { encrypted, keyId } = textToSave
        ? await encryptJournalText(textToSave, user.id)
        : { encrypted: '', keyId: `encryption_key_${user.id}` };
      await createJournalEntry({
        userId: user.id,
        entrySource: 'reflect',
        pleasantness,
        energyLevel,
        emotions: selectedEmotions,
        reasons: selectedReasons.length > 0 ? selectedReasons : undefined,
        journalTextEncrypted: encrypted,
        encryptionKeyId: keyId,
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
        return true; // Always can proceed from step 1
      case 2:
        return selectedEmotions.length > 0; // Need at least one emotion
      case 3:
        return true; // Reasons are optional
      case 4:
        return true; // Journal is optional
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
      <Text style={styles.stepTitle}>Select emotions</Text>

      {selectedEmotions.length > 0 && (
        <View style={styles.selectedEmotionsContainer}>
          {selectedEmotions.map((emotion) => {
            const emotionColor = getEmotionColor(emotion);
            return (
              <TouchableOpacity
                key={emotion}
                style={[styles.selectedEmotionChip, { backgroundColor: emotionColor }]}
                onPress={() => toggleEmotion(emotion)}
              >
                <Text style={[styles.selectedEmotionText, { color: '#FFFFFF' }]}>{emotion}</Text>
                <Ionicons name="close-circle" size={16} color="rgba(255,255,255,0.9)" />
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View style={styles.emotionGrid}>
        {TOP_EMOTIONS.map((emotion) => {
          const isSelected = selectedEmotions.includes(emotion);
          const emotionColor = getEmotionColor(emotion);
          return (
            <TouchableOpacity
              key={emotion}
              onPress={() => toggleEmotion(emotion)}
              style={[
                styles.emotionChip,
                isSelected && { backgroundColor: emotionColor, borderColor: emotionColor },
                !isSelected && { borderLeftWidth: 3, borderLeftColor: emotionColor },
              ]}
              disabled={!isSelected && selectedEmotions.length >= 3}
            >
              <Text
                style={[
                  styles.emotionChipText,
                  isSelected && { color: '#FFFFFF' },
                ]}
              >
                {emotion}
              </Text>
            </TouchableOpacity>
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
          <View style={styles.moreEmotionsGrid}>
            {MORE_EMOTIONS.map((emotion) => {
              const isSelected = selectedEmotions.includes(emotion);
              const emotionColor = getEmotionColor(emotion);
              return (
                <TouchableOpacity
                  key={emotion}
                  onPress={() => toggleEmotion(emotion)}
                  style={[
                    styles.emotionChip,
                    isSelected && { backgroundColor: emotionColor, borderColor: emotionColor },
                    !isSelected && { borderLeftWidth: 3, borderLeftColor: emotionColor },
                  ]}
                  disabled={!isSelected && selectedEmotions.length >= 3}
                >
                  <Text
                    style={[
                      styles.emotionChipText,
                      isSelected && { color: '#FFFFFF' },
                    ]}
                  >
                    {emotion}
                  </Text>
                </TouchableOpacity>
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

      <View style={styles.reasonGrid}>
        {REASONS.map((reason) => {
          const isSelected = selectedReasons.includes(reason);
          return (
            <TouchableOpacity
              key={reason}
              onPress={() => toggleReason(reason)}
              style={[
                styles.reasonChip,
                isSelected && styles.reasonChipSelected,
              ]}
            >
              <Text style={[
                styles.reasonChipText,
                isSelected && styles.reasonChipTextSelected,
              ]}>
                {reason}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Journal</Text>

      <TextInput
        value={journalText}
        onChangeText={setJournalText}
        placeholder={getPlaceholder()}
        placeholderTextColor={colors.textMuted}
        multiline
        style={styles.journalInput}
        textAlignVertical="top"
      />

      <View style={styles.privacySection}>
        <View style={styles.privacyPill}>
          <Ionicons name="lock-closed" size={14} color={colors.primary} />
          <Text style={styles.privacyText}>Private & encrypted</Text>
        </View>
        <Text style={styles.privacyNote}>
          Your writing stays on your device. We never read it. Entries from Check in appear in Journal History too.
        </Text>
      </View>
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
    marginBottom: Spacing.sm,
    fontFamily: Typography.fontFamily.heading,
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
  selectedEmotionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
    justifyContent: 'flex-start',
  },
  selectedEmotionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.primary,
  },
  selectedEmotionText: {
    color: colors.primaryForeground,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  emotionSection: {
    marginBottom: Spacing['2xl'],
  },
  emotionSectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.heading,
  },
  emotionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emotionChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.floating,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  emotionChipSelected: {
    borderColor: colors.primary,
  },
  emotionChipText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
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
  moreEmotionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
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
  journalSection: {
    marginTop: Spacing.xl,
    gap: Spacing.lg,
  },
  journalInput: {
    minHeight: 200,
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    fontFamily: Typography.fontFamily.primary,
    padding: Spacing.lg,
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
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
  reasonSection: {
    marginTop: Spacing.md,
  },
  reasonLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.primary,
  },
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  reasonChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.floating,
  },
  reasonChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  reasonChipText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  reasonChipTextSelected: {
    color: colors.primaryForeground,
  },
  privacySection: {
    marginTop: Spacing['3xl'],
    alignItems: 'center',
    gap: Spacing.sm,
  },
  privacyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    backgroundColor: colors.surface,
  },
  privacyText: {
    fontSize: Typography.fontSize.xs,
    color: colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.5,
    fontFamily: Typography.fontFamily.primary,
  },
  privacyNote: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xs,
    textAlign: 'center',
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
