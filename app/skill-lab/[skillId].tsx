/**
 * Skill Lab - skill detail + AI practice
 *
 * Act-first flow: pick a sub-skill (defaults to the first), optionally add context, start → scenario →
 * respond → feedback, then “Playbook for next time” (how-to lines) after the attempt—not before.
 *
 * Practice modes (see future-skills.ts):
 *   decision_simulator, output_audit, open_reflection, generative_brainstorm, draft_and_refine
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
  Shadows,
} from '@/constants/design-tokens';
import {
  SLColors,
  SLTypography,
  SLSpacing,
  SLLayout,
  SLRadius,
  SLButton,
  SLTextarea,
} from '@/constants/skill-lab-tokens';
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
import { bumpOfflineSessionCount, recordRoundForToday } from '@/services/skill-lab-offline-progress';
import { getUserProfileContext, buildPracticeContextWire, type UserProfileContext } from '@/services/profile-context';
import { buildVercelApiUrl } from '@/utils/vercel-api';
import { ScreenHeader } from '@/components/ui/screen-header';
import { GlassBackground } from '@/components/ui/glass-background';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type PracticePhase =
  | 'idle'
  | 'loading_scenario'
  | 'choosing_decision'   // decision_simulator only
  | 'answering'
  | 'loading_feedback'
  | 'feedback'
  // Quick Round (60s, multi-choice, single-call)
  | 'quick_loading'
  | 'quick_choosing'
  | 'quick_feedback';

/** Practice depth — Quick Round is the new default lightweight path. */
type PracticeDepth = 'quick' | 'standard';

interface DecisionOption {
  id: string;
  label: string;
}

interface QuickOption {
  id: string;
  label: string;
  tier: 'sharp' | 'solid' | 'try';
  reaction: string;
  nextTip: string;
}

const QUICK_TIER_COPY: Record<QuickOption['tier'], { label: string; emoji: string }> = {
  sharp: { label: 'Sharp move', emoji: '🎯' },
  solid: { label: 'Solid, almost there', emoji: '✨' },
  try: { label: 'Worth a rethink', emoji: '🌱' },
};

const QUICK_TIER_ORDER: QuickOption['tier'][] = ['sharp', 'solid', 'try'];

function quickFallbackText(tier: QuickOption['tier']): Pick<QuickOption, 'reaction' | 'nextTip'> {
  if (tier === 'sharp') {
    return {
      reaction: 'You picked the move that keeps the moment moving.',
      nextTip: 'Lock it in by naming the goal before the next step.',
    };
  }
  if (tier === 'solid') {
    return {
      reaction: "Solid instinct. You're close to the sharper play.",
      nextTip: 'Try adding one clear question or trade-off before you act.',
    };
  }
  return {
    reaction: 'Tempting move, but it may narrow the room too early.',
    nextTip: 'Pause, ask one grounding question, then make the call.',
  };
}

function quickFallbackOption(i: number, tier: QuickOption['tier'], label?: string): QuickOption {
  const text = quickFallbackText(tier);
  return {
    id: ['a', 'b', 'c'][i] ?? `o${i}`,
    label:
      label?.trim() ||
      (tier === 'sharp'
        ? "I'd clarify the goal, then suggest one concrete next step."
        : tier === 'solid'
          ? "I'd ask one question and offer a small next move."
          : "I'd push my preferred answer and try to settle it fast."),
    tier,
    ...text,
  };
}

function parseQuickOptionsFromApi(data: Record<string, unknown>): QuickOption[] {
  const raw =
    data.options ??
    data.choices ??
    data.decisionOptions ??
    data.decision_options;

  if (!Array.isArray(raw) || raw.length === 0) {
    return QUICK_TIER_ORDER.map((tier, i) => quickFallbackOption(i, tier));
  }

  const parsed = raw.slice(0, 3).map((item, i) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
    const tierRaw = String(row.tier ?? '').trim().toLowerCase();
    const tier: QuickOption['tier'] =
      tierRaw === 'sharp' || tierRaw === 'solid' || tierRaw === 'try'
        ? tierRaw
        : QUICK_TIER_ORDER[i] ?? 'solid';
    const fallback = quickFallbackOption(i, tier);
    const label = String(
      row.label ?? row.text ?? row.title ?? row.option ?? row.description ?? ''
    ).trim();
    return {
      id: String(row.id ?? row.key ?? fallback.id).toLowerCase(),
      label: label || fallback.label,
      tier,
      reaction: String(row.reaction ?? row.feedback ?? '').trim() || fallback.reaction,
      nextTip:
        String(row.nextTip ?? row.next_tip ?? row.tip ?? row.coachTip ?? '').trim() ||
        fallback.nextTip,
    };
  });

  while (parsed.length < 3) {
    const tier = QUICK_TIER_ORDER[parsed.length] ?? 'solid';
    parsed.push(quickFallbackOption(parsed.length, tier));
  }

  return parsed;
}

/** Friendly label for a 0-10 score in standard mode. */
function tierLabelForScore(score: number): { label: string; tone: 'sharp' | 'solid' | 'try' } {
  if (score >= 8) return { label: 'Sharp', tone: 'sharp' };
  if (score >= 5) return { label: 'Solid', tone: 'solid' };
  return { label: 'Worth another look', tone: 'try' };
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

/** Phase step labels for the practice stepper bar — kept warm, not exam-y. */
const PHASE_STEPS_DECISION = ['Scene', 'Your call', 'Coach'] as const;
const PHASE_STEPS_OPEN = ['Scene', 'Your move', 'Coach'] as const;

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
      activeOpacity={0.75}
      style={[
        chipStyles.chip,
        {
          backgroundColor: selected ? SLColors.brandPrimary + '12' : SLColors.bgSurface,
          borderColor: selected ? color : SLColors.borderSoft,
        },
      ]}
    >
      <Text style={[chipStyles.chipText, { color: selected ? color : SLColors.inkSecondary }]}>
        {skill.name}
      </Text>
    </TouchableOpacity>
  );
}

