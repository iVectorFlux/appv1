import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingNode } from '@/data/thinking-mode-types';
import { ExplorableText } from './explorable-text';
import { ThinkingRepresentationView } from './thinking-representation-view';
import {
  explanationBullets,
  friendlyLabel,
  nodeFirstPrinciples,
  nodeTldr,
  pickNodeEmoji,
} from './thinking-ui-utils';

interface ThinkingBranchPanelProps {
  node?: ThinkingNode;
  loading?: boolean;
  onExploreConcept: (term: string) => void;
  nestedHub?: ReactNode;
}

/** Inline expansion content under a branch card — not a new full journey. */
export function ThinkingBranchPanel({ node, loading, onExploreConcept, nestedHub }: ThinkingBranchPanelProps) {
  const colors = useColors();

  if (loading || !node) {
    return (
      <View style={[styles.panel, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Building this path…</Text>
      </View>
    );
  }

  const emoji = pickNodeEmoji(node);
  const bullets = explanationBullets(node);

  return (
    <View style={[styles.panel, { borderColor: colors.primary + '25', backgroundColor: colors.primary + '06' }]}>
      <Text style={styles.panelEmoji}>{emoji}</Text>
      <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>{friendlyLabel(node.question)}</Text>

      <View style={[styles.hookBox, { backgroundColor: colors.accentIndigo + '10', borderColor: colors.accentIndigo + '25' }]}>
        <Text style={[styles.hookLabel, { color: colors.accentIndigo }]}>In simple terms</Text>
        <Text style={[styles.hookText, { color: colors.textPrimary }]}>{nodeTldr(node)}</Text>
      </View>

      <Text style={[styles.fpLabel, { color: colors.textSecondary }]}>From first principles</Text>
      <Text style={[styles.fpText, { color: colors.textPrimary }]}>{nodeFirstPrinciples(node)}</Text>

      {bullets.length > 0 ? (
        <View style={styles.bulletList}>
          {bullets.map((b) => (
            <View key={b.slice(0, 24)} style={styles.bulletRow}>
              <Text style={[styles.bulletDot, { color: colors.primary }]}>•</Text>
              <ExplorableText text={b} concepts={node.concepts} onExploreConcept={onExploreConcept} />
            </View>
          ))}
        </View>
      ) : null}

      <ThinkingRepresentationView node={node} />

      {node.evidence ? (
        <View style={[styles.evidence, { borderColor: colors.accentSage + '30', backgroundColor: colors.accentSage + '08' }]}>
          <Text style={[styles.evidenceLabel, { color: colors.accentSage }]}>🌍 Example</Text>
          <Text style={[styles.evidenceText, { color: colors.textSecondary }]}>{node.evidence}</Text>
        </View>
      ) : null}

      {nestedHub}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    marginTop: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  loadingText: { fontSize: Typography.fontSize.sm, textAlign: 'center' },
  panelEmoji: { fontSize: 28, textAlign: 'center' },
  panelTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold, textAlign: 'center', lineHeight: 22 },
  hookBox: { padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  hookLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  hookText: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
  fpLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.xs },
  fpText: { fontSize: Typography.fontSize.sm, lineHeight: 22 },
  bulletList: { gap: Spacing.xs },
  bulletRow: { flexDirection: 'row', gap: Spacing.xs, alignItems: 'flex-start' },
  bulletDot: { fontSize: Typography.fontSize.base, lineHeight: 22 },
  evidence: { padding: Spacing.sm, borderRadius: Radius.md, borderWidth: 1, gap: 4 },
  evidenceLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  evidenceText: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
});
