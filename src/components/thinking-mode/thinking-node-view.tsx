import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingBranch, ThinkingNode } from '@/data/thinking-mode-types';
import { BRANCH_LABELS } from '@/data/thinking-mode-types';
import { ConceptChip, ExplorableText } from './explorable-text';

interface ThinkingNodeViewProps {
  node: ThinkingNode;
  loading?: boolean;
  challengeFeedback?: string | null;
  onExpandBranch: (branch: ThinkingBranch) => void;
  onExploreConcept: (term: string) => void;
  onSubmitChallenge: (answer: string) => void;
}

export function ThinkingNodeView({
  node,
  loading,
  challengeFeedback,
  onExpandBranch,
  onExploreConcept,
  onSubmitChallenge,
}: ThinkingNodeViewProps) {
  const colors = useColors();
  const [challengeAnswer, setChallengeAnswer] = useState('');

  const showFlow =
    node.processSteps &&
    node.processSteps.length > 0 &&
    (node.representation === 'flow' || node.representation === 'cause_effect');

  return (
    <View style={styles.wrap}>
      <Text style={[styles.question, { color: colors.textPrimary }]}>{node.question}</Text>

      {node.whyItMatters ? (
        <View style={[styles.callout, { backgroundColor: colors.accentIndigo + '12', borderColor: colors.accentIndigo + '30' }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.accentIndigo} />
          <Text style={[styles.calloutText, { color: colors.textSecondary }]}>{node.whyItMatters}</Text>
        </View>
      ) : null}

      {node.socraticQuestion ? (
        <View style={[styles.socratic, { borderColor: colors.primary + '35', backgroundColor: colors.primary + '08' }]}>
          <Text style={[styles.socraticLabel, { color: colors.primary }]}>Think first</Text>
          <Text style={[styles.socraticQ, { color: colors.textPrimary }]}>{node.socraticQuestion}</Text>
        </View>
      ) : null}

      <ExplorableText text={node.explanation} concepts={node.concepts} onExploreConcept={onExploreConcept} />

      {node.concepts.length > 0 ? (
        <View style={styles.conceptSection}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Need a quick detour?</Text>
          <View style={styles.conceptRow}>
            {node.concepts.map((c) => (
              <ConceptChip key={c.term} concept={c} onPress={() => onExploreConcept(c.term)} />
            ))}
          </View>
        </View>
      ) : null}

      {showFlow ? (
        <View style={[styles.flow, { borderColor: colors.glassBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
            {node.representation === 'cause_effect' ? 'Cause → effect' : 'How it flows'}
          </Text>
          {node.processSteps!.map((step, i) => (
            <View key={step} style={styles.flowRow}>
              <View style={[styles.flowDot, { backgroundColor: colors.primary }]} />
              {i < node.processSteps!.length - 1 ? (
                <View style={[styles.flowLine, { backgroundColor: colors.glassBorder }]} />
              ) : null}
              <Text style={[styles.flowStep, { color: colors.textPrimary }]}>{step}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {node.visualizationHint ? (
        <View style={[styles.visual, { backgroundColor: colors.accentSage + '10', borderColor: colors.accentSage + '35' }]}>
          <Ionicons name="eye-outline" size={18} color={colors.accentSage} />
          <Text style={[styles.visualText, { color: colors.textSecondary }]}>{node.visualizationHint}</Text>
        </View>
      ) : null}

      {node.evidence ? (
        <View style={[styles.evidence, { borderColor: colors.glassBorder }]}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Real example</Text>
          <Text style={[styles.evidenceText, { color: colors.textSecondary }]}>{node.evidence}</Text>
        </View>
      ) : null}

      {node.challengePrompt ? (
        <View style={[styles.challenge, { borderColor: colors.accentTerracotta + '40', backgroundColor: colors.accentTerracotta + '08' }]}>
          <Text style={[styles.sectionLabel, { color: colors.accentTerracotta }]}>Challenge</Text>
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
                style={[
                  styles.input,
                  { borderColor: colors.glassBorder, color: colors.textPrimary, backgroundColor: colors.glass },
                ]}
              />
              <TouchableOpacity
                disabled={!challengeAnswer.trim() || loading}
                onPress={() => {
                  onSubmitChallenge(challengeAnswer.trim());
                  setChallengeAnswer('');
                }}
                style={[styles.challengeBtn, { backgroundColor: colors.accentTerracotta, opacity: challengeAnswer.trim() ? 1 : 0.5 }]}
              >
                <Text style={styles.challengeBtnText}>Check my thinking</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      ) : null}

      <Text style={[styles.sectionLabel, { color: colors.textMuted, marginTop: Spacing.sm }]}>Explore deeper</Text>
      <View style={styles.branchGrid}>
        {node.branches.map((b) => {
          const meta = BRANCH_LABELS[b.type] ?? { icon: 'arrow-forward-outline', color: colors.primary };
          return (
            <TouchableOpacity
              key={`${b.type}-${b.label}`}
              disabled={loading}
              onPress={() => onExpandBranch(b)}
              style={[styles.branchBtn, { borderColor: meta.color + '50', backgroundColor: meta.color + '12' }]}
            >
              <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={18} color={meta.color} />
              <Text style={[styles.branchLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                {b.label}
              </Text>
            </TouchableOpacity>
          );
        })}
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
  question: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold, lineHeight: 26 },
  callout: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  calloutText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  socratic: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  socraticLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold, letterSpacing: 0.5 },
  socraticQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, lineHeight: 20 },
  conceptSection: { gap: Spacing.sm },
  conceptRow: { gap: Spacing.sm },
  sectionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  flow: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  flowRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm, paddingLeft: 4 },
  flowDot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  flowLine: { position: 'absolute', left: 7, top: 14, width: 2, height: 24 },
  flowStep: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: 20 },
  visual: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'flex-start',
  },
  visualText: { flex: 1, fontSize: Typography.fontSize.sm, lineHeight: 20, fontStyle: 'italic' },
  evidence: { padding: Spacing.md, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  evidenceText: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  challenge: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  challengeQ: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold, lineHeight: 20 },
  feedback: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    minHeight: 72,
    fontSize: Typography.fontSize.sm,
    textAlignVertical: 'top',
  },
  challengeBtn: { paddingVertical: Spacing.sm, borderRadius: Radius.md, alignItems: 'center' },
  challengeBtnText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.sm },
  branchGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  branchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    minWidth: '47%',
    flexGrow: 1,
  },
  branchLabel: { flex: 1, fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  loadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
});
