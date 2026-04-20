/**
 * Shared Styles
 * 
 * Centralized style definitions for common UI patterns.
 * Use these factories to create consistent styles across screens.
 */

import { StyleSheet, Platform } from 'react-native';
import { Spacing, Typography, Radius, Shadows } from '@/constants/design-tokens';
import type { ThemeColors } from '@/constants/themes';

// =============================================================================
// LAYOUT STYLES
// =============================================================================

export function createLayoutStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Full screen container
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    
    // Centered container
    centeredContainer: {
      flex: 1,
      backgroundColor: colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Safe area content
    safeContent: {
      flex: 1,
      paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl,
    },
    
    // Scroll content padding
    scrollContent: {
      flexGrow: 1,
      padding: Spacing.xl,
    },
    
    // Card container
    card: {
      backgroundColor: colors.surface,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      ...Shadows.sm,
    },
    
    // Floating card
    floatingCard: {
      backgroundColor: colors.floating,
      borderRadius: Radius.xl,
      padding: Spacing.xl,
      ...Shadows.md,
    },
  });
}

// =============================================================================
// HEADER STYLES
// =============================================================================

export function createHeaderStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Standard header row
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: Spacing.lg,
      paddingVertical: Spacing.md,
      paddingTop: Platform.OS === 'ios' ? 50 : Spacing.xl,
    },
    
    // Header title
    headerTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
    },
    
    // Close button (circular)
    closeButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Back button (with arrow)
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      padding: Spacing.sm,
    },
    
    // Spacer for alignment
    headerSpacer: {
      width: 44,
    },
  });
}

// =============================================================================
// PROGRESS BAR STYLES
// =============================================================================

export function createProgressStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Progress bar container
    progressBar: {
      height: 4,
      backgroundColor: colors.surface,
      overflow: 'hidden',
    },
    
    // Progress fill
    progressFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 2,
    },
    
    // Thick progress bar
    progressBarThick: {
      height: 8,
      backgroundColor: colors.surface,
      borderRadius: 4,
      overflow: 'hidden',
    },
  });
}

// =============================================================================
// QUESTION/FORM STYLES
// =============================================================================

export function createQuestionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Question wrapper (for animations)
    questionWrapper: {
      flex: 1,
    },
    
    // Question content area
    questionContent: {
      flex: 1,
      gap: Spacing.xl,
    },
    
    // Question prompt text
    questionPrompt: {
      fontSize: Typography.fontSize.xl,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.xl,
      textAlign: 'center',
    },
    
    // Question statement (for Likert)
    questionStatement: {
      fontSize: Typography.fontSize.lg,
      color: colors.textPrimary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
      textAlign: 'center',
      fontStyle: 'italic',
    },
    
    // Question label
    questionLabel: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: Spacing.sm,
    },
    
    // Question hint
    questionHint: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    
    // Scenario text
    scenarioText: {
      fontSize: Typography.fontSize.lg,
      color: colors.textPrimary,
      textAlign: 'center',
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.lg,
      fontStyle: 'italic',
      paddingHorizontal: Spacing.md,
    },
  });
}

// =============================================================================
// OPTION BUTTON STYLES
// =============================================================================

export function createOptionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Options container
    optionsContainer: {
      gap: Spacing.md,
    },
    
    // Base option button
    optionButton: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 2,
      borderColor: colors.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    
    // Selected option
    optionButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    
    // Option text
    optionText: {
      fontSize: Typography.fontSize.base,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
      flex: 1,
    },
    
    // Selected option text
    optionTextSelected: {
      color: colors.primaryForeground,
    },
    
    // Compact option (for emotions, tags)
    compactOption: {
      backgroundColor: colors.floating,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      borderWidth: 2,
      borderColor: colors.borderLight,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    
    // Compact option selected
    compactOptionSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    
    // Compact option text
    compactOptionText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.medium,
      color: colors.textPrimary,
    },
    
    // Compact option text selected
    compactOptionTextSelected: {
      color: colors.primaryForeground,
    },
    
    // Selection checkmark container
    selectionCheckmark: {
      marginLeft: Spacing.sm,
    },
    
    // Option content row (for text + checkmark)
    optionContent: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
    },
  });
}

// =============================================================================
// LIKERT SCALE STYLES
// =============================================================================

export function createLikertStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Likert container
    likertContainer: {
      gap: Spacing.md,
    },
    
    // Scale row
    likertScale: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: Spacing.xs,
    },
    
    // Individual button
    likertButton: {
      flex: 1,
      aspectRatio: 1,
      maxWidth: 44,
      borderRadius: Radius.md,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'transparent',
    },
    
    // Selected button
    likertButtonSelected: {
      backgroundColor: colors.primary,
      borderColor: colors.primary,
    },
    
    // Button text
    likertButtonText: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.textSecondary,
    },
    
    // Selected button text
    likertButtonTextSelected: {
      color: colors.primaryForeground,
    },
    
    // Labels row
    likertLabels: {
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    
    // Label text
    likertLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textSecondary,
      maxWidth: '40%',
    },
  });
}

