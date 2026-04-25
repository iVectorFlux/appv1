/**
 * Trait Test — adaptive interpersonal snapshot (36 core + 7 follow-ups from a 72-item bank).
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import {
  TRAIT_DIMENSIONS,
  TRAIT_TEST_INSTRUMENT_VERSION,
  TRAIT_FIRST_WAVE_LEN,
  TRAIT_LIKERT_LABELS,
  buildInitialTraitQuestionOrder,
  pickAdaptiveFollowUps,
  newTraitTestSessionSeed,
  getQuestionPrompt,
  type TraitQuestionItem,
} from '@/data/trait-test';
import { scoreTraitTest, formatTraitTestSummaryLine } from '@/services/trait-test-scoring';
import type { TraitTestScoreResult } from '@/services/trait-test-scoring';
import { writeTraitTestLatest } from '@/lib/trait-test-cache';
import { ScreenHeader } from '@/components/ui/screen-header';
import { requestTraitTestInsights } from '@/utils/vercel-api';

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
  const [result, setResult] = useState<TraitTestScoreResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'test' && sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    }
    if (phase === 'intro') sessionStartRef.current = null;
  }, [phase]);

  const st = createStyles(colors);
  const q = questions[index];
  const total = questions.length;
  const progress = total > 0 ? index / total : 0;

  const finish = useCallback(
    async (finalResponses: Record<string, number>) => {
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
    },
    [user?.id]
  );

  const fetchTraitInsights = useCallback(async () => {
    if (!result) return;
    setAiLoading(true);
    setAiError(null);
    try {
      const traits = TRAIT_DIMENSIONS.map((d) => ({
        id: d.id,
        label: d.label,
        score0to100: result.byTrait[d.id],
        scoreHighMeans: d.scoreHighMeans,
        improveHint: d.improveHint,
      }));
      const { report } = await requestTraitTestInsights({
        instrumentVersion: TRAIT_TEST_INSTRUMENT_VERSION,
        overall0to100: result.overall0to100,
        traits,
      });
      setAiReport(report);
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'Could not load AI insights.');
    } finally {
      setAiLoading(false);
    }
  }, [result]);

  const commitAnswer = useCallback(
    (value1to5: number) => {
      if (!q) return;
      const next = { ...responses, [q.id]: value1to5 };

      if (
        questions.length === TRAIT_FIRST_WAVE_LEN &&
        index === TRAIT_FIRST_WAVE_LEN - 1 &&
        !followUpsAppendedRef.current
      ) {
        followUpsAppendedRef.current = true;
        const extras = pickAdaptiveFollowUps(wave1Ref.current, next);
        setResponses(next);
        setQuestions((prev) => [...prev, ...extras]);
        setIndex(TRAIT_FIRST_WAVE_LEN);
        return;
      }

      setResponses(next);
      if (index + 1 >= questions.length) {
        void finish(next);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [q, responses, index, questions.length, finish]
  );

  const goBackQuestion = useCallback(() => {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  }, [index]);

  const resetTest = useCallback(() => {
    const seed = newTraitTestSessionSeed();
    sessionSeedRef.current = seed;
    const w1 = buildInitialTraitQuestionOrder(seed);
    wave1Ref.current = w1;
    followUpsAppendedRef.current = false;
    setPhase('intro');
    setQuestions(w1);
    setIndex(0);
    setResponses({});
    setResult(null);
    setAiReport(null);
    setAiError(null);
  }, []);

  const leaveTestDiscardingProgress = useCallback(() => {
    resetTest();
    router.back();
  }, [resetTest, router]);

  const confirmLeaveAssessment = useCallback((onLeave: () => void) => {
    const msg = 'Your answers and progress on this attempt will be removed.';
    if (Platform.OS === 'web') {
      if (window.confirm(`${msg}\n\nLeave assessment?`)) onLeave();
      return;
    }
    Alert.alert('Leave assessment?', msg, [
      { text: 'Stay', style: 'cancel' },
      { text: 'Leave', style: 'destructive', onPress: onLeave },
    ]);
  }, []);

  const handleHeaderBack = useCallback(() => {
    if (phase === 'test') {
      if (index > 0) {
        goBackQuestion();
        return;
      }
      const hasProgress = Object.keys(responses).length > 0;
      if (hasProgress) {
        confirmLeaveAssessment(leaveTestDiscardingProgress);
        return;
      }
      setPhase('intro');
      return;
    }
    if (phase === 'results') {
      router.back();
      return;
    }
    router.back();
  }, [phase, index, responses, goBackQuestion, router, confirmLeaveAssessment, leaveTestDiscardingProgress]);

  const handleCloseFromTest = useCallback(() => {
    const hasProgress = Object.keys(responses).length > 0 || index > 0;
    if (!hasProgress) {
      setPhase('intro');
      return;
    }
    confirmLeaveAssessment(leaveTestDiscardingProgress);
  }, [index, responses, confirmLeaveAssessment, leaveTestDiscardingProgress]);

  const rankedTraits = useMemo(() => {
    if (!result) return [];
    return [...TRAIT_DIMENSIONS]
      .map((d) => ({
        ...d,
        score: result.byTrait[d.id],
      }))
      .sort((a, b) => b.score - a.score);
  }, [result]);

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <GlassBackground>
      <ScrollView style={st.scroll} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Trait test"
          onBackPress={handleHeaderBack}
          backFallbackHref="/(tabs)/home"
          right={
            phase === 'test' ? (
              <TouchableOpacity
                onPress={handleCloseFromTest}
                style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
                hitSlop={16}
                accessibilityRole="button"
                accessibilityLabel="Close assessment"
              >
                <Ionicons name="close" size={26} color={colors.textPrimary} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        {phase === 'intro' && (
          <>
            <Text style={st.lead}>
              This assessment maps <Text style={{ fontWeight: '700' }}>eighteen</Text> patterns (Irrationality through
              Death Denial). Every item is a short situation with <Text style={{ fontWeight: '700' }}>four</Text> options
              —trade-offs, not moral “right answers.” Your run uses two items per pattern from a bank of seventy-two, then
              seven adaptive follow-ups from the same bank. For self-insight only—not diagnosis, hiring, or clinical use.
            </Text>
            <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => setPhase('test')}>
              <Text style={st.primaryBtnText}>Start trait test</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </>
        )}

        {phase === 'test' && q && (
          <>
            <View style={st.progressOuter}>
              <View style={[st.progressInner, { width: `${progress * 100}%`, backgroundColor: colors.primary }]} />
            </View>
            <Text style={st.progressLabel}>
              Question {index + 1} of {total}
              {index < TRAIT_FIRST_WAVE_LEN ? ' · first pass' : ' · adaptive follow-ups'}
            </Text>
            <Text style={st.questionText}>{getQuestionPrompt(q)}</Text>
            {q.type === 'scenario' ? (
              <>
                <Text style={st.scaleHint}>Pick the option closest to what you usually do—not what sounds best.</Text>
                {q.options.map((opt, i) => (
                  <TouchableOpacity
                    key={`${q.id}-${opt.sub}`}
                    style={[st.optionRow, { borderColor: colors.border, backgroundColor: colors.floating }]}
                    onPress={() => commitAnswer(opt.traitSignal)}
                    activeOpacity={0.75}
                  >
                    <Text style={st.optionLetter}>{String.fromCharCode(65 + i)}.</Text>
                    <Text style={st.optionLabel}>{opt.label}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <>
                <Text style={st.scaleHint}>How much do you agree?</Text>
                {([5, 4, 3, 2, 1] as const).map((v) => (
                  <TouchableOpacity
                    key={v}
                    style={[st.optionRow, { borderColor: colors.border, backgroundColor: colors.floating }]}
                    onPress={() => commitAnswer(v)}
                    activeOpacity={0.75}
                  >
                    <Text style={st.optionLabel}>{TRAIT_LIKERT_LABELS[v]}</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))}
              </>
            )}
            {index > 0 ? (
              <TouchableOpacity onPress={goBackQuestion} style={st.backLink}>
                <Text style={[st.backLinkText, { color: colors.primary }]}>Previous question</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {phase === 'results' && result && (
          <>
            <Text style={st.resultsTitle}>Your trait snapshot</Text>
            <Text style={st.headline}>
              Overall {result.overall0to100}/100 (mean of eighteen pattern scores). Higher on a pattern means it shows
              up more strongly for you right now—not a moral label.
            </Text>

            <GlassCard style={st.reportCard}>
              <Text style={st.reportSectionLabel}>Strongest patterns (highest scores)</Text>
              <Text style={st.execSummary}>{formatTraitTestSummaryLine(result.byTrait, 5)}</Text>
            </GlassCard>

            <Text style={st.detailedHeading}>Scores by pattern (0–100)</Text>
            <Text style={st.resultsSub}>
              Each card states what a higher score tends to mean, plus a practical improvement angle.
            </Text>

            {rankedTraits.map((d) => {
              const pct = Math.min(d.score, 100);
              return (
                <GlassCard key={d.id} style={st.traitCard}>
                  <View style={st.traitHeader}>
                    <Text style={st.traitName}>{d.label}</Text>
                    <Text style={st.traitScore}>{d.score}</Text>
                  </View>
                  <View style={[st.barBg, { backgroundColor: colors.surface }]}>
                    <View style={[st.barFill, { width: `${pct}%`, backgroundColor: colors.accentIndigo }]} />
                  </View>
                  <Text style={st.patternMeaning}>{d.scoreHighMeans}</Text>
                  <Text style={st.improveLine}>
                    <Text style={{ fontWeight: '600', color: colors.textPrimary }}>Improve: </Text>
                    {d.improveHint}
                  </Text>
                </GlassCard>
              );
            })}

            <Text style={st.aiSectionTitle}>AI insights</Text>
            <Text style={st.aiHint}>
              Sends only your aggregate scores and pattern names to our AI (not each individual answer). For reflection
              only.
            </Text>
            <TouchableOpacity
              style={[st.aiPrimaryBtn, { backgroundColor: colors.accentIndigo }]}
              onPress={() => void fetchTraitInsights()}
              disabled={aiLoading}
              activeOpacity={0.85}
            >
              {aiLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={st.aiPrimaryBtnText}>Generate AI trait report</Text>
                </>
              )}
            </TouchableOpacity>
            {aiError ? <Text style={[st.aiError, { color: colors.destructive }]}>{aiError}</Text> : null}
            {aiReport ? (
              <GlassCard style={st.aiReportCard}>
                <Text style={st.reportSectionLabel}>AI report</Text>
                {aiReport.split(/\n\n+/).map((para, i) => (
                  <Text key={i} style={st.aiPara}>
                    {para.replace(/^#{1,6}\s+/gm, '').trim()}
                  </Text>
                ))}
              </GlassCard>
            ) : null}

            <Text style={st.disclaimer}>
              Trait test ({TRAIT_TEST_INSTRUMENT_VERSION}) is a self-report snapshot. It does not assess ability or
              predict performance. Retake anytime; results are saved on this device when you are signed in.
            </Text>

            <TouchableOpacity style={[st.secondaryBtn, { borderColor: colors.primary }]} onPress={resetTest}>
              <Text style={[st.secondaryBtnText, { color: colors.primary }]}>Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.back()} style={st.doneLink}>
              <Text style={[st.doneLinkText, { color: colors.textMuted }]}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    scroll: { flex: 1 },
    content: {
      paddingHorizontal: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 48 : Spacing.lg,
      paddingBottom: 120,
      maxWidth: 520,
      alignSelf: 'center',
      width: '100%',
    },
    lead: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.base * 1.5,
      marginBottom: Spacing.md,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      marginTop: Spacing.lg,
    },
    primaryBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    progressOuter: {
      height: 6,
      borderRadius: 3,
      backgroundColor: colors.surface,
      overflow: 'hidden',
      marginBottom: Spacing.sm,
    },
    progressInner: { height: '100%', borderRadius: 3 },
    progressLabel: { fontSize: Typography.fontSize.xs, color: colors.textMuted, marginBottom: Spacing.lg },
    questionText: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.sm,
      lineHeight: Typography.fontSize.lg * 1.35,
    },
    scaleHint: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.md },
    optionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderRadius: Radius.md,
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.md,
      marginBottom: Spacing.sm,
    },
    optionLetter: {
      width: 22,
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textMuted,
      marginRight: Spacing.xs,
    },
    optionLabel: { flex: 1, fontSize: Typography.fontSize.sm, color: colors.textPrimary },
    backLink: { marginTop: Spacing.lg, alignItems: 'center' },
    backLinkText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    resultsTitle: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.xs,
    },
    headline: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: Spacing.lg,
      lineHeight: Typography.fontSize.lg * 1.35,
    },
    reportCard: { marginBottom: Spacing.md },
    reportSectionLabel: {
      fontSize: Typography.fontSize.xs,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textMuted,
      marginBottom: Spacing.sm,
      letterSpacing: 0.3,
    },
    execSummary: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.55,
    },
    detailedHeading: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    resultsSub: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.md },
    traitCard: { marginBottom: Spacing.md },
    traitHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: Spacing.sm,
    },
    traitName: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary },
    traitScore: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    barBg: { height: 8, borderRadius: 4, overflow: 'hidden', marginBottom: Spacing.sm },
    barFill: { height: '100%', borderRadius: 4 },
    patternMeaning: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.5,
      marginBottom: Spacing.sm,
    },
    improveLine: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
    aiSectionTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginTop: Spacing.lg,
      marginBottom: Spacing.xs,
    },
    aiHint: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.5,
      marginBottom: Spacing.md,
    },
    aiPrimaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      marginBottom: Spacing.sm,
    },
    aiPrimaryBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    aiError: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
    aiReportCard: { marginBottom: Spacing.md, marginTop: Spacing.sm },
    aiPara: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.55,
      marginBottom: Spacing.md,
    },
    disclaimer: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      lineHeight: Typography.fontSize.xs * 1.5,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
    },
    secondaryBtn: {
      borderWidth: 1.5,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      alignItems: 'center',
      marginTop: Spacing.md,
    },
    secondaryBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    doneLink: { alignItems: 'center', paddingVertical: Spacing.lg },
    doneLinkText: { fontSize: Typography.fontSize.sm },
  });
