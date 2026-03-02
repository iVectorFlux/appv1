/**
 * Full EQ Assessment Screen
 * 
 * Comprehensive EQ test with all 7 question types.
 * Accessible from Profile section.
 * ~25 minutes, ~60 questions.
 * 
 * Provides detailed scoring with:
 * - Dimension breakdown
 * - Strengths and growth areas
 * - Self-awareness calibration
 * - Consistency indicators
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
  Platform,
  Alert,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { selectFullTestQuestions } from '@/data/eq-questions';
import { calculateEQScore, getScoreLevel, getScoreLevelDescription, getDimensionDescription } from '@/services/eq-scoring';
import { loadFullTestQuestions } from '@/services/eq-questions-loader';
import {
  startEQAssessmentSession,
  saveResponseToSession,
  completeEQAssessmentSession,
} from '@/services/eq-storage';
import {
  AnimationDuration,
  AnimationConfigs,
  TransitionValues,
  createQuestionTransition,
  createSelectionWithDelay,
  getQuestionAnimatedStyle,
  getSelectionCheckmarkStyle,
  getProgressBarWidth,
} from '@/styles/animations';
import { createSharedStyles } from '@/styles/shared';
import type {
  EQQuestion,
  EQResponse,
  EQDimension,
  EQAssessmentResult,
  ForcedChoiceQuestion,
  LikertQuestion,
  EmotionVocabularyQuestion,
  MetaEQQuestion,
  PhysiologicalProxyQuestion,
  ConsistencyProbeQuestion,
  RankingAllocationQuestion,
  SJTDecisionQuestion,
  EmotionPerceptionQuestion,
  ForcedChoiceResponse,
  LikertResponse,
  EmotionVocabularyResponse,
  MetaEQResponse,
  PhysiologicalProxyResponse,
  ConsistencyProbeResponse,
  RankingAllocationResponse,
  SJTDecisionResponse,
  EmotionPerceptionResponse,
} from '@/types/eq-assessment';

type ScreenState = 'intro' | 'test' | 'results';

export default function FullEQTestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  const [screenState, setScreenState] = useState<ScreenState>('intro');
  const [questions, setQuestions] = useState<EQQuestion[]>([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [responses, setResponses] = useState<EQResponse[]>([]);
  const [result, setResult] = useState<EQAssessmentResult | null>(null);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());

  // Per-question state
  const [questionStartTime, setQuestionStartTime] = useState<number>(Date.now());
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [selectedLeast, setSelectedLeast] = useState<string | null>(null);
  const [likertValue, setLikertValue] = useState(4);
  const [selfRating, setSelfRating] = useState(4);
  const [otherRating, setOtherRating] = useState(4);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const checkmarkAnim = useRef(new Animated.Value(0)).current;
  
  // Flag to prevent double-submission
  const isTransitioning = useRef(false);
  
  // Memoized shared styles
  const sharedStyles = useMemo(() => createSharedStyles(colors), [colors]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setQuestionsLoading(true);
      const fromDb = await loadFullTestQuestions();
      if (cancelled) return;
      const useDb = fromDb && fromDb.length > 0;
      if (__DEV__) console.log('[Full EQ Test] Questions source:', useDb ? `DB (${fromDb.length} selected)` : 'in-code fallback');
      setQuestions(useDb ? fromDb : selectFullTestQuestions());
      setQuestionsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);
  
  // Animate progress bar
  useEffect(() => {
    const targetProgress = questions.length > 0 ? (currentIndex / questions.length) * 100 : 0;
    Animated.timing(progressAnim, {
      toValue: targetProgress,
      ...AnimationConfigs.progressBar,
    }).start();
  }, [currentIndex, questions.length, progressAnim]);

  const currentQuestion = questions[currentIndex];
  const progress = questions.length > 0 ? ((currentIndex) / questions.length) * 100 : 0;

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

  const resetQuestionState = () => {
    setSelectedChoice(null);
    setSelectedLeast(null);
    setLikertValue(4);
    setSelfRating(4);
    setOtherRating(4);
    setAllocations({});
    setQuestionStartTime(Date.now());
  };

  /** Restore per-question state from a previously recorded response (for Back / edit). */
  const restoreStateFromResponse = (question: EQQuestion, response: EQResponse) => {
    setQuestionStartTime(Date.now());
    if (response.type === 'forced_choice') {
      setSelectedChoice(response.mostLikeMe);
      setSelectedLeast(response.leastLikeMe ?? null);
      setLikertValue(4);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations({});
      return;
    }
    if (response.type === 'likert') {
      setSelectedChoice(null);
      setSelectedLeast(null);
      setLikertValue(response.value);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations({});
      return;
    }
    if (response.type === 'emotion_vocabulary' || response.type === 'physiological_proxy') {
      setSelectedChoice(response.selectedOptionId);
      setSelectedLeast(null);
      setLikertValue(4);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations({});
      return;
    }
    if (response.type === 'meta_eq') {
      setSelectedChoice(null);
      setSelectedLeast(null);
      setLikertValue(4);
      setSelfRating(response.selfRating);
      setOtherRating(response.otherRating);
      setAllocations({});
      return;
    }
    if (response.type === 'consistency_probe') {
      setSelectedChoice(null);
      setSelectedLeast(null);
      setLikertValue(response.value);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations({});
      return;
    }
    if (response.type === 'ranking_allocation') {
      setSelectedChoice(null);
      setSelectedLeast(null);
      setLikertValue(4);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations(response.allocations ?? {});
      return;
    }
    if (response.type === 'sjt_decision' || response.type === 'emotion_perception') {
      setSelectedChoice(response.selectedOptionId);
      setSelectedLeast(null);
      setLikertValue(4);
      setSelfRating(4);
      setOtherRating(4);
      setAllocations({});
      return;
    }
    resetQuestionState();
  };

  const handleBack = () => {
    if (currentIndex <= 0 || responses.length === 0) return;
    const prevIndex = currentIndex - 1;
    const prevQuestion = questions[prevIndex];
    const prevResponse = responses[responses.length - 1];
    setResponses(responses.slice(0, -1));
    setCurrentIndex(prevIndex);
    restoreStateFromResponse(prevQuestion, prevResponse);
  };

  const recordResponse = (response: EQResponse) => {
    const newResponses = [...responses, response];
    const orderIndex = newResponses.length - 1;
    setResponses(newResponses);

    if (user?.id && sessionId && currentQuestion) {
      saveResponseToSession(
        sessionId,
        user.id,
        currentQuestion.id,
        currentQuestion.type,
        currentQuestion.dimension,
        response,
        orderIndex
      ).catch((err) => console.error('[Full EQ Test] Failed to save response:', err));
    }

    if (currentIndex < questions.length - 1) {
      animateTransition(() => {
        setCurrentIndex(currentIndex + 1);
        resetQuestionState();
      });
    } else {
      const assessmentResult = calculateEQScore(
        questions,
        newResponses,
        user?.id ?? '',
        'full_test'
      );
      setResult(assessmentResult);
      setScreenState('results');
      if (user?.id && sessionId) {
        completeEQAssessmentSession(sessionId, assessmentResult, sessionStartTime).catch((err) => {
          console.error('[Full EQ Test] Failed to complete session:', err);
        });
      }
    }
  };

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      animateTransition(() => {
        setCurrentIndex(currentIndex + 1);
        resetQuestionState();
      });
    } else {
      const assessmentResult = calculateEQScore(
        questions,
        responses,
        user?.id ?? '',
        'full_test'
      );
      setResult(assessmentResult);
      setScreenState('results');
      if (user?.id && sessionId) {
        completeEQAssessmentSession(sessionId, assessmentResult, sessionStartTime).catch((err) => {
          console.error('[Full EQ Test] Failed to complete session:', err);
        });
      }
    }
  };

  const handleExit = () => {
    const doExit = () => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/profile');
      }
    };
    
    // Alert.alert doesn't work on web, use confirm instead
    if (Platform.OS === 'web') {
      if (responses.length === 0 || window.confirm('Exit Assessment?\n\nYour progress will be lost. Are you sure you want to exit?')) {
        doExit();
      }
    } else {
      if (responses.length === 0) {
        // No responses yet, just exit
        doExit();
      } else {
        Alert.alert(
          'Exit Assessment?',
          'Your progress will be lost. Are you sure you want to exit?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Exit', style: 'destructive', onPress: doExit },
          ]
        );
      }
    }
  };

  const getResponseTime = () => Date.now() - questionStartTime;

  const styles = createStyles(colors);

  // Intro Screen
  if (screenState === 'intro') {
    return (
      <View style={styles.container}>
        <View style={styles.introContainer}>
          <View style={[styles.introIconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="analytics" size={48} color={colors.primary} />
          </View>
          
          <Text style={styles.introTitle}>Full EQ Assessment</Text>
          <Text style={styles.introDescription}>
            This comprehensive assessment measures your emotional intelligence across 5 dimensions using 7 different question types.
          </Text>
          
          <View style={styles.infoCards}>
            <View style={styles.infoCard}>
              <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>~25 minutes</Text>
            </View>
            <View style={styles.infoCard}>
              <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.infoText}>
                {questionsLoading ? '…' : `${questions.length} questions`}
              </Text>
            </View>
          </View>
          
          <View style={styles.dimensionsList}>
            <Text style={styles.dimensionsTitle}>What we measure:</Text>
            {(['self_awareness', 'self_regulation', 'empathy', 'social_skills', 'motivation', 'resilience'] as EQDimension[]).map((dim) => (
              <View key={dim} style={styles.dimensionItem}>
                <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                <Text style={styles.dimensionText}>
                  {dim.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
              </View>
            ))}
          </View>
          
          <Button
            title={questionsLoading ? 'Loading questions…' : 'Begin Assessment'}
            disabled={questionsLoading || questions.length === 0}
            onPress={async () => {
              if (!user?.id || questions.length === 0) return;
              const startTime = Date.now();
              setSessionStartTime(startTime);
              setQuestionStartTime(startTime);
              try {
                const sid = await startEQAssessmentSession(user.id, 'full_test', questions.length);
                setSessionId(sid);
              } catch (e) {
                console.error('[Full EQ Test] Failed to start session:', e);
              }
              setScreenState('test');
            }}
            size="lg"
            fullWidth
          />
          
          <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={styles.backLinkText}>Back to Profile</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Results Screen
  if (screenState === 'results' && result) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.resultsContainer}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Your EQ Profile</Text>
          <Text style={styles.resultsSubtitle}>
            Based on {result.responses.length} responses
          </Text>
        </View>
        
        {/* Overall Score */}
        <View style={styles.overallScoreCard}>
          <Text style={styles.overallScoreLabel}>Overall EQ Score</Text>
          <Text style={styles.overallScoreValue}>{result.overallScore}</Text>
          <Text style={styles.overallScoreLevel}>
            {getScoreLevel(result.overallScore).replace('_', ' ').toUpperCase()}
          </Text>
        </View>
        
        {/* Dimension Breakdown */}
        <View style={styles.dimensionsCard}>
          <Text style={styles.cardTitle}>Dimension Breakdown</Text>
          
          {(Object.entries(result.dimensionScores) as [EQDimension, number][]).map(([dim, score]) => (
            <View key={dim} style={styles.dimensionRow}>
              <View style={styles.dimensionInfo}>
                <Text style={styles.dimensionName}>
                  {dim.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Text>
                <Text style={styles.dimensionScore}>{score}</Text>
              </View>
              <View style={styles.dimensionBar}>
                <View style={[styles.dimensionBarFill, { width: `${score}%` }]} />
              </View>
            </View>
          ))}
        </View>
        
        {/* Strengths & Growth */}
        <View style={styles.insightsCard}>
          <View style={styles.insightSection}>
            <View style={styles.insightHeader}>
              <Ionicons name="star" size={20} color={colors.accentEnergy} />
              <Text style={styles.insightTitle}>Top Strengths</Text>
            </View>
            {result.strengths.map((s, i) => (
              <Text key={i} style={styles.insightItem}>
                • {s.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            ))}
          </View>
          
          <View style={[styles.insightSection, styles.insightSectionLast]}>
            <View style={styles.insightHeader}>
              <Ionicons name="trending-up" size={20} color={colors.secondary} />
              <Text style={styles.insightTitle}>Growth Opportunities</Text>
            </View>
            {result.growthAreas.map((g, i) => (
              <Text key={i} style={styles.insightItem}>
                • {g.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            ))}
          </View>
        </View>
        
        {/* Insights */}
        {result.insights.length > 0 && (
          <View style={styles.insightsTextCard}>
            <Text style={styles.cardTitle}>Personalized Insights</Text>
            {result.insights.map((insight, i) => (
              <Text key={i} style={styles.insightText}>
                {insight}
              </Text>
            ))}
          </View>
        )}
        
        {/* Unreliable Warning */}
        {result.qualityIndicators.isUnreliable && (
          <View style={styles.unreliableWarning}>
            <Ionicons name="warning" size={24} color={colors.warning} />
            <View style={styles.unreliableContent}>
              <Text style={styles.unreliableTitle}>Results May Be Unreliable</Text>
              <Text style={styles.unreliableText}>
                Your consistency score was {Math.round(result.qualityIndicators.consistencyIndex * 100)}% (below 40% threshold). 
                Consider retaking when you have more time to focus on each question.
              </Text>
            </View>
          </View>
        )}
        
        {/* Quality Indicators */}
        <View style={styles.qualityCard}>
          <Text style={styles.qualityTitle}>Assessment Quality</Text>
          
          {/* Consistency with penalty info */}
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Consistency</Text>
            <View style={styles.qualityValueContainer}>
              <Text style={[
                styles.qualityValue,
                result.qualityIndicators.consistencyIndex < 0.4 && styles.qualityValueWarning,
                result.qualityIndicators.consistencyIndex >= 0.7 && styles.qualityValueGood,
              ]}>
                {Math.round(result.qualityIndicators.consistencyIndex * 100)}%
              </Text>
              {result.qualityIndicators.consistencyPenalty > 0 && (
                <Text style={styles.penaltyBadge}>
                  -{Math.round(result.qualityIndicators.consistencyPenalty)} pts
                </Text>
              )}
            </View>
          </View>
          
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Completion</Text>
            <Text style={[
              styles.qualityValue,
              result.qualityIndicators.completionRate >= 0.9 && styles.qualityValueGood,
            ]}>
              {Math.round(result.qualityIndicators.completionRate * 100)}%
            </Text>
          </View>
          
          <View style={styles.qualityRow}>
            <Text style={styles.qualityLabel}>Self-Awareness Calibration</Text>
            <Text style={[
              styles.qualityValue,
              result.qualityIndicators.selfAwarenessCalibration >= 0.7 && styles.qualityValueGood,
            ]}>
              {Math.round(result.qualityIndicators.selfAwarenessCalibration * 100)}%
            </Text>
          </View>
          
          {/* Consistency level explanation */}
          <View style={styles.consistencyExplanation}>
            <Text style={styles.consistencyExplanationText}>
              {result.qualityIndicators.consistencyPenaltyLevel === 'none' && '✓ Excellent response consistency'}
              {result.qualityIndicators.consistencyPenaltyLevel === 'mild' && '○ Minor response variability detected'}
              {result.qualityIndicators.consistencyPenaltyLevel === 'moderate' && '△ Moderate response variability detected'}
              {result.qualityIndicators.consistencyPenaltyLevel === 'severe' && '⚠ Significant response inconsistency'}
            </Text>
          </View>
        </View>
        
        <Button
          title="Done"
          onPress={() => router.replace('/(tabs)/profile')}
          size="lg"
          fullWidth
        />
        
        <Text style={styles.disclaimerText}>
          This assessment is for self-reflection purposes and is not a clinical diagnosis.
        </Text>
      </ScrollView>
    );
  }

  // Test Screen - Loading
  if (!currentQuestion) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Preparing assessment...</Text>
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
      case 'meta_eq':
        return renderMetaEQ(currentQuestion as MetaEQQuestion);
      case 'physiological_proxy':
        return renderPhysiologicalProxy(currentQuestion as PhysiologicalProxyQuestion);
      case 'consistency_probe':
        return renderConsistencyProbe(currentQuestion as ConsistencyProbeQuestion);
      case 'ranking_allocation':
        return renderRankingAllocation(currentQuestion as RankingAllocationQuestion);
      case 'sjt_decision':
        return renderSJTDecision(currentQuestion as SJTDecisionQuestion);
      case 'emotion_perception':
        return renderEmotionPerception(currentQuestion as EmotionPerceptionQuestion);
      default:
        return null;
    }
  };

  // Forced Choice
  const renderForcedChoice = (q: ForcedChoiceQuestion) => {
    const canSubmit = selectedChoice !== null && (!q.selectLeast || selectedLeast !== null);
    
    const handleSubmit = () => {
      if (!canSubmit) return;
      const response: ForcedChoiceResponse = {
        questionId: q.id,
        type: 'forced_choice',
        mostLikeMe: selectedChoice!,
        leastLikeMe: selectedLeast || undefined,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.prompt}</Text>
        
        {q.selectLeast && (
          <Text style={styles.questionHint}>
            Select your MOST and LEAST like you
          </Text>
        )}
        
        <View style={styles.optionsContainer}>
          {q.options.map((option) => {
            const isMost = selectedChoice === option.id;
            const isLeast = selectedLeast === option.id;
            
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.forcedChoiceOption,
                  isMost && styles.forcedChoiceOptionMost,
                  isLeast && styles.forcedChoiceOptionLeast,
                ]}
                onPress={() => {
                  if (q.selectLeast) {
                    // Toggle logic for most/least
                    if (isMost) {
                      setSelectedChoice(null);
                    } else if (isLeast) {
                      setSelectedLeast(null);
                    } else if (!selectedChoice) {
                      setSelectedChoice(option.id);
                    } else if (!selectedLeast) {
                      setSelectedLeast(option.id);
                    }
                  } else {
                    setSelectedChoice(option.id);
                  }
                }}
              >
                <Text style={[
                  styles.forcedChoiceText,
                  (isMost || isLeast) && styles.forcedChoiceTextSelected,
                ]}>
                  {option.text}
                </Text>
                {isMost && (
                  <View style={styles.choiceBadge}>
                    <Text style={styles.choiceBadgeText}>MOST</Text>
                  </View>
                )}
                {isLeast && (
                  <View style={[styles.choiceBadge, styles.choiceBadgeLeast]}>
                    <Text style={styles.choiceBadgeText}>LEAST</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
        
        <Button
          title="Next"
          onPress={handleSubmit}
          fullWidth
          size="lg"
          disabled={!canSubmit}
        />
      </View>
    );
  };

  // Likert
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

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionStatement}>{q.statement}</Text>
        
        <View style={styles.likertContainer}>
          <View style={styles.likertScale}>
            {Array.from({ length: q.scale }, (_, i) => i + 1).map((num) => (
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
        
        <Button title="Next" onPress={handleSubmit} fullWidth size="lg" />
      </View>
    );
  };

  // Emotion Vocabulary
  const renderEmotionVocabulary = (q: EmotionVocabularyQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return; // Prevent double-tap
      
      setSelectedChoice(optionId);
      
      // Use selection animation, then transition
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
                    styles.selectionCheckmark,
                    getSelectionCheckmarkStyle(checkmarkAnim),
                  ]}>
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

  // SJT Decision
  const renderSJTDecision = (q: SJTDecisionQuestion) => {
    const handleSubmit = () => {
      if (!selectedChoice) return;
      const response: SJTDecisionResponse = {
        questionId: q.id,
        type: 'sjt_decision',
        selectedOptionId: selectedChoice,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.scenario}</Text>
        <Text style={styles.questionHint}>Which response is most effective?</Text>
        <View style={styles.optionsContainer}>
          {q.options.map((option) => {
            const isSelected = selectedChoice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.forcedChoiceOption,
                  isSelected && styles.forcedChoiceOptionMost,
                ]}
                onPress={() => setSelectedChoice(option.id)}
              >
                <Text style={[
                  styles.forcedChoiceText,
                  isSelected && styles.forcedChoiceTextSelected,
                ]}>
                  {option.text}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <Button
          title="Next"
          onPress={handleSubmit}
          fullWidth
          size="lg"
          disabled={!selectedChoice}
        />
      </View>
    );
  };

  // Emotion Perception
  const renderEmotionPerception = (q: EmotionPerceptionQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return;
      setSelectedChoice(optionId);
      animateSelection(() => {
        const response: EmotionPerceptionResponse = {
          questionId: q.id,
          type: 'emotion_perception',
          selectedOptionId: optionId,
          responseTimeMs: getResponseTime(),
        };
        recordResponse(response);
      });
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.scenario}</Text>
        <Text style={styles.questionHint}>What emotion best fits?</Text>
        <View style={styles.optionsContainer}>
          {q.options.map((option) => {
            const isSelected = selectedChoice === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.forcedChoiceOption,
                  isSelected && styles.forcedChoiceOptionMost,
                ]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
                disabled={!!selectedChoice}
              >
                <Text style={[
                  styles.forcedChoiceText,
                  isSelected && styles.forcedChoiceTextSelected,
                ]}>
                  {option.emotion}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // Meta-EQ
  const renderMetaEQ = (q: MetaEQQuestion) => {
    const handleSubmit = () => {
      const response: MetaEQResponse = {
        questionId: q.id,
        type: 'meta_eq',
        selfRating,
        otherRating,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    return (
      <View style={styles.questionContent}>
        <View style={styles.metaEQSection}>
          <Text style={styles.metaEQLabel}>Rate yourself:</Text>
          <Text style={styles.metaEQStatement}>"{q.selfStatement}"</Text>
          <View style={styles.likertScale}>
            {Array.from({ length: q.scale }, (_, i) => i + 1).map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.likertButton,
                  selfRating === num && styles.likertButtonSelected,
                ]}
                onPress={() => setSelfRating(num)}
              >
                <Text style={[
                  styles.likertButtonText,
                  selfRating === num && styles.likertButtonTextSelected,
                ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <View style={styles.metaEQSection}>
          <Text style={styles.metaEQLabel}>How would others rate you:</Text>
          <Text style={styles.metaEQStatement}>"{q.otherStatement}"</Text>
          <View style={styles.likertScale}>
            {Array.from({ length: q.scale }, (_, i) => i + 1).map((num) => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.likertButton,
                  otherRating === num && styles.likertButtonSelected,
                ]}
                onPress={() => setOtherRating(num)}
              >
                <Text style={[
                  styles.likertButtonText,
                  otherRating === num && styles.likertButtonTextSelected,
                ]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        
        <Button title="Next" onPress={handleSubmit} fullWidth size="lg" />
      </View>
    );
  };

  // Physiological Proxy
  const renderPhysiologicalProxy = (q: PhysiologicalProxyQuestion) => {
    const handleSelect = (optionId: string) => {
      if (isTransitioning.current || selectedChoice) return; // Prevent double-tap
      
      setSelectedChoice(optionId);
      
      // Use selection animation, then transition
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
                    <Animated.View style={[
                      styles.selectionCheckmark,
                      getSelectionCheckmarkStyle(checkmarkAnim),
                    ]}>
                      <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />
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

  // Consistency Probe (same as Likert)
  const renderConsistencyProbe = (q: ConsistencyProbeQuestion) => {
    const handleSubmit = () => {
      const response: ConsistencyProbeResponse = {
        questionId: q.id,
        type: 'consistency_probe',
        value: likertValue,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionStatement}>{q.statement}</Text>
        
        <View style={styles.likertContainer}>
          <View style={styles.likertScale}>
            {Array.from({ length: q.scale }, (_, i) => i + 1).map((num) => (
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
            <Text style={styles.likertLabel}>Strongly Disagree</Text>
            <Text style={styles.likertLabel}>Strongly Agree</Text>
          </View>
        </View>
        
        <Button title="Next" onPress={handleSubmit} fullWidth size="lg" />
      </View>
    );
  };

  // Ranking Allocation
  const renderRankingAllocation = (q: RankingAllocationQuestion) => {
    const totalAllocated = Object.values(allocations).reduce((sum, v) => sum + v, 0);
    const remaining = q.totalPoints - totalAllocated;
    const canSubmit = remaining === 0;

    const handleAllocate = (optionId: string, delta: number) => {
      const current = allocations[optionId] || 0;
      const newValue = Math.max(q.minPerOption, Math.min(q.maxPerOption, current + delta));
      const newTotal = totalAllocated - current + newValue;
      
      if (newTotal <= q.totalPoints) {
        setAllocations({ ...allocations, [optionId]: newValue });
      }
    };

    const handleSubmit = () => {
      const response: RankingAllocationResponse = {
        questionId: q.id,
        type: 'ranking_allocation',
        allocations,
        responseTimeMs: getResponseTime(),
      };
      recordResponse(response);
    };

    return (
      <View style={styles.questionContent}>
        <Text style={styles.questionPrompt}>{q.prompt}</Text>
        <Text style={styles.allocationRemaining}>
          {remaining} points remaining
        </Text>
        
        <View style={styles.allocationOptions}>
          {q.options.map((option) => (
            <View key={option.id} style={styles.allocationRow}>
              <Text style={styles.allocationText}>{option.text}</Text>
              <View style={styles.allocationControls}>
                <TouchableOpacity
                  style={styles.allocationButton}
                  onPress={() => handleAllocate(option.id, -10)}
                >
                  <Ionicons name="remove" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.allocationValue}>
                  {allocations[option.id] || 0}
                </Text>
                <TouchableOpacity
                  style={styles.allocationButton}
                  onPress={() => handleAllocate(option.id, 10)}
                >
                  <Ionicons name="add" size={20} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
        
        <Button
          title="Next"
          onPress={handleSubmit}
          fullWidth
          size="lg"
          disabled={!canSubmit}
        />
      </View>
    );
  };

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.testHeader}>
        {currentIndex > 0 ? (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.primary} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.closeButton} />
        )}
        <Text style={styles.testHeaderText}>
          {currentIndex + 1} / {questions.length}
        </Text>
        <TouchableOpacity
          onPress={handleExit}
          style={styles.closeButton}
          hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Animated Progress bar */}
      <View style={styles.progressBar}>
        <Animated.View 
          style={[
            styles.progressFill, 
            { width: getProgressBarWidth(progressAnim) }
          ]} 
        />
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
      <View style={styles.skipContainer}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip this question</Text>
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
  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
  },
  // Intro
  introContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  introIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  introTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.md,
  },
  introDescription: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.xl,
    maxWidth: 320,
  },
  infoCards: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  dimensionsList: {
    width: '100%',
    marginBottom: Spacing['2xl'],
  },
  dimensionsTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  dimensionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dimensionText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
  },
  backLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: Spacing.xl,
    padding: Spacing.md,
  },
  backLinkText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
  // Test Header
  testHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    minWidth: 44,
  },
  backButtonText: {
    fontSize: Typography.fontSize.sm,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium,
  },
  testHeaderText: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.surface,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
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
    textAlign: 'center',
    fontFamily: Typography.fontFamily.heading,
    lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl,
  },
  questionStatement: {
    fontSize: Typography.fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
  },
  questionLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  questionHint: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
  },
  scenarioText: {
    fontSize: Typography.fontSize.lg,
    color: colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: Spacing.md,
  },
  optionsContainer: {
    gap: Spacing.md,
  },
  // Forced Choice
  forcedChoiceOption: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
    flexDirection: 'row',
    alignItems: 'center',
  },
  forcedChoiceOptionMost: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  forcedChoiceOptionLeast: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  forcedChoiceText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  forcedChoiceTextSelected: {
    color: colors.primaryForeground,
  },
  choiceBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  choiceBadgeLeast: {
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  choiceBadgeText: {
    fontSize: Typography.fontSize.xs,
    color: colors.primaryForeground,
    fontWeight: Typography.fontWeight.bold,
  },
  // Likert
  likertContainer: {
    gap: Spacing.md,
  },
  likertScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.xs,
  },
  likertButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
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
    maxWidth: '40%',
  },
  // Emotion Vocabulary
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
  },
  emotionOptionTextSelected: {
    color: colors.primaryForeground,
  },
  selectionCheckmark: {
    marginLeft: Spacing.sm,
  },
  // Meta-EQ
  metaEQSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  metaEQLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  metaEQStatement: {
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontStyle: 'italic',
  },
  // Physiological
  physioOptions: {
    gap: Spacing.md,
  },
  physioOption: {
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: colors.borderLight,
  },
  physioOptionSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  physioOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  physioOptionText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    flex: 1,
  },
  physioOptionTextSelected: {
    color: colors.primaryForeground,
  },
  // Allocation
  allocationRemaining: {
    fontSize: Typography.fontSize.lg,
    color: colors.primary,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.semibold,
  },
  allocationOptions: {
    gap: Spacing.md,
  },
  allocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.floating,
    borderRadius: Radius.lg,
    padding: Spacing.md,
  },
  allocationText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    flex: 1,
  },
  allocationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  allocationButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  allocationValue: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: colors.primary,
    minWidth: 40,
    textAlign: 'center',
  },
  // Skip
  skipContainer: {
    padding: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // Results
  resultsContainer: {
    padding: Spacing.xl,
    paddingTop: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.xl,
    paddingBottom: Spacing['5xl'],
  },
  resultsHeader: {
    marginBottom: Spacing['2xl'],
  },
  resultsTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.xs,
  },
  resultsSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
  },
  overallScoreCard: {
    backgroundColor: colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  overallScoreLabel: {
    fontSize: Typography.fontSize.sm,
    color: colors.primaryForeground,
    opacity: 0.8,
    marginBottom: Spacing.sm,
  },
  overallScoreValue: {
    fontSize: 64,
    fontWeight: Typography.fontWeight.bold,
    color: colors.primaryForeground,
    fontFamily: Typography.fontFamily.heading,
  },
  overallScoreLevel: {
    fontSize: Typography.fontSize.sm,
    color: colors.primaryForeground,
    fontWeight: Typography.fontWeight.medium,
    marginTop: Spacing.sm,
  },
  dimensionsCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.heading,
    marginBottom: Spacing.lg,
  },
  dimensionRow: {
    marginBottom: Spacing.lg,
  },
  dimensionInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  dimensionName: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    textTransform: 'capitalize',
  },
  dimensionScore: {
    fontSize: Typography.fontSize.sm,
    color: colors.primary,
    fontWeight: Typography.fontWeight.bold,
  },
  dimensionBar: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  dimensionBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
  },
  insightsCard: {
    backgroundColor: colors.floating,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  insightSection: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  insightSectionLast: {
    marginBottom: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  insightTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  insightItem: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginLeft: Spacing.lg,
    marginBottom: Spacing.xs,
    textTransform: 'capitalize',
  },
  insightsTextCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  insightText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    marginBottom: Spacing.md,
  },
  // Unreliable warning
  unreliableWarning: {
    backgroundColor: colors.warning + '15',
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  unreliableContent: {
    flex: 1,
  },
  unreliableTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.warning,
    marginBottom: Spacing.xs,
  },
  unreliableText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
  },
  // Quality card
  qualityCard: {
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing['2xl'],
  },
  qualityTitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: Spacing.md,
  },
  qualityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  qualityLabel: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
  },
  qualityValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  qualityValue: {
    fontSize: Typography.fontSize.xs,
    color: colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  qualityValueGood: {
    color: colors.primary,
  },
  qualityValueWarning: {
    color: colors.warning,
  },
  penaltyBadge: {
    fontSize: Typography.fontSize.xs,
    color: colors.warning,
    fontWeight: Typography.fontWeight.medium,
    backgroundColor: colors.warning + '20',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  consistencyExplanation: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
  },
  consistencyExplanationText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  disclaimerText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
});
