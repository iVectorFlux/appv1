import React from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { GraphEdge } from '@/hooks/use-thinking-graph';
import type { ThinkingNode } from '@/data/thinking-mode-types';
import { pickNodeEmoji } from './thinking-ui-utils';

interface ThinkingMemoryStripProps {
  rootQuestion: string;
  rootNode?: ThinkingNode;
  edges: GraphEdge[];
  nodes: Map<string, ThinkingNode>;
  onOpenMap: () => void;
}

export function ThinkingMemoryStrip({ rootQuestion, rootNode, edges, nodes, onOpenMap }: ThinkingMemoryStripProps) {
  const colors = useColors();

  const items: { id: string; label: string; emoji: string; branchLabel?: string }[] = [];
  if (rootNode) {
    items.push({ id: rootNode.id, label: rootNode.question, emoji: pickNodeEmoji(rootNode) });
  }
  edges.forEach((e) => {
    const n = nodes.get(e.toId);
    if (n && !items.some((i) => i.id === n.id)) {
      items.push({
        id: n.id,
        label: n.question,
        emoji: pickNodeEmoji(n),
        branchLabel: e.branch.label,
      });
    }
  });

  if (items.length <= 1 && edges.length === 0) return null;

  return (
    <View style={[styles.wrap, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>🗺️ Memory map</Text>
        <TouchableOpacity onPress={onOpenMap} hitSlop={8}>
          <Text style={[styles.openLink, { color: colors.primary }]}>Full map</Text>
        </TouchableOpacity>
      </View>
      <Text style={[styles.root, { color: colors.textMuted }]} numberOfLines={1}>
        {rootQuestion}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {items.map((item, i) => (
          <View key={item.id} style={styles.itemRow}>
            {i > 0 ? <Text style={[styles.arrow, { color: colors.textMuted }]}>→</Text> : null}
            <View style={[styles.chip, { borderColor: colors.primary + '35', backgroundColor: colors.primary + '10' }]}>
              <Text style={styles.chipEmoji}>{item.emoji}</Text>
              <View style={styles.chipText}>
                {item.branchLabel ? (
                  <Text style={[styles.chipBranch, { color: colors.primary }]} numberOfLines={1}>
                    {item.branchLabel}
                  </Text>
                ) : null}
                <Text style={[styles.chipLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.label.length > 36 ? `${item.label.slice(0, 36)}…` : item.label}
                </Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md, gap: Spacing.sm, marginBottom: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  openLink: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
  root: { fontSize: Typography.fontSize.xs },
  scroll: { gap: Spacing.xs, alignItems: 'center', paddingVertical: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  arrow: { fontSize: 14, marginHorizontal: 2 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    maxWidth: 200,
  },
  chipEmoji: { fontSize: 20 },
  chipText: { flex: 1, gap: 2 },
  chipBranch: { fontSize: Typography.fontSize.micro, fontWeight: Typography.fontWeight.semibold },
  chipLabel: { fontSize: Typography.fontSize.xs, lineHeight: 16 },
});
