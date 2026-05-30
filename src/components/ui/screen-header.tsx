/**
 * Unified top bar for stack / modal screens: back (chevron) + centered title + optional home or custom right slot.
 * Back uses router.back() when possible, otherwise replaces with `backFallbackHref`.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography } from '@/constants/design-tokens';

const SIDE_W = 44;

export interface ScreenHeaderProps {
  title?: string;
  /** Override default back (e.g. pause media then navigate). If omitted, uses smart back + fallback. */
  onBackPress?: () => void;
  /** When `onBackPress` is omitted: `router.replace(this)` if `canGoBack()` is false */
  backFallbackHref?: Href;
  /** Trailing: Home shortcut to main tab */
  showHomeButton?: boolean;
  /** Custom right element (e.g. history). Ignored if `showHomeButton` is true. */
  right?: React.ReactNode;
  /** Optional custom left icon name instead of chevron-back */
  leftIcon?: keyof typeof Ionicons.glyphMap;
}

export function ScreenHeader({
  title,
  onBackPress,
  backFallbackHref = '/(tabs)/home',
  showHomeButton,
  right,
  leftIcon,
}: ScreenHeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();

  const paddingTop = Platform.OS === 'ios' ? Math.max(insets.top, 12) : Math.max(insets.top, 8);

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
      return;
    }
    if (router.canGoBack()) router.back();
    else router.replace(backFallbackHref as Href);
  };

  const goHome = () => router.replace('/(tabs)/home');

  const trailing = showHomeButton ? (
    <TouchableOpacity
      onPress={goHome}
      style={styles.sideTap}
      hitSlop={16}
      accessibilityRole="button"
      accessibilityLabel="Home"
    >
      <Ionicons name="home-outline" size={22} color={colors.textPrimary} />
    </TouchableOpacity>
  ) : (
    right ?? <View style={styles.sideTap} />
  );

  return (
    <View style={[styles.row, { paddingTop, paddingBottom: Spacing.sm }]}>
      <View style={styles.sideCol}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.sideTap}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name={leftIcon || "chevron-back"} size={24} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
      <View style={styles.titleWrap}>
        {title ? (
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {title}
          </Text>
        ) : null}
      </View>
      <View style={[styles.sideCol, styles.sideColEnd]}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    minHeight: SIDE_W,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sideCol: {
    width: SIDE_W,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  sideColEnd: {
    alignItems: 'flex-end',
  },
  sideTap: {
    width: SIDE_W,
    height: SIDE_W,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleWrap: { flex: 1, justifyContent: 'center', paddingHorizontal: 4 },
  title: {
    textAlign: 'center',
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    fontFamily: Typography.fontFamily.heading,
  },
});
