/**
 * Skill Lab design tokens
 *
 * Scoped aliases over the main platform design system. Skill Lab has some
 * practice-specific component tokens, but it should look like the rest of the
 * forest/cream editorial wellness UI.
 */

import { Platform } from 'react-native';
import { Radius, Spacing, Typography } from '@/constants/design-tokens';

// ── Color Palette ────────────────────────────────────────────────────────────

export const SLColors = {
  // Backgrounds
  bgPage: '#FAF9F7',
  bgSurface: '#FFFFFF',
  bgSubtle: '#F5EDE3',

  // Ink hierarchy
  inkPrimary: '#2D4739',
  inkDefault: '#2D4739',
  inkSecondary: '#666666',
  inkMuted: '#888888',
  inkDisabled: '#AAAAAA',

  // Borders
  borderDefault: '#EDEAE6',
  borderSoft: 'rgba(237, 234, 230, 0.8)',

  // Brand / Interactive
  brandPrimary: '#2D4739',
  brandPrimaryHover: '#3D8B6E',
  brandOnPrimary: '#FFFFFF',

  // Semantic
  success: '#3D8B6E',
  danger: '#E07A5F',

  // Reflection (dark surface)
  reflectionBg: '#2D4739',
  reflectionLabel: '#D4B896',
  reflectionText: '#FFFFFF',
} as const;

// ── Typography ───────────────────────────────────────────────────────────────

const WEB_SANS = Typography.fontFamily.primary;
const NATIVE_FONT = 'System';

export const SLTypography = {
  fontFamily: {
    /** Long-form writing and scenario content use the platform body face. */
    serif: Platform.OS === 'web' ? WEB_SANS : NATIVE_FONT,
    /** Controls, helper text, headings, list labels */
    sans: Platform.OS === 'web' ? WEB_SANS : NATIVE_FONT,
    /** Meta labels use the platform face for visual consistency. */
    mono: Platform.OS === 'web' ? WEB_SANS : NATIVE_FONT,
  },
  fontSize: {
    /** Micro/meta labels */
    micro: Typography.fontSize.micro,
    /** Small meta labels */
    xs: Typography.fontSize.xs,
    /** UI label text */
    sm: Typography.fontSize.sm,
    /** Body default */
    base: Typography.fontSize.base,
    /** Body larger */
    body: Typography.fontSize.body,
    /** Heading medium */
    md: Typography.fontSize.cardTitle,
    /** Section/card titles */
    lg: Typography.fontSize.xl,
    /** Section question */
    xl: Typography.fontSize['2xl'],
    /** Display/title (use with clamp on web) */
    display: Typography.fontSize['3xl'],
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  lineHeight: {
    tight: Typography.lineHeight.tight,
    snug: 1.3,
    normal: Typography.lineHeight.normal,
    relaxed: 1.6,
    loose: Typography.lineHeight.relaxed,
  },
  letterSpacing: {
    tight: Typography.letterSpacing.narrow,
    normal: 0,
    wide: Typography.letterSpacing.wide,
    label: 0.06,
    uppercase: 0.1,
  },
} as const;

// ── Spacing (8px base) ──────────────────────────────────────────────────────

export const SLSpacing = {
  xxs: Spacing.xs,
  xs: Spacing.sm,
  sm: 12,
  md: Spacing.md,
  lg: Spacing.lg,
  xl: Spacing.xl,
  '2xl': Spacing['2xl'],
  '3xl': Spacing['3xl'],
  '4xl': Spacing['4xl'],
  '5xl': Spacing['5xl'],
} as const;

// ── Layout ───────────────────────────────────────────────────────────────────

export const SLLayout = {
  /** Full-width browser layout. Inner elements provide their own padding. */
  contentMaxWidth: '100%',
  /** Header padding horizontal */
  headerPadH: 40,
  /** Header padding vertical */
  headerPadV: 24,
  /** Main content padding */
  mainPadV: 40,
  mainPadH: 20,
  /** Progress rail height */
  progressRailHeight: 4,
} as const;

// ── Radius ───────────────────────────────────────────────────────────────────

export const SLRadius = {
  sm: Radius.sm,
  md: Radius.md,
  lg: Radius.lg,
  xl: Radius.xl,
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
