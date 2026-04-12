/**
 * Skill Lab — skill detail + AI practice
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
import { saveSkillSession, recordScenarioAttempt } from '@/services/skills-storage';
import { buildVercelApiUrl } from '@/utils/vercel-api';

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
  strengths: string[];
  growthAreas: string[];
  refinementPrompt: string;
  nextScenarioAvailable: boolean;
  consequences: string;
  reflectionQuestion: string;
}

// Per-mode UI config
interface ModeConfig {
  scenarioLabel: string;
  inputPlaceholder: string;
  hint: string;
  loadingText: string;
}

function getModeConfig(
  mode: PracticeMode,
  opts?: { skillId?: string; atomicSkillId?: string | null }
): ModeConfig {
  const { skillId, atomicSkillId } = opts ?? {};

  switch (mode) {
    case 'output_audit': {
      // Scenario title reflects the exercise shape (API text differs per atomic for AI Literacy).
      let scenarioLabel = 'Exercise';
      if (skillId === 'ai_literacy') {
        switch (atomicSkillId) {
          case 'prompt_craft':
            scenarioLabel = 'Weak prompt + AI reply';
            break;
          case 'output_evaluation':
            scenarioLabel = 'AI output to evaluate';
            break;
          case 'ai_ethics':
            scenarioLabel = 'AI / policy scenario';
            break;
          case 'tool_fluency':
            scenarioLabel = 'Tool & workflow';
            break;
          default:
            scenarioLabel = 'AI literacy exercise';
        }
      } else {
        scenarioLabel = 'AI output to evaluate';
      }
      return {
        scenarioLabel,
        // Placeholder stays short — the task lives in the "question" line only (no duplicate audit essay).
        inputPlaceholder: 'Be specific — what you noticed, why it matters, what you’d change or verify.',
        hint: 'Each sub-skill uses a different exercise. Pick a sub-skill, then start practice.',
        loadingText: 'Generating your exercise...',
      };
    }
    case 'open_reflection':
      return {
        scenarioLabel: 'Situation',
        inputPlaceholder: "Share your honest thinking — what you notice, how you'd respond, and why.",
        hint: 'Read the situation → reflect openly → get coaching on your response.',
        loadingText: 'Generating your scenario...',
      };
    case 'generative_brainstorm':
      return {
        scenarioLabel: 'Creative Challenge',
        inputPlaceholder: 'List your ideas — aim for at least 4. Range over polish. One should challenge an assumption.',
        hint: 'Read the challenge → generate ideas (range over polish) → get feedback on originality.',
        loadingText: 'Generating your creative challenge...',
      };
    case 'draft_and_refine':
      return {
        scenarioLabel: 'Communication Brief',
        inputPlaceholder: 'Draft your message — email, Slack, memo, or opening line. Keep it under 150 words.',
        hint: 'Read the brief → draft your message → get feedback on clarity, framing, and audience fit.',
        loadingText: 'Generating your communication brief...',
      };
    default:
      return {
        scenarioLabel: 'Scenario',
        inputPlaceholder: 'Short answer is fine — focus on your logic and trade-offs.',
        hint: 'Scenario → pick a move → explain your reasoning → feedback, trade-offs, and a reflection prompt.',
        loadingText: 'Generating your scenario...',
      };
  }
}

/** Fallback decision options shown if the API omits them. */
const FALLBACK_DECISION_OPTIONS: DecisionOption[] = [
  { id: 'a', label: 'Move fast with a small, reversible experiment' },
  { id: 'b', label: 'Commit to a bolder stance and accept higher risk' },
  { id: 'c', label: 'Delay the call until you have more data or input' },
  { id: 'd', label: 'Align stakeholders first, then decide together' },
];

