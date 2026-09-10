/**
 * Thinking Mode session — lazy-loaded thinking graph exploration.
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { ThinkingNodeView } from '@/components/thinking-mode/thinking-node-view';
import { ThinkingTrail } from '@/components/thinking-mode/thinking-trail';
import { ThinkingLandscape } from '@/components/thinking-mode/thinking-landscape';
import { useThinkingGraph } from '@/hooks/use-thinking-graph';
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
            <Text style={[styles.toolBtnText, { color: colors.primary }]}>Landscape</Text>
          </TouchableOpacity>
        </View>

        <ThinkingTrail
          rootLabel={question}
          trail={graph.trail}
          detourLabel={graph.detour ? graph.detour.returnLabel : null}
          onJumpTo={graph.jumpToNode}
          onBackFromDetour={graph.detour ? graph.exitDetour : undefined}
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

        {!graph.activeNode && graph.loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Building your first step…</Text>
          </View>
        ) : null}

        {graph.activeNode ? (
          <View style={[styles.nodeCard, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
            {graph.detour ? (
              <View style={[styles.detourBadge, { backgroundColor: colors.primary + '15' }]}>
                <Ionicons name="telescope-outline" size={14} color={colors.primary} />
                <Text style={[styles.detourBadgeText, { color: colors.primary }]}>Concept detour</Text>
              </View>
            ) : null}
            <ThinkingNodeView
              node={graph.activeNode}
              loading={graph.loading}
              challengeFeedback={graph.challengeFeedback}
              onExpandBranch={graph.expandBranch}
              onExploreConcept={graph.exploreConcept}
              onSubmitChallenge={graph.submitChallenge}
            />
          </View>
        ) : null}
      </ScrollView>

      <ThinkingLandscape
        visible={landscapeOpen}
        rootQuestion={question}
        nodes={graph.nodes}
        pathIds={graph.pathIds}
        onClose={() => setLandscapeOpen(false)}
        onSelectNode={graph.jumpToNode}
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
  nodeCard: { borderRadius: Radius.lg, borderWidth: 1, padding: Spacing.md },
  detourBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
  },
  detourBadgeText: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.bold },
});
