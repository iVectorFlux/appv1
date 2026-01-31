/**
 * Design System Tokens
 * 
 * Token-based design system following Figma specifications.
 * No magic numbers - all spacing, colors, and radii must reference these tokens.
 * 
 * Colors are now dynamic based on theme selection.
 * Use `useColors()` hook to get current theme colors.
 * 
 * Shadows use boxShadow on web (avoids "shadow*" deprecation) and shadow* on native.
 */

import { Platform } from 'react-native';
import { useThemeStore } from '@/stores/theme-store';
import { themes } from './themes';

/**
 * Hook to get current theme colors
 * Use this in components instead of importing Colors directly
 */
export const useColors = () => {
  const { colorMode } = useThemeStore();
  return themes[colorMode];
};

/**
 * Static Colors export for backward compatibility
 * @deprecated Use useColors() hook instead
 */
export const Colors = themes.light;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  full: 9999,
} as const;

export const Typography = {
  fontFamily: {
    primary: 'System', // Will use Inter/Poppins when custom fonts are added
    heading: 'System',
  },
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 28,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },
} as const;

const shadowsNative = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  card: {
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  hero: {
    shadowColor: '#1a1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;

const shadowsWeb = {
  sm: { boxShadow: '0 1px 2px rgba(0,0,0,0.05)', elevation: 1 },
  md: { boxShadow: '0 2px 4px rgba(0,0,0,0.1)', elevation: 2 },
  lg: { boxShadow: '0 4px 8px rgba(0,0,0,0.15)', elevation: 4 },
  card: { boxShadow: '0 2px 8px rgba(26,26,26,0.06)', elevation: 2 },
  hero: { boxShadow: '0 4px 12px rgba(26,26,26,0.12)', elevation: 4 },
} as const;

/** Platform-aware: boxShadow on web (avoids deprecation), shadow* on native. */
export const Shadows = Platform.OS === 'web' ? shadowsWeb : shadowsNative;