// =============================================================================
// SKIP/ACTION BUTTON STYLES
// =============================================================================

export function createActionStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Skip button container
    skipContainer: {
      padding: Spacing.lg,
      paddingBottom: Platform.OS === 'ios' ? Spacing['2xl'] : Spacing.lg,
      alignItems: 'center',
    },
    
    // Skip text
    skipText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
    
    // Back link
    backLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Spacing.xs,
      marginTop: Spacing.xl,
      padding: Spacing.md,
    },
    
    // Back link text
    backLinkText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
    },
  });
}

// =============================================================================
// RESULTS/SCORE STYLES
// =============================================================================

export function createResultStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Results container
    resultsContainer: {
      padding: Spacing.xl,
      paddingTop: Platform.OS === 'ios' ? 60 : Spacing.xl,
    },
    
    // Score card
    scoreCard: {
      backgroundColor: colors.primary,
      borderRadius: Radius['2xl'],
      padding: Spacing['2xl'],
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    
    // Score label
    scoreLabel: {
      fontSize: Typography.fontSize.sm,
      color: colors.primaryForeground,
      opacity: 0.8,
    },
    
    // Score value
    scoreValue: {
      fontSize: 64,
      fontWeight: Typography.fontWeight.bold,
      color: colors.primaryForeground,
    },
    
    // Score level
    scoreLevel: {
      fontSize: Typography.fontSize.lg,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.primaryForeground,
      letterSpacing: 0.5,
    },
    
    // Dimension row
    dimensionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: Spacing.md,
    },
    
    // Dimension bar background
    dimensionBar: {
      height: 8,
      backgroundColor: colors.surface,
      borderRadius: 4,
      flex: 1,
      marginHorizontal: Spacing.sm,
      overflow: 'hidden',
    },
    
    // Dimension bar fill
    dimensionFill: {
      height: '100%',
      backgroundColor: colors.primary,
      borderRadius: 4,
    },
  });
}

// =============================================================================
// QUALITY INDICATOR STYLES
// =============================================================================

export function createQualityStyles(colors: ThemeColors) {
  return StyleSheet.create({
    // Quality card
    qualityCard: {
      backgroundColor: colors.surface,
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing['2xl'],
    },
    
    // Quality title
    qualityTitle: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing.md,
    },
    
    // Quality row
    qualityRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
    },
    
    // Quality label
    qualityLabel: {
      fontSize: Typography.fontSize.xs,
      color: colors.textMuted,
    },
    
    // Quality value
    qualityValue: {
      fontSize: Typography.fontSize.xs,
      color: colors.textPrimary,
      fontWeight: Typography.fontWeight.medium,
    },
    
    // Good value (green)
    qualityValueGood: {
      color: colors.success,
    },
    
    // Warning value (orange)
    qualityValueWarning: {
      color: colors.warning,
    },
    
    // Penalty badge
    penaltyBadge: {
      fontSize: Typography.fontSize.xs,
      color: colors.warning,
      fontWeight: Typography.fontWeight.medium,
      backgroundColor: colors.warning + '20',
      paddingHorizontal: Spacing.sm,
      paddingVertical: 2,
      borderRadius: Radius.sm,
      marginLeft: Spacing.sm,
    },
    
    // Warning banner
    warningBanner: {
      backgroundColor: colors.warning + '15',
      borderRadius: Radius.lg,
      padding: Spacing.lg,
      marginBottom: Spacing.xl,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: Spacing.md,
      borderWidth: 1,
      borderColor: colors.warning + '30',
    },
    
    // Warning title
    warningTitle: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      color: colors.warning,
      marginBottom: Spacing.xs,
    },
    
    // Warning text
    warningText: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
      flex: 1,
    },
  });
}

// =============================================================================
// COMBINED FACTORY - Creates all styles at once
// =============================================================================

export function createSharedStyles(colors: ThemeColors) {
  return {
    layout: createLayoutStyles(colors),
    header: createHeaderStyles(colors),
    progress: createProgressStyles(colors),
    question: createQuestionStyles(colors),
    option: createOptionStyles(colors),
    likert: createLikertStyles(colors),
    action: createActionStyles(colors),
    result: createResultStyles(colors),
    quality: createQualityStyles(colors),
  };
}

export type SharedStyles = ReturnType<typeof createSharedStyles>;
