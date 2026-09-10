import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { GraphEdge } from '@/hooks/use-thinking-graph';
import type { ThinkingNode } from '@/data/thinking-mode-types';
import { branchEmoji, pickNodeEmoji } from './thinking-ui-utils';

interface ThinkingLandscapeProps {
  visible: boolean;
  rootQuestion: string;
  rootNode?: ThinkingNode;
  nodes: Map<string, ThinkingNode>;
  edges: GraphEdge[];
  onClose: () => void;
}

export function ThinkingLandscape({ visible, rootQuestion, rootNode, nodes, edges, onClose }: ThinkingLandscapeProps) {
  const colors = useColors();

  const childEdges = (fromId: string) => edges.filter((e) => e.fromId === fromId);

  const renderNode = (node: ThinkingNode, depth: number, viaBranch?: GraphEdge) => (
    <View key={`${node.id}-${depth}-${viaBranch?.branch.label ?? 'root'}`} style={{ marginLeft: depth * 14 }}>
      <View
        style={[
          styles.nodeRow,
          {
            borderColor: viaBranch ? colors.primary + '40' : colors.glassBorder,
            backgroundColor: viaBranch ? colors.primary + '10' : colors.glass,
          },
        ]}
      >
        <Text style={styles.nodeEmoji}>{pickNodeEmoji(node)}</Text>
        <View style={styles.nodeText}>
          {viaBranch ? (
            <Text style={[styles.branchTag, { color: colors.primary }]}>
              {branchEmoji(viaBranch.branch)} {viaBranch.branch.label}
            </Text>
          ) : (
            <Text style={[styles.branchTag, { color: colors.textMuted }]}>Starting question</Text>
          )}
          <Text style={[styles.nodeLabel, { color: colors.textPrimary }]} numberOfLines={3}>
            {node.question}
          </Text>
        </View>
      </View>
      {childEdges(node.id).map((e) => {
        const child = nodes.get(e.toId);
        return child ? renderNode(child, depth + 1, e) : null;
      })}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>🗺️ Your memory map</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.root, { color: colors.textMuted }]} numberOfLines={2}>
            {rootQuestion}
          </Text>
          <ScrollView contentContainerStyle={styles.tree} showsVerticalScrollIndicator={false}>
            {rootNode ? renderNode(rootNode, 0) : (
              <Text style={{ color: colors.textMuted, textAlign: 'center', padding: Spacing.lg }}>
                Explore paths below to grow your map.
              </Text>
            )}
            {edges.length === 0 && rootNode ? (
              <Text style={[styles.hint, { color: colors.textMuted }]}>
                Tap Why, How, or What if under Explore paths to add branches here.
              </Text>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.md,
    paddingBottom: Spacing['3xl'],
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  title: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.bold },
  root: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.md },
  tree: { gap: Spacing.xs, paddingBottom: Spacing.lg },
  nodeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  nodeEmoji: { fontSize: 22, marginTop: 2 },
  nodeText: { flex: 1, gap: 2 },
  branchTag: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  nodeLabel: { fontSize: Typography.fontSize.sm, lineHeight: 18 },
  hint: { fontSize: Typography.fontSize.sm, textAlign: 'center', marginTop: Spacing.md, lineHeight: 20 },
});
