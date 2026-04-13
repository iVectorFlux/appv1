/**
 * Theme — visionOS-inspired glassmorphism (2026)
 *
 * Light glass: soft pale backgrounds with frosted translucent cards.
 * Dark glass: deep blue-black with luminous frosted surfaces.
 * Primary: Forest Green (light) / Vibrant Green (dark).
 */

import type { ColorMode } from '@/stores/theme-store';

export interface ThemeColors {
  background: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  surface: string;
  floating: string;
  surfaceAccent: string;

  glass: string;
  glassBorder: string;
  glassHighlight: string;
  glassTint: string;

  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;

  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;

  border: string;
  borderLight: string;

  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  inputBackground: string;

  accentTerracotta: string;
  accentSage: string;
  accentWarmTan: string;
  accentIndigo: string;
  accentCalm: string;
  accentEnergy: string;
  accentSoft: string;
  accentWarm: string;
}

const FOREST = '#2D4739';
const WHITE = '#FFFFFF';
const TERRACOTTA = '#E07A5F';
const SAGE = '#3D8B6E';
const WARM_TAN = '#C4A484';
const SOFT_INDIGO = '#5C6BC0';

const lightTheme: ThemeColors = {
  background: '#E4EBF5',
  backgroundGradientStart: '#C9D6E8',
  backgroundGradientEnd: '#D6DCED',
  surface: 'rgba(255,255,255,0.50)',
  floating: 'rgba(255,255,255,0.72)',
  surfaceAccent: 'rgba(255,255,255,0.35)',

  glass: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.75)',
  glassHighlight: 'rgba(255,255,255,0.92)',
  glassTint: 'light',

  primary: FOREST,
  primaryForeground: WHITE,
  secondary: '#4A5D52',
  secondaryForeground: WHITE,

  textPrimary: '#14261C',
  textSecondary: '#3D5548',
  textMuted: '#7A8E84',
  textLight: '#A8B8B0',

  border: 'rgba(0,0,0,0.06)',
  borderLight: 'rgba(0,0,0,0.03)',

  destructive: TERRACOTTA,
  destructiveForeground: WHITE,
  success: SAGE,
  successForeground: WHITE,
  warning: TERRACOTTA,
  warningForeground: WHITE,
  inputBackground: 'rgba(255,255,255,0.8)',

  accentTerracotta: TERRACOTTA,
  accentSage: SAGE,
  accentWarmTan: WARM_TAN,
  accentIndigo: SOFT_INDIGO,
  accentCalm: SAGE,
  accentEnergy: WARM_TAN,
  accentSoft: SOFT_INDIGO,
  accentWarm: TERRACOTTA,
};

/* ── Dark Theme ────────────────────────────────────────────
 * Deep blue-black background with luminous glass surfaces.
 * Vibrant accent colors tuned for visibility on dark canvas.
 * Inspired by visionOS dark, macOS Sonoma dark mode.
 * ────────────────────────────────────────────────────────── */

const darkTheme: ThemeColors = {
  background: '#0D1117',
  backgroundGradientStart: '#161D2B',
  backgroundGradientEnd: '#111822',
  surface: 'rgba(255,255,255,0.07)',
  floating: 'rgba(255,255,255,0.10)',
  surfaceAccent: 'rgba(255,255,255,0.05)',

  glass: 'rgba(255,255,255,0.09)',
  glassBorder: 'rgba(255,255,255,0.14)',
  glassHighlight: 'rgba(255,255,255,0.20)',
  glassTint: 'dark',

  primary: '#4ADE80',
  primaryForeground: '#0D1117',
  secondary: '#94A3B8',
  secondaryForeground: '#0D1117',

  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textLight: '#475569',

  border: 'rgba(255,255,255,0.10)',
  borderLight: 'rgba(255,255,255,0.06)',

  destructive: '#FB7185',
  destructiveForeground: WHITE,
  success: '#4ADE80',
  successForeground: '#0D1117',
  warning: '#FBBF24',
  warningForeground: '#0D1117',
  inputBackground: 'rgba(255,255,255,0.08)',

  accentTerracotta: '#FB923C',
  accentSage: '#4ADE80',
  accentWarmTan: '#FBBF24',
  accentIndigo: '#818CF8',
  accentCalm: '#4ADE80',
  accentEnergy: '#FBBF24',
  accentSoft: '#818CF8',
  accentWarm: '#FB923C',
};

export const emotionColors: Record<string, keyof ThemeColors> = {
  Calm: 'accentCalm', Peaceful: 'accentCalm', Relaxed: 'accentCalm', Content: 'accentCalm', Grounded: 'accentCalm',
  Excited: 'accentEnergy', Energized: 'accentEnergy', Hopeful: 'accentEnergy', Confident: 'accentEnergy',
  Happy: 'accentWarm', Grateful: 'accentWarm', Proud: 'accentWarm',
  Sad: 'accentSoft', Tired: 'accentSoft', Lonely: 'accentSoft', Empty: 'accentSoft', Exhausted: 'accentSoft',
  Neutral: 'primary', Mixed: 'primary', Unsure: 'primary', Confused: 'primary',
  Anxious: 'secondary', Stressed: 'secondary', Overwhelmed: 'secondary', Worried: 'secondary', Uncertain: 'secondary',
  Angry: 'destructive', Frustrated: 'destructive', Irritated: 'destructive', Upset: 'destructive', Disappointed: 'destructive',
};

export const themes: Record<ColorMode, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};
