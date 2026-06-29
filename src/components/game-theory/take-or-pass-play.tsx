import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

const MAX_ROUNDS = 4;

interface TakeOrPassPlayProps {
  onComplete?: () => void;
}

export function TakeOrPassPlay({ onComplete }: TakeOrPassPlayProps) {
  const colors = useColors();
  const [round, setRound] = useState(1);
  const [pot, setPot] = useState(1);
  const [finished, setFinished] = useState(false);
  const [youTook, setYouTook] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;

  const pulsePot = () => {
    scale.setValue(0.85);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const take = () => {
    setYouTook(true);
    setFinished(true);
    onComplete?.();
  };

  const pass = () => {
    if (round >= MAX_ROUNDS) {
      setFinished(true);
      setYouTook(false);
      onComplete?.();
      return;
    }
    const nextPot = pot * 2;
    setPot(nextPot);
    setRound(round + 1);
    pulsePot();
  };

  const reset = () => {
    setRound(1);
    setPot(1);
    setFinished(false);
    setYouTook(false);
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>
        The pot grows each time you pass. Take now, or wait for a bigger prize?
      </Text>

      <Animated.View
        style={[
          styles.potCircle,
          { borderColor: colors.primary, backgroundColor: colors.primary + '12', transform: [{ scale }] },
        ]}
      >
        <Text style={[styles.potAmount, { color: colors.primary }]}>${pot}</Text>
        <Text style={[styles.potRound, { color: colors.textMuted }]}>Round {round} of {MAX_ROUNDS}</Text>
      </Animated.View>

      {!finished ? (
        <View style={styles.row}>
          <TouchableOpacity
            onPress={take}
            style={[styles.action, { borderColor: colors.accentSage, backgroundColor: colors.accentSage + '15' }]}
          >
            <Ionicons name="hand-left-outline" size={22} color={colors.accentSage} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Take ${pot}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={pass}
            style={[styles.action, { borderColor: colors.primary, backgroundColor: colors.primary + '12' }]}
          >
            <Ionicons name="arrow-forward-circle-outline" size={22} color={colors.primary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>
              {round >= MAX_ROUNDS ? 'Final round' : `Pass → $${pot * 2}`}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.result, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10' }]}>
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {youTook ? `You took $${pot}!` : 'You passed until the end — partner may have taken it all.'}
          </Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            On paper, rational players grab early. In real life, people pass when they trust the other person will
            pass too — until someone takes.
          </Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Play again</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md, alignItems: 'center' },
  lead: { fontSize: Typography.fontSize.sm, lineHeight: 20, textAlign: 'center' },
  potCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  potAmount: { fontSize: 32, fontWeight: Typography.fontWeight.bold },
  potRound: { fontSize: Typography.fontSize.xs },
  row: { flexDirection: 'row', gap: Spacing.sm, width: '100%' },
  action: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: Spacing.xs,
  },
  actionText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  result: { width: '100%', padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