/** Client fallback if the model omits "question" — matches API branches per atomic. */
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
      return 'Using prompt quality, output accuracy, ethics, or tool fit — explain what needs fixing and how.';
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
  feedbackText: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.5 },
  section: { gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: 2 },
  sectionTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  reflectionQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium, lineHeight: Typography.fontSize.sm * 1.5 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function SkillDetailScreen() {
  const params = useLocalSearchParams<{ skillId: string; returnTo?: string | string[] }>();
  const { skillId } = params;
  const router = useRouter();
  const colors = useColors();
  const { user } = useAuthStore();

  const navigateBackFromSkill = useCallback(() => {
    const ret = params.returnTo;
    const r = Array.isArray(ret) ? ret[0] : ret;
    if (r === 'chat') { router.replace('/chat'); return; }
    if (r === 'assist') { router.replace('/(tabs)/assist'); return; }
    router.back();
  }, [params.returnTo, router]);

  const skill = getSkillById(skillId ?? '');

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

  const scrollRef = useRef<ScrollView>(null);
  /** Timestamp when the current scenario started loading — used for duration_ms. */
  const scenarioStartedAt = useRef<number>(0);
  /** Keep a ref in sync with selectedAtomicId to avoid stale closures in startPractice. */
  const selectedAtomicIdRef = useRef<string | null>(null);
  const styles = createStyles(colors);

  if (!skill) {
    return (
      <View style={styles.errorContainer}>
        <Text style={{ color: colors.textPrimary }}>Skill not found.</Text>
        <TouchableOpacity onPress={navigateBackFromSkill}>
          <Text style={{ color: colors.primary, marginTop: 8 }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const practiceMode = skill.practiceMode;
  const modeConfig = getModeConfig(practiceMode, {
    skillId: skill.id,
    atomicSkillId: selectedAtomicId,
  });
  const selectedAtomic = skill.atomicSkills.find((a) => a.id === selectedAtomicId) ?? null;
  const isDecisionMode = practiceMode === 'decision_simulator';

  // Keep ref in sync with state
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useEffect(() => { selectedAtomicIdRef.current = selectedAtomicId; }, [selectedAtomicId]);

  // ── Start practice: generate scenario ──────────────────────────────────────
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const startPractice = useCallback(async () => {
    const atomicId = selectedAtomicIdRef.current;
    if (!atomicId) return;
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
  }, [skill, practiceMode, isDecisionMode, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps


  // ── Submit answer: get feedback ─────────────────────────────────────────────
  const submitAnswer = useCallback(async () => {
    const answer = userAnswer.trim();
    if (!answer || phase !== 'answering') return;
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

      const res = await fetch(buildVercelApiUrl('/api/skills-coach'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('API error');

      const data = (await res.json()) as Feedback;
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
        if (saved) setRoundsSaved((n) => n + 1);
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
    isDecisionMode,
  ]);

  // ── Refine: keep scenario, increment attempt ────────────────────────────────
  const refineAnswer = () => {
    setAttemptNumber((n) => n + 1);
    setUserAnswer('');
    setFeedback(null);
    setPhase('answering');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  // ── New scenario ────────────────────────────────────────────────────────────
  const newScenario = () => {
    setScenario('');
    setPracticeQuestion('');
    setDecisionOptions([]);
    setSelectedDecisionId(null);
    setUserAnswer('');
    setFeedback(null);
    startPractice();
  };

  const isPracticing = phase !== 'idle';

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={navigateBackFromSkill} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={[styles.iconCircle, { backgroundColor: skill.color + '18' }]}>
            <Ionicons name={skill.icon as any} size={24} color={skill.color} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.skillName}>{skill.name}</Text>
            <Text style={styles.skillTagline}>{skill.tagline}</Text>
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About this skill</Text>
          <Text style={styles.bodyText}>{skill.description}</Text>
          <View style={[styles.whyBox, { backgroundColor: skill.color + '10', borderColor: skill.color + '30' }]}>
            <Ionicons name="information-circle-outline" size={16} color={skill.color} />
            <Text style={[styles.whyText, { color: colors.textPrimary }]}>{skill.why}</Text>
          </View>
        </View>

        {/* Sub-skills */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sub-skills</Text>
          <Text style={styles.bodyTextMuted}>
            Choose a sub-skill below — practice is tailored to that focus.
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
            <Text style={styles.atomicDesc}>{selectedAtomic.description}</Text>
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

            {/* Error banner */}
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
                {practiceError ? 'Try again' : roundsSaved > 0 ? 'Practice again' : 'Start AI Practice'}
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

        {/* ── PRACTICE AREA ─────────────────────────────────────── */}
        {isPracticing && (
          <View style={styles.section}>
            <View style={styles.practiceHeader}>
              <Ionicons name="school-outline" size={16} color={skill.color} />
              <Text style={[styles.practiceLabel, { color: skill.color }]}>
                AI Practice{selectedAtomic ? ` · ${selectedAtomic.name}` : ''}
              </Text>
              <TouchableOpacity onPress={() => setPhase('idle')} hitSlop={8} style={{ marginLeft: 'auto' }}>
                <Ionicons name="close" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

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
                  <Text style={[styles.scenarioLabel, { color: skill.color }]}>
                    {modeConfig.scenarioLabel}
                  </Text>
                  <Text style={[styles.scenarioText, { color: colors.textPrimary }]}>{scenario}</Text>
                </View>

                {/* Decision choice step (decision_simulator only) */}
                {phase === 'choosing_decision' && isDecisionMode && (
                  <>
                    <Text style={[styles.decisionStepTitle, { color: colors.textPrimary }]}>
                      Your move — pick one
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
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
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
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm },
    atomicDesc: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, lineHeight: Typography.fontSize.sm * 1.5, fontStyle: 'italic' },
    roundsBadge: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, borderRadius: Radius.md, padding: Spacing.sm, marginBottom: Spacing.sm },
    roundsText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
    errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, padding: Spacing.sm, marginBottom: Spacing.sm },
    errorBannerText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
    startBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, borderRadius: Radius.lg, paddingVertical: Spacing.md, marginBottom: Spacing.sm },
    startBtnText: { color: '#fff', fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold },
    practiceHint: { textAlign: 'center', fontSize: Typography.fontSize.xs, color: colors.textMuted },
    practiceHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.md },
    practiceLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    loadingBox: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, padding: Spacing.md },
    loadingText: { fontSize: Typography.fontSize.sm },
    scenarioBox: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.md, marginBottom: Spacing.md },
    scenarioLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
    scenarioText: { fontSize: Typography.fontSize.base, lineHeight: Typography.fontSize.base * 1.5 },
    questionBox: { marginBottom: Spacing.md },
    questionLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: Spacing.xs },
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
