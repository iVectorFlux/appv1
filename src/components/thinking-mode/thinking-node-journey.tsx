import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingBranch, ThinkingNode } from '@/data/thinking-mode-types';
import { BRANCH_LABELS } from '@/data/thinking-mode-types';
import { ConceptChip, ExplorableText } from './explorable-text';
import { ThinkingRepresentationView } from './thinking-representation-view';
import {
  branchEmoji,
  explanationBullets,
  friendlyLabel,
  nodeTldr,
  pickNodeEmoji,
} from './thinking-ui-utils';

type StepKind =
  | 'think'
  | 'gist'
  | 'visual'
  | 'learn'
  | 'evidence'
  | 'concepts'
  | 'challenge'
  | 'explore';

interface JourneyStep {
  kind: StepKind;
  bulletIndex?: number;
}

function buildSteps(node: ThinkingNode, bullets: string[]): JourneyStep[] {
  const steps: JourneyStep[] = [];
  if (node.socraticQuestion) steps.push({ kind: 'think' });
  steps.push({ kind: 'gist' }, { kind: 'visual' });
  bullets.forEach((_, i) => steps.push({ kind: 'learn', bulletIndex: i }));
  if (node.evidence) steps.push({ kind: 'evidence' });
  if (node.concepts.length > 0) steps.push({ kind: 'concepts' });
  if (node.challengePrompt) steps.push({ kind: 'challenge' });
  steps.push({ kind: 'explore' });
  return steps;
}

function stepLabel(step: JourneyStep, bulletsLen: number): string {
  switch (step.kind) {
    case 'think':
      return 'Think first';
    case 'gist':
      return 'The gist';
    case 'visual':
      return 'Picture it';
    case 'learn':
      return bulletsLen > 1 ? `Learn more (${(step.bulletIndex ?? 0) + 1}/${bulletsLen})` : 'Learn more';
    case 'evidence':
      return 'Real example';
    case 'concepts':
      return 'Quick detour';
    case 'challenge':
      return 'Your turn';
    case 'explore':
      return 'Where next?';
    default:
      return '';
  }
}

interface ThinkingNodeJourneyProps {
  node: ThinkingNode;
  loading?: boolean;
  challengeFeedback?: string | null;
  onExpandBranch: (branch: ThinkingBranch) => void;
  onExploreConcept: (term: string) => void;
  onSubmitChallenge: (answer: string) => void;
}

