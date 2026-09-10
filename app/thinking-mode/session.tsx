/**
 * Thinking Mode session — lesson steps + inline branch exploration + memory map.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThinkingNodeView } from '@/components/thinking-mode/thinking-node-view';
import { ThinkingBranchHub } from '@/components/thinking-mode/thinking-branch-hub';
import { ThinkingBranchPanel } from '@/components/thinking-mode/thinking-branch-panel';
import { ThinkingMemoryStrip } from '@/components/thinking-mode/thinking-memory-strip';
import { ThinkingLandscape } from '@/components/thinking-mode/thinking-landscape';
import { branchKey } from '@/components/thinking-mode/thinking-ui-utils';
import { useThinkingGraph } from '@/hooks/use-thinking-graph';
import type { ThinkingBranch, ThinkingNode } from '@/data/thinking-mode-types';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export default function ThinkingModeSessionScreen() {
  const { q } = useLocalSearchParams<{ q: string }>();
  const router = useRouter();
  const colors = useColors();
  const question = String(q ?? '').trim();
  const [landscapeOpen, setLandscapeOpen] = useState(false);
  const startedRef = useRef(false);

  const graph = useThinkingGraph(question);

  useEffect(() => {
    if (!question || startedRef.current) return;
    startedRef.current = true;
    graph.startRoot();
  }, [question, graph.startRoot]);

  const handleBranchToggle = useCallback(
    (parentNodeId: string, branch: ThinkingBranch) => {
      const key = branchKey(parentNodeId, branch);
      if (graph.openBranchKey === key) {
        graph.setOpenBranchKey(null);
        return;
      }
      void graph.expandBranch(parentNodeId, branch);
    },
    [graph]
  );

  const renderBranchHub = useCallback(
    (parentNode: ThinkingNode, nested = false) => (
      <ThinkingBranchHub
        nested={nested}
        parentNode={parentNode}
        branchOrder={graph.branchOrders.get(parentNode.id) ?? parentNode.branches.map((b) => branchKey(parentNode.id, b))}
        openBranchKey={graph.openBranchKey}
        loadingBranchKey={graph.loadingBranchKey}
        getChildNode={(branch) => graph.getChildNodeForBranch(parentNode.id, branch)}
        onToggleBranch={(branch) => handleBranchToggle(parentNode.id, branch)}
        onExploreConcept={(term) => graph.exploreConcept(term, parentNode.id)}
        renderNestedHub={(child) => renderBranchHub(child, true)}
      />
    ),
    [graph, handleBranchToggle]
  );

  if (!question) {
    return (
      <GlassBackground>
        <ScreenHeader title="Thinking Mode" backFallbackHref="/thinking-mode" />
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>No question provided.</Text>
          <TouchableOpacity onPress={() => router.replace('/thinking-mode' as never)}>
            <Text style={{ color: colors.primary, marginTop: Spacing.md }}>Go back</Text>
          </TouchableOpacity>
        </View>
      </GlassBackground>
    );
  }

  return (
    <GlassBackground>
      <ScreenHeader title="Thinking Mode" backFallbackHref="/thinking-mode" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.toolbar}>
          <TouchableOpacity
            onPress={() => setLandscapeOpen(true)}
            style={[styles.toolBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
          >
            <Ionicons name="map-outline" size={16} color={colors.primary} />
            <Text style={[styles.toolBtnText, { color: colors.primary }]}>Memory map</Text>
          </TouchableOpacity>
        </View>

        <ThinkingMemoryStrip
          rootQuestion={question}
          rootNode={graph.rootNode}
          edges={graph.edges}
          nodes={graph.nodes}
          onOpenMap={() => setLandscapeOpen(true)}
        />

        {graph.error ? (
          <View style={[styles.errorBox, { borderColor: colors.accentTerracotta, backgroundColor: colors.accentTerracotta + '12' }]}>
            <Text style={{ color: colors.textPrimary, fontSize: Typography.fontSize.sm }}>{graph.error}</Text>
            <TouchableOpacity onPress={() => graph.startRoot()}>
              <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold, marginTop: Spacing.sm }}>
                Try again
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!graph.rootNode && graph.loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Building your first step…</Text>
          </View>
        ) : null}

        {graph.detour ? (
          <View>
            <TouchableOpacity
              onPress={graph.exitDetour}
              style={[styles.detourBar, { backgroundColor: colors.primary + '12', borderColor: colors.primary + '35' }]}
            >
              <Ionicons name="arrow-back" size={16} color={colors.primary} />
              <Text style={[styles.detourText, { color: colors.primary }]} numberOfLines={1}>
                Back to lesson
              </Text>
            </TouchableOpacity>
            <ThinkingBranchPanel node={graph.detour.node} onExploreConcept={(t) => graph.exploreConcept(t, graph.detour!.returnToNodeId)} />
          </View>
        ) : null}

        {graph.rootNode && !graph.detour ? (
          <View>
            <ThinkingNodeView
              node={graph.rootNode}
              loading={graph.loading}
              challengeFeedback={graph.challengeFeedback}
              onExploreConcept={(term) => graph.exploreConcept(term, graph.rootNode!.id)}
              onSubmitChallenge={(answer) => graph.submitChallenge(answer, graph.rootNode!.id)}
            />
            {renderBranchHub(graph.rootNode)}
          </View>
        ) : null}
      </ScrollView>

      <ThinkingLandscape
        visible={landscapeOpen}
        rootQuestion={question}
        rootNode={graph.rootNode}
        nodes={graph.nodes}
        edges={graph.edges}
        onClose={() => setLandscapeOpen(false)}
      />
    </GlassBackground>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.xl, gap: Spacing.md },
  loadingText: { fontSize: Typography.fontSize.sm },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: Spacing.xs },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  toolBtnText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  errorBox: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, marginBottom: Spacing.md },
  detourBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  detourText: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
});
