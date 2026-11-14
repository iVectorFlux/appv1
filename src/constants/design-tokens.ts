/**
 * Design System Tokens - 2026 editorial wellness
 *
 * Bento-friendly spacing, 8px base, DM Sans typography.
 * Use useColors() for theme-aware colors.
 */

import { Platform } from 'react-native';
import { useThemeStore } from '@/stores/theme-store';
import { themes } from './themes';

export const useColors = () => {
  const { colorMode } = useThemeStore();
  return themes[colorMode];
};

/** @deprecated Use useColors() */
export const Colors = themes.light;

/** Base 8px. xs=4, sm=8, md=16, lg=24, xl=32, 2xl=40, 3xl=48, 4xl=56, 5xl=64 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
  '4xl': 56,
  '5xl': 64,
} as const;

/** sm=8, md=10, lg=12, xl=16, full=50% */
export const Radius = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
} as const;

export const Glass = {
  blur: 18,
  blurLight: 10,
  blurHeavy: 32,
  tint: 'light' as const,
  tintDark: 'dark' as const,
  intensity: 52,
} as const;

export const Typography = {
  fontFamily: {
    primary: Platform.OS === 'web' ? '"DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'System',
    heading: Platform.OS === 'web' ? '"DM Sans", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' : 'System',
  },
  fontSize: {
    micro: 11,
    xs: 12,
    sm: 13,
    base: 15,
    body: 15,
    cardTitle: 17,
    section: 14,
    lg: 18,
    xl: 20,
    heroCard: 32,
    '2xl': 24,
    '3xl': 28,
    hero: 42,
    largeNumber: 48,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  letterSpacing: {
    tight: -1.5,
    snug: -1,
    narrow: -0.5,
    normal: 0,
    wide: 0.5,
    section: 1,
    uppercase: 1,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

const SLATE_SHADOW = '#0F172A';

const shadowsNative = {
  sm: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2, elevation: 1 },
  md: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
  lg: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  card: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 },
  hero: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 3 },
  glass: { shadowColor: SLATE_SHADOW, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 1 },
};

const shadowsWeb = {
  sm: { boxShadow: '0 1px 2px rgba(15, 23, 42, 0.05)', elevation: 1 },
  md: { boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)', elevation: 2 },
  lg: { boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)', elevation: 4 },
  card: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)', elevation: 1 },
  hero: { boxShadow: '0 4px 16px rgba(15, 23, 42, 0.07)', elevation: 3 },
  glass: { boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)', elevation: 1 },
};

export const Shadows = Platform.OS === 'web' ? shadowsWeb : shadowsNative;

/** Bento: comfortable max width, horizontal padding */
export const Layout = {
  gridGap: 16,
  maxWidth: 1400,
  paddingHorizontal: 32,
} as const;
