/**
 * Skill Lab Editorial Design Tokens
 *
 * Implements the "First Principles Enterprise Design Spec" visual system.
 * Scoped to Skill Lab pages only — the rest of the app keeps its existing
 * Forest Green / Cream editorial-wellness palette.
 *
 * Tone: editorial, calm, high-trust.
 * Typography triad: Libre Baskerville (reading) + IBM Plex Sans (UI) + IBM Plex Mono (meta).
 * Palette: soft paper background + navy brand + restrained ink hierarchy.
 */

import { Platform } from 'react-native';

// ── Color Palette ────────────────────────────────────────────────────────────

export const SLColors = {
  // Backgrounds
  bgPage: '#F7F6F3',
  bgSurface: '#FFFFFF',
  bgSubtle: '#EFEDE8',

  // Ink hierarchy
  inkPrimary: '#1A1814',
  inkDefault: '#2C2A25',
  inkSecondary: '#5C5A52',
  inkMuted: '#9B9890',
  inkDisabled: '#C5C3BC',

  // Borders
  borderDefault: '#E5E3DE',
  borderSoft: '#D8D6D0',

  // Brand / Interactive
  brandPrimary: '#1B2A4A',
  brandPrimaryHover: '#243660',
  brandOnPrimary: '#FFFFFF',

  // Semantic
  success: '#2D6A4F',
  danger: '#9B2335',

  // Reflection (dark surface)
  reflectionBg: '#1B2A4A',
  reflectionLabel: '#6B8AB8',
  reflectionText: '#E5EAF5',
} as const;

// ── Typography ───────────────────────────────────────────────────────────────

const WEB_SERIF = '"Libre Baskerville", Georgia, serif';
const WEB_SANS = '"IBM Plex Sans", sans-serif';
const WEB_MONO = '"IBM Plex Mono", monospace';
const NATIVE_FONT = 'System';

export const SLTypography = {
  fontFamily: {
    /** Long-form writing, scenario content */
    serif: Platform.OS === 'web' ? WEB_SERIF : NATIVE_FONT,
    /** Controls, helper text, headings, list labels */
    sans: Platform.OS === 'web' ? WEB_SANS : NATIVE_FONT,
    /** Step numbers, progress counters, system labels */
    mono: Platform.OS === 'web' ? WEB_MONO : NATIVE_FONT,
  },
  fontSize: {
    /** Micro/meta labels */
    micro: 11,
    /** Small meta labels */
    xs: 12,
    /** UI label text */
    sm: 13,
    /** Body default */
    base: 15,
    /** Body larger */
    body: 16,
    /** Heading medium */
    md: 17,
    /** Section/card titles */
    lg: 20,
    /** Section question */
    xl: 24,
    /** Display/title (use with clamp on web) */
    display: 28,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.3,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.75,
  },
  letterSpacing: {
    tight: -0.3,
    normal: 0,
    wide: 0.02,
    label: 0.06,
    uppercase: 0.1,
  },
} as const;

// ── Spacing (8px base) ──────────────────────────────────────────────────────

export const SLSpacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 32,
  '4xl': 36,
  '5xl': 40,
} as const;

// ── Layout ───────────────────────────────────────────────────────────────────

export const SLLayout = {
  /** Single-column reading width for deep tasks */
  contentMaxWidth: 640,
  /** Header padding horizontal */
  headerPadH: 40,
  /** Header padding vertical */
  headerPadV: 24,
  /** Main content padding */
  mainPadV: 40,
  mainPadH: 20,
  /** Progress rail height */
  progressRailHeight: 3,
} as const;

// ── Radius ───────────────────────────────────────────────────────────────────

export const SLRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

// ── Component Tokens ─────────────────────────────────────────────────────────

export const SLButton = {
  primary: {
    bg: SLColors.brandPrimary,
    bgHover: SLColors.brandPrimaryHover,
    text: SLColors.brandOnPrimary,
    paddingV: 12,
    paddingH: 28,
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.02,
    borderRadius: SLRadius.md,
  },
  ghost: {
    bg: 'transparent',
    text: '#6B6860',
    textHover: SLColors.brandPrimary,
    border: SLColors.borderSoft,
    borderHover: SLColors.brandPrimary,
    paddingV: 11,
    paddingH: 24,
    fontSize: 14,
    borderRadius: SLRadius.md,
  },
} as const;

export const SLTextarea = {
  bg: SLColors.bgSurface,
  border: SLColors.borderSoft,
  paddingV: 18,
  paddingH: 20,
  fontSize: 15,
  lineHeight: 1.7,
  borderRadius: SLRadius.lg,
} as const;

// ── Transition / Motion ──────────────────────────────────────────────────────

export const SLMotion = {
  /** Default transition duration */
  fast: 150,
  /** Standard UI transition */
  normal: 220,
  /** Progress bar, view transitions */
  slow: 400,
  /** Entrance animation translateY offset */
  entranceOffset: 10,
} as const;
