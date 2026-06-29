import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

type Side = 'heads' | 'tails';

interface CoinFlipPlayProps {
  onComplete?: () => void;
}

export function CoinFlipPlay({ onComplete }: CoinFlipPlayProps) {
  const colors = useColors();
  const [yourPick, setYourPick] = useState<Side | null>(null);
  const [opponentPick, setOpponentPick] = useState<Side | null>(null);
  const [flipping, setFlipping] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;

  const flip = (pick: Side) => {
    if (flipping) return;
    setYourPick(pick);
    setFlipping(true);
    const opp: Side = Math.random() < 0.5 ? 'heads' : 'tails';
    setOpponentPick(opp);

    spin.setValue(0);
    Animated.timing(spin, {
      toValue: 4,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setFlipping(false);
      onComplete?.();
    });
  };

  const reset = () => {
    setYourPick(null);
    setOpponentPick(null);
    setFlipping(false);
    spin.setValue(0);
  };

  const matched = yourPick != null && opponentPick != null && yourPick === opponentPick;
  const rotate = spin.interpolate({
    inputRange: [0, 1, 2, 3, 4],
    outputRange: ['0deg', '180deg', '360deg', '540deg', '720deg'],
  });

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        You are the <Text style={{ fontWeight: '700' }}>Matcher</Text> — win when both sides match.
      </Text>

      <Animated.View
        style={[
          styles.coin,
          {
            borderColor: colors.primary,
            backgroundColor: colors.primary + '15',
            transform: [{ rotateY: rotate }],
          },
        ]}
      >
        <Ionicons
          name={opponentPick && !flipping ? (opponentPick === 'heads' ? 'sunny-outline' : 'moon-outline') : 'help-outline'}
          size={40}
          color={colors.primary}
        />
        <Text style={[styles.coinLabel, { color: colors.textPrimary }]}>
          {flipping ? 'Flipping…' : opponentPick ? opponentPick : 'Pick a side'}
        </Text>
      </Animated.View>

      {!yourPick || flipping ? (
        <View style={styles.row}>
          <TouchableOpacity
            disabled={flipping}
            onPress={() => flip('heads')}
            style={[styles.sideBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
          >
            <Ionicons name="sunny-outline" size={24} color={colors.primary} />
            <Text style={[styles.sideText, { color: colors.textPrimary }]}>Heads</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={flipping}
            onPress={() => flip('tails')}
            style={[styles.sideBtn, { borderColor: colors.accentIndigo, backgroundColor: colors.accentIndigo + '12' }]}
          >
            <Ionicons name="moon-outline" size={24} color={colors.accentIndigo} />
            <Text style={[styles.sideText, { color: colors.textPrimary }]}>Tails</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {yourPick && opponentPick && !flipping ? (
        <View
          style={[
            styles.result,
            {
              borderColor: matched ? colors.accentSage : colors.accentTerracotta,
              backgroundColor: (matched ? colors.accentSage : colors.accentTerracotta) + '12',
            },
          ]}
        >
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {matched ? 'Match — you win!' : 'No match — you lose.'}
          </Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            You picked {yourPick}, opponent got {opponentPick}. In pure conflict, being predictable lets the other side
            exploit you — mixing heads and tails 50/50 is often best.
          </Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Flip again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md, alignItems: 'center' },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  coin: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  coinLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold, textTransform: 'capitalize' },
  row: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  sideBtn: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  sideText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  result: { width: '100%', padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
