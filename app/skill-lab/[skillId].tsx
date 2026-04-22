/**
 * Skill Lab - skill detail + AI practice
 *
 * Routes each skill to its own practice mode:
 *   decision_simulator  → scenario → A–D choice → reasoning → feedback
 *   output_audit        → AI output to evaluate → critique → feedback
 *   open_reflection     → interpersonal/systemic situation → open response → feedback
 *   generative_brainstorm → creative challenge → ideas list → originality feedback
 *   draft_and_refine    → communication brief → draft message → feedback
 *
 * Uses /api/skills-coach for AI calls.
 * Saves completed rounds to Supabase via skills-storage.ts.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  ActivityIndicator,
  KeyboardAvoidingView,
  Animated,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  useColors,
  Spacing,
  Typography,
  Radius,
  Layout,
} from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';
import { getSkillById } from '@/data/future-skills';
import type { AtomicSkill, FutureSkill, PracticeMode } from '@/data/future-skills';
import {
  getHowToSolveLines,
  getPracticeFieldCopy,
  getOptionalSituationCopy,
  normalizeSkillRouteParam,
} from '@/data/skill-lab-practice-ui';
import { saveSkillSession, recordScenarioAttempt } from '@/services/skills-storage';
import { bumpOfflineSessionCount } from '@/services/skill-lab-offline-progress';
import { getUserProfileContext, buildPracticeContextWire, type UserProfileContext } from '@/services/profile-context';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import { ScreenHeader } from '@/components/ui/screen-header';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PracticePhase =
  | 'idle'
  | 'loading_scenario'
  | 'choosing_decision'   // decision_simulator only
  | 'answering'
  | 'loading_feedback'
  | 'feedback';

interface DecisionOption {
  id: string;
  label: string;
}

interface Feedback {
  feedback: string;
  /** AI coach score 0–10 for this response. */
  scoreOutOf10: number;
  strengths: string[];
  growthAreas: string[];
  refinementPrompt: string;
  nextScenarioAvailable: boolean;
  consequences: string;
  reflectionQuestion: string;
}

function parseFeedbackPayload(raw: Record<string, unknown>): Feedback {
  const scoreRaw = raw.scoreOutOf10 ?? raw.score_out_of_10 ?? raw.score;
  const n =
    typeof scoreRaw === 'number'
      ? scoreRaw
      : typeof scoreRaw === 'string'
        ? parseFloat(scoreRaw)
        : NaN;
  const scoreOutOf10 = Number.isNaN(n) ? 5 : Math.min(10, Math.max(0, Math.round(n)));

  return {
    scoreOutOf10,
    feedback: String(raw.feedback ?? ''),
    strengths: Array.isArray(raw.strengths) ? (raw.strengths as string[]) : [],
    growthAreas: Array.isArray(raw.growthAreas) ? (raw.growthAreas as string[]) : [],
    refinementPrompt: String(raw.refinementPrompt ?? ''),
    nextScenarioAvailable: raw.nextScenarioAvailable !== false,
    consequences: String(raw.consequences ?? ''),
    reflectionQuestion: String(raw.reflectionQuestion ?? ''),
  };
}

/** Fallback decision options shown if the API omits them. */
const FALLBACK_DECISION_OPTIONS: DecisionOption[] = [
  { id: 'a', label: 'Move fast with a small, reversible experiment' },
  { id: 'b', label: 'Commit to a bolder stance and accept higher risk' },
  { id: 'c', label: 'Delay the call until you have more data or input' },
  { id: 'd', label: 'Align stakeholders first, then decide together' },
];

/** Client fallback if the model omits "question" - matches API branches per atomic. */
function fallbackOutputAuditQuestion(skillId: string, atomicSkillId: string | null): string {
  if (skillId !== 'ai_literacy') {
    return 'What issues do you notice, and what would you change or verify before using this?';
  }
  switch (atomicSkillId) {
    case 'prompt_craft':
      return 'What is weak about how the user asked, and how would you rewrite the prompt for a clearer, safer answer?';
    case 'output_evaluation':
      return 'What is wrong or overstated in the AI output, and what would you check before trusting or sharing it?';
    case 'ai_ethics':
      return 'What ethical risks do you see (bias, privacy, IP, misuse), and what guardrails would you add?';
    case 'tool_fluency':
      return 'Is this the right tool and workflow for the task? What would you use instead or add, and why?';
    default:
      return 'Using prompt quality, output accuracy, ethics, or tool fit, explain what needs fixing and how.';
  }
}

