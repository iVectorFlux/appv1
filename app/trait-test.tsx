/**
 * Trait Test — adaptive interpersonal snapshot (36 core + 7 follow-ups from a 72-item bank).
 * UI aligned with Full EQ Test design language.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, Alert, ActivityIndicator, Animated,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import {
  TRAIT_DIMENSIONS, TRAIT_TEST_INSTRUMENT_VERSION, TRAIT_FIRST_WAVE_LEN,
  TRAIT_LIKERT_LABELS, buildInitialTraitQuestionOrder, pickAdaptiveFollowUps,
  newTraitTestSessionSeed, getQuestionPrompt, type TraitQuestionItem,
} from '@/data/trait-test';
import { scoreTraitTest, formatTraitTestSummaryLine } from '@/services/trait-test-scoring';
import type { TraitTestScoreResult } from '@/services/trait-test-scoring';
import { writeTraitTestLatest } from '@/lib/trait-test-cache';
import { requestTraitTestInsights } from '@/utils/vercel-api';
import {
  AnimationConfigs, createQuestionTransition,
  getQuestionAnimatedStyle, getProgressBarWidth,
} from '@/styles/animations';

type Phase = 'intro' | 'test' | 'results';

export default function TraitTestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const sessionSeedRef = useRef(newTraitTestSessionSeed());
  const wave1Ref = useRef<TraitQuestionItem[]>(buildInitialTraitQuestionOrder(sessionSeedRef.current));
  const [questions, setQuestions] = useState<TraitQuestionItem[]>(() => wave1Ref.current);
  const followUpsAppendedRef = useRef(false);
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [selectedScenarioOption, setSelectedScenarioOption] = useState<string | null>(null);
  const [result, setResult] = useState<TraitTestScoreResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  // Animation refs
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const isTransitioning = useRef(false);

  const questionTransition = useMemo(
    () => createQuestionTransition(fadeAnim, slideAnim, scaleAnim),
    [fadeAnim, slideAnim, scaleAnim]
  );

  useEffect(() => {
    if (phase === 'test' && sessionStartRef.current === null) sessionStartRef.current = Date.now();
    if (phase === 'intro') sessionStartRef.current = null;
  }, [phase]);

  useEffect(() => {
    const total = questions.length;
    const target = total > 0 ? (index / total) * 100 : 0;
    Animated.timing(progressAnim, { toValue: target, ...AnimationConfigs.progressBar }).start();
  }, [index, questions.length, progressAnim]);

  const st = createStyles(colors);
  const q = questions[index];
  const total = questions.length;

  useEffect(() => {
    setSelectedAnswer(null);
    setSelectedScenarioOption(null);
  }, [q?.id]);

  const animateTransition = useCallback((cb: () => void) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    questionTransition(cb, () => { isTransitioning.current = false; });
  }, [questionTransition]);

  const finish = useCallback(async (finalResponses: Record<string, number>) => {
    const scored = scoreTraitTest(finalResponses, TRAIT_TEST_INSTRUMENT_VERSION);
    setResult(scored);
    setAiReport(null);
    setAiError(null);
    setPhase('results');
    if (user?.id) {
      const summaryLine = formatTraitTestSummaryLine(scored.byTrait);
      await writeTraitTestLatest(user.id, {
        completedAt: new Date().toISOString(),
        overall0to100: scored.overall0to100,
        summaryLine,
        instrumentVersion: TRAIT_TEST_INSTRUMENT_VERSION,
        byTrait: scored.byTrait,
      });
    }
  }, [user?.id]);

  const fetchTraitInsights = useCallback(async () => {
    if (!result) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const traits = TRAIT_DIMENSIONS.map((d) => ({
        id: d.id, label: d.label, score0to100: result.byTrait[d.id],
        scoreHighMeans: d.scoreHighMeans, improveHint: d.improveHint,
      }));
      const { report } = await requestTraitTestInsights({
        instrumentVersion: TRAIT_TEST_INSTRUMENT_VERSION,
        overall0to100: result.overall0to100, traits,
      });
      setAiReport(report);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not load AI insights.');
    } finally { setAiLoading(false); }
  }, [result]);

  const commitAnswer = useCallback((value1to5: number) => {
    if (!q || isTransitioning.current) return;
    const next = { ...responses, [q.id]: value1to5 };
    if (questions.length === TRAIT_FIRST_WAVE_LEN && index === TRAIT_FIRST_WAVE_LEN - 1 && !followUpsAppendedRef.current) {
      followUpsAppendedRef.current = true;
      const extras = pickAdaptiveFollowUps(wave1Ref.current, next);
      setResponses(next);
      setQuestions((prev) => [...prev, ...extras]);
      animateTransition(() => setIndex(TRAIT_FIRST_WAVE_LEN));
      return;
    }
    setResponses(next);
    if (index + 1 >= questions.length) {
      void finish(next);
    } else {
      animateTransition(() => setIndex((i) => i + 1));
    }
  }, [q, responses, index, questions.length, finish, animateTransition]);

  const goBackQuestion = useCallback(() => {
    if (index <= 0 || isTransitioning.current) return;
    animateTransition(() => setIndex((i) => i - 1));
  }, [index, animateTransition]);

  const handleSkip = useCallback(() => {
    if (isTransitioning.current) return;
    if (index + 1 >= questions.length) { void finish(responses); }
    else { animateTransition(() => setIndex((i) => i + 1)); }
  }, [index, questions.length, responses, finish, animateTransition]);

  const resetTest = useCallback(() => {
    const seed = newTraitTestSessionSeed();
    sessionSeedRef.current = seed;
    const w1 = buildInitialTraitQuestionOrder(seed);
    wave1Ref.current = w1;
    followUpsAppendedRef.current = false;
    setPhase('intro'); setQuestions(w1); setIndex(0); setResponses({});
    setSelectedAnswer(null); setSelectedScenarioOption(null);
    setResult(null); setAiReport(null); setAiError(null);
    fadeAnim.setValue(1); slideAnim.setValue(0); scaleAnim.setValue(1); progressAnim.setValue(0);
  }, [fadeAnim, slideAnim, scaleAnim, progressAnim]);

  const handleExit = useCallback(() => {
    const doExit = () => { if (router.canGoBack()) router.back(); else router.replace('/(tabs)/profile'); };
    const hasProgress = Object.keys(responses).length > 0 || index > 0;
    if (Platform.OS === 'web') {
      if (!hasProgress || window.confirm('Exit assessment?\n\nYour answers and progress will be removed.')) doExit();
      return;
    }
    if (!hasProgress) { doExit(); return; }
    Alert.alert('Exit assessment?', 'Your answers and progress will be removed.', [
      { text: 'Stay', style: 'cancel' },
      { text: 'Exit', style: 'destructive', onPress: doExit },
    ]);
  }, [responses, index, router]);

  const rankedTraits = useMemo(() => {
    if (!result) return [];
    return [...TRAIT_DIMENSIONS].map((d) => ({ ...d, score: result.byTrait[d.id] })).sort((a, b) => b.score - a.score);
  }, [result]);

  if (!isLoading && !isAuthenticated) return <Redirect href="/(auth)/sign-in" />;

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <View style={st.container}>
        <ScrollView style={st.container} contentContainerStyle={st.introScrollContent} showsVerticalScrollIndicator={false}>
          <View style={st.introContainer}>
            <View style={[st.introIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="shield-checkmark-outline" size={48} color={colors.primary} />
            </View>
            <Text style={st.introTitle}>Trait Assessment</Text>
            <Text style={st.introDescription}>
              Maps eighteen interpersonal patterns through short situational trade-offs, then seven adaptive follow-ups.
              For self-insight only—not diagnosis, hiring, or clinical use.
            </Text>
            <View style={st.infoCards}>
              <View style={st.infoCard}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={st.infoText}>~15 minutes</Text>
              </View>
              <View style={st.infoCard}>
                <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
                <Text style={st.infoText}>Adaptive</Text>
              </View>
            </View>
            <View style={st.dimensionsList}>
              <Text style={st.dimensionsTitle}>What we measure:</Text>
              {TRAIT_DIMENSIONS.slice(0, 6).map((d) => (
                <View key={d.id} style={st.dimensionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={st.dimensionText}>{d.label}</Text>
                </View>
              ))}
              <Text style={st.dimensionText}>…and {TRAIT_DIMENSIONS.length - 6} more patterns</Text>
            </View>
            <Button title="Begin Assessment" onPress={() => setPhase('test')} size="lg" fullWidth />
            <TouchableOpacity style={st.backLink} onPress={() => router.back()} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={20} color={colors.primary} />
              <Text style={st.backLinkText}>Back to Profile</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ── RESULTS ──
  if (phase === 'results' && result) {
    return (
      <ScrollView style={st.container} contentContainerStyle={st.resultsContainer}>
        <View style={st.resultsHeader}>
          <Text style={st.resultsTitle}>Your Trait Snapshot</Text>
          <Text style={st.resultsSubtitle}>Based on {Object.keys(responses).length} responses</Text>
        </View>

        {/* Overall Score */}
        <View style={st.overallScoreCard}>
          <Text style={st.overallScoreLabel}>Overall Trait Score</Text>
          <Text style={st.overallScoreValue}>{result.overall0to100}</Text>
          <Text style={st.overallScoreLevel}>out of 100</Text>
        </View>

        {/* Strongest patterns */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Strongest Patterns</Text>
          <Text style={st.cardBody}>{formatTraitTestSummaryLine(result.byTrait, 5)}</Text>
        </View>

        {/* All patterns */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Scores by Pattern (0–100)</Text>
          <Text style={st.cardBodySub}>Higher = pattern shows up more strongly. Not a moral label.</Text>
          {rankedTraits.map((d) => {
            const pct = Math.min(d.score, 100);
            return (
              <View key={d.id} style={st.dimRow}>
                <View style={st.dimInfo}>
                  <Text style={st.dimName}>{d.label}</Text>
                  <Text style={st.dimScore}>{d.score}</Text>
                </View>
                <View style={st.dimBar}>
                  <View style={[st.dimBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={st.dimOneLine}>{d.scoreHighMeans}</Text>
                <Text style={st.dimDetail}>
                  <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Improve: </Text>
                  {d.improveHint}
                </Text>
              </View>
            );
          })}
        </View>

        {/* AI insights */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>AI Insights</Text>
          <Text style={st.cardBodySub}>
            Sends only your aggregate scores and pattern names to our AI. For reflection only.
          </Text>
          <TouchableOpacity
            style={[st.aiBtn, { backgroundColor: colors.accentIndigo }]}
            onPress={() => void fetchTraitInsights()}
            disabled={aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={st.aiBtnText}>Generate AI trait report</Text>
              </>
            )}
          </TouchableOpacity>
          {aiError ? <Text style={[st.aiErrorText, { color: colors.destructive }]}>{aiError}</Text> : null}
          {aiReport ? (
            <View style={st.aiReportBox}>
              {aiReport.split(/\n\n+/).map((para, i) => (
                <Text key={i} style={st.cardBody}>{para.replace(/^#{1,6}\s+/gm, '').trim()}</Text>
              ))}
            </View>
          ) : null}
        </View>

        <Text style={st.disclaimerText}>
          Trait test ({TRAIT_TEST_INSTRUMENT_VERSION}) is a self-report snapshot. It does not assess ability or predict
          performance. Retake anytime; results are saved when you are signed in.
        </Text>

        <Button title="Retake Assessment" onPress={resetTest} variant="secondary" size="lg" fullWidth />
        <Button title="Done" onPress={() => router.replace('/(tabs)/profile')} size="lg" fullWidth />
        <Text style={st.disclaimerText}>
          This assessment is for self-reflection purposes and is not a clinical diagnosis.
        </Text>
      </ScrollView>
    );
  }

  // ── TEST ──
  if (!q) {
    return (
      <View style={st.container}>
        <View style={st.loadingContainer}><Text style={st.loadingText}>Preparing assessment...</Text></View>
      </View>
    );
  }

  return (
    <View style={st.container}>
      <View style={st.testHeader}>
        <View style={st.headerSideLeft}>
          {index > 0 ? (
            <TouchableOpacity onPress={goBackQuestion} style={st.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
              <Text style={st.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : <View style={st.headerSpacer} />}
        </View>
        <View style={st.headerProgressOverlay} pointerEvents="none">
          <Text style={st.testHeaderText}>
            {index + 1} / {total}
            {index < TRAIT_FIRST_WAVE_LEN ? ' · first pass' : ' · follow-ups'}
          </Text>
        </View>
        <View style={st.headerSideRight}>
          <TouchableOpacity onPress={handleExit} style={st.closeButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} activeOpacity={0.7} accessibilityLabel="Exit test">
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={st.progressBar}>
        <Animated.View style={[st.progressFill, { width: getProgressBarWidth(progressAnim) }]} />
      </View>

      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[st.questionWrapper, getQuestionAnimatedStyle(fadeAnim, slideAnim, scaleAnim)]}>
          <View style={st.questionContent}>
            <Text style={st.questionPrompt}>{getQuestionPrompt(q)}</Text>
            {q.type === 'scenario' ? (
              <>
                <Text style={st.questionHint}>Pick the option closest to what you usually do—not what sounds best.</Text>
                <View style={st.optionsContainer}>
                  {q.options.map((opt, i) => {
                    const optionKey = `${q.id}-${opt.sub}-${i}`;
                    const isSelected = selectedScenarioOption === optionKey;
                    return (
                      <TouchableOpacity
                        key={optionKey}
                        style={[st.optionRow, isSelected && st.optionRowSelected]}
                        onPress={() => {
                          setSelectedAnswer(opt.traitSignal);
                          setSelectedScenarioOption(optionKey);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[st.optionLetter, isSelected && st.optionLetterSelected]}>
                          {`${String.fromCharCode(65 + i)}.`}
                        </Text>
                        <Text style={[st.optionLabel, isSelected && st.optionLabelSelected]}>{opt.label}</Text>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button
                  title="Next"
                  onPress={() => selectedAnswer != null && commitAnswer(selectedAnswer)}
                  fullWidth
                  size="lg"
                  disabled={selectedAnswer == null}
                />
              </>
            ) : (
              <>
                <Text style={st.questionHint}>How much do you agree?</Text>
                <View style={st.optionsContainer}>
                  {([5, 4, 3, 2, 1] as const).map((v) => {
                    const isSelected = selectedAnswer === v;
                    return (
                      <TouchableOpacity
                        key={v}
                        style={[st.optionRow, isSelected && st.optionRowSelected]}
                        onPress={() => {
                          setSelectedAnswer(v);
                          setSelectedScenarioOption(null);
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={[st.optionLabel, isSelected && st.optionLabelSelected]}>
                          {TRAIT_LIKERT_LABELS[v]}
                        </Text>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={22} color={colors.primaryForeground} />
                        ) : (
                          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Button
                  title="Next"
                  onPress={() => selectedAnswer != null && commitAnswer(selectedAnswer)}
                  fullWidth
                  size="lg"
                  disabled={selectedAnswer == null}
                />
              </>
            )}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={st.skipContainer}>
        <TouchableOpacity onPress={handleSkip}><Text style={st.skipText}>Skip this question</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.fontSize.base, color: colors.textSecondary },
  introScrollContent: { flexGrow: 1, padding: Spacing.xl, paddingBottom: Spacing['2xl'] },
  introContainer: { alignItems: 'center', justifyContent: 'center', paddingBottom: Spacing.xl },
  introIconCircle: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  introTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.md },
  introDescription: { fontSize: Typography.fontSize.base, color: colors.textSecondary, textAlign: 'center', lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base, marginBottom: Spacing.xl, maxWidth: 320 },
  infoCards: { flexDirection: 'row', gap: Spacing.lg, marginBottom: Spacing.xl },
  infoCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, backgroundColor: colors.surface, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, borderRadius: Radius.lg },
  infoText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
  dimensionsList: { width: '100%', marginBottom: Spacing['2xl'] },
  dimensionsTitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.md },
  dimensionItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
  dimensionText: { fontSize: Typography.fontSize.sm, color: colors.textPrimary },
  backLink: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, marginTop: Spacing.xl, marginBottom: Spacing.xl, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xl, minHeight: 48, borderRadius: Radius.lg, borderWidth: 1, backgroundColor: colors.surface, borderColor: colors.border },
  backLinkText: { fontSize: Typography.fontSize.base, color: colors.primary, fontWeight: Typography.fontWeight.semibold },
  testHeader: { position: 'relative', flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md, paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl, minHeight: 52 },
  headerSideLeft: { flex: 1, zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' },
  headerSideRight: { flex: 1, zIndex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  headerSpacer: { width: 44, height: 44 },
  headerProgressOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  backButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.xs, minWidth: 44 },
  backButtonText: { fontSize: Typography.fontSize.sm, color: colors.primary, fontWeight: Typography.fontWeight.medium },
  testHeaderText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontWeight: Typography.fontWeight.semibold },
  progressBar: { height: 4, backgroundColor: colors.surface },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  scrollContent: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center' },
  questionWrapper: { flex: 1, justifyContent: 'center' },
  questionContent: { gap: Spacing.xl },
  questionPrompt: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center', fontFamily: Typography.fontFamily.heading, lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl },
  questionHint: { fontSize: Typography.fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  optionsContainer: { gap: Spacing.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.floating, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: colors.borderLight },
  optionRowSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLetter: { width: 22, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, color: colors.textMuted, marginRight: Spacing.xs },
  optionLetterSelected: { color: colors.primaryForeground },
  optionLabel: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textPrimary },
  optionLabelSelected: { color: colors.primaryForeground },
  skipContainer: { padding: Spacing.lg, paddingTop: Spacing.sm },
  skipText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  resultsContainer: { padding: Spacing.xl, paddingTop: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.xl, paddingBottom: Spacing['5xl'] },
  resultsHeader: { marginBottom: Spacing['2xl'] },
  resultsTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
  resultsSubtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  overallScoreCard: { backgroundColor: colors.primary, borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl },
  overallScoreLabel: { fontSize: Typography.fontSize.sm, color: colors.primaryForeground, opacity: 0.8, marginBottom: Spacing.sm },
  overallScoreValue: { fontSize: 64, fontWeight: Typography.fontWeight.bold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.heading },
  overallScoreLevel: { fontSize: Typography.fontSize.sm, color: colors.primaryForeground, fontWeight: Typography.fontWeight.medium, marginTop: Spacing.sm },
  cardSection: { backgroundColor: colors.floating, borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
  cardTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.lg },
  cardBody: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, lineHeight: Typography.fontSize.sm * 1.55, marginBottom: Spacing.md },
  cardBodySub: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, lineHeight: Typography.fontSize.xs * 1.45, marginBottom: Spacing.xs },
  dimRow: { marginBottom: Spacing.lg },
  dimInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  dimName: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
  dimScore: { fontSize: Typography.fontSize.sm, color: colors.primary, fontWeight: Typography.fontWeight.bold },
  dimBar: { height: 8, backgroundColor: colors.surface, borderRadius: Radius.full, overflow: 'hidden', marginBottom: Spacing.sm },
  dimBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: Radius.full },
  dimOneLine: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, color: colors.textPrimary, lineHeight: Typography.fontSize.sm * 1.45, marginBottom: Spacing.sm },
  dimDetail: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: Typography.fontSize.sm * 1.55 },
  aiBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.sm, marginTop: Spacing.md },
  aiBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
  aiErrorText: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
  aiReportBox: { marginTop: Spacing.md },
  disclaimerText: { fontSize: Typography.fontSize.xs, color: colors.textMuted, textAlign: 'center', marginTop: Spacing.xl },
});
