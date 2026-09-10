import React, { type ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingBranch, ThinkingNode } from '@/data/thinking-mode-types';
import { BRANCH_LABELS } from '@/data/thinking-mode-types';
import { branchEmoji, branchKey, friendlyLabel } from './thinking-ui-utils';
import { ThinkingBranchPanel } from './thinking-branch-panel';

interface ThinkingBranchHubProps {
  parentNode: ThinkingNode;
  branchOrder: string[];
  openBranchKey: string | null;
  loadingBranchKey: string | null;
  getChildNode: (branch: ThinkingBranch) => ThinkingNode | undefined;
  onToggleBranch: (branch: ThinkingBranch) => void;
  onExploreConcept: (term: string) => void;
  renderNestedHub?: (childNode: ThinkingNode) => ReactNode;
  nested?: boolean;
}

export function ThinkingBranchHub({
  parentNode,
  branchOrder,
  openBranchKey,
  loadingBranchKey,
  getChildNode,
  onToggleBranch,
  onExploreConcept,
  renderNestedHub,
  nested = false,
}: ThinkingBranchHubProps) {
  const colors = useColors();

  const orderedBranches = branchOrder
    .map((key) => parentNode.branches.find((b) => branchKey(parentNode.id, b) === key))
    .filter(Boolean) as ThinkingBranch[];

  const remaining = parentNode.branches.filter((b) => !orderedBranches.some((o) => o.label === b.label && o.type === b.type));
  const allBranches = [...orderedBranches, ...remaining];

  if (allBranches.length === 0) return null;

  return (
    <View style={[styles.hub, nested && styles.hubNested]}>
      {!nested ? (
        <>
          <Text style={[styles.hubTitle, { color: colors.textPrimary }]}>🧭 Explore paths</Text>
          <Text style={[styles.hubSub, { color: colors.textMuted }]}>
            Tap a card — the answer opens right here. Explored paths move to the bottom.
          </Text>
        </>
      ) : (
        <Text style={[styles.nestedTitle, { color: colors.textSecondary }]}>Go deeper</Text>
      )}

      <View style={styles.list}>
        {allBranches.map((branch) => {
          const key = branchKey(parentNode.id, branch);
          const isOpen = openBranchKey === key;
          const isLoading = loadingBranchKey === key;
          const child = getChildNode(branch);
          const meta = BRANCH_LABELS[branch.type] ?? { icon: 'arrow-forward-outline', color: colors.primary };
          const em = branchEmoji(branch);

          return (
            <View key={key} style={styles.branchBlock}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => onToggleBranch(branch)}
                style={[
                  styles.branchBtn,
                  {
                    borderColor: isOpen ? meta.color : meta.color + '45',
                    backgroundColor: isOpen ? meta.color + '18' : meta.color + '10',
                    borderWidth: isOpen ? 2 : 1,
                  },
                ]}
              >
                <Text style={styles.branchEmoji}>{em}</Text>
                <View style={styles.branchTextCol}>
                  <Text style={[styles.branchType, { color: meta.color }]}>{friendlyLabel(branch.type.replace('_', ' '))}</Text>
                  <Text style={[styles.branchLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                    {branch.label}
                  </Text>
                </View>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={meta.color} />
              </TouchableOpacity>

              {isOpen ? (
                <ThinkingBranchPanel
                  node={child}
                  loading={isLoading && !child}
                  onExploreConcept={onExploreConcept}
                  nestedHub={child && child.branches.length > 0 ? renderNestedHub?.(child) : undefined}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hub: { gap: Spacing.sm, marginTop: Spacing.lg },
  hubNested: { marginTop: Spacing.md },
  hubTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.bold },
  hubSub: { fontSize: Typography.fontSize.sm, lineHeight: 20, marginTop: -Spacing.xs },
  nestedTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  list: { gap: Spacing.md },
  branchBlock: { gap: 0 },
  branchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
  },
  branchEmoji: { fontSize: 24 },
  branchTextCol: { flex: 1, gap: 2 },
  branchType: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'capitalize' },
  branchLabel: { fontSize: Typography.fontSize.sm, lineHeight: 20 },
});
