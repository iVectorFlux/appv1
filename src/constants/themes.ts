/**
 * Theme — Warm editorial wellness (2026)
 *
 * Primary: Forest Green. Accent: Terracotta, Sage, Warm Tan, Soft Indigo.
 * Cream background, white cards, calm and focused.
 */

import type { ColorMode } from '@/stores/theme-store';

export interface ThemeColors {
  // Backgrounds
  background: string;
  surface: string;
  floating: string;
  surfaceAccent: string; // #F5EDE3 subtle card bg

  // Primary (Forest Green)
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string; // #AAAAAA icons, disabled

  // Border
  border: string;
  borderLight: string;

  // Semantic
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  inputBackground: string;

  // Accent (editorial)
  accentTerracotta: string;  // Streak, warnings
  accentSage: string;        // Success, progress
  accentWarmTan: string;      // Brand accent
  accentIndigo: string;       // Category
  accentCalm: string;
  accentEnergy: string;
  accentSoft: string;
  accentWarm: string;
}

// Palette from spec
const FOREST = '#2D4739';
const CREAM = '#FAF9F7';
const WHITE = '#FFFFFF';
const TERRACOTTA = '#E07A5F';
const SAGE = '#3D8B6E';
const WARM_TAN = '#C4A484';
const SOFT_INDIGO = '#5C6BC0';
const BODY_TEXT = '#666666';
const MUTED = '#888888';
const LIGHT_GRAY = '#AAAAAA';
const BORDER = '#EDEAE6';
const BG_ACCENT = '#F5EDE3';

const lightTheme: ThemeColors = {
  background: CREAM,
  surface: BG_ACCENT,
  floating: WHITE,
  surfaceAccent: BG_ACCENT,

  primary: FOREST,
  primaryForeground: WHITE,
  secondary: BODY_TEXT,
  secondaryForeground: WHITE,

  textPrimary: FOREST,
  textSecondary: BODY_TEXT,
  textMuted: MUTED,
  textLight: LIGHT_GRAY,

  border: BORDER,
  borderLight: 'rgba(237, 234, 230, 0.8)',

  destructive: TERRACOTTA,
  destructiveForeground: WHITE,
  success: SAGE,
  successForeground: WHITE,
  warning: TERRACOTTA,
  warningForeground: WHITE,
  inputBackground: WHITE,

  accentTerracotta: TERRACOTTA,
  accentSage: SAGE,
  accentWarmTan: WARM_TAN,
  accentIndigo: SOFT_INDIGO,
  accentCalm: SAGE,
  accentEnergy: WARM_TAN,
  accentSoft: SOFT_INDIGO,
  accentWarm: TERRACOTTA,
};

const darkTheme: ThemeColors = {
  background: '#1A211E',
  surface: '#242D29',
  floating: '#2D3732',
  surfaceAccent: '#2D3732',

  primary: '#3D8B6E',
  primaryForeground: WHITE,
  secondary: '#94A39B',
  secondaryForeground: '#1A211E',

  textPrimary: '#F5F7F6',
  textSecondary: '#B8C4BE',
  textMuted: '#8A9A92',
  textLight: '#6B7A72',

  border: 'rgba(255,255,255,0.1)',
  borderLight: 'rgba(255,255,255,0.06)',

  destructive: '#E07A5F',
  destructiveForeground: WHITE,
  success: '#4DA67A',
  successForeground: WHITE,
  warning: '#E07A5F',
  warningForeground: WHITE,
  inputBackground: '#242D29',

  accentTerracotta: '#E07A5F',
  accentSage: '#4DA67A',
  accentWarmTan: '#D4B896',
  accentIndigo: '#7C8DE0',
  accentCalm: '#4DA67A',
  accentEnergy: '#D4B896',
  accentSoft: '#7C8DE0',
  accentWarm: '#E07A5F',
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
