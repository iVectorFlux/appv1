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

type JourneyPhase = 'think' | 'gist' | 'visual' | 'learn' | 'extra' | 'explore';

interface ThinkingNodeJourneyProps {
  node: ThinkingNode;
  loading?: boolean;
  challengeFeedback?: string | null;
  onExpandBranch: (branch: ThinkingBranch) => void;
  onExploreConcept: (term: string) => void;
  onSubmitChallenge: (answer: string) => void;
}

function phaseList(node: ThinkingNode): JourneyPhase[] {
  const phases: JourneyPhase[] = [];
  if (node.socraticQuestion) phases.push('think');
  phases.push('gist', 'visual', 'learn');
  if (node.evidence || node.whyItMatters || node.concepts.length > 0 || node.challengePrompt) {
    phases.push('extra');
  }
  phases.push('explore');
  return phases;
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
  const phases = useMemo(() => phaseList(node), [node]);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [bulletIndex, setBulletIndex] = useState(0);
  const [thinkRevealed, setThinkRevealed] = useState(false);
  const [challengeAnswer, setChallengeAnswer] = useState('');
  const fade = React.useRef(new Animated.Value(1)).current;

  const phase = phases[phaseIndex] ?? 'explore';

  useEffect(() => {
    setPhaseIndex(0);
    setBulletIndex(0);
    setThinkRevealed(false);
    setChallengeAnswer('');
    fade.setValue(1);
  }, [node.id, fade]);

  const animateNext = (next: () => void) => {
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: true }).start(() => {
      next();
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }).start();
    });
  };

  const goNext = () => {
    if (phase === 'learn' && bulletIndex < bullets.length - 1) {
      setBulletIndex((i) => i + 1);
      return;
    }
    if (phaseIndex < phases.length - 1) {
      animateNext(() => {
        setPhaseIndex((i) => i + 1);
        setBulletIndex(0);
      });
    }
  };

  const goBack = () => {
    if (phase === 'learn' && bulletIndex > 0) {
      setBulletIndex((i) => i - 1);
      return;
    }
    if (phaseIndex > 0) {
      animateNext(() => {
        setPhaseIndex((i) => i - 1);
        setBulletIndex(Math.max(0, bullets.length - 1));
      });
    }
  };

  const canGoBack = phaseIndex > 0 || (phase === 'learn' && bulletIndex > 0);
  const isLastPhase = phaseIndex >= phases.length - 1;
  const learnHasMore = phase === 'learn' && bulletIndex < bullets.length - 1;

  return (
    <View style={styles.wrap}>
      <View style={styles.progressRow}>
        {phases.map((p, i) => (
          <View
            key={p}
            style={[
              styles.progressDot,
              {
                backgroundColor: i <= phaseIndex ? colors.primary : colors.glassBorder,
                width: i === phaseIndex ? 18 : 8,
              },
            ]}
          />
        ))}
      </View>

      <Animated.View style={[styles.card, { borderColor: colors.glassBorder, backgroundColor: colors.surface, opacity: fade }]}>
        {phase === 'think' ? (
          <>
            <Text style={styles.heroEmoji}>{heroEmoji}</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{friendlyLabel(node.question)}</Text>
            <View style={[styles.thinkBox, { borderColor: colors.primary + '30', backgroundColor: colors.primary + '08' }]}>
              <Text style={[styles.thinkLabel, { color: colors.primary }]}>🤔 Pause — what do you think?</Text>
              <Text style={[styles.thinkQ, { color: colors.textPrimary }]}>{node.socraticQuestion}</Text>
            </View>
            {!thinkRevealed ? (
              <View style={styles.thinkActions}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: colors.glassBorder }]}
                  onPress={() => setThinkRevealed(true)}
                >
                  <Text style={[styles.secondaryBtnText, { color: colors.textSecondary }]}>Skip for now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setThinkRevealed(true)}
                >
                  <Text style={styles.primaryBtnText}>Show me</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </>
        ) : null}

        {phase === 'gist' ? (
          <>
            <Text style={styles.heroEmoji}>{heroEmoji}</Text>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{friendlyLabel(node.question)}</Text>
            <View style={[styles.gistBubble, { backgroundColor: colors.accentIndigo + '12', borderColor: colors.accentIndigo + '28' }]}>
              <Text style={[styles.gistLabel, { color: colors.accentIndigo }]}>✨ The gist</Text>
              <Text style={[styles.gistText, { color: colors.textPrimary }]}>{nodeTldr(node)}</Text>
            </View>
            {node.whyItMatters ? (
              <Text style={[styles.whyLine, { color: colors.textSecondary }]}>💡 {node.whyItMatters}</Text>
            ) : null}
          </>
        ) : null}

        {phase === 'visual' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>👀 Picture it</Text>
            <ThinkingRepresentationView node={node} />
            {node.visualizationHint && node.processSteps?.length ? (
              <Text style={[styles.visualCaption, { color: colors.textMuted }]}>{node.visualizationHint}</Text>
            ) : null}
          </>
        ) : null}

        {phase === 'learn' ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              📖 Learn more {bullets.length > 1 ? `(${bulletIndex + 1}/${bullets.length})` : ''}
            </Text>
            <View style={[styles.bulletCard, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
              <ExplorableText
                text={bullets[bulletIndex] ?? node.explanation}
                concepts={node.concepts}
                onExploreConcept={onExploreConcept}
              />
            </View>
            {bullets.length > 1 ? (
              <View style={styles.bulletDots}>
                {bullets.map((_, i) => (
                  <View
                    key={i}
                    style={[styles.bulletDot, { backgroundColor: i === bulletIndex ? colors.primary : colors.glassBorder }]}
                  />
                ))}
              </View>
            ) : null}
          </>
        ) : null}

        {phase === 'extra' ? (
          <>
            {node.evidence ? (
              <View style={[styles.extraBlock, { borderColor: colors.accentSage + '35', backgroundColor: colors.accentSage + '10' }]}>
                <Text style={[styles.extraTitle, { color: colors.accentSage }]}>🌍 Real example</Text>
                <Text style={[styles.extraBody, { color: colors.textPrimary }]}>{node.evidence}</Text>
              </View>
            ) : null}

            {node.concepts.length > 0 ? (
              <View style={styles.conceptBlock}>
                <Text style={[styles.extraTitle, { color: colors.textSecondary }]}>🔍 Need a quick detour?</Text>
                <View style={styles.conceptRow}>
                  {node.concepts.map((c) => (
                    <ConceptChip key={c.term} concept={c} onPress={() => onExploreConcept(c.term)} />
                  ))}
                </View>
              </View>
            ) : null}

            {node.challengePrompt ? (
              <View style={[styles.challenge, { borderColor: colors.accentTerracotta + '40', backgroundColor: colors.accentTerracotta + '08' }]}>
                <Text style={[styles.extraTitle, { color: colors.accentTerracotta }]}>🎯 Your turn</Text>
                <Text style={[styles.challengeQ, { color: colors.textPrimary }]}>{node.challengePrompt}</Text>
                {challengeFeedback ? (
                  <Text style={[styles.feedback, { color: colors.textSecondary }]}>{challengeFeedback}</Text>
                ) : (
                  <>
                    <TextInput
                      value={challengeAnswer}
                      onChangeText={setChallengeAnswer}
                      placeholder="What do you think?"
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
                      style={[styles.primaryBtn, { backgroundColor: colors.accentTerracotta, opacity: challengeAnswer.trim() ? 1 : 0.5 }]}
                    >
                      <Text style={styles.primaryBtnText}>Check my thinking</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            ) : null}
          </>
        ) : null}

        {phase === 'explore' ? (
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

      {phase !== 'explore' && !(phase === 'think' && !thinkRevealed) ? (
        <View style={styles.navRow}>
          {canGoBack ? (
            <TouchableOpacity style={[styles.navBtn, { borderColor: colors.glassBorder }]} onPress={goBack}>
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              <Text style={[styles.navBtnText, { color: colors.textSecondary }]}>Back</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.navSpacer} />
          )}
          {!isLastPhase || learnHasMore ? (
            <TouchableOpacity style={[styles.navBtnPrimary, { backgroundColor: colors.primary }]} onPress={goNext}>
              <Text style={styles.navBtnPrimaryText}>{learnHasMore ? 'Next point' : 'Continue'}</Text>
              <Ionicons name="arrow-forward" size={16} color="#FFF" />
            </TouchableOpacity>
          ) : (
            <View style={styles.navSpacer} />
          )}
        </View>
      ) : null}

      {phase === 'think' && thinkRevealed ? (
        <TouchableOpacity style={[styles.navBtnPrimary, { backgroundColor: colors.primary, alignSelf: 'stretch' }]} onPress={goNext}>
          <Text style={styles.navBtnPrimaryText}>Continue</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFF" />
        </TouchableOpacity>
      ) : null}

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
  card: { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.md, minHeight: 200 },
  heroEmoji: { fontSize: 40, textAlign: 'center' },
  cardTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, textAlign: 'center', lineHeight: 26 },
  thinkBox: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  thinkLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  thinkQ: { fontSize: Typography.fontSize.base, lineHeight: 24 },
  thinkActions: { flexDirection: 'row', gap: Spacing.sm },
  gistBubble: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: 6 },
  gistLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  gistText: { fontSize: Typography.fontSize.base, lineHeight: 24, fontWeight: Typography.fontWeight.medium },
  whyLine: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  sectionTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  visualCaption: { fontSize: Typography.fontSize.xs, lineHeight: 18, textAlign: 'center', fontStyle: 'italic' },
  bulletCard: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1 },
  bulletText: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  bulletDots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  bulletDot: { width: 8, height: 8, borderRadius: 4 },
  extraBlock: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: 6 },
  extraTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  extraBody: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  conceptBlock: { gap: Spacing.sm },
  conceptRow: { gap: Spacing.sm },
  challenge: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  challengeQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, lineHeight: 22 },
  feedback: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  input: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.sm, minHeight: 72, fontSize: Typography.fontSize.sm, textAlignVertical: 'top' },
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
  navSpacer: { flex: 1 },
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
  primaryBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', flex: 1 },
  primaryBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  secondaryBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', flex: 1, borderWidth: 1 },
  secondaryBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm },
});