function parseDecisionOptionsFromApi(data: Record<string, unknown>): DecisionOption[] {
  const raw =
    data.decisionOptions ??
    data.decision_options ??
    data.options ??
    data.choices;
  if (!Array.isArray(raw)) return [];
  return raw
    .map((o, i) => {
      const row = (o && typeof o === 'object' ? o : {}) as Record<string, unknown>;
      const id = String(row.id ?? row.key ?? ['a', 'b', 'c', 'd'][i] ?? `o${i}`).toLowerCase();
      const label = String(
        row.label ?? row.text ?? row.title ?? row.option ?? row.description ?? ''
      ).trim();
      return { id, label };
    })
    .filter((x) => x.label.length > 0);
}

/** Phase step labels for the practice stepper bar. */
const PHASE_STEPS_DECISION = ['Choose', 'Reason', 'Feedback'] as const;
const PHASE_STEPS_OPEN = ['Read', 'Respond', 'Feedback'] as const;

function getPhaseIndex(phase: PracticePhase, isDecision: boolean): number {
  if (phase === 'loading_scenario') return 0;
  if (isDecision) {
    if (phase === 'choosing_decision') return 0;
    if (phase === 'answering' || phase === 'loading_feedback') return 1;
    if (phase === 'feedback') return 2;
  } else {
    if (phase === 'answering' || phase === 'loading_feedback') return 1;
    if (phase === 'feedback') return 2;
  }
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AtomicSkillChip({
  skill,
  selected,
  color,
  colors,
  onPress,
}: {
  skill: AtomicSkill;
  selected: boolean;
  color: string;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        chipStyles.chip,
        {
          backgroundColor: selected ? color + '22' : colors.surface,
          borderColor: selected ? color : colors.border,
        },
      ]}
    >
      <Text style={[chipStyles.chipText, { color: selected ? color : colors.textSecondary }]}>
        {skill.name}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm - 2,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

function FeedbackCard({
  fb,
  colors,
  skill,
}: {
  fb: Feedback;
  colors: ReturnType<typeof useColors>;
  skill: FutureSkill;
}) {
  return (
    <View style={[fbStyles.card, { backgroundColor: colors.floating, borderColor: colors.border }]}>
      <View style={[fbStyles.scoreRow, { borderColor: skill.color + '35', backgroundColor: skill.color + '10' }]}>
        <Text style={[fbStyles.scoreLabel, { color: skill.color }]}>Score</Text>
        <Text style={[fbStyles.scoreValue, { color: colors.textPrimary }]}>
          {fb.scoreOutOf10}
          <Text style={[fbStyles.scoreDenom, { color: colors.textMuted }]}>/10</Text>
        </Text>
      </View>
      <Text style={[fbStyles.feedbackText, { color: colors.textPrimary }]}>{fb.feedback}</Text>

      {fb.strengths.length > 0 && (
        <View style={fbStyles.section}>
          <View style={fbStyles.sectionHeader}>
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
            <Text style={[fbStyles.sectionTitle, { color: colors.primary }]}>Strengths</Text>
          </View>
          {fb.strengths.map((s, i) => (
            <Text key={i} style={[fbStyles.bullet, { color: colors.textPrimary }]}>· {s}</Text>
          ))}
        </View>
      )}

      {fb.growthAreas.length > 0 && (
        <View style={fbStyles.section}>
          <View style={fbStyles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={14} color={colors.accentWarmTan} />
            <Text style={[fbStyles.sectionTitle, { color: colors.accentWarmTan }]}>Growth areas</Text>
          </View>
          {fb.growthAreas.map((g, i) => (
            <Text key={i} style={[fbStyles.bullet, { color: colors.textPrimary }]}>· {g}</Text>
          ))}
        </View>
      )}

      {fb.consequences?.trim() ? (
        <View style={[fbStyles.consequenceBox, { borderColor: colors.border, backgroundColor: colors.surface }]}>
          <View style={fbStyles.sectionHeader}>
            <Ionicons name="git-branch-outline" size={14} color={colors.accentIndigo} />
            <Text style={[fbStyles.sectionTitle, { color: colors.accentIndigo }]}>Likely outcomes</Text>
          </View>
          <Text style={[fbStyles.consequenceText, { color: colors.textPrimary }]}>
            {fb.consequences.split('\n').filter(Boolean).join('\n')}
          </Text>
        </View>
      ) : null}

      {fb.reflectionQuestion?.trim() ? (
        <View style={[fbStyles.reflectionBox, { borderColor: skill.color + '40', backgroundColor: skill.color + '10' }]}>
          <Ionicons name="sparkles-outline" size={16} color={skill.color} />
          <View style={{ flex: 1 }}>
            <Text style={[fbStyles.reflectionLabel, { color: skill.color }]}>Reflect</Text>
            <Text style={[fbStyles.reflectionQ, { color: colors.textPrimary }]}>{fb.reflectionQuestion}</Text>
          </View>
        </View>
      ) : null}

      {fb.refinementPrompt?.trim() ? (
        <View style={[fbStyles.refinementBox, { backgroundColor: skill.color + '12', borderColor: skill.color + '30' }]}>
          <Ionicons name="arrow-forward-circle-outline" size={16} color={skill.color} />
          <Text style={[fbStyles.refinementText, { color: colors.textPrimary }]}>{fb.refinementPrompt}</Text>
        </View>
      ) : null}
    </View>
  );
}

const fbStyles = StyleSheet.create({
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  scoreLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.3 },
  scoreValue: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold },
  scoreDenom: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  feedbackText: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.5 },
  section: { gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
  },
  bullet: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5, paddingLeft: Spacing.xs },
  refinementBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  refinementText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
  consequenceBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, gap: Spacing.xs },
  consequenceText: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55 },
  reflectionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
  reflectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    letterSpacing: 0.2,
    marginBottom: 4,
  },
  reflectionQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, lineHeight: Typography.fontSize.sm * 1.5 },
});

