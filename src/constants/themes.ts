/**
 * Theme Definitions
 * 
 * Single theme with light and dark mode variants.
 * Following the 90-7-3 distribution rule.
 * 
 * Color Psychology:
 * - Primary (Teal): Trust, calm, emotional intelligence
 * - Accent colors for emotions add visual warmth
 */

import type { ColorMode } from '@/stores/theme-store';

export interface ThemeColors {
  // Background Colors
  background: string;
  surface: string;
  floating: string;
  
  // Primary Colors
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  
  // Text Colors
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  
  // Border Colors
  border: string;
  borderLight: string;
  
  // Semantic Colors
  destructive: string;
  destructiveForeground: string;
  success: string;
  successForeground: string;
  warning: string;
  warningForeground: string;
  
  // Input Colors
  inputBackground: string;
  
  // Accent Colors (for emotional variety)
  accentCalm: string;      // For peaceful/calm emotions
  accentEnergy: string;    // For excited/energized emotions
  accentSoft: string;      // For sad/tired emotions
  accentWarm: string;      // For happy/grateful emotions
}

// ============================================================================
// Default Theme (Light and Dark variants)
// ============================================================================

const lightTheme: ThemeColors = {
  // Warmer, softer backgrounds
  background: '#FAFBFA',
  surface: '#F0F3F1',
  floating: '#FFFFFF',
  
  // Primary: Warm teal (more saturated)
  primary: '#3D8B84',
  primaryForeground: '#FFFFFF',
  
  // Secondary: Warm gray with slight blue
  secondary: '#64748B',
  secondaryForeground: '#FFFFFF',
  
  // Text: Softer black for less harsh contrast
  textPrimary: '#1F2937',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  
  // Borders: Subtle warmth
  border: 'rgba(31, 41, 55, 0.10)',
  borderLight: 'rgba(31, 41, 55, 0.06)',
  
  // Semantic
  // No red in the app: use warm orange for destructive
  destructive: '#F97316',
  destructiveForeground: '#FFFFFF',
  success: '#059669',
  successForeground: '#FFFFFF',
  warning: '#D97706',
  warningForeground: '#FFFFFF',
  
  // Input
  inputBackground: '#FFFFFF',
  
  // Accent colors for emotions
  accentCalm: '#60A5FA',     // Soft blue - peaceful
  accentEnergy: '#FBBF24',   // Warm yellow - energized
  accentSoft: '#A78BFA',     // Soft purple - reflective
  accentWarm: '#F97316',     // Orange - happy/warm
};

const darkTheme: ThemeColors = {
  background: '#0F1419',
  surface: '#1A2027',
  floating: '#242B33',
  
  // Primary: Brighter in dark mode for visibility
  primary: '#4ECDC4',
  primaryForeground: '#0F1419',
  
  secondary: '#8B9CB3',
  secondaryForeground: '#0F1419',
  
  textPrimary: '#F1F5F9',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  
  border: 'rgba(241, 245, 249, 0.12)',
  borderLight: 'rgba(241, 245, 249, 0.08)',
  
  // No red in the app: use warm orange for destructive
  destructive: '#FB923C',
  destructiveForeground: '#FFFFFF',
  success: '#10B981',
  successForeground: '#FFFFFF',
  warning: '#F59E0B',
  warningForeground: '#0F1419',
  
  inputBackground: '#1A2027',
  
  // Accent colors (brighter for dark mode)
  accentCalm: '#60A5FA',
  accentEnergy: '#FCD34D',
  accentSoft: '#C4B5FD',
  accentWarm: '#FB923C',
};

// ============================================================================
// Emotion Color Mapping
// ============================================================================

export const emotionColors: Record<string, keyof ThemeColors> = {
  // Positive/Calm emotions -> accentCalm
  'Calm': 'accentCalm',
  'Peaceful': 'accentCalm',
  'Relaxed': 'accentCalm',
  'Content': 'accentCalm',
  'Grounded': 'accentCalm',
  
  // High energy emotions -> accentEnergy
  'Excited': 'accentEnergy',
  'Energized': 'accentEnergy',
  'Hopeful': 'accentEnergy',
  'Confident': 'accentEnergy',
  
  // Warm/Happy emotions -> accentWarm
  'Happy': 'accentWarm',
  'Grateful': 'accentWarm',
  'Proud': 'accentWarm',
  
  // Soft/Reflective emotions -> accentSoft
  'Sad': 'accentSoft',
  'Tired': 'accentSoft',
  'Lonely': 'accentSoft',
  'Empty': 'accentSoft',
  'Exhausted': 'accentSoft',
  
  // Neutral -> primary
  'Neutral': 'primary',
  'Mixed': 'primary',
  'Unsure': 'primary',
  'Confused': 'primary',
  
  // Stressed/Anxious -> secondary (muted)
  'Anxious': 'secondary',
  'Stressed': 'secondary',
  'Overwhelmed': 'secondary',
  'Worried': 'secondary',
  'Uncertain': 'secondary',
  
  // Intense emotions -> destructive
  'Angry': 'destructive',
  'Frustrated': 'destructive',
  'Irritated': 'destructive',
  'Upset': 'destructive',
  'Disappointed': 'destructive',
};

// ============================================================================
// Theme Map
// ============================================================================

export const themes: Record<ColorMode, ThemeColors> = {
  light: lightTheme,
  dark: darkTheme,
};
