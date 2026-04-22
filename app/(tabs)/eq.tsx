/**
 * EQ Check-In Screen
 * 
 * Quick daily check-in with 5 questions from different types.
 * Designed for minimal friction and maximum insight.
 * 
 * Question Types in Check-In:
 * - 1 Forced Choice
 * - 2 Likert
 * - 1 Emotion Vocabulary
 * - 1 Physiological Proxy
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { selectCheckInQuestions } from '@/data/eq-questions';
import { loadCheckInQuestions } from '@/services/eq-questions-loader';
import { calculateEQScore } from '@/services/eq-scoring';
import {
  startEQAssessmentSession,
  saveResponseToSession,
  completeEQAssessmentSession,
} from '@/services/eq-storage';
import {
  AnimationDuration,
  createQuestionTransition,
  createSelectionWithDelay,
  getQuestionAnimatedStyle,
  getSelectionCheckmarkStyle,
} from '@/styles/animations';
import type {
  EQQuestion,
  EQResponse,
  ForcedChoiceQuestion,
  LikertQuestion,
  EmotionVocabularyQuestion,
  PhysiologicalProxyQuestion,
  ForcedChoiceResponse,
  LikertResponse,
  EmotionVocabularyResponse,
  PhysiologicalProxyResponse,
} from '@/types/eq-assessment';

export default function EQCheckInScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();
  
  const [questions, setQuestions] = useState<EQQuestion[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<EQResponse[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  
  // Per-question state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [likertValue, setLikertValue] = useState(4);
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  
  // Prevent double-submission
  const isTransitioning = useRef(false);

  const [questionsLoading, setQuestionsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const startTime = Date.now();
    setSessionStartTime(startTime);
    setQuestionStartTime(startTime);
    const DB_TIMEOUT_MS = 4000;
    const loadPromise = loadCheckInQuestions();
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => resolve(null), DB_TIMEOUT_MS)
    );
    (async () => {
      try {
        const fromDb = await Promise.race([loadPromise, timeoutPromise]);
        if (cancelled) return;
        const useDb = fromDb && fromDb.length > 0;
        if (__DEV__) console.log('[EQ Check-In] Questions source:', useDb ? `DB (${fromDb.length} selected)` : 'in-code fallback');
        setQuestions(useDb ? fromDb : selectCheckInQuestions());
      } catch (e) {
        if (!cancelled) setQuestions(selectCheckInQuestions());
        if (__DEV__) console.warn('[EQ Check-In] DB load failed, using in-code questions', e);
      } finally {
        if (!cancelled) setQuestionsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (questions.length === 0 || !user?.id) return;
    startEQAssessmentSession(user.id, 'check_in', questions.length)
      .then(setSessionId)
      .catch((e) => console.error('[EQ Check-In] Failed to start session:', e));
  }, [questions.length, user?.id]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex + 1) / questions.length) * 100 : 0;

  // Use centralized transition animation
  const questionTransition = useMemo(
    () => createQuestionTransition(fadeAnim, slideAnim, scaleAnim),
    [fadeAnim, slideAnim, scaleAnim]
  );
  
  const animateTransition = useCallback((callback: () => void) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    
    questionTransition(callback, () => {
      isTransitioning.current = false;
    });
  }, [questionTransition]);
  
  // Use centralized selection animation
  const selectionWithDelay = useMemo(
    () => createSelectionWithDelay(checkmarkAnim, AnimationDuration.selection),
    [checkmarkAnim]
  );
  
  const animateSelection = useCallback((onComplete: () => void) => {
    selectionWithDelay(onComplete);
  }, [selectionWithDelay]);

  const recordResponse = (response: EQResponse) => {
    const newResponses = [...responses, response];
    const orderIndex = newResponses.length - 1;
    setResponses(newResponses);

    const q = questions[currentIndex];
    if (user?.id && sessionId && q) {
      saveResponseToSession(
        sessionId,
        user.id,
        q.id,
        q.type,
        q.dimension,
        response,
        orderIndex
      ).catch((err) => console.error('[EQ Check-In] Failed to save response:', err));
    }

    if (currentIndex < questions.length - 1) {
      animateTransition(() => {
        setCurrentIndex(currentIndex + 1);
        setSelectedChoice(null);
        setLikertValue(4);
        setQuestionStartTime(Date.now());
      });
    } else {
      const assessmentResult = calculateEQScore(
        questions,
        newResponses,
        user?.id ?? '',
        'check_in'
      );
      setResult(assessmentResult);
      setIsComplete(true);
      if (user?.id && sessionId) {
        completeEQAssessmentSession(sessionId, assessmentResult, sessionStartTime).catch((err) => {
          console.error('[EQ Check-In] Failed to complete session:', err);
        });
      }
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      animateTransition(() => {
        setCurrentIndex(currentIndex + 1);
        setSelectedChoice(null);
        setLikertValue(4);
        setQuestionStartTime(Date.now());
      });
    } else {
      const assessmentResult = calculateEQScore(
        questions,
        responses,
        user?.id ?? '',
        'check_in'
      );
      setResult(assessmentResult);
      setIsComplete(true);
      if (user?.id && sessionId) {
        completeEQAssessmentSession(sessionId, assessmentResult, sessionStartTime).catch((err) => {
          console.error('[EQ Check-In] Failed to complete session:', err);
        });
      }
    }
  };

  const handleComplete = () => {
    router.replace('/(tabs)/home');
  };

  const getResponseTime = () => Date.now() - questionStartTime;

  const styles = createStyles(colors);

  // Completion Screen
  if (isComplete && result) {
    return (
      <View style={styles.container}>
        <ScrollView
          contentContainerStyle={styles.completeScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.completeContainer}>
            <View style={[styles.completeIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="checkmark-circle" size={64} color={colors.primary} />
            </View>
            <Text style={styles.completeTitle}>Check-In Complete</Text>
            <Text style={styles.completeDescription}>
              Your responses help track your emotional skill development over time.
            </Text>

            <View style={styles.scoreSummary}>
              <View style={styles.scoreItem}>
                <Text style={styles.scoreLabel}>Overall</Text>
                <Text style={styles.scoreValue}>{result.overallScore}</Text>
              </View>
              {result.strengths.length > 0 && (
                <View style={styles.strengthsContainer}>
                  <Text style={styles.strengthsLabel}>Strengths today:</Text>
                  <Text style={styles.strengthsText}>
                    {result.strengths.map((s: string) => s.replace('_', ' ')).join(', ')}
                  </Text>
                </View>
              )}
            </View>

            <Button
              title="Done"
              onPress={handleComplete}
              size="lg"
              fullWidth
            />

            <TouchableOpacity
              style={styles.fullTestLink}
              onPress={() => router.push('/full-eq-test')}
              activeOpacity={0.7}
            >
              <Text style={styles.fullTestLinkText}>Take the full EQ assessment</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Loading state
  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing your check-in...</Text>
        </View>
      </View>
    );
  }

  // Render question based on type
  const renderQuestion = () => {
    switch (currentQuestion.type) {
      case 'forced_choice':
        return renderForcedChoice(currentQuestion as ForcedChoiceQuestion);
      case 'likert':
        return renderLikert(currentQuestion as LikertQuestion);
      case 'emotion_vocabulary':
        return renderEmotionVocabulary(currentQuestion as EmotionVocabularyQuestion);
      case 'physiological_proxy':
        return renderPhysiologicalProxy(currentQuestion as PhysiologicalProxyQuestion);
      default:
        // For check-in, we only use the 4 types above
        return null;
    }
  };

  // Forced Choice Question
  const renderForcedChoice = (q: ForcedChoiceQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return;
      
      setSelectedChoice(optionId);
      
      animateSelection(() => {
        const response: ForcedChoiceResponse = {
          questionId: q.id,
          type: 'forced_choice',
          mostLikeMe: optionId,
          responseTimeMs: getResponseTime(),
        };
        recordResponse(response);
      });
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.prompt}</Text>
        <View style={styles.optionsContainer}>
          {q.options.map((option) => {
            const isSelected = selectedChoice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.forcedChoiceOption,
                  isSelected && styles.forcedChoiceOptionSelected,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
                disabled={!!selectedChoice}
              >
                <Text style={[
                  styles.forcedChoiceText,
                  isSelected && styles.forcedChoiceTextSelected,
                ]}>
                  {option.text}
                </Text>
                {isSelected && (
                  <Animated.View style={getSelectionCheckmarkStyle(checkmarkAnim)}>
                    <Ionicons name="checkmark-circle" size={24} color={colors.primaryForeground} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Likert Question
  const renderLikert = (q: LikertQuestion) => {
    const handleSubmit = () => {
      const response: LikertResponse = {
        questionId: q.id,
        type: 'likert',
        value: likertValue,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    const scaleLabels = Array.from({ length: q.scale }, (_, i) => i + 1);

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionStatement}>{q.statement}</Text>
        
        <View style={styles.likertContainer}>
          <View style={styles.likertScale}>
            {scaleLabels.map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.likertButton,
                  likertValue === num && styles.likertButtonSelected,
                ]}
                onPress={() => setLikertValue(num)}
              >
                <Text style={[
                  styles.likertButtonText,
                  likertValue === num && styles.likertButtonTextSelected,
                ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.likertLabels}>
            <Text style={styles.likertLabel}>{q.anchorLabels.low}</Text>
            <Text style={styles.likertLabel}>{q.anchorLabels.high}</Text>
          </View>
        </View>
        
        <Button
          title="Next"
          onPress={handleSubmit}
          fullWidth
          size="lg"
        />
      </View>
    );
  };

  // Emotion Vocabulary Question
  const renderEmotionVocabulary = (q: EmotionVocabularyQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return;
      
      setSelectedChoice(optionId);
      
      animateSelection(() => {
        const response: EmotionVocabularyResponse = {
          questionId: q.id,
          type: 'emotion_vocabulary',
          selectedOptionId: optionId,
          responseTimeMs: getResponseTime(),
        };
        recordResponse(response);
      });
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionLabel}>Which emotion best fits:</Text>
        <Text style={styles.scenarioText}>"{q.scenario}"</Text>
        
        <View style={styles.emotionOptions}>
          {q.options.map((option) => {
            const isSelected = selectedChoice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.emotionOption,
                  isSelected && styles.emotionOptionSelected,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
                disabled={!!selectedChoice}
              >
                <Text style={[
                  styles.emotionOptionText,
                  isSelected && styles.emotionOptionTextSelected,
                ]}>
                  {option.emotion}
                </Text>
                {isSelected && (
                  <Animated.View style={[
                    { marginLeft: Spacing.sm },
                    getSelectionCheckmarkStyle(checkmarkAnim),
                  ]}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />
                  </Animated.View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Physiological Proxy Question
  const renderPhysiologicalProxy = (q: PhysiologicalProxyQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return;
      
      setSelectedChoice(optionId);
      
      animateSelection(() => {
        const response: PhysiologicalProxyResponse = {
          questionId: q.id,
          type: 'physiological_proxy',
          selectedOptionId: optionId,
          responseTimeMs: getResponseTime(),
        };
        recordResponse(response);
      });
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.prompt}</Text>
        
        <View style={styles.physioOptions}>
          {q.options.map((option) => {
            const isSelected = selectedChoice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.physioOption,
                  isSelected && styles.physioOptionSelected,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
                disabled={!!selectedChoice}
              >
                <View style={styles.physioOptionContent}>
                  <Text style={[
                    styles.physioOptionText,
                    isSelected && styles.physioOptionTextSelected,
                  ]}>
                    {option.text}
                  </Text>
                  {isSelected && (
                    <Animated.View style={getSelectionCheckmarkStyle(checkmarkAnim)}>
                      <Ionicons name="checkmark-circle" size={20} color={colors.primaryForeground} />
                    </Animated.View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  if (questionsLoading || questions.length === 0) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text style={styles.loadingText}>Loading questions…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader title="EQ Check-in" backFallbackHref="/(tabs)/home" showHomeButton />
      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerText}>
          Question {currentIndex + 1} of {questions.length}
        </Text>
        <Text style={styles.headerSubtext}>
          Quick check-in • Skip anytime
        </Text>
      </View>

      {/* Question */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={[
            styles.questionWrapper,
            getQuestionAnimatedStyle(fadeAnim, slideAnim, scaleAnim),
          ]}
        >
          {renderQuestion()}
        </Animated.View>
      </ScrollView>

      {/* Skip button */}
      <View style={[styles.skipContainer, { paddingBottom: Math.max(insets.bottom, 8) + 64 }]}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
    width: '100%',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  header: {
    padding: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  headerText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  headerSubtext: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  scrollContent: {
    flexGrow: 1,
    padding: Spacing.lg,
    justifyContent: 'center',
  },
  questionWrapper: {
    flex: 1,
    justifyContent: 'center',
  },
  questionContent: {
    gap: Spacing.xl,
  },
  questionPrompt: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
  },
  questionStatement: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  questionLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  scenarioText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.primary,
    paddingHorizontal: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  // Forced Choice styles
  forcedChoiceOption: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Shadows.sm,
  },
  forcedChoiceOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  forcedChoiceText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
    flex: 1,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  forcedChoiceTextSelected: {
    color: colors.primaryForeground,
    fontWeight: Typography.fontWeight.medium,
  },
  // Likert styles
  likertContainer: {
    gap: Spacing.md,
  },
  likertScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  likertButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 48,
    borderRadius: Radius.md,
    backgroundColor: colors.floating,
    borderWidth: 2,
    borderColor: colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  likertButtonSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  likertButtonText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
  },
  likertButtonTextSelected: {
    color: colors.primaryForeground,
  },
  likertLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  likertLabel: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    maxWidth: '40%',
  },
  // Emotion Vocabulary styles
  emotionOptions: {
    gap: Spacing.sm,
  },
  emotionOption: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emotionOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  emotionOptionText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
  },
  emotionOptionTextSelected: {
    color: colors.primaryForeground,
  },
  // Physiological Proxy styles
  physioOptions: {
    gap: Spacing.md,
  },
  physioOption: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  physioOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  physioOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  physioOptionText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
    flex: 1,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  physioOptionTextSelected: {
    color: colors.primaryForeground,
  },
  // Skip button
  skipContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  // Complete screen
  completeScrollContent: {
    flexGrow: 1,
    padding: Spacing.xl,
    paddingBottom: 120,
  },
  completeContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  completeIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  completeTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
  },
  completeDescription: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    textAlign: 'center',
    marginBottom: Spacing['2xl'],
    fontFamily: Typography.fontFamily.primary,
    maxWidth: 300,
  },
  scoreSummary: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing['2xl'],
    width: '100%',
    alignItems: 'center',
  },
  scoreItem: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  scoreLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
    marginBottom: Spacing.xs,
  },
  scoreValue: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.primary,
    fontFamily: Typography.fontFamily.heading,
  },
  strengthsContainer: {
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  strengthsLabel: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    fontFamily: Typography.fontFamily.primary,
  },
  strengthsText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
    textTransform: 'capitalize',
  },
  fullTestLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    minHeight: 48,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fullTestLinkText: {
    fontSize: Typography.fontSize.base,
    color: colors.primary,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.primary,
  },
});
