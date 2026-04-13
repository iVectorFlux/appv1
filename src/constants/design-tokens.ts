/**
 * Design System Tokens — visionOS glassmorphism (2026)
 *
 * 8px base grid, DM Sans typography, frosted glass surfaces.
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

export const Radius = {
  sm: 12,
  md: 16,
  lg: 22,
  xl: 28,
  '2xl': 32,
  full: 9999,
} as const;

export const Glass = {
  blur: 20,
  blurLight: 12,
  blurHeavy: 40,
  tint: 'light' as const,
  tintDark: 'dark' as const,
  intensity: 60,
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

const shadowsNative = {
  sm: { shadowColor: '#1A2E23', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1 },
  md: { shadowColor: '#1A2E23', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
  lg: { shadowColor: '#1A2E23', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 4 },
  card: { shadowColor: '#1A2E23', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  hero: { shadowColor: '#1A2E23', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 6 },
  glass: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.07, shadowRadius: 14, elevation: 4 },
};

const shadowsWeb = {
  sm: { boxShadow: '0 1px 3px rgba(26, 46, 35, 0.04)', elevation: 1 },
  md: { boxShadow: '0 2px 8px rgba(26, 46, 35, 0.06)', elevation: 2 },
  lg: { boxShadow: '0 6px 16px rgba(26, 46, 35, 0.08)', elevation: 4 },
  card: { boxShadow: '0 2px 10px rgba(26, 46, 35, 0.05)', elevation: 2 },
  hero: { boxShadow: '0 6px 20px rgba(26, 46, 35, 0.1)', elevation: 6 },
  glass: { boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 0 1px rgba(0,0,0,0.08)', elevation: 4 },
};

export const Shadows = Platform.OS === 'web' ? shadowsWeb : shadowsNative;

export const Layout = {
  gridGap: 16,
  maxWidth: 1400,
  paddingHorizontal: 32,
} as const;
