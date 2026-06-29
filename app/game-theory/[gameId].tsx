/**
 * Single game theory lesson — learn, play, reflect.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { ScreenHeader } from '@/components/ui/screen-header';
import { PayoffMatrix } from '@/components/game-theory/payoff-matrix';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { getGameById, getCategoryMeta } from '@/data/game-theory-catalog';
import type { GamePlayChoice } from '@/data/game-theory-types';
import { markGameTheoryComplete } from '@/services/game-theory-progress';

type Phase = 'learn' | 'play' | 'done';

export default function GameTheoryDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const colors = useColors();
  const game = getGameById(String(gameId ?? ''));

  const [phase, setPhase] = useState<Phase>('learn');
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [selectedCol, setSelectedCol] = useState<number | null>(null);
  const [choiceResult, setChoiceResult] = useState<GamePlayChoice | null>(null);
  const [completing, setCompleting] = useState(false);

  if (!game) {
    return (
      <GlassBackground>
        <ScreenHeader title="Game" backFallbackHref="/game-theory" />
        <View style={styles.centered}>
          <Text style={{ color: colors.textSecondary }}>Game not found.</Text>
        </View>
      </GlassBackground>
    );
  }

  const category = getCategoryMeta(game.category);

  const handleMatrixCell = (row: number, col: number) => {
    setSelectedRow(row);
    setSelectedCol(col);
  };

  const handleChoice = (choice: GamePlayChoice) => {
    setChoiceResult(choice);
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markGameTheoryComplete(game.id);
      setPhase('done');
    } finally {
      setCompleting(false);
    }
  };

  const matrixInsight =
    game.matrix && selectedRow != null && selectedCol != null
      ? game.matrix.payoffs[selectedRow][selectedCol]
      : null;

  return (
    <GlassBackground>
      <ScreenHeader title={game.title} backFallbackHref="/game-theory" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.badge, { backgroundColor: game.color + '18' }]}>
          <Ionicons name={game.icon} size={28} color={game.color} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.tagline, { color: game.color }]}>{game.tagline}</Text>
            <Text style={[styles.meta, { color: colors.textMuted }]}>
              {category?.label} · {game.players}
            </Text>
          </View>
        </View>

        {/* Phase tabs */}
        <View style={styles.tabs}>
          {(['learn', 'play'] as const).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPhase(p)}
              style={[
                styles.tab,
                {
                  borderColor: phase === p ? colors.primary : colors.glassBorder,
                  backgroundColor: phase === p ? colors.primary + '14' : colors.glass,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: Typography.fontSize.sm,
                  fontWeight: phase === p ? Typography.fontWeight.bold : Typography.fontWeight.medium,
                  color: phase === p ? colors.primary : colors.textSecondary,
                }}
              >
                {p === 'learn' ? '1 · Learn' : '2 · Play'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {phase === 'learn' ? (
          <View style={styles.section}>
            <Section title="The situation" colors={colors}>
              <Text style={[styles.hook, { color: colors.textPrimary }]}>{game.storyHook}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.description}</Text>
            </Section>

            <Section title={`Key concept: ${game.keyConcept}`} colors={colors}>
              {game.whatYouLearn.map((line) => (
                <Bullet key={line} text={line} colors={colors} />
              ))}
            </Section>

            <Section title="At work" colors={colors}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.workplaceExample}</Text>
            </Section>

            <TouchableOpacity
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() => setPhase('play')}
            >
              <Text style={styles.ctaText}>Try the game</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.section}>
            <Section title="Your move" colors={colors}>
              {game.matrix ? (
                <>
                  <Text style={[styles.hint, { color: colors.textSecondary }]}>
                    Tap a cell to see payoffs ({game.matrix.rowPlayer}, {game.matrix.colPlayer}).
                  </Text>
                  <PayoffMatrix
                    matrix={game.matrix}
                    selectedRow={selectedRow}
                    selectedCol={selectedCol}
                    onSelectCell={handleMatrixCell}
                  />
                  {matrixInsight ? (
                    <View style={[styles.resultBox, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
                        Payoff: you {matrixInsight[0]}, them {matrixInsight[1]}
                      </Text>
                      <Text style={[styles.body, { color: colors.textSecondary }]}>
                        {game.matrix.equilibriumNote}
                      </Text>
                    </View>
                  ) : null}
                </>
              ) : null}

              {game.choices ? (
                <View style={{ gap: Spacing.sm }}>
                  {!choiceResult ? (
                    game.choices.map((c) => (
                      <TouchableOpacity
                        key={c.id}
                        style={[styles.choiceBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
                        onPress={() => handleChoice(c)}
                      >
                        <Text style={[styles.choiceLabel, { color: colors.textPrimary }]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={[styles.resultBox, { borderColor: colors.accentSage + '50', backgroundColor: colors.accentSage + '12' }]}>
                      <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{choiceResult.outcome}</Text>
                      <Text style={[styles.body, { color: colors.textSecondary, marginTop: Spacing.sm }]}>
                        {choiceResult.lesson}
                      </Text>
                      <TouchableOpacity onPress={() => setChoiceResult(null)} style={{ marginTop: Spacing.sm }}>
                        <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>
                          Try another move
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ) : null}
            </Section>

            <Section title="Reflect" colors={colors}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.reflectionPrompt}</Text>
            </Section>

            {phase === 'done' ? (
              <View style={[styles.doneBox, { borderColor: colors.accentSage }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accentSage} />
                <Text style={[styles.doneText, { color: colors.textPrimary }]}>Marked complete</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.cta, { backgroundColor: colors.primary, opacity: completing ? 0.7 : 1 }]}
                onPress={handleComplete}
                disabled={completing}
              >
                <Text style={styles.ctaText}>Complete lesson</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/game-theory' as never)}
            >
              <Text style={{ color: colors.textSecondary }}>Back to all games</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.sectionCard, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function Bullet({ text, colors }: { text: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={{ color: colors.primary }}>•</Text>
      <Text style={[styles.body, { color: colors.textSecondary, flex: 1 }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'] },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    marginBottom: Spacing.md,
  },
  tagline: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  meta: { fontSize: Typography.fontSize.xs, marginTop: 2 },
  tabs: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.md },
  tab: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
  },
  section: { gap: Spacing.md },
  sectionCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  hook: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    lineHeight: Typography.fontSize.base * 1.45,
  },
  body: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.55 },
  hint: { fontSize: Typography.fontSize.xs, marginBottom: Spacing.sm },
  bulletRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'flex-start' },
  resultBox: {
    marginTop: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  choiceBtn: {
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: Spacing.md,
  },
  choiceLabel: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    ...Shadows.sm,
  },
  ctaText: { color: '#FFF', fontWeight: Typography.fontWeight.bold, fontSize: Typography.fontSize.base },
  secondaryBtn: { alignItems: 'center', paddingVertical: Spacing.md },
  doneBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
  },
  doneText: { fontWeight: Typography.fontWeight.semibold },
});
