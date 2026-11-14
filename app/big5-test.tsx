/**
 * Big Five personality assessment (IPIP 50-item markers) - from Profile.
 * UI aligned with Full EQ Test design language.
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Alert,
  Animated,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { BIG5_QUESTIONS, BIG5_LIKERT_LABELS, BIG5_INSTRUMENT_VERSION } from '@/data/big5-questions';
import { formatScore1dp, type Big5Scores } from '@/services/big5-scoring';
import { scoreBig5Assessment, type Big5EngineResult } from '@/services/big5-engine';
import { requestBig5LeadershipInsights } from '@/utils/vercel-api';
import { generateBig5Report } from '@/services/big5-report';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveBig5Assessment } from '@/services/big5-storage';
import { removeCacheSegment, cacheSegments } from '@/lib/async-data-cache';
import {
  AnimationConfigs,
  createQuestionTransition,
  getQuestionAnimatedStyle,
  getProgressBarWidth,
} from '@/styles/animations';

type Phase = 'intro' | 'test' | 'results';

const BIG5_TRAITS = [
  'Openness to Experience',
  'Conscientiousness',
  'Extraversion',
  'Agreeableness',
  'Emotional Stability',
] as const;

export default function Big5TestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [scores, setScores] = useState<Big5Scores | null>(null);
  const [engineResult, setEngineResult] = useState<Big5EngineResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedToCloud, setSavedToCloud] = useState<boolean | null>(null);
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
    if (phase === 'test' && sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    }
    if (phase === 'intro') sessionStartRef.current = null;
  }, [phase]);

  // Animate progress bar
  useEffect(() => {
    const total = BIG5_QUESTIONS.length;
    const target = total > 0 ? (index / total) * 100 : 0;
    Animated.timing(progressAnim, { toValue: target, ...AnimationConfigs.progressBar }).start();
  }, [index, progressAnim]);

  const st = createStyles(colors);
  const q = BIG5_QUESTIONS[index];
  const total = BIG5_QUESTIONS.length;

  const report = useMemo(() => (scores ? generateBig5Report(scores) : null), [scores]);

  useEffect(() => {
    setSelectedAnswer(q?.id ? (responses[q.id] ?? null) : null);
    // Only reset when the visible question changes. Responses are intentionally not a dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q?.id]);

  const animateTransition = useCallback((callback: () => void) => {
    if (isTransitioning.current) return;
    isTransitioning.current = true;
    questionTransition(callback, () => { isTransitioning.current = false; });
  }, [questionTransition]);

  const lastSubmissionRef = useRef<{ responses: Record<string, number>; engine: Big5EngineResult } | null>(null);

  const persistBig5 = useCallback(
    async (finalResponses: Record<string, number>, engine: Big5EngineResult) => {
      setSaving(true);
      setSaveError(null);
      setSavedToCloud(null);
      if (user?.id) {
        try {
          const id = await saveBig5Assessment(user.id, finalResponses, engine, BIG5_INSTRUMENT_VERSION);
          if (id != null) {
            await removeCacheSegment(cacheSegments.big5Latest(user.id)).catch(() => {});
          }
          setSavedToCloud(id != null);
        } catch (e) {
          setSaveError(e instanceof Error ? e.message : 'Could not save results.');
          setSavedToCloud(false);
        }
      } else {
        setSavedToCloud(false);
      }
      setSaving(false);
    },
    [user?.id]
  );

  const finish = useCallback(
    async (finalResponses: Record<string, number>) => {
      const durationSeconds =
        sessionStartRef.current != null ? (Date.now() - sessionStartRef.current) / 1000 : undefined;
      let engine;
      try {
        engine = scoreBig5Assessment(finalResponses, { durationSeconds });
      } catch (e) {
        setSaveError(e instanceof Error ? e.message : 'Could not score responses.');
        return;
      }
      lastSubmissionRef.current = { responses: finalResponses, engine };
      setScores(engine.raw);
      setEngineResult(engine);
      setAiReport(null);
      setAiError(null);
      setPhase('results');
      await persistBig5(finalResponses, engine);
    },
    [persistBig5]
  );

  const fetchLeadershipInsights = useCallback(async () => {
    if (!engineResult || !report) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const { report: text } = await requestBig5LeadershipInsights({
        instrumentVersion: BIG5_INSTRUMENT_VERSION,
        engine: engineResult,
        ruleBasedHeadline: report.headline,
        ruleBasedExecutiveSummary: report.executiveSummary,
      });
      setAiReport(text);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not load AI insights.');
    } finally {
      setAiLoading(false);
    }
  }, [engineResult, report]);

  const selectLikert = useCallback(
    (value: number) => {
      if (!q || isTransitioning.current) return;
      const next = { ...responses, [q.id]: value };
      setResponses(next);
      if (index + 1 >= total) {
        void finish(next);
      } else {
        animateTransition(() => setIndex((i) => i + 1));
      }
    },
    [q, responses, index, total, finish, animateTransition]
  );

  const goBackQuestion = useCallback(() => {
    if (index <= 0 || isTransitioning.current) return;
    animateTransition(() => setIndex((i) => i - 1));
  }, [index, animateTransition]);

  const handleSkip = useCallback(() => {
    if (isTransitioning.current) return;
    if (index + 1 >= total) {
      void finish(responses);
    } else {
      animateTransition(() => setIndex((i) => i + 1));
    }
  }, [index, total, responses, finish, animateTransition]);

  const resetTest = useCallback(() => {
    setPhase('intro');
    setIndex(0);
    setResponses({});
    setSelectedAnswer(null);
    setScores(null);
    setEngineResult(null);
    setAiReport(null);
    setAiError(null);
    setSaveError(null);
    setSavedToCloud(null);
    fadeAnim.setValue(1);
    slideAnim.setValue(0);
    scaleAnim.setValue(1);
    progressAnim.setValue(0);
  }, [fadeAnim, slideAnim, scaleAnim, progressAnim]);

  const handleExit = useCallback(() => {
    const doExit = () => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)/profile');
    };
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

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  // ── INTRO ──
  if (phase === 'intro') {
    return (
      <View style={st.container}>
        <ScrollView style={st.container} contentContainerStyle={st.introScrollContent} showsVerticalScrollIndicator={false}>
          <View style={st.introContainer}>
            <View style={[st.introIconCircle, { backgroundColor: colors.primary + '20' }]}>
              <Ionicons name="hardware-chip-outline" size={48} color={colors.primary} />
            </View>
            <Text style={st.introTitle}>Big Five Personality</Text>
            <Text style={st.introDescription}>
              Fifty short statements about how you usually think, feel, and act. Say how much each one sounds like you.
              This is for self-insight, not a clinical diagnosis.
            </Text>
            <View style={st.infoCards}>
              <View style={st.infoCard}>
                <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
                <Text style={st.infoText}>~12 minutes</Text>
              </View>
              <View style={st.infoCard}>
                <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
                <Text style={st.infoText}>{total} questions</Text>
              </View>
            </View>
            <View style={st.dimensionsList}>
              <Text style={st.dimensionsTitle}>What we measure:</Text>
              {BIG5_TRAITS.map((trait) => (
                <View key={trait} style={st.dimensionItem}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
                  <Text style={st.dimensionText}>{trait}</Text>
                </View>
              ))}
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
  if (phase === 'results' && scores && report && engineResult) {
    return (
      <ScrollView style={st.container} contentContainerStyle={st.resultsContainer}>
        <View style={st.resultsHeader}>
          <Text style={st.resultsTitle}>Your Big Five Profile</Text>
          <Text style={st.resultsSubtitle}>Based on {total} responses</Text>
        </View>

        {/* Headline card */}
        <View style={st.overallScoreCard}>
          <Text style={st.overallScoreLabel}>Personality Headline</Text>
          <Text style={st.overallHeadline}>{report.headline}</Text>
        </View>

        {saving ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.sm }} />
        ) : saveError || (savedToCloud === false && user?.id && isSupabaseConfigured()) ? (
          <View style={{ alignItems: 'center', marginVertical: Spacing.xs }}>
            <Text style={[st.saveNote, { color: colors.destructive }]}>
              {saveError ?? 'Results could not be synced. Your report is still shown below.'}
            </Text>
            {lastSubmissionRef.current ? (
              <Button
                title="Retry Save"
                onPress={() => {
                  const sub = lastSubmissionRef.current;
                  if (sub) void persistBig5(sub.responses, sub.engine);
                }}
                variant="secondary"
                size="sm"
              />
            ) : null}
          </View>
        ) : savedToCloud ? (
          <Text style={[st.saveNote, { color: colors.primary }]}>Results saved to your account.</Text>
        ) : savedToCloud === false ? (
          <Text style={[st.saveNote, { color: colors.textSecondary }]}>
            Report is shown on this device only (cloud sync not configured).
          </Text>
        ) : null}

        {/* Summary */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Summary</Text>
          <Text style={st.cardBody}>{report.executiveSummary}</Text>
        </View>

        {/* Pattern */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Pattern</Text>
          <Text style={st.cardBody}>{report.patterns.spreadNote}</Text>
          <Text style={st.cardBodySub}>
            Emphasis: {report.patterns.emphasis.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' · ')}
          </Text>
          <Text style={st.cardBodySub}>
            Relatively lower: {report.patterns.quieter.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' · ')}
          </Text>
        </View>

        {/* Dimension Breakdown */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Trait Breakdown</Text>
          <Text style={st.cardBodySub}>Each score is an average on a 1–5 scale (higher = more of that trait).</Text>
          {report.domains.map((d) => {
            const pct = ((d.score - 1) / 4) * 100;
            return (
              <View key={d.traitKey} style={st.dimRow}>
                <View style={st.dimInfo}>
                  <Text style={st.dimName}>{d.displayName}</Text>
                  <Text style={st.dimScore}>{formatScore1dp(d.score)} · {d.bandLabel}</Text>
                </View>
                <View style={st.dimBar}>
                  <View style={[st.dimBarFill, { width: `${pct}%` }]} />
                </View>
                <Text style={st.dimOneLine}>{d.oneLine}</Text>
                <Text style={st.dimDetail}>{d.detail}</Text>
              </View>
            );
          })}
        </View>

        <Text style={st.disclaimerText}>{report.disclaimer}</Text>

        {/* AI insights */}
        <View style={st.cardSection}>
          <Text style={st.cardTitle}>Leadership & Workplace (AI)</Text>
          <Text style={st.cardBodySub}>
            A deeper take on how this profile may show up at work. Sends your scores, percentiles, and quality flags to
            our AI. For reflection only; not for hiring or selection.
          </Text>
          <TouchableOpacity
            style={[st.aiBtn, { backgroundColor: colors.accentIndigo }]}
            onPress={() => void fetchLeadershipInsights()}
            disabled={aiLoading}
            activeOpacity={0.85}
          >
            {aiLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="sparkles" size={20} color="#fff" />
                <Text style={st.aiBtnText}>Generate AI leadership insights</Text>
              </>
            )}
          </TouchableOpacity>
          {aiError ? <Text style={[st.aiErrorText, { color: colors.destructive }]}>{aiError}</Text> : null}
          {aiReport ? (
            <View style={st.aiReportBox}>
              <Text style={st.cardBodySub}>AI insights</Text>
              {aiReport.split(/\n\n+/).map((para, i) => (
                <Text key={i} style={st.cardBody}>
                  {para.replace(/^#{1,6}\s+/gm, '').trim()}
                </Text>
              ))}
            </View>
          ) : null}
        </View>

        <Button title="View Progress" onPress={() => router.replace('/(tabs)/progress')} size="lg" fullWidth />
        <Button title="Retake Assessment" onPress={resetTest} variant="secondary" size="lg" fullWidth />
        <Button title="Done" onPress={() => router.replace('/(tabs)/profile')} variant="secondary" size="lg" fullWidth />
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
        <View style={st.loadingContainer}>
          <Text style={st.loadingText}>Preparing assessment...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={st.container}>
      {/* Header: back | counter | close */}
      <View style={st.testHeader}>
        <View style={st.headerSideLeft}>
          {index > 0 ? (
            <TouchableOpacity onPress={goBackQuestion} style={st.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={24} color={colors.primary} />
              <Text style={st.backButtonText}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={st.headerSpacer} />
          )}
        </View>
        <View style={st.headerProgressOverlay} pointerEvents="none">
          <Text style={st.testHeaderText}>{index + 1} / {total}</Text>
        </View>
        <View style={st.headerSideRight}>
          <TouchableOpacity onPress={handleExit} style={st.closeButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} activeOpacity={0.7} accessibilityLabel="Exit test">
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Progress bar */}
      <View style={st.progressBar}>
        <Animated.View style={[st.progressFill, { width: getProgressBarWidth(progressAnim) }]} />
      </View>

      {/* Question */}
      <ScrollView contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Animated.View style={[st.questionWrapper, getQuestionAnimatedStyle(fadeAnim, slideAnim, scaleAnim)]}>
          <View style={st.questionContent}>
            <Text style={st.questionPrompt}>{q.text}</Text>
            <Text style={st.questionHint}>How much is this like you?</Text>
            <View style={st.optionsContainer}>
              {([5, 4, 3, 2, 1] as const).map((v) => {
                const isSelected = selectedAnswer === v;
                return (
                  <TouchableOpacity
                    key={v}
                    style={[st.optionRow, isSelected && st.optionRowSelected]}
                    onPress={() => setSelectedAnswer(v)}
                    activeOpacity={0.75}
                  >
                    <Text style={[st.optionLabel, isSelected && st.optionLabelSelected]}>
                      {BIG5_LIKERT_LABELS[v]}
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
          </View>
        </Animated.View>
      </ScrollView>

      {/* Actions */}
      <View style={st.actionContainer}>
        <Button
          title={index + 1 >= total ? 'See Results' : 'Next'}
          onPress={() => selectedAnswer != null && selectLikert(selectedAnswer)}
          fullWidth
          size="lg"
          disabled={selectedAnswer == null || isTransitioning.current}
        />
        <TouchableOpacity onPress={handleSkip}>
          <Text style={st.skipText}>Skip this question</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: Typography.fontSize.base, color: colors.textSecondary },
  // Intro
  introScrollContent: { flexGrow: 1, padding: Spacing.xl, paddingBottom: Spacing['2xl'], width: '100%', maxWidth: 820, alignSelf: 'center' },
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
  // Test header
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
  scrollContent: { flexGrow: 1, padding: Spacing.lg, justifyContent: 'center', width: '100%', maxWidth: 820, alignSelf: 'center' },
  questionWrapper: { flex: 1, justifyContent: 'center' },
  questionContent: { gap: Spacing.xl },
  questionPrompt: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center', fontFamily: Typography.fontFamily.heading, lineHeight: Typography.lineHeight.tight * Typography.fontSize.xl },
  questionHint: { fontSize: Typography.fontSize.xs, color: colors.textMuted, textAlign: 'center' },
  optionsContainer: { gap: Spacing.md },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.floating, borderRadius: Radius.lg, padding: Spacing.lg, borderWidth: 2, borderColor: colors.borderLight },
  optionRowSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  optionLabel: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textPrimary },
  optionLabelSelected: { color: colors.primaryForeground, fontWeight: Typography.fontWeight.semibold },
  actionContainer: { padding: Spacing.lg, paddingTop: Spacing.sm, gap: Spacing.md },
  skipText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center' },
  // Results
  resultsContainer: { padding: Spacing.xl, paddingTop: Platform.OS === 'ios' ? Spacing['3xl'] : Spacing.xl, paddingBottom: Spacing['5xl'], width: '100%', maxWidth: 880, alignSelf: 'center' },
  resultsHeader: { marginBottom: Spacing['2xl'] },
  resultsTitle: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.xs },
  resultsSubtitle: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  overallScoreCard: { backgroundColor: colors.primary, borderRadius: Radius.xl, padding: Spacing['2xl'], alignItems: 'center', marginBottom: Spacing.xl },
  overallScoreLabel: { fontSize: Typography.fontSize.sm, color: colors.primaryForeground, opacity: 0.8, marginBottom: Spacing.sm },
  overallHeadline: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: colors.primaryForeground, fontFamily: Typography.fontFamily.heading, textAlign: 'center', lineHeight: Typography.fontSize.lg * 1.4 },
  saveNote: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
  cardSection: { backgroundColor: colors.floating, borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.xl },
  cardTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, fontFamily: Typography.fontFamily.heading, marginBottom: Spacing.lg },
  cardBody: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, lineHeight: Typography.fontSize.sm * 1.55, marginBottom: Spacing.md },
  cardBodySub: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, lineHeight: Typography.fontSize.xs * 1.45, marginBottom: Spacing.xs },
  dimRow: { marginBottom: Spacing.lg },
  dimInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  dimName: { fontSize: Typography.fontSize.sm, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium, textTransform: 'capitalize' },
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