export function ThinkingNodeJourney({
  node,
  loading,
  challengeFeedback,
  onExpandBranch,
  onExploreConcept,
  onSubmitChallenge,
}: ThinkingNodeJourneyProps) {
  const colors = useColors();
  const heroEmoji = pickNodeEmoji(node);
  const bullets = useMemo(() => explanationBullets(node), [node]);
  const steps = useMemo(() => buildSteps(node, bullets), [node, bullets]);
  const [stepIndex, setStepIndex] = useState(0);
  const [thinkGuess, setThinkGuess] = useState('');
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const fade = React.useRef(new Animated.Value(1)).current;

  const step = steps[stepIndex] ?? steps[steps.length - 1];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex >= steps.length - 1;

  useEffect(() => {
    setStepIndex(0);
    setThinkGuess('');
    setChallengeAnswer('');
    fade.setValue(1);
  }, [node.id, fade]);

  const animateStep = (nextIndex: number) => {
    Animated.timing(fade, { toValue: 0, duration: 100, useNativeDriver: true }).start(() => {
      setStepIndex(nextIndex);
      Animated.timing(fade, { toValue: 1, duration: 160, useNativeDriver: true }).start();
    });
  };

  const goNext = () => {
    if (stepIndex < steps.length - 1) animateStep(stepIndex + 1);
  };

  const goBack = () => {
    if (stepIndex > 0) animateStep(stepIndex - 1);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.progressRow}>
        {steps.map((s, i) => (
          <TouchableOpacity
            key={`${s.kind}-${s.bulletIndex ?? i}`}
            onPress={() => i <= stepIndex && animateStep(i)}
            disabled={i > stepIndex}
            hitSlop={6}
          >
            <View
              style={[
                styles.progressDot,
                {
                  backgroundColor: i <= stepIndex ? colors.primary : colors.glassBorder,
                  width: i === stepIndex ? 18 : 8,
                },
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      <Text style={[styles.stepHint, { color: colors.textMuted }]}>
        Step {stepIndex + 1} of {steps.length} · {stepLabel(step, bullets.length)}
      </Text>

      <Animated.View
        style={[styles.card, { borderColor: colors.glassBorder, backgroundColor: colors.surface, opacity: fade }]}
      >
        {step.kind === 'think' ? (
          <>
            <Text style={styles.heroEmoji}>{heroEmoji}</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{friendlyLabel(node.question)}</Text>
            <View style={[styles.thinkBox, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '08' }]}>
              <Text style={[styles.thinkLabel, { color: colors.primary }]}>🤔 Think first</Text>
              <Text style={[styles.thinkHint, { color: colors.textMuted }]}>
                Just reflect for a moment — no wrong answers. You can optionally write a guess below.
              </Text>
              <Text style={[styles.thinkQ, { color: colors.textPrimary }]}>{node.socraticQuestion}</Text>
              <TextInput
                value={thinkGuess}
                onChangeText={setThinkGuess}
                placeholder="Optional: type your guess here…"
                placeholderTextColor={colors.textMuted}
                multiline
                style={[
                  styles.thinkInput,
                  { borderColor: colors.glassBorder, color: colors.textPrimary, backgroundColor: colors.glass },
                ]}
              />
            </View>
          </>
        ) : null}

        {step.kind === 'gist' ? (
          <>
            <Text style={styles.heroEmoji}>{heroEmoji}</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{friendlyLabel(node.question)}</Text>
            {thinkGuess.trim() ? (
              <View style={[styles.guessRecall, { backgroundColor: colors.glass, borderColor: colors.glassBorder }]}>
                <Text style={[styles.guessRecallLabel, { color: colors.textMuted }]}>Your guess</Text>
                <Text style={[styles.guessRecallText, { color: colors.textSecondary }]}>{thinkGuess.trim()}</Text>
              </View>
            ) : null}
            <View style={[styles.gistBubble, { backgroundColor: colors.accentIndigo + '12', borderColor: colors.accentIndigo + '28' }]}>
              <Text style={[styles.gistLabel, { color: colors.accentIndigo }]}>✨ The gist</Text>
              <Text style={[styles.gistText, { color: colors.textPrimary }]}>{nodeTldr(node)}</Text>
            </View>
            {node.whyItMatters ? (
              <Text style={[styles.whyLine, { color: colors.textSecondary }]}>💡 {node.whyItMatters}</Text>
            ) : null}
          </>
        ) : null}

        {step.kind === 'visual' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>👀 Picture it</Text>
            <ThinkingRepresentationView node={node} />
            {node.visualizationHint ? (
              <Text style={[styles.visualCaption, { color: colors.textMuted }]}>{node.visualizationHint}</Text>
            ) : null}
          </>
        ) : null}

        {step.kind === 'learn' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              📖 {stepLabel(step, bullets.length)}
            </Text>
            <View style={[styles.bulletCard, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
              <ExplorableText
                text={bullets[step.bulletIndex ?? 0] ?? node.explanation}
                concepts={node.concepts}
                onExploreConcept={onExploreConcept}
              />
            </View>
          </>
        ) : null}

        {step.kind === 'evidence' ? (
          <View style={[styles.extraBlock, { borderColor: colors.accentSage + '35', backgroundColor: colors.accentSage + '10' }]}>
            <Text style={[styles.sectionTitle, { color: colors.accentSage }]}>🌍 Real example</Text>
            <Text style={[styles.extraBody, { color: colors.textPrimary }]}>{node.evidence}</Text>
          </View>
        ) : null}

        {step.kind === 'concepts' ? (
          <View style={styles.conceptBlock}>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🔍 Need a quick detour?</Text>
            <Text style={[styles.conceptHint, { color: colors.textMuted }]}>
              Tap a term if something is unclear — you will return here after.
            </Text>
            <View style={styles.conceptRow}>
              {node.concepts.map((c) => (
                <ConceptChip key={c.term} concept={c} onPress={() => onExploreConcept(c.term)} />
              ))}
            </View>
          </View>
        ) : null}

        {step.kind === 'challenge' ? (
          <View style={[styles.challenge, { borderColor: colors.accentTerracotta + '40', backgroundColor: colors.accentTerracotta + '08' }]}>
            <Text style={[styles.sectionTitle, { color: colors.accentTerracotta }]}>🎯 Your turn</Text>
            <Text style={[styles.challengeHint, { color: colors.textMuted }]}>Write your answer — we will check your thinking.</Text>
            <Text style={[styles.challengeQ, { color: colors.textPrimary }]}>{node.challengePrompt}</Text>
            {challengeFeedback ? (
              <Text style={[styles.feedback, { color: colors.textSecondary }]}>{challengeFeedback}</Text>
            ) : (
              <>
                <TextInput
                  value={challengeAnswer}
                  onChangeText={setChallengeAnswer}
                  placeholder="Type your answer here…"
                  placeholderTextColor={colors.textMuted}
                  multiline
                  style={[styles.input, { borderColor: colors.glassBorder, color: colors.textPrimary, backgroundColor: colors.glass }]}
                />
                <TouchableOpacity
                  disabled={!challengeAnswer.trim() || loading}
                  onPress={() => {
                    onSubmitChallenge(challengeAnswer.trim());
                    setChallengeAnswer('');
                  }}
                  style={[
                    styles.inlinePrimaryBtn,
                    { backgroundColor: colors.accentTerracotta, opacity: challengeAnswer.trim() ? 1 : 0.5 },
                  ]}
                >
                  <Text style={styles.inlinePrimaryBtnText}>Check my thinking</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {step.kind === 'explore' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>🧭 Where next?</Text>
            <Text style={[styles.exploreSub, { color: colors.textMuted }]}>Pick a path — your map grows as you go.</Text>
            <View style={styles.branchGrid}>
              {node.branches.map((b) => {
                const meta = BRANCH_LABELS[b.type] ?? { icon: 'arrow-forward-outline', color: colors.primary };
                const em = branchEmoji(b);
                return (
                  <TouchableOpacity
                    key={`${b.type}-${b.label}`}
                    disabled={loading}
                    onPress={() => onExpandBranch(b)}
                    style={[styles.branchBtn, { borderColor: meta.color + '45', backgroundColor: meta.color + '10' }]}
                  >
                    <Text style={styles.branchEmoji}>{em}</Text>
                    <View style={styles.branchTextCol}>
                      <Text style={[styles.branchType, { color: meta.color }]}>{friendlyLabel(b.type.replace('_', ' '))}</Text>
                      <Text style={[styles.branchLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                        {b.label}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color={meta.color} />
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : null}
      </Animated.View>

      <View style={styles.navRow}>
        {!isFirst ? (
          <TouchableOpacity style={[styles.navBtn, { borderColor: colors.glassBorder }]} onPress={goBack}>
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.navSpacer} />
        )}

        {step.kind === 'think' ? (
          <TouchableOpacity style={[styles.navBtnPrimary, { backgroundColor: colors.primary, flex: 1 }]} onPress={goNext}>
            <Text style={styles.navBtnPrimaryText}>Show me the answer</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : !isLast ? (
          <TouchableOpacity style={[styles.navBtnPrimary, { backgroundColor: colors.primary }]} onPress={goNext}>
            <Text style={styles.navBtnPrimaryText}>Continue</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : (
          <View style={styles.navSpacer} />
        )}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textMuted, fontSize: Typography.fontSize.sm }}>Building next step…</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4 },
  progressDot: { height: 8, borderRadius: 4 },
  stepHint: { fontSize: Typography.fontSize.xs, textAlign: 'center' },
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, minHeight: 180 },
  heroEmoji: { fontSize: 40, textAlign: 'center' },
  cardTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, textAlign: 'center', lineHeight: 26 },
  thinkBox: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  thinkLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  thinkHint: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  thinkQ: { fontSize: Typography.fontSize.base, lineHeight: 24, fontWeight: Typography.fontWeight.medium },
  thinkInput: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minHeight: 56,
    fontSize: Typography.fontSize.sm,
    textAlignVertical: 'top',
    marginTop: Spacing.xs,
  },
  guessRecall: { padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, gap: 2 },
  guessRecallLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  guessRecallText: { fontSize: Typography.fontSize.sm, lineHeight: 20, fontStyle: 'italic' },
  gistBubble: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: 6 },
  gistLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  gistText: { fontSize: Typography.fontSize.base, lineHeight: 24, fontWeight: Typography.fontWeight.medium },
  whyLine: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  visualCaption: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center', fontStyle: 'italic' },
  bulletCard: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  extraBlock: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  extraBody: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  conceptBlock: { gap: Spacing.sm },
  conceptHint: { fontSize: Typography.fontSize.xs, lineHeight: 18, marginTop: -Spacing.xs },
  conceptRow: { gap: Spacing.sm },
  challenge: { gap: Spacing.sm },
  challengeHint: { fontSize: Typography.fontSize.xs, lineHeight: 18 },
  challengeQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, lineHeight: 22 },
  feedback: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, minHeight: 72, fontSize: Typography.fontSize.sm, textAlignVertical: 'top' },
  inlinePrimaryBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  inlinePrimaryBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  exploreSub: { fontSize: Typography.fontSize.sm, marginTop: -Spacing.sm },
  branchGrid: { gap: Spacing.sm },
  branchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  branchEmoji: { fontSize: 24 },
  branchTextCol: { flex: 1, gap: 2 },
  branchType: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'capitalize' },
  branchLabel: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm },
  navSpacer: { minWidth: 72 },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  navBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  navBtnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.full,
  },
  navBtnPrimaryText: { color: '#FFF', fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
});
