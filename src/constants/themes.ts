/**
 * Theme - Lumi6 Enterprise (Shadcn Slate & Cobalt System)
 *
 * Crisp light/dark enterprise surfaces: Zinc/Slate neutrals paired with Cobalt Blue & Indigo.
 */

import type { ColorMode } from '@/stores/theme-store';

export interface ThemeColors {
  // Backgrounds
  background: string;
  backgroundGradientStart: string;
  backgroundGradientEnd: string;
  surface: string;
  floating: string;
  surfaceAccent: string;

  // Cards / Chrome
  glass: string;
  glassBorder: string;
  glassHighlight: string;
  glassTint: string;

  // Brand / Actions
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;

  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textLight: string;

  // Borders
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

  // Enterprise Accents
  accentTerracotta: string;
  accentSage: string;
  accentWarmTan: string;
  accentIndigo: string;
  accentCalm: string;
  accentEnergy: string;
  accentSoft: string;
  accentWarm: string;
}

const lightTheme: ThemeColors = {
  background: '#F8FAFC',
  backgroundGradientStart: '#FFFFFF',
  backgroundGradientEnd: '#F1F5F9',
  surface: '#F1F5F9',
  floating: '#FFFFFF',
  surfaceAccent: '#EFF6FF',

  glass: '#FFFFFF',
  glassBorder: '#E2E8F0',
  glassHighlight: 'rgba(15, 23, 42, 0.03)',
  glassTint: 'light',

  primary: '#2563EB',
  primaryForeground: '#FFFFFF',
  secondary: '#0F172A',
  secondaryForeground: '#FFFFFF',

  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',

  border: '#E2E8F0',
  borderLight: '#F1F5F9',

  destructive: '#DC2626',
  destructiveForeground: '#FFFFFF',
  success: '#16A34A',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  inputBackground: '#FFFFFF',

  accentTerracotta: '#E11D48',
  accentSage: '#0EA5E9',
  accentWarmTan: '#F59E0B',
  accentIndigo: '#4F46E5',
  accentCalm: '#0284C7',
  accentEnergy: '#D97706',
  accentSoft: '#6366F1',
  accentWarm: '#E11D48',
};

const darkTheme: ThemeColors = {
  background: '#09090B',
  backgroundGradientStart: '#0F172A',
  backgroundGradientEnd: '#09090B',
  surface: '#18181B',
  floating: '#18181B',
  surfaceAccent: '#1E293B',

  glass: '#18181B',
  glassBorder: '#27272A',
  glassHighlight: 'rgba(255, 255, 255, 0.04)',
  glassTint: 'dark',

  primary: '#3B82F6',
  primaryForeground: '#FFFFFF',
  secondary: '#E4E4E7',
  secondaryForeground: '#09090B',

  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  textLight: '#52525B',

  border: '#27272A',
  borderLight: 'rgba(255, 255, 255, 0.06)',

  destructive: '#EF4444',
  destructiveForeground: '#FFFFFF',
  success: '#22C55E',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#09090B',
  inputBackground: '#18181B',

  accentTerracotta: '#FB7185',
  accentSage: '#38BDF8',
  accentWarmTan: '#FBBF24',
  accentIndigo: '#818CF8',
  accentCalm: '#38BDF8',
  accentEnergy: '#FBBF24',
  accentSoft: '#818CF8',
  accentWarm: '#FB7185',
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
