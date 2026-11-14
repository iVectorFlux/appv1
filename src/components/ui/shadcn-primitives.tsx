/**
 * Shadcn-inspired Enterprise Primitives for React Native & Expo Web
 *
 * Provides Badge, ProgressBar, StatCard, SectionHeading, and Divider
 * with crisp typography, tabular metrics, and neutral Slate/Cobalt styling.
 */

import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Radius, Typography } from '@/constants/design-tokens';
import { GlassCard } from './glass-card';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline';

export function Badge({
  label,
  variant = 'secondary',
  icon,
  style,
}: {
  label: string;
  variant?: BadgeVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();

  const palette: Record<BadgeVariant, { bg: string; fg: string; border: string }> = {
    default: { bg: colors.primary + '16', fg: colors.primary, border: colors.primary + '33' },
    secondary: { bg: colors.surface, fg: colors.textSecondary, border: colors.border },
    success: { bg: colors.success + '16', fg: colors.success, border: colors.success + '33' },
    warning: { bg: colors.warning + '18', fg: colors.warning, border: colors.warning + '38' },
    destructive: { bg: colors.destructive + '16', fg: colors.destructive, border: colors.destructive + '33' },
    outline: { bg: 'transparent', fg: colors.textSecondary, border: colors.border },
  };
  const p = palette[variant];

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: p.bg, borderColor: p.border },
        style,
      ]}
    >
      {icon ? <Ionicons name={icon} size={12} color={p.fg} /> : null}
      <Text style={[styles.badgeText, { color: p.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

export function ProgressBar({
  value,
  height = 8,
  color,
  trackColor,
  gradientColors,
}: {
  value: number;
  height?: number;
  color?: string;
  trackColor?: string;
  gradientColors?: readonly [string, string, ...string[]];
}) {
  const colors = useColors();
  const pct = Math.max(0, Math.min(100, value));
  const fillGradient: readonly [string, string, ...string[]] | null = gradientColors
    ? gradientColors
    : color
      ? null
      : ['#2563EB', '#0284C7', '#0D9488'];

  return (
    <View
      style={[
        styles.track,
        {
          height,
          borderRadius: height / 2,
          backgroundColor: trackColor ?? colors.surface,
        },
      ]}
    >
      {fillGradient ? (
        <LinearGradient
          colors={fillGradient}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: height / 2,
          }}
        />
      ) : (
        <View
          style={{
            height: '100%',
            width: `${pct}%`,
            borderRadius: height / 2,
            backgroundColor: color ?? colors.primary,
          }}
        />
      )}
    </View>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent,
  style,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: keyof typeof Ionicons.glyphMap;
  accent?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = useColors();
  const c = accent ?? colors.primary;
  return (
    <GlassCard style={style}>
      <View style={styles.statTop}>
        <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
        <View style={[styles.statIconWrap, { backgroundColor: c + '14' }]}>
          <Ionicons name={icon} size={16} color={c} />
        </View>
      </View>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      {hint ? (
        <Text style={[styles.statHint, { color: colors.textMuted }]} numberOfLines={1}>
          {hint}
        </Text>
      ) : null}
    </GlassCard>
  );
}

export function SectionHeading({
  title,
  description,
  right,
}: {
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  const colors = useColors();
  return (
    <View style={styles.sectionHeaderRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>{title}</Text>
        {description ? (
          <Text style={[styles.sectionDesc, { color: colors.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Separator({ style }: { style?: StyleProp<ViewStyle> }) {
  const colors = useColors();
  return <View style={[{ height: 1, backgroundColor: colors.border }, style]} />;
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  track: {
    width: '100%',
    overflow: 'hidden',
  },
  statTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.fontFamily.primary,
  },
  statIconWrap: {
    width: 30,
    height: 30,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
    fontFamily: Typography.fontFamily.primary,
  },
  statHint: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: Typography.fontFamily.primary,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
    fontFamily: Typography.fontFamily.primary,
  },
  sectionDesc: {
    fontSize: 13,
    marginTop: 2,
    fontFamily: Typography.fontFamily.primary,
  },
});

