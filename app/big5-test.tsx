/**
 * Big Five personality assessment (IPIP 50-item markers) - from Profile.
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
} from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { BIG5_QUESTIONS, BIG5_LIKERT_LABELS, BIG5_INSTRUMENT_VERSION } from '@/data/big5-questions';
import { formatScore1dp, type Big5Scores } from '@/services/big5-scoring';
import { scoreBig5Assessment, type Big5EngineResult } from '@/services/big5-engine';
import { requestBig5LeadershipInsights } from '@/utils/vercel-api';
import { generateBig5Report } from '@/services/big5-report';
import { isSupabaseConfigured } from '@/lib/supabase';
import { saveBig5Assessment } from '@/services/big5-storage';
import { ScreenHeader } from '@/components/ui/screen-header';

type Phase = 'intro' | 'test' | 'results';

export default function Big5TestScreen() {
  const router = useRouter();
  const colors = useColors();
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const [phase, setPhase] = useState<Phase>('intro');
  const [index, setIndex] = useState(0);
  const [responses, setResponses] = useState<Record<string, number>>({});
  const [scores, setScores] = useState<Big5Scores | null>(null);
  const [engineResult, setEngineResult] = useState<Big5EngineResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedToCloud, setSavedToCloud] = useState<boolean | null>(null);
  const sessionStartRef = useRef<number | null>(null);

  useEffect(() => {
    if (phase === 'test' && sessionStartRef.current === null) {
      sessionStartRef.current = Date.now();
    }
    if (phase === 'intro') sessionStartRef.current = null;
  }, [phase]);

  const st = createStyles(colors);
  const q = BIG5_QUESTIONS[index];
  const total = BIG5_QUESTIONS.length;
  const progress = index / total;

  const report = useMemo(() => (scores ? generateBig5Report(scores) : null), [scores]);

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
      setScores(engine.raw);
      setEngineResult(engine);
      setAiReport(null);
      setAiError(null);
      setPhase('results');
      setSaving(true);
      setSaveError(null);
      setSavedToCloud(null);
      if (user?.id) {
        try {
          const id = await saveBig5Assessment(user.id, finalResponses, engine, BIG5_INSTRUMENT_VERSION);
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
      if (!q) return;
      const next = { ...responses, [q.id]: value };
      setResponses(next);
      if (index + 1 >= total) {
        void finish(next);
      } else {
        setIndex((i) => i + 1);
      }
    },
    [q, responses, index, total, finish]
  );

  const goBackQuestion = useCallback(() => {
    if (index <= 0) return;
    setIndex((i) => i - 1);
  }, [index]);

  const resetTest = useCallback(() => {
    setPhase('intro');
    setIndex(0);
    setResponses({});
    setScores(null);
    setEngineResult(null);
    setAiReport(null);
    setAiError(null);
    setSaveError(null);
    setSavedToCloud(null);
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

  if (!isLoading && !isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }

  return (
    <GlassBackground>
      <ScrollView style={st.scroll} contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          title="Big Five"
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
              Fifty short statements about how you usually think, feel, and act. For each one, say how much it sounds
              like you, from not like you at all to very much like you. This is for self-insight, not a clinical diagnosis.
              Allow about 10 to 15 minutes. You can retake anytime; each completion is saved separately.
            </Text>
            <TouchableOpacity style={[st.primaryBtn, { backgroundColor: colors.primary }]} onPress={() => setPhase('test')}>
              <Text style={st.primaryBtnText}>Start assessment</Text>
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
            </Text>
            <Text style={st.questionText}>{q.text}</Text>
            <Text style={st.scaleHint}>How much is this like you?</Text>
            {([5, 4, 3, 2, 1] as const).map((v) => (
              <TouchableOpacity
                key={v}
                style={[st.optionRow, { borderColor: colors.border, backgroundColor: colors.floating }]}
                onPress={() => selectLikert(v)}
                activeOpacity={0.75}
              >
                <Text style={st.optionLabel}>{BIG5_LIKERT_LABELS[v]}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
            {index > 0 ? (
              <TouchableOpacity onPress={goBackQuestion} style={st.backLink}>
                <Text style={[st.backLinkText, { color: colors.primary }]}>Previous question</Text>
              </TouchableOpacity>
            ) : null}
          </>
        )}

        {phase === 'results' && scores && report && engineResult && (
          <>
            <Text style={st.resultsTitle}>Your Big Five report</Text>
            <Text style={st.headline}>{report.headline}</Text>

            {saveError ? (
              <Text style={[st.warn, { color: colors.destructive }]}>{saveError}</Text>
            ) : saving ? (
              <ActivityIndicator color={colors.primary} style={{ marginVertical: Spacing.sm }} />
            ) : savedToCloud ? (
              <Text style={[st.saved, { color: colors.primary }]}>Results saved to your account.</Text>
            ) : savedToCloud === false && !saveError ? (
              <Text style={[st.saved, { color: colors.textSecondary }]}>
                {isSupabaseConfigured()
                  ? 'Results could not be synced. Your report is still shown below.'
                  : 'Report is shown on this device only (cloud sync not configured).'}
              </Text>
            ) : null}

            <GlassCard style={st.reportCard}>
              <Text style={st.reportSectionLabel}>Summary</Text>
              <Text style={st.execSummary}>{report.executiveSummary}</Text>
            </GlassCard>

            <GlassCard style={st.reportCard}>
              <Text style={st.reportSectionLabel}>Pattern</Text>
              <Text style={st.patternText}>{report.patterns.spreadNote}</Text>
              <Text style={st.patternSub}>
                Emphasis: {report.patterns.emphasis.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' · ')}
              </Text>
              <Text style={st.patternSub}>
                Relatively lower:{' '}
                {report.patterns.quieter.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' · ')}
              </Text>
            </GlassCard>

            <Text style={st.detailedHeading}>Detailed breakdown</Text>
            <Text style={st.resultsSub}>Each score is an average on a 1 to 5 scale (higher = more of that trait).</Text>

            {report.domains.map((d) => {
              const pct = ((d.score - 1) / 4) * 100;
              return (
                <GlassCard key={d.traitKey} style={st.traitCard}>
                  <View style={st.traitHeader}>
                    <Text style={st.traitName}>{d.displayName}</Text>
                    <Text style={st.traitScore}>
                      {formatScore1dp(d.score)} · {d.bandLabel}
                    </Text>
                  </View>
                  <View style={[st.barBg, { backgroundColor: colors.surface }]}>
                    <View style={[st.barFill, { width: `${pct}%`, backgroundColor: colors.primary }]} />
                  </View>
                  <Text style={st.oneLine}>{d.oneLine}</Text>
                  <Text style={st.detailPara}>{d.detail}</Text>
                </GlassCard>
              );
            })}

            <Text style={st.disclaimer}>{report.disclaimer}</Text>

            <Text style={st.aiSectionTitle}>Leadership & workplace (AI)</Text>
            <Text style={st.aiHint}>
              Get a deeper take on how this profile may show up at work: teams, influence, and development. Sends your
              scores, percentiles, and quality flags to our AI (not every individual answer). For reflection only; not for
              hiring or selection.
            </Text>
            <TouchableOpacity
              style={[st.aiPrimaryBtn, { backgroundColor: colors.accentIndigo }]}
              onPress={() => void fetchLeadershipInsights()}
              disabled={aiLoading}
              activeOpacity={0.85}
            >
              {aiLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="sparkles" size={20} color="#fff" />
                  <Text style={st.aiPrimaryBtnText}>Generate AI leadership insights</Text>
                </>
              )}
            </TouchableOpacity>
            {aiError ? <Text style={[st.aiError, { color: colors.destructive }]}>{aiError}</Text> : null}
            {aiReport ? (
              <GlassCard style={st.aiReportCard}>
                <Text style={st.reportSectionLabel}>AI insights</Text>
                {aiReport.split(/\n\n+/).map((para, i) => (
                  <Text key={i} style={st.aiPara}>
                    {para.replace(/^#{1,6}\s+/gm, '').trim()}
                  </Text>
                ))}
              </GlassCard>
            ) : null}

            <TouchableOpacity style={[st.secondaryBtn, { borderColor: colors.primary }]} onPress={resetTest}>
              <Text style={[st.secondaryBtnText, { color: colors.primary }]}>Retake assessment</Text>
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
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: Spacing.lg,
    },
    backBtn: { padding: 4 },
    headerTitle: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
    },
    lead: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.base * 1.5,
      marginBottom: Spacing.lg,
    },
    primaryBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      marginTop: Spacing.xl,
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
    patternText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.5,
      marginBottom: Spacing.sm,
    },
    patternSub: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.xs * 1.45,
      marginBottom: Spacing.xs,
    },
    detailedHeading: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    resultsSub: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.md },
    warn: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.sm },
    saved: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.md },
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
    oneLine: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
      lineHeight: Typography.fontSize.sm * 1.45,
      marginBottom: Spacing.sm,
    },
    detailPara: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.55,
    },
    disclaimer: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
      lineHeight: Typography.fontSize.xs * 1.5,
      marginTop: Spacing.md,
      marginBottom: Spacing.sm,
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