/** Phase stepper bar rendered above the practice area. */
function PhaseStepper({
  steps,
  activeIndex,
  accentColor,
  colors,
}: {
  steps: readonly string[];
  activeIndex: number;
  accentColor: string;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={stepperStyles.row}>
      {steps.map((label, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        return (
          <React.Fragment key={label}>
            {i > 0 && (
              <View
                style={[
                  stepperStyles.line,
                  { backgroundColor: done ? accentColor : colors.border },
                ]}
              />
            )}
            <View style={stepperStyles.stepCol}>
              <View
                style={[
                  stepperStyles.dot,
                  {
                    backgroundColor: done || active ? accentColor : colors.surface,
                    borderColor: done || active ? accentColor : colors.border,
                  },
                ]}
              >
                {done && <Ionicons name="checkmark" size={10} color="#fff" />}
                {active && !done && <View style={[stepperStyles.innerDot, { backgroundColor: '#fff' }]} />}
              </View>
              <Text
                style={[
                  stepperStyles.label,
                  { color: active ? accentColor : done ? colors.textSecondary : colors.textMuted },
                ]}
              >
                {label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

const stepperStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, gap: 2 },
  stepCol: { alignItems: 'center', gap: 3 },
  dot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerDot: { width: 6, height: 6, borderRadius: 3 },
  line: { height: 2, flex: 1, borderRadius: 1, minWidth: 28 },
  label: { fontSize: Typography.fontSize.micro, fontWeight: Typography.fontWeight.medium },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SkillDetailScreen() {
  const params = useLocalSearchParams<{
    skillId: string | string[];
    returnTo?: string | string[];
    /** Pre-select a sub-skill (e.g. from Skill Lab catalog). */
    atomic?: string | string[];
  }>();
  const skillIdParam = normalizeSkillRouteParam(params.skillId);
  const atomicQs = (() => {
    const a = params.atomic;
    const s = Array.isArray(a) ? a[0] : a;
    return typeof s === 'string' && s.length > 0 ? s : undefined;
  })();
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const navigateBackFromSkill = useCallback(() => {
    const ret = params.returnTo;
    const r = Array.isArray(ret) ? ret[0] : ret;
    if (r === 'chat') { router.replace('/chat'); return; }
    if (r === 'assist') { router.replace('/(tabs)/companion'); return; }
    router.back();
  }, [params.returnTo, router]);

  // Resolve skill - may be undefined; hooks still run unconditionally
  const skill = getSkillById(skillIdParam);

  const [selectedAtomicId, setSelectedAtomicId] = useState<string | null>(null);
  const [phase, setPhase] = useState<PracticePhase>('idle');
  const [scenario, setScenario] = useState('');
  // For decision_simulator
  const [decisionOptions, setDecisionOptions] = useState<DecisionOption[]>([]);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  // For all modes: the question or reasoning prompt shown above the text input
  const [practiceQuestion, setPracticeQuestion] = useState('');
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [roundsSaved, setRoundsSaved] = useState(0);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [customProblemDraft, setCustomProblemDraft] = useState('');
  const [learnerContext, setLearnerContext] = useState<UserProfileContext | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  /** Timestamp when the current scenario started loading - used for duration_ms. */
  const scenarioStartedAt = useRef<number>(0);
  /** Keep a ref in sync with selectedAtomicId to avoid stale closures in startPractice. */
  const selectedAtomicIdRef = useRef<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const styles = createStyles(colors);

  // Derived values - safe even when skill is null
  const practiceMode: PracticeMode = skill?.practiceMode ?? 'open_reflection';
  const modeConfig = getPracticeFieldCopy({
    skillId: skill?.id ?? '',
    practiceMode,
    atomicSkillId: selectedAtomicId,
  });
  const selectedAtomic = skill?.atomicSkills.find((a) => a.id === selectedAtomicId) ?? null;
  const isDecisionMode = practiceMode === 'decision_simulator';

  // Keep ref in sync with state
  useEffect(() => { selectedAtomicIdRef.current = selectedAtomicId; }, [selectedAtomicId]);

  // Deep link: /skill-lab/[id]?atomic=subskill_id
  useEffect(() => {
    if (!skill || !atomicQs) return;
    if (skill.atomicSkills.some((a) => a.id === atomicQs)) {
      setSelectedAtomicId(atomicQs);
    }
  }, [skill, atomicQs]);

  // Fade-in animation on mount
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [fadeAnim]);

  useEffect(() => {
    if (!user?.id) {
      setLearnerContext(null);
      return;
    }
    let cancelled = false;
    getUserProfileContext(user.id)
      .then((c) => { if (!cancelled) setLearnerContext(c); })
      .catch(() => { if (!cancelled) setLearnerContext(null); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Start practice: generate scenario ──────────────────────────────────────
  const startPractice = useCallback(async () => {
    const atomicId = selectedAtomicIdRef.current;
    if (!atomicId || !skill) return;
    setPracticeError(null);
    setPhase('loading_scenario');
    setFeedback(null);
    setUserAnswer('');
    setAttemptNumber(1);
    setDecisionOptions([]);
    setSelectedDecisionId(null);
    setPracticeQuestion('');
    scenarioStartedAt.current = Date.now();

    if (user?.id) {
      await recordScenarioAttempt(user.id, skill.id);
    }

    try {
      const customDraft = customProblemDraft.trim();

      const practiceContext = buildPracticeContextWire(learnerContext);
      const res = await fetch(buildVercelApiUrl('/api/skills-coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          skillId: skill.id,
          skillName: skill.name,
          atomicSkillId: atomicId,
          atomicSkillName: skill.atomicSkills.find((a) => a.id === atomicId)?.name ?? null,
          practiceMode,
          generateScenario: true,
          ...(customDraft ? { customProblemDraft: customDraft } : {}),
          ...(practiceContext ? { practiceContext } : {}),
        }),
      });

      if (!res.ok) {
        const errBody = await res.text().catch(() => '');
        let errMsg = `Server error (${res.status})`;
        try { const j = JSON.parse(errBody) as Record<string, unknown>; if (typeof j.error === 'string') errMsg = j.error; } catch { /* ignore */ }
        throw new Error(errMsg);
      }

      const data = (await res.json()) as Record<string, unknown>;
      const scenarioText = String(data.scenario ?? '').trim();
      if (!scenarioText) throw new Error('The AI returned an empty scenario. Please try again.');

      setScenario(scenarioText);

      if (isDecisionMode) {
        let options = parseDecisionOptionsFromApi(data);
        if (options.length < 2) options = [...FALLBACK_DECISION_OPTIONS];
        const reasoning = String(
          data.reasoningPrompt ?? data.reasoning_prompt ?? data.question ?? ''
        ).trim() || 'Explain your reasoning for the path you chose, using the skill you are practising.';
        setDecisionOptions(options);
        setPracticeQuestion(reasoning);
        setPhase('choosing_decision');
      } else {
        const rawQ = String(
          data.question ?? data.auditPrompt ?? data.ideaPrompt ?? data.draftPrompt ?? ''
        ).trim();
        const question =
          rawQ ||
          (practiceMode === 'output_audit'
            ? fallbackOutputAuditQuestion(skill.id, atomicId)
            : 'Respond to the situation above using the skill you are practising.');
        setPracticeQuestion(question);
        setPhase('answering');
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err) {
      const errMsg2 = err instanceof Error ? err.message : 'Could not generate a scenario. Check your connection and try again.';
      setPracticeError(errMsg2);
      setPhase('idle');
    }
  }, [skill, practiceMode, isDecisionMode, user?.id, customProblemDraft, learnerContext]);


  // ── Submit answer: get feedback ─────────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    const answer = userAnswer.trim();
    if (!answer || phase !== 'answering' || !skill) return;
    if (isDecisionMode && !selectedDecisionId) return;

    setPhase('loading_feedback');

    try {
      const body: Record<string, unknown> = {
        skillId: skill.id,
        skillName: skill.name,
        atomicSkillId: selectedAtomicId ?? null,
        atomicSkillName: selectedAtomic?.name ?? null,
        practiceMode,
        scenario,
        userAnswer: answer,
        attemptNumber,
      };

      if (isDecisionMode) {
        body.reasoningPrompt = practiceQuestion;
        body.decisionOptions = decisionOptions;
        body.selectedDecisionId = selectedDecisionId;
      } else {
        body.question = practiceQuestion;
      }
      const pc = buildPracticeContextWire(learnerContext);
      if (pc) body.practiceContext = pc;

      const res = await fetch(buildVercelApiUrl('/api/skills-coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('API error');

      const rawFb = (await res.json()) as Record<string, unknown>;
      const data = parseFeedbackPayload(rawFb);
      setFeedback(data);
      setPhase('feedback');

      if (user?.id) {
        const chosen = isDecisionMode
          ? decisionOptions.find((o) => o.id === selectedDecisionId)
          : undefined;
        const durationMs = scenarioStartedAt.current > 0
          ? Date.now() - scenarioStartedAt.current
          : undefined;

        const saved = await saveSkillSession({
          userId: user.id,
          skillId: skill.id,
          atomicSkillId: selectedAtomicId,
          scenario,
          aiQuestion: practiceQuestion,
          userAnswer: answer,
          aiFeedback: data.feedback ?? '',
          aiScore: data.scoreOutOf10,
          strengths: data.strengths ?? [],
          growthAreas: data.growthAreas ?? [],
          attemptNumber,
          durationMs,
          practiceMode,
          sessionMetadata: {
            practiceMode,
            decisionOptions: isDecisionMode ? decisionOptions : undefined,
            selectedDecisionId: isDecisionMode ? selectedDecisionId ?? undefined : undefined,
            selectedDecisionLabel: chosen?.label,
            consequences: data.consequences,
            reflectionQuestion: data.reflectionQuestion,
          },
        });
        if (saved) {
          setRoundsSaved((n) => n + 1);
        } else {
          void bumpOfflineSessionCount(skill.id);
        }
      }

      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not get feedback. Check your connection and try again.';
      setPracticeError(msg);
      setPhase('answering');
    }
  }, [
    userAnswer, phase, skill, selectedAtomicId, selectedAtomic, practiceMode,
    scenario, practiceQuestion, decisionOptions, selectedDecisionId, attemptNumber, user?.id,
    isDecisionMode, learnerContext,
  ]);

  // ── Refine: keep scenario, increment attempt ────────────────────────────────
  const refineAnswer = useCallback(() => {
    setAttemptNumber((n) => n + 1);
    setUserAnswer('');
    setFeedback(null);
    setPhase('answering');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  }, []);

  // ── New scenario ────────────────────────────────────────────────────────────
  const newScenario = useCallback(() => {
    setScenario('');
    setPracticeQuestion('');
    setDecisionOptions([]);
    setSelectedDecisionId(null);
    setUserAnswer('');
    setFeedback(null);
    startPractice();
  }, [startPractice]);

  // ── Early return for missing skill - AFTER all hooks have run ──────────────
  if (!skill) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textMuted} />
        <Text style={{ color: colors.textPrimary, fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.md }}>Skill not found</Text>
        <Text style={{ color: colors.textMuted, fontSize: Typography.fontSize.sm, marginTop: Spacing.xs }}>This skill may have been removed or the link is invalid.</Text>
        <TouchableOpacity onPress={navigateBackFromSkill} style={{ marginTop: Spacing.lg }}>
          <Text style={{ color: colors.primary, fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPracticing = phase !== 'idle';
  const phaseSteps = isDecisionMode ? PHASE_STEPS_DECISION : PHASE_STEPS_OPEN;
  const maxCustomChars = 300;
  const situationCopy = getOptionalSituationCopy(skill.id);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <ScreenHeader
            title={skill.name}
            onBackPress={navigateBackFromSkill}
            showHomeButton
            backFallbackHref="/skill-lab"
          />
          <View style={styles.subHeader}>
            <View style={[styles.iconCircle, { backgroundColor: skill.color + '18' }]}>
              <Ionicons name={skill.icon as any} size={24} color={skill.color} />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.skillTagline}>{skill.tagline}</Text>
            </View>
          </View>

          {/* Sub-skills (first - pick a focus, then practice; About sits below Start) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sub-skills</Text>
            <Text style={styles.bodyTextMuted}>
              {selectedAtomic
                ? `You’re practising “${selectedAtomic.name}”. Scenarios and tips below follow this focus.`
                : 'Pick a sub-skill. Scenarios, “how to solve,” and coaching all match that focus.'}
            </Text>
            <View style={styles.chipRow}>
              {skill.atomicSkills.map((a) => (
                <AtomicSkillChip
                  key={a.id}
                  skill={a}
                  selected={selectedAtomicId === a.id}
                  color={skill.color}
                  colors={colors}
                  onPress={() => setSelectedAtomicId((prev) => (prev === a.id ? null : a.id))}
                />
              ))}
            </View>
            {selectedAtomic && (
              <>
                <Text style={styles.atomicDesc}>{selectedAtomic.description}</Text>

                {/* How to solve - numbered bullets with accent left border */}
                <View style={[styles.howBox, { borderColor: colors.border, backgroundColor: colors.floating, borderLeftColor: skill.color, borderLeftWidth: 3 }]}>
                  <Text style={[styles.howTitle, { color: colors.textPrimary }]}>How to solve this well</Text>
                  {getHowToSolveLines({
                    skillId: skill.id,
                    atomicSkillId: selectedAtomicId,
                    practiceMode,
                    isDecisionMode,
                  }).map((line, idx) => (
                    <View key={idx} style={styles.howBulletRow}>
                      <View style={[styles.howBulletNum, { backgroundColor: skill.color + '18' }]}>
                        <Text style={[styles.howBulletNumText, { color: skill.color }]}>{idx + 1}</Text>
                      </View>
                      <Text style={[styles.howBulletText, { color: colors.textSecondary }]}>
                        {line}
                      </Text>
                    </View>
                  ))}
                  <Text style={[styles.howFooter, { color: colors.textMuted }]}>
                    {`After feedback, use "Try again" to deepen the same scenario or "New scenario" for a fresh situation.`}
                  </Text>
                </View>

                {/* Your situation (optional) - with character count */}
                <Text style={[styles.customLabel, { color: colors.textPrimary }]}>Your situation (optional)</Text>
                <Text style={[styles.customHint, { color: colors.textMuted }]}>
                  {situationCopy.hint}
                </Text>
                <View>
                  <TextInput
                    style={[
                      styles.customInput,
                      { borderColor: colors.border, backgroundColor: colors.surface, color: colors.textPrimary },
                    ]}
                    placeholder={situationCopy.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={customProblemDraft}
                    onChangeText={(t) => setCustomProblemDraft(t.slice(0, maxCustomChars))}
                    multiline
                    textAlignVertical="top"
                  />
                  <Text style={[styles.charCount, { color: customProblemDraft.length >= maxCustomChars ? colors.destructive : colors.textMuted }]}>
                    {customProblemDraft.length}/{maxCustomChars}
                  </Text>
                </View>
              </>
            )}
          </View>

          {/* Start CTA (idle) */}
          {!isPracticing && (
            <View style={styles.section}>
              {roundsSaved > 0 && (
                <View style={[styles.roundsBadge, { backgroundColor: colors.primary + '15' }]}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                  <Text style={[styles.roundsText, { color: colors.primary }]}>
                    {roundsSaved} {roundsSaved === 1 ? 'round' : 'rounds'} completed this session
                  </Text>
                </View>
              )}

              {practiceError && (
                <View style={[styles.errorBanner, { backgroundColor: colors.destructive + '14', borderColor: colors.destructive + '40' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorBannerText, { color: colors.destructive }]}>{practiceError}</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.startBtn,
                  {
                    backgroundColor: selectedAtomicId ? skill.color : colors.surface,
                    borderWidth: selectedAtomicId ? 0 : 1,
                    borderColor: colors.border,
                  },
                ]}
                onPress={startPractice}
                disabled={!selectedAtomicId}
                activeOpacity={selectedAtomicId ? 0.85 : 1}
              >
                <Ionicons
                  name="play-circle-outline"
                  size={20}
                  color={selectedAtomicId ? '#fff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.startBtnText,
                    { color: selectedAtomicId ? '#fff' : colors.textMuted },
                  ]}
                >
                  {practiceError ? 'Try again' : roundsSaved > 0 ? 'Practice again' : 'Start AI practice'}
                </Text>
              </TouchableOpacity>
              {!selectedAtomicId ? (
                <Text style={[styles.practiceHint, { color: colors.textSecondary }]}>
                  Select a sub-skill above to enable practice.
                </Text>
              ) : (
                <Text style={styles.practiceHint}>{modeConfig.hint}</Text>
              )}
            </View>
          )}

          {!isPracticing && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>About this skill</Text>
              <Text style={styles.bodyText}>{skill.description}</Text>
              <View style={[styles.whyBox, { backgroundColor: skill.color + '10', borderColor: skill.color + '30' }]}>
                <Ionicons name="information-circle-outline" size={16} color={skill.color} />
                <Text style={[styles.whyText, { color: colors.textPrimary }]}>{skill.why}</Text>
              </View>
            </View>
          )}

          {/* ── PRACTICE AREA ─────────────────────────────────────── */}
          {isPracticing && (
            <View style={styles.section}>
              {/* Practice header with close */}
              <View style={styles.practiceHeader}>
                <Ionicons name="school-outline" size={16} color={skill.color} />
                <Text style={[styles.practiceLabel, { color: skill.color }]}>
                  AI Practice{selectedAtomic ? ` · ${selectedAtomic.name}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setPhase('idle')} hitSlop={8} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Phase stepper */}
              {phase !== 'loading_scenario' && (
                <PhaseStepper
                  steps={phaseSteps}
                  activeIndex={getPhaseIndex(phase, isDecisionMode)}
                  accentColor={skill.color}
                  colors={colors}
                />
              )}

              {/* Loading */}
              {phase === 'loading_scenario' && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={skill.color} />
                  <Text style={[styles.loadingText, { color: colors.textMuted }]}>
                    {modeConfig.loadingText}
                  </Text>
                </View>
              )}

              {/* Scenario / brief / AI output */}
              {(phase === 'choosing_decision' ||
                phase === 'answering' ||
                phase === 'loading_feedback' ||
                phase === 'feedback') && (
                <>
                  <View style={[styles.scenarioBox, { backgroundColor: skill.color + '0D', borderColor: skill.color + '30' }]}>
                    <View style={styles.scenarioLabelRow}>
                      <Ionicons name={skill.icon as any} size={14} color={skill.color} />
                      <Text style={[styles.scenarioLabel, { color: skill.color }]}>
                        {modeConfig.scenarioLabel}
                      </Text>
                    </View>
                    <Text style={[styles.scenarioText, { color: colors.textPrimary }]}>{scenario}</Text>
                  </View>

                  {/* Decision choice step (decision_simulator only) */}
                  {phase === 'choosing_decision' && isDecisionMode && (
                    <>
                      <Text style={[styles.decisionStepTitle, { color: colors.textPrimary }]}>
                        Your move. Pick one
                      </Text>
                      <Text style={[styles.decisionHint, { color: colors.textSecondary }]}>
                        You'll explain your reasoning next. Choose the path you'd actually take.
                      </Text>
                      {decisionOptions.map((opt, i) => {
                        const letter = ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '•';
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.decisionRow, { borderColor: colors.border, backgroundColor: colors.surface }]}
                            onPress={() => {
                              setSelectedDecisionId(opt.id);
                              setPhase('answering');
                              setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
                            }}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.decisionLetterBadge, { backgroundColor: skill.color + '22' }]}>
                              <Text style={[styles.decisionLetter, { color: skill.color }]}>{letter}</Text>
                            </View>
                            <Text style={[styles.decisionLabelText, { color: colors.textPrimary }]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {/* Answering + feedback area */}
                  {(phase === 'answering' || phase === 'loading_feedback' || phase === 'feedback') && (
                    <>
                      {/* Show chosen option (decision_simulator only) */}
                      {isDecisionMode && selectedDecisionId && (
                        <View style={[styles.choiceSummary, { borderColor: skill.color + '35', backgroundColor: skill.color + '08' }]}>
                          <Text style={[styles.questionLabel, { color: skill.color }]}>Your choice</Text>
                          <Text style={[styles.choiceSummaryText, { color: colors.textPrimary }]}>
                            {(() => {
                              const idx = decisionOptions.findIndex((o) => o.id === selectedDecisionId);
                              const L = idx >= 0 ? (['A', 'B', 'C', 'D', 'E', 'F'][idx] ?? '•') : '•';
                              const lab = decisionOptions.find((o) => o.id === selectedDecisionId)?.label ?? '';
                              return `${L} · ${lab}`;
                            })()}
                          </Text>
                        </View>
                      )}

                      {/* Question / reasoning prompt */}
                      <View style={styles.questionBox}>
                        <Text style={[styles.questionLabel, { color: colors.textSecondary }]}>
                          {isDecisionMode
                            ? `Reasoning${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`
                            : practiceMode === 'output_audit'
                              ? `Task${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`
                              : `Your response${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`}
                        </Text>
                        <Text style={[styles.questionText, { color: colors.textPrimary }]}>
                          {practiceQuestion}
                        </Text>
                      </View>

                      {(phase === 'answering' || phase === 'loading_feedback') && (
                        <View style={styles.answerArea}>
                          <TextInput
                            style={[
                              styles.answerInput,
                              { backgroundColor: colors.surface, borderColor: colors.border, color: colors.textPrimary },
                            ]}
                            value={userAnswer}
                            onChangeText={setUserAnswer}
                            placeholder={modeConfig.inputPlaceholder}
                            placeholderTextColor={colors.textMuted}
                            multiline
                            textAlignVertical="top"
                            editable={phase === 'answering'}
                          />
                          <TouchableOpacity
                            style={[
                              styles.submitBtn,
                              { backgroundColor: userAnswer.trim() && phase === 'answering' ? skill.color : colors.surface },
                            ]}
                            onPress={submitAnswer}
                            disabled={!userAnswer.trim() || phase === 'loading_feedback'}
                          >
                            {phase === 'loading_feedback' ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <>
                                <Ionicons name="send-outline" size={16} color={userAnswer.trim() ? '#fff' : colors.textMuted} />
                                <Text style={[styles.submitBtnText, { color: userAnswer.trim() ? '#fff' : colors.textMuted }]}>
                                  Get feedback
                                </Text>
                              </>
                            )}
                          </TouchableOpacity>
                        </View>
                      )}

                      {phase === 'feedback' && feedback && (
                        <View style={styles.feedbackArea}>
                          <FeedbackCard fb={feedback} colors={colors} skill={skill} />

                          <View style={styles.feedbackActions}>
                            <TouchableOpacity
                              style={[styles.actionBtn, styles.refineBtn, { borderColor: skill.color }]}
                              onPress={refineAnswer}
                            >
                              <Ionicons name="pencil-outline" size={16} color={skill.color} />
                              <Text style={[styles.actionBtnText, { color: skill.color }]}>
                                {isDecisionMode ? 'Refine my reasoning' : 'Try again'}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtn, { backgroundColor: skill.color }]}
                              onPress={newScenario}
                            >
                              <Ionicons name="shuffle-outline" size={16} color="#fff" />
                              <Text style={[styles.actionBtnText, { color: '#fff' }]}>New scenario</Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity onPress={() => setPhase('idle')} style={styles.doneLink}>
                            <Text style={[styles.doneLinkText, { color: colors.textMuted }]}>Done for now</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </>
                  )}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    content: { paddingBottom: Spacing['3xl'], maxWidth: Layout.maxWidth, alignSelf: 'center', width: '100%' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: Spacing.xl },
    subHeader: {
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    header: {
      paddingTop: Platform.OS === 'ios' ? 52 : Spacing.lg,
      paddingHorizontal: Spacing.md,
      paddingBottom: Spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.sm,
    },
    backBtn: {},
    iconCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    skillName: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, color: colors.textPrimary },
    skillTagline: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
    section: { paddingHorizontal: Spacing.md, marginBottom: Spacing.lg },
    sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.sm },
    bodyText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, lineHeight: Typography.fontSize.base * 1.5, marginBottom: Spacing.sm },
    bodyTextMuted: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, marginBottom: Spacing.sm, lineHeight: Typography.fontSize.sm * 1.5 },
    whyBox: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm },
    whyText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      marginBottom: Spacing.sm,
      gap: 0,
    },
    atomicDesc: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.fontSize.sm * 1.5,
      fontStyle: 'italic',
      marginTop: Spacing.sm,
    },
    howBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginTop: Spacing.md, gap: Spacing.sm },
    howTitle: {
      fontSize: Typography.fontSize.sm,
      fontWeight: Typography.fontWeight.semibold,
      marginBottom: Spacing.sm,
    },
    howBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    howBulletNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    howBulletNumText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
    howBulletText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45 },
    howFooter: { fontSize: Typography.fontSize.xs, lineHeight: Typography.fontSize.xs * 1.45, marginTop: Spacing.xs },
    customLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.lg },
    customHint: { fontSize: Typography.fontSize.xs, lineHeight: Typography.fontSize.xs * 1.45, marginTop: Spacing.xs, marginBottom: Spacing.sm },
    customInput: {
      borderWidth: 1,
      borderRadius: Radius.lg,
      padding: Spacing.md,
      fontSize: Typography.fontSize.sm,
      minHeight: 88,
      lineHeight: Typography.fontSize.sm * 1.45,
    },
    charCount: { position: 'absolute', bottom: Spacing.sm, right: Spacing.md, fontSize: Typography.fontSize.micro },
    roundsBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
    roundsText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, marginBottom: Spacing.sm },
    errorBannerText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
    startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.sm },
    startBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    practiceHint: { textAlign: 'center', fontSize: Typography.fontSize.xs, color: colors.textMuted },
    practiceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
    practiceLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    loadingBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    loadingText: { fontSize: Typography.fontSize.sm },
    scenarioBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
    scenarioLabelRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.xs },
    scenarioLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.2 },
    scenarioText: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.5 },
    questionBox: { marginBottom: Spacing.md },
    questionLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, letterSpacing: 0.2, marginBottom: Spacing.xs },
    questionText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.medium, lineHeight: Typography.fontSize.base * 1.5 },
    decisionStepTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.xs },
    decisionHint: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45, marginBottom: Spacing.md },
    decisionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm + 2, marginBottom: Spacing.sm },
    decisionLetterBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    decisionLetter: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
    decisionLabelText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.45 },
    choiceSummary: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.md },
    choiceSummaryText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, lineHeight: Typography.fontSize.sm * 1.45 },
    answerArea: { gap: Spacing.sm },
    answerInput: { borderWidth: 1, borderRadius: Radius.lg, padding: Spacing.md, fontSize: Typography.fontSize.base, minHeight: 120, lineHeight: Typography.fontSize.base * 1.5 },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md },
    submitBtnText: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    feedbackArea: { gap: Spacing.md },
    feedbackActions: { flexDirection: 'row', gap: Spacing.sm },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.lg, paddingVertical: Spacing.sm + 2 },
    refineBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
    actionBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    doneLink: { alignItems: 'center', paddingVertical: Spacing.xs },
    doneLinkText: { fontSize: Typography.fontSize.sm },
  });
