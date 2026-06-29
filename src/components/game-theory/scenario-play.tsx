import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';
import type { GamePlayChoice } from '@/data/game-theory-types';

const CHOICE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  swerve: 'arrow-redo-outline',
  straight: 'flash-outline',
  communicate: 'chatbubble-outline',
  obvious: 'star-outline',
  unique: 'sparkles-outline',
  offer_90: 'trending-down-outline',
  offer_50: 'git-compare-outline',
  offer_40: 'hand-left-outline',
  keep_all: 'lock-closed-outline',
  share: 'gift-outline',
  send_half: 'send-outline',
  send_all: 'rocket-outline',
  send_none: 'close-circle-outline',
  free_ride: 'person-outline',
  fair_share: 'people-outline',
  extra: 'heart-outline',
  minimum: 'remove-outline',
  reciprocate: 'sync-outline',
  take_now: 'hand-left-outline',
  pass: 'arrow-forward-outline',
  fight: 'shield-outline',
  accommodate: 'hand-right-outline',
  invest_unprotected: 'warning-outline',
  invest_protected: 'document-lock-outline',
  keep_options: 'options-outline',
  commit: 'link-outline',
  forward: 'play-forward-outline',
  backward: 'play-back-outline',
  cheap_talk: 'megaphone-outline',
  costly_signal: 'school-outline',
  flat: 'receipt-outline',
  menu: 'list-outline',
  believe: 'checkmark-circle-outline',
  verify: 'search-outline',
  average_price: 'calculator-outline',
  always_defect: 'close-outline',
  tit_for_tat: 'repeat-outline',
  always_cooperate: 'heart-outline',
  grim: 'skull-outline',
  forgiving: 'leaf-outline',
  max_output: 'trending-up-outline',
  equilibrium: 'git-compare-outline',
  match_low: 'pricetag-outline',
  differentiate: 'diamond-outline',
  true_value: 'cash-outline',
  shade: 'eye-off-outline',
  truthful: 'checkmark-done-outline',
  weak_batna: 'walk-outline',
  strong_batna: 'fitness-outline',
  greedy: 'arrow-up-outline',
  fair: 'scale-outline',
  solo: 'person-outline',
  pair: 'people-outline',
  grand: 'globe-outline',
};

interface ScenarioPlayProps {
  choices: GamePlayChoice[];
  accentColor?: string;
  onComplete?: () => void;
}

export function ScenarioPlay({ choices, accentColor, onComplete }: ScenarioPlayProps) {
  const colors = useColors();
  const accent = accentColor ?? colors.primary;
  const [picked, setPicked] = React.useState<GamePlayChoice | null>(null);
  const fade = useRef(new Animated.Value(0)).current;

  const pick = (c: GamePlayChoice) => {
    setPicked(c);
    fade.setValue(0);
    Animated.timing(fade, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    onComplete?.();
  };

  const reset = () => {
    setPicked(null);
    fade.setValue(0);
  };

  if (picked) {
    return (
      <Animated.View style={{ opacity: fade, gap: Spacing.md }}>
        <View style={[styles.result, { borderColor: accent + '50', backgroundColor: accent + '12' }]}>
          <Ionicons name="bulb-outline" size={24} color={accent} />
          <Text style={[styles.resultTitle, { color: colors.textPrimary }]}>{picked.outcome}</Text>
          <Text style={[styles.resultBody, { color: colors.textSecondary }]}>{picked.lesson}</Text>
        </View>
        <TouchableOpacity onPress={reset}>
          <Text style={{ color: colors.primary, fontWeight: Typography.fontWeight.semibold, textAlign: 'center' }}>
            Try another choice
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={[styles.lead, { color: colors.textSecondary }]}>Pick the move you would make:</Text>
      {choices.map((c, i) => {
        const icon = CHOICE_ICONS[c.id] ?? 'ellipse-outline';
        return (
          <ChoiceCard key={c.id} label={c.label} icon={icon} accent={accent} delay={i * 60} onPress={() => pick(c)} />
        );
      })}
    </View>
  );
}

function ChoiceCard({
  label,
  icon,
  accent,
  delay,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent: string;
  delay: number;
  onPress: () => void;
}) {
  const colors = useColors();
  const slide = useRef(new Animated.Value(16)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 300, delay, useNativeDriver: true }),
    ]).start();
  }, [delay, opacity, slide]);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: slide }] }}>
      <TouchableOpacity
        onPress={onPress}
        style={[styles.card, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}
        activeOpacity={0.85}
      >
        <View style={[styles.iconWrap, { backgroundColor: accent + '18' }]}>
          <Ionicons name={icon} size={20} color={accent} />
        </View>
        <Text style={[styles.cardLabel, { color: colors.textPrimary }]}>{label}</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.sm },
  lead: { fontSize: Typography.fontSize.sm, marginBottom: Spacing.xs, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardLabel: { flex: 1, fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  result: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm, alignItems: 'center' },
  resultTitle: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.bold, textAlign: 'center' },
  resultBody: { fontSize: Typography.fontSize.sm, lineHeight: Typography.fontSize.sm * 1.5, textAlign: 'center' },
});