const chipStyles = StyleSheet.create({
  chip: {
    paddingHorizontal: SLSpacing.md,
    paddingVertical: SLSpacing.xs - 2,
    borderRadius: SLRadius.full,
    borderWidth: 1,
    marginRight: SLSpacing.xxs,
    marginBottom: SLSpacing.xxs,
  },
  chipText: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.sm,
    fontWeight: SLTypography.fontWeight.medium,
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
  const [scoreOpen, setScoreOpen] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const tier = tierLabelForScore(fb.scoreOutOf10);
  const tierAccent = tier.tone === 'sharp' ? colors.success : tier.tone === 'solid' ? skill.color : colors.accentWarmTan;
  const hasExtras = fb.strengths.length > 0 || fb.growthAreas.length > 0 || (fb.consequences?.trim() ?? '') !== '';

  return (
    <View style={[fbStyles.card, { backgroundColor: SLColors.bgSurface, borderColor: SLColors.borderDefault }]}>
      <TouchableOpacity
        onPress={() => setScoreOpen((o) => !o)}
        activeOpacity={0.85}
        style={[fbStyles.tierRow, { borderColor: tierAccent + '40', backgroundColor: tierAccent + '12' }]}
      >
        <Text style={[fbStyles.tierLabel, { color: tierAccent }]}>{tier.label}</Text>
        <Text style={[fbStyles.tierHint, { color: SLColors.inkMuted }]}>
          {scoreOpen ? `${fb.scoreOutOf10}/10` : 'Tap for score'}
        </Text>
      </TouchableOpacity>
      <Text style={[fbStyles.feedbackText, { color: SLColors.inkPrimary }]}>{fb.feedback}</Text>

      {fb.refinementPrompt?.trim() ? (
        <View style={[fbStyles.refinementBox, { backgroundColor: skill.color + '12', borderColor: skill.color + '30' }]}>
          <Ionicons name="arrow-forward-circle-outline" size={16} color={skill.color} />
          <Text style={[fbStyles.refinementText, { color: SLColors.inkPrimary }]}>{fb.refinementPrompt}</Text>
        </View>
      ) : null}

      {fb.reflectionQuestion?.trim() ? (
        <View style={[fbStyles.reflectionBox, { borderColor: skill.color + '40', backgroundColor: skill.color + '10' }]}>
          <Ionicons name="sparkles-outline" size={16} color={skill.color} />
          <View style={{ flex: 1 }}>
            <Text style={[fbStyles.reflectionLabel, { color: skill.color }]}>Reflect</Text>
            <Text style={[fbStyles.reflectionQ, { color: SLColors.inkPrimary }]}>{fb.reflectionQuestion}</Text>
          </View>
        </View>
      ) : null}

      {hasExtras && (
        <TouchableOpacity onPress={() => setExtrasOpen((o) => !o)} style={fbStyles.extrasToggle}>
          <Ionicons
            name={extrasOpen ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={SLColors.inkMuted}
          />
          <Text style={[fbStyles.extrasToggleText, { color: SLColors.inkMuted }]}>
            {extrasOpen ? 'Hide details' : 'Show what worked & what to tighten'}
          </Text>
        </TouchableOpacity>
      )}

      {extrasOpen && (
        <>
          {fb.strengths.length > 0 && (
            <View style={fbStyles.section}>
              <View style={fbStyles.sectionHeader}>
                <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                <Text style={[fbStyles.sectionTitle, { color: SLColors.brandPrimary }]}>What worked</Text>
              </View>
              {fb.strengths.map((s, i) => (
                <Text key={i} style={[fbStyles.bullet, { color: SLColors.inkPrimary }]}>· {s}</Text>
              ))}
            </View>
          )}

          {fb.growthAreas.length > 0 && (
            <View style={fbStyles.section}>
              <View style={fbStyles.sectionHeader}>
                <Ionicons name="trending-up-outline" size={14} color={colors.accentWarmTan} />
                <Text style={[fbStyles.sectionTitle, { color: colors.accentWarmTan }]}>To tighten next time</Text>
              </View>
              {fb.growthAreas.map((g, i) => (
                <Text key={i} style={[fbStyles.bullet, { color: SLColors.inkPrimary }]}>· {g}</Text>
              ))}
            </View>
          )}

          {fb.consequences?.trim() ? (
            <View style={[fbStyles.consequenceBox, { borderColor: SLColors.borderDefault, backgroundColor: SLColors.bgSurface }]}>
              <View style={fbStyles.sectionHeader}>
                <Ionicons name="git-branch-outline" size={14} color={colors.accentIndigo} />
                <Text style={[fbStyles.sectionTitle, { color: colors.accentIndigo }]}>If you go this way</Text>
              </View>
              <Text style={[fbStyles.consequenceText, { color: SLColors.inkPrimary }]}>
                {fb.consequences.split('\n').filter(Boolean).join('\n')}
              </Text>
            </View>
          ) : null}
        </>
      )}
    </View>
  );
}

const fbStyles = StyleSheet.create({
  card: { borderRadius: SLRadius.lg, borderWidth: 1, padding: SLSpacing.md, gap: SLSpacing.sm },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: SLRadius.md,
    paddingVertical: SLSpacing.xs + 2,
    paddingHorizontal: SLSpacing.md,
  },
  tierLabel: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.base,
    fontWeight: SLTypography.fontWeight.semibold,
  },
  tierHint: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.xs,
    fontWeight: SLTypography.fontWeight.medium,
  },
  extrasToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SLSpacing.xxs,
    paddingVertical: SLSpacing.xxs,
  },
  extrasToggleText: {
    fontFamily: SLTypography.fontFamily.sans,
    fontSize: SLTypography.fontSize.xs,
    fontWeight: SLTypography.fontWeight.medium,
  },
  feedbackText: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.base, lineHeight: SLTypography.fontSize.base * 1.6 },
  section: { gap: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.xxs, marginBottom: 2 },
  sectionTitle: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.xs,
    fontWeight: SLTypography.fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as any,
  },
  bullet: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.5, paddingLeft: SLSpacing.xxs },
  refinementBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SLSpacing.sm, borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm },
  refinementText: { flex: 1, fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.5 },
  consequenceBox: { borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm, gap: SLSpacing.xxs },
  consequenceText: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.6 },
  reflectionBox: { flexDirection: 'row', alignItems: 'flex-start', gap: SLSpacing.sm, borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm },
  reflectionLabel: {
    fontFamily: SLTypography.fontFamily.mono,
    fontSize: SLTypography.fontSize.xs,
    fontWeight: SLTypography.fontWeight.semibold,
    letterSpacing: 0.5,
    textTransform: 'uppercase' as any,
    marginBottom: 4,
  },
  reflectionQ: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, fontWeight: SLTypography.fontWeight.medium, lineHeight: SLTypography.fontSize.sm * 1.5 },
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
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: SLSpacing.md, gap: 2 },
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
  label: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.micro, fontWeight: SLTypography.fontWeight.medium, textTransform: 'uppercase' as any, letterSpacing: 0.3 },
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
    /** Optional ?depth=quick|standard or ?quick=1 to pre-select Quick Round. */
    depth?: string | string[];
    quick?: string | string[];
  }>();
  const skillIdParam = normalizeSkillRouteParam(params.skillId);
  const atomicQs = (() => {
    const a = params.atomic;
    const s = Array.isArray(a) ? a[0] : a;
    return typeof s === 'string' && s.length > 0 ? s : undefined;
  })();
  const initialDepth: PracticeDepth = (() => {
    const d = params.depth;
    const dv = Array.isArray(d) ? d[0] : d;
    if (dv === 'standard') return 'standard';
    return 'quick';
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
  const [optionalContextOpen, setOptionalContextOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [learnerContext, setLearnerContext] = useState<UserProfileContext | null>(null);

  // Quick Round state — single-call multi-choice flow
  const [practiceDepth, setPracticeDepth] = useState<PracticeDepth>(initialDepth);
  const [quickOptions, setQuickOptions] = useState<QuickOption[]>([]);
  const [quickPickedId, setQuickPickedId] = useState<string | null>(null);

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

  // Deep link or sensible default: always have a focus so users can act immediately.
  useEffect(() => {
    if (!skill) return;
    if (atomicQs && skill.atomicSkills.some((a) => a.id === atomicQs)) {
      setSelectedAtomicId(atomicQs);
      return;
    }
    setSelectedAtomicId((prev) => {
      if (prev && skill.atomicSkills.some((a) => a.id === prev)) return prev;
      return skill.atomicSkills[0]?.id ?? null;
    });
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

  useEffect(() => {
    if (!skill) return;
    setOptionalContextOpen(false);
  }, [skill]);

  // ── Start practice: generate scenario (standard mode) ──────────────────────
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

      // Only count scenarios_attempted after a real scenario landed (avoids inflated counts on errors).
      if (user?.id) {
        void recordScenarioAttempt(user.id, skill.id);
      }

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


  // ── Quick Round: one API call returns scenario + 3 options w/ pre-baked coaching ──
  const startQuickRound = useCallback(async (atomicIdOverride?: string | null) => {
    const atomicId = atomicIdOverride ?? selectedAtomicIdRef.current;
    if (!atomicId || !skill) return;
    setPracticeError(null);
    setPhase('quick_loading');
    setQuickOptions([]);
    setQuickPickedId(null);
    setScenario('');
    scenarioStartedAt.current = Date.now();

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
          practiceMode: 'quick_round',
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
      if (!scenarioText) {
        throw new Error('The AI returned an empty round. Please try again.');
      }
      const opts = parseQuickOptionsFromApi(data);

      if (user?.id) {
        void recordScenarioAttempt(user.id, skill.id);
      }

      setScenario(scenarioText);
      setQuickOptions(opts);
      setPhase('quick_choosing');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 150);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Could not start a quick round.';
      setPracticeError(errMsg);
      setPhase('idle');
    }
  }, [skill, user?.id, customProblemDraft, learnerContext]);

  const pickQuickOption = useCallback(
    async (opt: QuickOption) => {
      if (!skill) return;
      setQuickPickedId(opt.id);
      setPhase('quick_feedback');
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);

      const durationMs =
        scenarioStartedAt.current > 0 ? Date.now() - scenarioStartedAt.current : undefined;

      void recordRoundForToday();

      if (user?.id) {
        const saved = await saveSkillSession({
          userId: user.id,
          skillId: skill.id,
          atomicSkillId: selectedAtomicId,
          scenario,
          aiQuestion: 'Quick round — pick the move that fits',
          userAnswer: opt.label,
          aiFeedback: `${opt.reaction}${opt.nextTip ? `\n\nNext time: ${opt.nextTip}` : ''}`,
          aiScore: opt.tier === 'sharp' ? 9 : opt.tier === 'solid' ? 7 : 5,
          strengths: opt.tier === 'sharp' ? [opt.reaction] : [],
          growthAreas: opt.tier !== 'sharp' && opt.nextTip ? [opt.nextTip] : [],
          attemptNumber: 1,
          durationMs,
          practiceMode: 'quick_round',
          sessionMetadata: { practiceMode: 'quick_round' },
        });
        if (saved) {
          setRoundsSaved((n) => n + 1);
        } else {
          void bumpOfflineSessionCount(skill.id);
        }
      } else {
        void bumpOfflineSessionCount(skill.id);
      }
    },
    [skill, user?.id, selectedAtomicId, scenario]
  );

  // Quick → standard handoff: open a deep round on the same skill/atomic
  const goDeeper = useCallback(() => {
    setPracticeDepth('standard');
    setQuickOptions([]);
    setQuickPickedId(null);
    setScenario('');
    setPhase('idle');
    setTimeout(() => startPractice(), 50);
  }, [startPractice]);

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

      void recordRoundForToday();
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
        <Ionicons name="alert-circle-outline" size={48} color={SLColors.inkMuted} />
        <Text style={{ color: SLColors.inkPrimary, fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.lg, fontWeight: SLTypography.fontWeight.semibold, marginTop: SLSpacing.md }}>Skill not found</Text>
        <Text style={{ color: SLColors.inkMuted, fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, marginTop: SLSpacing.xxs }}>This skill may have been removed or the link is invalid.</Text>
        <TouchableOpacity onPress={navigateBackFromSkill} style={{ marginTop: SLSpacing.xl }}>
          <Text style={{ color: SLColors.brandPrimary, fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.base, fontWeight: SLTypography.fontWeight.semibold }}>Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isPracticing = phase !== 'idle';
  const phaseSteps = isDecisionMode ? PHASE_STEPS_DECISION : PHASE_STEPS_OPEN;
  const maxCustomChars = 300;
  const situationCopy = getOptionalSituationCopy(skill.id);

  return (
    <GlassBackground>
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
            <Text style={styles.sectionTitle}>Pick a focus</Text>
            <Text style={styles.bodyTextMuted}>
              {selectedAtomic
                ? `Today: ${selectedAtomic.name}.`
                : 'Choose a focus for this round.'}
            </Text>
            <View style={styles.chipRow}>
              {skill.atomicSkills.map((a) => (
                <AtomicSkillChip
                  key={a.id}
                  skill={a}
                  selected={selectedAtomicId === a.id}
                  color={skill.color}
                  colors={colors}
                  onPress={() => setSelectedAtomicId(a.id)}
                />
              ))}
            </View>
            {selectedAtomic && (
              <>
                <Text style={styles.atomicDesc}>{selectedAtomic.description}</Text>

                <TouchableOpacity
                  style={[styles.optionalContextToggle, { borderColor: SLColors.borderDefault, backgroundColor: SLColors.bgSurface }]}
                  onPress={() => setOptionalContextOpen((o) => !o)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.optionalContextToggleText, { color: SLColors.inkPrimary }]}>
                    Use a real moment from your week (optional)
                  </Text>
                  <Ionicons
                    name={optionalContextOpen ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
                {optionalContextOpen && (
                  <View style={{ marginTop: SLSpacing.sm }}>
                    <Text style={[styles.customHint, { color: SLColors.inkMuted, marginBottom: SLSpacing.sm }]}>
                      {situationCopy.hint}
                    </Text>
                    <View>
                      <TextInput
                        style={[
                          styles.customInput,
                          { borderColor: SLColors.borderDefault, backgroundColor: SLColors.bgSurface, color: SLColors.inkPrimary },
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
                  </View>
                )}
              </>
            )}
          </View>

          {/* Start CTA (idle) */}
          {!isPracticing && (
            <View style={styles.section}>
              {roundsSaved > 0 && (
                <View style={[styles.roundsBadge, { backgroundColor: SLColors.brandPrimary + '15' }]}>
                  <Ionicons name="sparkles-outline" size={16} color={colors.primary} />
                  <Text style={[styles.roundsText, { color: SLColors.brandPrimary }]}>
                    {roundsSaved} {roundsSaved === 1 ? 'round' : 'rounds'} done today — nice
                  </Text>
                </View>
              )}

              {practiceError && (
                <View style={[styles.errorBanner, { backgroundColor: SLColors.danger + '14', borderColor: colors.destructive + '40' }]}>
                  <Ionicons name="alert-circle-outline" size={16} color={colors.destructive} />
                  <Text style={[styles.errorBannerText, { color: SLColors.danger }]}>{practiceError}</Text>
                </View>
              )}

              <View style={styles.depthToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.depthChip,
                    practiceDepth === 'quick' && { backgroundColor: skill.color + '18', borderColor: skill.color },
                  ]}
                  onPress={() => setPracticeDepth('quick')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="flash-outline"
                    size={14}
                    color={practiceDepth === 'quick' ? skill.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.depthChipText,
                      { color: practiceDepth === 'quick' ? skill.color : colors.textSecondary },
                    ]}
                  >
                    Quick round · 60s
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.depthChip,
                    practiceDepth === 'standard' && { backgroundColor: skill.color + '18', borderColor: skill.color },
                  ]}
                  onPress={() => setPracticeDepth('standard')}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="school-outline"
                    size={14}
                    color={practiceDepth === 'standard' ? skill.color : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.depthChipText,
                      { color: practiceDepth === 'standard' ? skill.color : colors.textSecondary },
                    ]}
                  >
                    Deep practice
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[
                  styles.startBtn,
                  {
                    backgroundColor: selectedAtomicId ? skill.color : colors.surface,
                    borderWidth: selectedAtomicId ? 0 : 1,
                    borderColor: SLColors.borderDefault,
                  },
                ]}
                onPress={() => {
                  if (practiceDepth === 'quick') void startQuickRound();
                  else void startPractice();
                }}
                disabled={!selectedAtomicId}
                activeOpacity={selectedAtomicId ? 0.85 : 1}
              >
                <Ionicons
                  name={practiceDepth === 'quick' ? 'flash' : 'play-circle-outline'}
                  size={20}
                  color={selectedAtomicId ? '#fff' : colors.textMuted}
                />
                <Text
                  style={[
                    styles.startBtnText,
                    { color: selectedAtomicId ? '#fff' : colors.textMuted },
                  ]}
                >
                  {practiceError
                    ? 'Try again'
                    : practiceDepth === 'quick'
                      ? 'Start quick round'
                      : roundsSaved > 0
                        ? 'Start a deep round'
                        : 'Start deep practice'}
                </Text>
              </TouchableOpacity>
              {!selectedAtomicId ? (
                <Text style={[styles.practiceHint, { color: SLColors.inkSecondary }]}>
                  Pick a sub-skill above to start.
                </Text>
              ) : practiceDepth === 'quick' ? (
                <Text style={[styles.practiceHint, { color: SLColors.inkMuted }]}>
                  One scenario, three choices, one tap of coaching. Done in 60 seconds.
                </Text>
              ) : (
                <Text style={[styles.practiceHint, { color: SLColors.inkMuted }]}>
                  Write your own response and get full coaching. ~5 minutes.
                </Text>
              )}
            </View>
          )}

          {/* About this skill — collapsible, sits below the start CTA so it never blocks the round. */}
          {!isPracticing && (
            <View style={styles.section}>
              <TouchableOpacity
                onPress={() => setAboutOpen((o) => !o)}
                activeOpacity={0.8}
                style={styles.aboutToggleRow}
              >
                <Text style={styles.sectionTitle}>Why this skill matters</Text>
                <Ionicons
                  name={aboutOpen ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.textMuted}
                />
              </TouchableOpacity>
              {aboutOpen && (
                <>
                  <Text style={styles.bodyText}>{skill.description}</Text>
                  <View style={[styles.whyBox, { backgroundColor: skill.color + '10', borderColor: skill.color + '30' }]}>
                    <Ionicons name="information-circle-outline" size={16} color={skill.color} />
                    <Text style={[styles.whyText, { color: SLColors.inkPrimary }]}>{skill.why}</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* ── PRACTICE AREA ─────────────────────────────────────── */}
          {isPracticing && (
            <View style={styles.section}>
              {/* Practice header with close */}
              <View style={styles.practiceHeader}>
                <Ionicons
                  name={practiceDepth === 'quick' ? 'flash-outline' : 'school-outline'}
                  size={16}
                  color={skill.color}
                />
                <Text style={[styles.practiceLabel, { color: skill.color }]}>
                  {practiceDepth === 'quick' ? 'Quick round' : 'Deep practice'}
                  {selectedAtomic ? ` · ${selectedAtomic.name}` : ''}
                </Text>
                <TouchableOpacity onPress={() => setPhase('idle')} hitSlop={8} style={{ marginLeft: 'auto' }}>
                  <Ionicons name="close" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Standard-mode stepper (hidden for quick rounds — they are a single beat) */}
              {practiceDepth === 'standard' && phase !== 'loading_scenario' && (
                <PhaseStepper
                  steps={phaseSteps}
                  activeIndex={getPhaseIndex(phase, isDecisionMode)}
                  accentColor={skill.color}
                  colors={colors}
                />
              )}

              {/* Loading */}
              {(phase === 'loading_scenario' || phase === 'quick_loading') && (
                <View style={styles.loadingBox}>
                  <ActivityIndicator size="small" color={skill.color} />
                  <Text style={[styles.loadingText, { color: SLColors.inkMuted }]}>
                    {phase === 'quick_loading' ? 'Cooking up a quick round…' : modeConfig.loadingText}
                  </Text>
                </View>
              )}

              {/* Quick Round: scenario + 3 tap-able options + instant lightweight feedback */}
              {(phase === 'quick_choosing' || phase === 'quick_feedback') && (
                <>
                  <View style={[styles.scenarioBox, { backgroundColor: skill.color + '0D', borderColor: skill.color + '30' }]}>
                    <View style={styles.scenarioLabelRow}>
                      <Ionicons name={skill.icon as any} size={14} color={skill.color} />
                      <Text style={[styles.scenarioLabel, { color: skill.color }]}>
                        Quick scene
                      </Text>
                    </View>
                    <Text style={[styles.scenarioText, { color: SLColors.inkPrimary }]}>{scenario}</Text>
                  </View>

                  {phase === 'quick_choosing' && (
                    <>
                      <Text style={[styles.decisionStepTitle, { color: SLColors.inkPrimary }]}>
                        What would you do?
                      </Text>
                      <Text style={[styles.decisionHint, { color: SLColors.inkSecondary }]}>
                        Tap one. You'll get a quick coach take in a heartbeat.
                      </Text>
                      {quickOptions.map((opt, i) => {
                        const letter = ['A', 'B', 'C'][i] ?? '•';
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.decisionRow, { borderColor: SLColors.borderDefault, backgroundColor: SLColors.bgSurface }]}
                            onPress={() => pickQuickOption(opt)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.decisionLetterBadge, { backgroundColor: skill.color + '22' }]}>
                              <Text style={[styles.decisionLetter, { color: skill.color }]}>{letter}</Text>
                            </View>
                            <Text style={[styles.decisionLabelText, { color: SLColors.inkPrimary }]}>
                              {opt.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}

                  {phase === 'quick_feedback' && (() => {
                    const picked = quickOptions.find((o) => o.id === quickPickedId);
                    if (!picked) return null;
                    const tierMeta = QUICK_TIER_COPY[picked.tier];
                    const tierAccent =
                      picked.tier === 'sharp'
                        ? colors.success
                        : picked.tier === 'solid'
                          ? skill.color
                          : colors.accentWarmTan;
                    return (
                      <View style={styles.feedbackArea}>
                        <View style={[styles.choiceSummary, { borderColor: tierAccent + '40', backgroundColor: tierAccent + '10' }]}>
                          <Text style={[styles.questionLabel, { color: tierAccent }]}>You chose</Text>
                          <Text style={[styles.choiceSummaryText, { color: SLColors.inkPrimary }]}>
                            {picked.label}
                          </Text>
                        </View>

                        <View style={[fbStyles.card, { backgroundColor: SLColors.bgSurface, borderColor: SLColors.borderDefault }]}>
                          <View style={[fbStyles.tierRow, { borderColor: tierAccent + '40', backgroundColor: tierAccent + '12' }]}>
                            <Text style={[fbStyles.tierLabel, { color: tierAccent }]}>
                              {tierMeta.emoji} {tierMeta.label}
                            </Text>
                          </View>
                          <Text style={[fbStyles.feedbackText, { color: SLColors.inkPrimary }]}>
                            {picked.reaction}
                          </Text>
                          {picked.nextTip ? (
                            <View style={[fbStyles.refinementBox, { backgroundColor: skill.color + '12', borderColor: skill.color + '30' }]}>
                              <Ionicons name="bulb-outline" size={16} color={skill.color} />
                              <Text style={[fbStyles.refinementText, { color: SLColors.inkPrimary }]}>
                                <Text style={{ fontWeight: '600' as any }}>Coach tip · </Text>
                                {picked.nextTip}
                              </Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.feedbackActions}>
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.refineBtn, { borderColor: skill.color }]}
                            onPress={() => {
                              const ids = skill.atomicSkills.map((a) => a.id);
                              if (ids.length === 0) {
                                void startQuickRound();
                                return;
                              }
                              const cur = selectedAtomicIdRef.current;
                              const idx = cur ? ids.indexOf(cur) : -1;
                              const nextIdx = idx === -1 ? 0 : (idx + 1) % ids.length;
                              const nextId = ids[nextIdx];
                              selectedAtomicIdRef.current = nextId;
                              setSelectedAtomicId(nextId);
                              void startQuickRound(nextId);
                            }}
                          >
                            <Ionicons name="refresh-outline" size={16} color={skill.color} />
                            <Text style={[styles.actionBtnText, { color: skill.color }]}>
                              Another round
                            </Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={[styles.actionBtn, { backgroundColor: skill.color }]}
                            onPress={goDeeper}
                          >
                            <Ionicons name="arrow-forward-outline" size={16} color="#fff" />
                            <Text style={[styles.actionBtnText, { color: '#fff' }]}>Go deeper</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity onPress={() => setPhase('idle')} style={styles.doneLink}>
                          <Text style={[styles.doneLinkText, { color: SLColors.inkMuted }]}>Done for now</Text>
                        </TouchableOpacity>
                      </View>
                    );
                  })()}
                </>
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
                    <Text style={[styles.scenarioText, { color: SLColors.inkPrimary }]}>{scenario}</Text>
                  </View>

                  {/* Decision choice step (decision_simulator only) */}
                  {phase === 'choosing_decision' && isDecisionMode && (
                    <>
                      <Text style={[styles.decisionStepTitle, { color: SLColors.inkPrimary }]}>
                        Your move. Pick one
                      </Text>
                      <Text style={[styles.decisionHint, { color: SLColors.inkSecondary }]}>
                        You'll explain your reasoning next. Choose the path you'd actually take.
                      </Text>
                      {decisionOptions.map((opt, i) => {
                        const letter = ['A', 'B', 'C', 'D', 'E', 'F'][i] ?? '•';
                        return (
                          <TouchableOpacity
                            key={opt.id}
                            style={[styles.decisionRow, { borderColor: SLColors.borderDefault, backgroundColor: SLColors.bgSurface }]}
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
                            <Text style={[styles.decisionLabelText, { color: SLColors.inkPrimary }]}>
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
                          <Text style={[styles.choiceSummaryText, { color: SLColors.inkPrimary }]}>
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
                        <Text style={[styles.questionLabel, { color: SLColors.inkSecondary }]}>
                          {isDecisionMode
                            ? `Reasoning${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`
                            : practiceMode === 'output_audit'
                              ? `Task${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`
                              : `Your response${attemptNumber > 1 ? ` (attempt ${attemptNumber})` : ''}`}
                        </Text>
                        <Text style={[styles.questionText, { color: SLColors.inkPrimary }]}>
                          {practiceQuestion}
                        </Text>
                      </View>

                      {(phase === 'answering' || phase === 'loading_feedback') && (
                        <View style={styles.answerArea}>
                          <TextInput
                            style={[
                              styles.answerInput,
                              { backgroundColor: SLColors.bgSurface, borderColor: SLColors.borderDefault, color: SLColors.inkPrimary },
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

                          <View
                            style={[
                              styles.howBox,
                              {
                                borderColor: SLColors.borderDefault,
                                backgroundColor: SLColors.bgSurface,
                                borderLeftColor: skill.color,
                                borderLeftWidth: 3,
                              },
                            ]}
                          >
                            <Text style={[styles.howTitle, { color: SLColors.inkPrimary }]}>Coach tips</Text>
                            <Text style={[styles.playbookLead, { color: SLColors.inkMuted }]}>
                              Try one of these next time you’re in this kind of moment.
                            </Text>
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
                                <Text style={[styles.howBulletText, { color: SLColors.inkSecondary }]}>{line}</Text>
                              </View>
                            ))}
                          </View>

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
                            <Text style={[styles.doneLinkText, { color: SLColors.inkMuted }]}>Done for now</Text>
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
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: { flex: 1 },
    scroll: { flex: 1 },
    content: { paddingBottom: SLSpacing['5xl'], maxWidth: SLLayout.contentMaxWidth, alignSelf: 'center', width: '100%' },
    errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, paddingHorizontal: SLSpacing.xl },
    subHeader: {
      paddingHorizontal: SLSpacing.lg,
      paddingBottom: SLSpacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SLSpacing.sm,
    },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 },
    skillTagline: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, color: colors.textSecondary },
    section: {
      backgroundColor: colors.floating,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: SLRadius.xl,
      padding: SLSpacing.lg,
      marginHorizontal: SLSpacing.lg,
      marginBottom: SLSpacing.xl,
      ...Shadows.card,
    },
    sectionTitle: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.base, fontWeight: SLTypography.fontWeight.semibold, color: colors.textPrimary, marginBottom: SLSpacing.sm },
    bodyText: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.base, color: colors.textPrimary, lineHeight: SLTypography.fontSize.base * 1.6, marginBottom: SLSpacing.sm },
    bodyTextMuted: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, color: colors.textSecondary, marginBottom: SLSpacing.sm, lineHeight: SLTypography.fontSize.sm * 1.5 },
    whyBox: {
      flexDirection: 'row', alignItems: 'flex-start', gap: SLSpacing.sm,
      borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm,
      borderLeftWidth: 3, borderLeftColor: SLColors.brandPrimary,
      backgroundColor: colors.surface,
    },
    whyText: { flex: 1, fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.5, color: colors.textPrimary },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'flex-start',
      marginBottom: SLSpacing.sm,
      gap: SLSpacing.xxs,
    },
    atomicDesc: {
      fontFamily: SLTypography.fontFamily.serif,
      fontSize: SLTypography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: SLTypography.fontSize.sm * 1.5,
      marginTop: SLSpacing.sm,
    },
    howBox: {
      borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.md, marginTop: SLSpacing.md, gap: SLSpacing.sm,
      borderColor: colors.border, backgroundColor: colors.floating,
      borderLeftWidth: 3,
    },
    howTitle: {
      fontFamily: SLTypography.fontFamily.sans,
      fontSize: SLTypography.fontSize.sm,
      fontWeight: SLTypography.fontWeight.semibold,
      color: colors.textPrimary,
      marginBottom: SLSpacing.sm,
    },
    howBulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: SLSpacing.sm },
    howBulletNum: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
    howBulletNumText: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.xs, fontWeight: SLTypography.fontWeight.bold },
    howBulletText: { flex: 1, fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.5, color: colors.textSecondary },
    playbookLead: {
      fontFamily: SLTypography.fontFamily.sans,
      fontSize: SLTypography.fontSize.xs,
      color: colors.textMuted,
      lineHeight: SLTypography.fontSize.xs * 1.45,
      marginBottom: SLSpacing.sm,
    },
    optionalContextToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: SLSpacing.md,
      paddingVertical: SLSpacing.xs + 2,
      paddingHorizontal: SLSpacing.md,
      borderRadius: SLRadius.md,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.floating,
    },
    optionalContextToggleText: {
      fontFamily: SLTypography.fontFamily.sans,
      fontSize: SLTypography.fontSize.sm,
      fontWeight: SLTypography.fontWeight.medium,
      color: colors.textPrimary,
      flex: 1,
      paddingRight: SLSpacing.sm,
    },
    customHint: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.xs, lineHeight: SLTypography.fontSize.xs * 1.45, color: colors.textMuted, marginTop: SLSpacing.xxs, marginBottom: SLSpacing.sm },
    customInput: {
      borderWidth: 1,
      borderRadius: SLRadius.lg,
      padding: SLSpacing.md,
      fontFamily: SLTypography.fontFamily.serif,
      fontSize: SLTextarea.fontSize,
      minHeight: 88,
      lineHeight: SLTextarea.fontSize * SLTextarea.lineHeight,
      borderColor: colors.border,
      backgroundColor: colors.inputBackground,
      color: colors.textPrimary,
    },
    charCount: { position: 'absolute', bottom: SLSpacing.xs, right: SLSpacing.md, fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.micro },
    roundsBadge: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.sm, borderRadius: SLRadius.md, padding: SLSpacing.sm, marginBottom: SLSpacing.sm, backgroundColor: SLColors.brandPrimary + '12' },
    roundsText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, fontWeight: SLTypography.fontWeight.medium, color: SLColors.brandPrimary },
    errorBanner: { flexDirection: 'row', alignItems: 'flex-start', gap: SLSpacing.sm, borderRadius: SLRadius.md, borderWidth: 1, padding: SLSpacing.sm, marginBottom: SLSpacing.sm, backgroundColor: SLColors.danger + '10', borderColor: SLColors.danger + '30' },
    errorBannerText: { flex: 1, fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.5, color: SLColors.danger },
    startBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SLSpacing.sm,
      borderRadius: SLButton.primary.borderRadius,
      paddingVertical: SLButton.primary.paddingV,
      marginBottom: SLSpacing.sm,
    },
    startBtnText: { fontFamily: SLTypography.fontFamily.sans, color: '#fff', fontSize: SLButton.primary.fontSize, fontWeight: SLTypography.fontWeight.medium, letterSpacing: SLButton.primary.letterSpacing },
    practiceHint: { textAlign: 'center', fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.xs, color: colors.textMuted },
    practiceHeader: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.xxs, marginBottom: SLSpacing.sm },
    practiceLabel: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.sm, fontWeight: SLTypography.fontWeight.semibold, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
    loadingBox: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.sm, padding: SLSpacing.md },
    loadingText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, color: colors.textMuted },
    scenarioBox: {
      borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.md, marginBottom: SLSpacing.md,
      borderLeftWidth: 3, backgroundColor: colors.surface,
    },
    scenarioLabelRow: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.xxs, marginBottom: SLSpacing.xxs },
    scenarioLabel: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.xs, fontWeight: SLTypography.fontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' as any },
    scenarioText: { fontFamily: SLTypography.fontFamily.serif, fontSize: SLTypography.fontSize.base, lineHeight: SLTypography.fontSize.base * 1.6, color: colors.textPrimary },
    questionBox: { marginBottom: SLSpacing.md },
    questionLabel: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.xs, fontWeight: SLTypography.fontWeight.semibold, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: SLSpacing.xxs },
    questionText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.base, fontWeight: SLTypography.fontWeight.medium, lineHeight: SLTypography.fontSize.base * 1.5, color: colors.textPrimary },
    decisionStepTitle: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.base, fontWeight: SLTypography.fontWeight.semibold, color: colors.textPrimary, marginBottom: SLSpacing.xxs },
    decisionHint: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.45, color: colors.textSecondary, marginBottom: SLSpacing.md },
    decisionRow: { flexDirection: 'row', alignItems: 'center', gap: SLSpacing.sm, borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm + 2, marginBottom: SLSpacing.sm, borderColor: colors.border, backgroundColor: colors.floating },
    decisionLetterBadge: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    decisionLetter: { fontFamily: SLTypography.fontFamily.mono, fontSize: SLTypography.fontSize.sm, fontWeight: SLTypography.fontWeight.bold },
    decisionLabelText: { flex: 1, fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, lineHeight: SLTypography.fontSize.sm * 1.45, color: colors.textPrimary },
    choiceSummary: { borderWidth: 1, borderRadius: SLRadius.md, padding: SLSpacing.sm, marginBottom: SLSpacing.md },
    choiceSummaryText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, fontWeight: SLTypography.fontWeight.medium, lineHeight: SLTypography.fontSize.sm * 1.45 },
    answerArea: { gap: SLSpacing.sm },
    answerInput: {
      borderWidth: 1, borderRadius: SLTextarea.borderRadius, padding: SLSpacing.md,
      fontFamily: SLTypography.fontFamily.serif, fontSize: SLTextarea.fontSize, minHeight: 120,
      lineHeight: SLTextarea.fontSize * SLTextarea.lineHeight,
      borderColor: colors.border, backgroundColor: colors.inputBackground, color: colors.textPrimary,
    },
    submitBtn: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SLSpacing.sm,
      borderRadius: SLButton.primary.borderRadius,
      paddingVertical: SLButton.primary.paddingV,
    },
    submitBtnText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLButton.primary.fontSize, fontWeight: SLTypography.fontWeight.medium, letterSpacing: SLButton.primary.letterSpacing },
    feedbackArea: { gap: SLSpacing.md },
    feedbackActions: { flexDirection: 'row', gap: SLSpacing.sm },
    actionBtn: {
      flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SLSpacing.xxs,
      borderRadius: SLButton.ghost.borderRadius,
      paddingVertical: SLButton.ghost.paddingV,
    },
    refineBtn: { borderWidth: 1.5, backgroundColor: 'transparent' },
    actionBtnText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLButton.ghost.fontSize, fontWeight: SLTypography.fontWeight.medium },
    doneLink: { alignItems: 'center', paddingVertical: SLSpacing.xxs },
    doneLinkText: { fontFamily: SLTypography.fontFamily.sans, fontSize: SLTypography.fontSize.sm, color: colors.textMuted },
    depthToggleRow: {
      flexDirection: 'row',
      gap: SLSpacing.sm,
      marginBottom: SLSpacing.md,
    },
    depthChip: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SLSpacing.xxs,
      paddingVertical: SLSpacing.xs + 2,
      paddingHorizontal: SLSpacing.sm,
      borderRadius: SLRadius.full,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    depthChipText: {
      fontFamily: SLTypography.fontFamily.sans,
      fontSize: SLTypography.fontSize.xs,
      fontWeight: SLTypography.fontWeight.semibold,
    },
    aboutToggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
  });

