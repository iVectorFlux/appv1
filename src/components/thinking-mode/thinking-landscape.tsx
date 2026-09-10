import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import type { ThinkingNode } from '@/data/thinking-mode-types';

interface LandscapeNode {
  id: string;
  label: string;
  depth: number;
  parentId?: string;
}

interface ThinkingLandscapeProps {
  visible: boolean;
  rootQuestion: string;
  nodes: Map<string, ThinkingNode>;
  pathIds: string[];
  onClose: () => void;
  onSelectNode: (nodeId: string) => void;
}

export function ThinkingLandscape({
  visible,
  rootQuestion,
  nodes,
  pathIds,
  onClose,
  onSelectNode,
}: ThinkingLandscapeProps) {
  const colors = useColors();

  const items: LandscapeNode[] = Array.from(nodes.values()).map((n) => ({
    id: n.id,
    label: n.question,
    depth: pathIds.indexOf(n.id) >= 0 ? pathIds.indexOf(n.id) : pathIds.length,
    parentId: pathIds[pathIds.indexOf(n.id) - 1],
  }));

  items.sort((a, b) => a.depth - b.depth || a.label.localeCompare(b.label));

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background, borderColor: colors.glassBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Your thinking landscape</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.root, { color: colors.textMuted }]} numberOfLines={2}>
            {rootQuestion}
          </Text>
          <ScrollView contentContainerStyle={styles.tree} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const active = pathIds[pathIds.length - 1] === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => {
                    onSelectNode(item.id);
                    onClose();
                  }}
                  style={[
                    styles.nodeRow,
                    {
                      marginLeft: item.depth * 16,
                      borderColor: active ? colors.primary : colors.glassBorder,
                      backgroundColor: active ? colors.primary + '12' : colors.glass,
                    },
                  ]}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'ellipse-outline'}
                    size={14}
                    color={active ? colors.primary : colors.textMuted}
                  />
                  <Text style={[styles.nodeLabel, { color: colors.textPrimary }]} numberOfLines={2}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
            {items.length === 0 ? (
              <Text style={{ color: colors.textMuted, textAlign: 'center', padding: Spacing.lg }}>
                Explore branches to grow your map.
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
    maxHeight: '75%',
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
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  nodeLabel: { flex: 1, fontSize: Typography.fontSize.sm },
});
