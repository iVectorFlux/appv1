/**
 * Single game theory lesson — learn, play, reflect, and math.
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
import { MatrixDuelPlay } from '@/components/game-theory/matrix-duel-play';
import { CoinFlipPlay } from '@/components/game-theory/coin-flip-play';
import { MontyHallPlay } from '@/components/game-theory/monty-hall-play';
import { SplitOfferPlay } from '@/components/game-theory/split-offer-play';
import { TakeOrPassPlay } from '@/components/game-theory/take-or-pass-play';
import { BrinkmanshipPlay } from '@/components/game-theory/brinkmanship-play';
import { TrustInvestPlay } from '@/components/game-theory/trust-invest-play';
import { BidPlay } from '@/components/game-theory/bid-play';
import { ScenarioPlay } from '@/components/game-theory/scenario-play';
import { MathExplanationPanel } from '@/components/game-theory/math-explanation-panel';
import { useColors, Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import { getGameById, getCategoryMeta } from '@/data/game-theory-catalog';
import type { SplitOfferVariant } from '@/components/game-theory/split-offer-play';
import { markGameTheoryComplete } from '@/services/game-theory-progress';

type Tab = 'learn' | 'play' | 'math';

const PLAY_TYPE_LABELS: Record<string, string> = {
  matrix_duel: 'Strategy duel',
  coin_flip: 'Coin flip',
  monty_hall: 'Three doors',
  split_offer: 'Split the money',
  take_or_pass: 'Growing pot',
  brinkmanship: 'Chicken standoff',
  trust_invest: 'Trust investment',
  bid: 'Auction bid',
  scenario: 'Your choice',
};

function splitVariant(gameId: string): SplitOfferVariant {
  if (gameId === 'dictator_game') return 'dictator';
  if (gameId === 'divide_dollar') return 'divide';
  return 'ultimatum';
}

export default function GameTheoryDetailScreen() {
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const router = useRouter();
  const colors = useColors();
  const game = getGameById(String(gameId ?? ''));

  const [tab, setTab] = useState<Tab>('learn');
  const [playedOnce, setPlayedOnce] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);

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
  const playMode = game.playMode;
  const onPlayed = () => setPlayedOnce(true);

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await markGameTheoryComplete(game.id);
      setCompleted(true);
    } finally {
      setCompleting(false);
    }
  };

  const playTypeLabel = PLAY_TYPE_LABELS[playMode] ?? 'Interactive';

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
              {category?.label} · {game.players} · {playTypeLabel}
            </Text>
          </View>
        </View>

        <View style={styles.tabs}>
          {(
            [
              { id: 'learn' as const, label: 'Learn' },
              { id: 'play' as const, label: 'Play' },
              { id: 'math' as const, label: 'Math' },
            ] as const
          ).map((t) => (
            <TouchableOpacity
              key={t.id}
              onPress={() => setTab(t.id)}
              style={[
                styles.tab,
                {
                  borderColor: tab === t.id ? colors.primary : colors.glassBorder,
                  backgroundColor: tab === t.id ? colors.primary + '14' : colors.glass,
                },
              ]}
            >
              <Text
                style={{
                  fontSize: Typography.fontSize.sm,
                  fontWeight: tab === t.id ? Typography.fontWeight.bold : Typography.fontWeight.medium,
                  color: tab === t.id ? colors.primary : colors.textSecondary,
                }}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'learn' ? (
          <View style={styles.section}>
            <Section title="The situation" colors={colors}>
              <Text style={[styles.hook, { color: colors.textPrimary }]}>{game.storyHook}</Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.description}</Text>
            </Section>

            <Section title={`Key idea: ${game.keyConcept}`} colors={colors}>
              {game.whatYouLearn.map((line) => (
                <Bullet key={line} text={line} colors={colors} />
              ))}
            </Section>

            <Section title="Real life example" colors={colors}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.workplaceExample}</Text>
            </Section>

            <TouchableOpacity
              style={[styles.cta, { backgroundColor: colors.primary }]}
              onPress={() => setTab('play')}
            >
              <Text style={styles.ctaText}>Try the game</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === 'math' ? (
          <View style={styles.section}>
            {game.math ? (
              <MathExplanationPanel math={game.math} />
            ) : (
              <Section title="The numbers" colors={colors}>
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  Explanation coming soon for this game.
                </Text>
              </Section>
            )}
            <TouchableOpacity
              style={[styles.ctaOutline, { borderColor: colors.primary }]}
              onPress={() => setTab('play')}
            >
              <Text style={[styles.ctaOutlineText, { color: colors.primary }]}>Practice in Play tab</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {tab === 'play' ? (
          <View style={styles.section}>
            <Section title="Your move" colors={colors}>
              {playMode === 'matrix_duel' && game.matrix ? (
                <MatrixDuelPlay matrix={game.matrix} onComplete={onPlayed} />
              ) : null}

              {playMode === 'coin_flip' ? <CoinFlipPlay onComplete={onPlayed} /> : null}

              {playMode === 'monty_hall' ? <MontyHallPlay onComplete={onPlayed} /> : null}

              {playMode === 'split_offer' ? (
                <SplitOfferPlay variant={splitVariant(game.id)} onComplete={onPlayed} />
              ) : null}

              {playMode === 'take_or_pass' ? <TakeOrPassPlay onComplete={onPlayed} /> : null}

              {playMode === 'brinkmanship' ? <BrinkmanshipPlay onComplete={onPlayed} /> : null}

              {playMode === 'trust_invest' ? <TrustInvestPlay onComplete={onPlayed} /> : null}

              {playMode === 'bid' ? (
                <BidPlay
                  variant={game.id === 'second_price_auction' ? 'second_price' : 'first_price'}
                  onComplete={onPlayed}
                />
              ) : null}

              {playMode === 'scenario' && game.choices ? (
                <ScenarioPlay choices={game.choices} accentColor={game.color} onComplete={onPlayed} />
              ) : null}
            </Section>

            {!playedOnce ? (
              <Text style={[styles.hint, { color: colors.textMuted, textAlign: 'center' }]}>
                Make at least one move to unlock completion.
              </Text>
            ) : null}

            <Section title="Reflect" colors={colors}>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{game.reflectionPrompt}</Text>
            </Section>

            {game.math ? (
              <TouchableOpacity onPress={() => setTab('math')} style={styles.mathLink}>
                <Ionicons name="calculator-outline" size={16} color={colors.primary} />
                <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>
                  See the simple math behind this
                </Text>
              </TouchableOpacity>
            ) : null}

            {completed ? (
              <View style={[styles.doneBox, { borderColor: colors.accentSage }]}>
                <Ionicons name="checkmark-circle" size={24} color={colors.accentSage} />
                <Text style={[styles.doneText, { color: colors.textPrimary }]}>Marked complete</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[
                  styles.cta,
                  {
                    backgroundColor: colors.primary,
                    opacity: completing || !playedOnce ? 0.55 : 1,
                  },
                ]}
                onPress={handleComplete}
                disabled={completing || !playedOnce}
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
        ) : null}
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
  ctaOutline: {
    paddingVertical: Spacing.md,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  ctaOutlineText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  mathLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
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
