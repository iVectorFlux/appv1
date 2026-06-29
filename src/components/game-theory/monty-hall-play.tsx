import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

type Phase = 'pick' | 'reveal' | 'decide' | 'result';

interface MontyHallPlayProps {
  onComplete?: () => void;
}

export function MontyHallPlay({ onComplete }: MontyHallPlayProps) {
  const colors = useColors();
  const [phase, setPhase] = useState<Phase>('pick');
  const [carDoor, setCarDoor] = useState(() => Math.floor(Math.random() * 3));
  const [picked, setPicked] = useState<number | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [finalChoice, setFinalChoice] = useState<number | null>(null);
  const [switched, setSwitched] = useState<boolean | null>(null);
  const doorAnims = useRef([0, 1, 2].map(() => new Animated.Value(1))).current;

  const pulseDoor = (index: number) => {
    doorAnims[index].setValue(0.9);
    Animated.spring(doorAnims[index], { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const reset = useCallback(() => {
    setPhase('pick');
    setCarDoor(Math.floor(Math.random() * 3));
    setPicked(null);
    setOpened(null);
    setFinalChoice(null);
    setSwitched(null);
  }, []);

  const pickDoor = (door: number) => {
    if (phase !== 'pick') return;
    setPicked(door);
    pulseDoor(door);
    const goats = [0, 1, 2].filter((d) => d !== door && d !== carDoor);
    const hostOpens = goats[Math.floor(Math.random() * goats.length)];
    setOpened(hostOpens);
    setTimeout(() => {
      pulseDoor(hostOpens);
      setPhase('decide');
    }, 400);
  };

  const finish = (switching: boolean) => {
    if (picked == null || opened == null) return;
    const final = switching ? [0, 1, 2].find((d) => d !== picked && d !== opened)! : picked;
    setFinalChoice(final);
    setSwitched(switching);
    setPhase('result');
    onComplete?.();
  };

  const won = finalChoice === carDoor;

  const doorContent = (index: number) => {
    const isPicked = picked === index;
    const isOpened = opened === index;
    const isFinal = finalChoice === index;
    const showAll = phase === 'result';
    const showGoat = (phase !== 'pick' && isOpened) || (showAll && index !== carDoor);
    const showCar = showAll && index === carDoor;

    let icon: keyof typeof Ionicons.glyphMap = 'help-outline';
    let label = `Door ${index + 1}`;

    if (showCar) {
      icon = 'car-sport-outline';
      label = 'Car!';
    } else if (showGoat) {
      icon = 'paw-outline';
      label = 'Goat';
    }

    const closed = !showCar && !showGoat;

    return (
      <Animated.View key={index} style={{ flex: 1, transform: [{ scale: doorAnims[index] }] }}>
        <TouchableOpacity
          disabled={phase !== 'pick' || isOpened}
          onPress={() => pickDoor(index)}
          style={[
            styles.door,
            {
              borderColor: isFinal ? colors.primary : isPicked ? colors.accentIndigo : colors.glassBorder,
              backgroundColor: isOpened && phase !== 'result'
                ? colors.glassBorder + '25'
                : isPicked
                  ? colors.primary + '12'
                  : colors.glass,
              opacity: isOpened && phase !== 'result' ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons
            name={icon}
            size={32}
            color={showCar ? colors.accentSage : showGoat ? colors.textMuted : isPicked ? colors.primary : colors.textSecondary}
          />
          <Text style={[styles.doorLabel, { color: colors.textPrimary }]}>{label}</Text>
          {closed && phase === 'decide' && isPicked ? (
            <Text style={[styles.doorHint, { color: colors.textMuted }]}>Your pick</Text>
          ) : null}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.instruction, { color: colors.textSecondary }]}>
        {phase === 'pick' && '1. Pick a door — one hides a car, two hide goats.'}
        {phase === 'decide' && '2. Host opened a goat. Stay with your door or switch?'}
        {phase === 'result' && (won ? 'You got the car!' : 'Goat this time — play again!')}
      </Text>

      <View style={styles.doors}>{[0, 1, 2].map(doorContent)}</View>

      {phase === 'decide' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            onPress={() => finish(false)}
          >
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Stay</Text>
            <Text style={[styles.actionSub, { color: colors.textMuted }]}>1 in 3 chance</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
            onPress={() => finish(true)}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>Switch</Text>
            <Text style={[styles.actionSub, { color: colors.primary }]}>2 in 3 chance</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'result' ? (
        <View
          style={[
            styles.resultBox,
            { borderColor: won ? colors.accentSage : colors.accentTerracotta, backgroundColor: colors.glass },
          ]}
        >
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {switched ? 'You switched' : 'You stayed'} — {won ? 'Car!' : 'Goat'}
          </Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            {switched
              ? 'Switching wins about 2 out of 3 times. Your first pick was probably wrong — the host’s goat reveal points to the other door.'
              : 'Staying wins only 1 out of 3 times — only when you guessed right on the first try.'}
          </Text>
          <TouchableOpacity onPress={reset} style={{ marginTop: Spacing.sm }}>
            <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold }}>Play again</Text>
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  instruction: { fontSize: Typography.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  doors: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'center' },
  door: {
    minHeight: 110,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  doorLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  doorHint: { fontSize: 9 },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    gap: 2,
  },
  actionText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  actionSub: { fontSize: Typography.fontSize.xs },
  resultBox: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.xs },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
