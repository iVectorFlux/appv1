/**
 * Game Theory hub — 30 classic games with strategy lessons.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';
import { ScreenHeader } from '@/components/ui/screen-header';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import {
  GAME_THEORY_CATEGORIES,
  GAME_THEORY_GAMES,
  getGamesByCategory,
} from '@/data/game-theory-catalog';
import type { GameTheoryCategoryId } from '@/data/game-theory-types';
import { getGameTheoryProgress } from '@/services/game-theory-progress';

export default function GameTheoryHubScreen() {
  const router = useRouter();
  const colors = useColors();
  const [completedIds, setCompletedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<GameTheoryCategoryId | 'all'>('all');

  const load = useCallback(() => {
    setLoading(true);
    getGameTheoryProgress()
      .then((p) => setCompletedIds(p.completedIds))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const games = useMemo(() => {
    if (filter === 'all') return [...GAME_THEORY_GAMES].sort((a, b) => a.order - b.order);
    return getGamesByCategory(filter);
  }, [filter]);

  const completedCount = completedIds.length;
  const total = GAME_THEORY_GAMES.length;

  return (
    <GlassBackground>
      <ScreenHeader title="Game Theory" showHomeButton backFallbackHref="/(tabs)/home" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
          <Text style={[styles.heroTag, { color: colors.primary }]}>STRATEGY LAB</Text>
          <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
            Learn game theory through 30 classic games
          </Text>
          <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
            Each game explains a real strategic situation, lets you try a move, and shows what to take into work and life.
          </Text>
          <View style={styles.progressRow}>
            <Ionicons name="trophy-outline" size={16} color={colors.accentTerracotta} />
            <Text style={[styles.progressText, { color: colors.textSecondary }]}>
              {loading ? '…' : `${completedCount} of ${total} completed`}
            </Text>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="All"
            active={filter === 'all'}
            onPress={() => setFilter('all')}
          />
          {GAME_THEORY_CATEGORIES.map((c) => (
            <FilterChip
              key={c.id}
              label={c.label}
              active={filter === c.id}
              onPress={() => setFilter(c.id)}
            />
          ))}
        </ScrollView>

        {loading ? (
          <ActivityIndicator style={{ marginTop: Spacing.xl }} color={colors.primary} />
        ) : (
          <View style={styles.list}>
            {games.map((game) => {
              const done = completedIds.includes(game.id);
              const cat = GAME_THEORY_CATEGORIES.find((c) => c.id === game.category);
              return (
                <TouchableOpacity
                  key={game.id}
                  activeOpacity={0.85}
                  onPress={() => router.push(`/game-theory/${game.id}` as never)}
                >
                  <GlassCard borderRadius={Radius.lg} style={styles.card}>
                    <View style={styles.cardRow}>
                      <View style={[styles.iconWrap, { backgroundColor: game.color + '1A' }]}>
                        <Ionicons name={game.icon} size={22} color={game.color} />
                      </View>
                      <View style={styles.cardBody}>
                        <View style={styles.titleRow}>
                          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                            {game.title}
                          </Text>
                          {done ? (
                            <Ionicons name="checkmark-circle" size={18} color={colors.accentSage} />
                          ) : null}
                        </View>
                        <Text style={[styles.cardTagline, { color: colors.textSecondary }]} numberOfLines={1}>
                          {game.tagline}
                        </Text>
                        <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                          {cat?.label} · {game.keyConcept}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </GlassCard>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </GlassBackground>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.chip,
        {
          borderColor: active ? colors.primary : colors.glassBorder,
          backgroundColor: active ? colors.primary + '18' : colors.glass,
        },
      ]}
    >
      <Text
        style={{
          fontSize: Typography.fontSize.xs,
          fontWeight: active ? Typography.fontWeight.bold : Typography.fontWeight.medium,
          color: active ? colors.primary : colors.textSecondary,
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing['5xl'] },
  hero: {
    borderRadius: Radius.xl,
    borderWidth: 1,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  heroTag: {
    fontSize: 10,
    fontWeight: Typography.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: Spacing.xs,
  },
  heroTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
    letterSpacing: Typography.letterSpacing.snug,
  },
  heroSub: {
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * 1.5,
    marginBottom: Spacing.md,
  },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  progressText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  filterRow: { gap: Spacing.xs, paddingBottom: Spacing.md },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    marginRight: Spacing.xs,
  },
  list: { gap: Spacing.sm },
  card: { padding: Spacing.md },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  cardTitle: { fontSize: Typography.fontSize.base, fontWeight: Typography.fontWeight.semibold, flex: 1 },
  cardTagline: { fontSize: Typography.fontSize.xs },
  cardMeta: { fontSize: 10, marginTop: 2 },
});
