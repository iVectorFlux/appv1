import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

type Phase = 'pick' | 'reveal' | 'decide' | 'result';

interface MontyHallPlayProps {
  prizeLabel?: string;
  dudLabel?: string;
  onComplete?: () => void;
}

export function MontyHallPlay({
  prizeLabel = 'Car',
  dudLabel = 'Goat',
  onComplete,
}: MontyHallPlayProps) {
  const colors = useColors();
  const [phase, setPhase] = useState<Phase>('pick');
  const [carDoor, setCarDoor] = useState(() => Math.floor(Math.random() * 3));
  const [picked, setPicked] = useState<number | null>(null);
  const [opened, setOpened] = useState<number | null>(null);
  const [finalChoice, setFinalChoice] = useState<number | null>(null);
  const [switched, setSwitched] = useState<boolean | null>(null);

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
    const goats = [0, 1, 2].filter((d) => d !== door && d !== carDoor);
    const hostOpens = goats[Math.floor(Math.random() * goats.length)];
    setOpened(hostOpens);
    setPhase('reveal');
  };

  const stay = () => {
    if (picked == null) return;
    setFinalChoice(picked);
    setSwitched(false);
    setPhase('result');
    onComplete?.();
  };

  const switchDoor = () => {
    if (picked == null || opened == null) return;
    const other = [0, 1, 2].find((d) => d !== picked && d !== opened)!;
    setFinalChoice(other);
    setSwitched(true);
    setPhase('result');
    onComplete?.();
  };

  const won = finalChoice === carDoor;

  const doorContent = (index: number) => {
    const isPicked = picked === index;
    const isOpened = opened === index;
    const isFinal = finalChoice === index;
    const revealed = phase === 'result' || (phase !== 'pick' && isOpened);

    let icon: keyof typeof Ionicons.glyphMap = 'help-outline';
    let label = `Door ${index + 1}`;
    if (revealed || (phase === 'result' && index === carDoor)) {
      if (index === carDoor) {
        icon = 'car-sport-outline';
        label = prizeLabel;
      } else {
        icon = 'paw-outline';
        label = dudLabel;
      }
    }

    return (
      <TouchableOpacity
        key={index}
        disabled={phase !== 'pick' || isOpened}
        onPress={() => pickDoor(index)}
        style={[
          styles.door,
          {
            borderColor: isFinal ? colors.primary : isPicked ? colors.accentIndigo : colors.glassBorder,
            backgroundColor: isOpened
              ? colors.glassBorder + '20'
              : isPicked
                ? colors.primary + '12'
                : colors.glass,
            opacity: isOpened && phase !== 'result' ? 0.45 : 1,
          },
        ]}
      >
        <Ionicons name={icon} size={28} color={isPicked ? colors.primary : colors.textSecondary} />
        <Text style={[styles.doorLabel, { color: colors.textPrimary }]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.wrap}>
      <Text style={[styles.instruction, { color: colors.textSecondary }]}>
        {phase === 'pick' && 'Pick a door. One hides the car, two hide goats.'}
        {phase === 'reveal' && 'The host opened a goat door. Stay or switch?'}
        {phase === 'result' && (won ? 'You win the car!' : 'Goat — try again.')}
      </Text>

      <View style={styles.doors}>{[0, 1, 2].map(doorContent)}</View>

      {phase === 'reveal' ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
            onPress={stay}
          >
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Stay</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: colors.primary, backgroundColor: colors.primary + '18' }]}
            onPress={switchDoor}
          >
            <Text style={[styles.actionText, { color: colors.primary }]}>Switch</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {phase === 'result' ? (
        <View style={[styles.resultBox, { borderColor: won ? colors.accentSage : colors.accentTerracotta, backgroundColor: colors.glass }]}>
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>
            {switched ? 'You switched' : 'You stayed'} — {won ? 'Car!' : 'Goat'}
          </Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>
            {switched
              ? 'Switching wins 2/3 of the time because the host’s reveal concentrates the remaining 2/3 probability on the other closed door.'
              : 'Staying wins only 1/3 — your first pick was right only if the car started behind that door.'}
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
    flex: 1,
    minHeight: 100,
    borderRadius: Radius.lg,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    padding: Spacing.sm,
  },
  doorLabel: { fontSize: Typography.fontSize.xs, fontWeight: Typography.fontWeight.semibold },
  actions: { flexDirection: 'row', gap: Spacing.sm },
  actionBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  actionText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBox: {
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5 },
});
