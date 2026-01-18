/**
 * Centralized Animation Utilities
 * 
 * Shared animation configurations and helpers for consistent
 * animations throughout the app.
 */

import { Animated, Easing, EasingFunction } from 'react-native';

// =============================================================================
// ANIMATION TIMING CONSTANTS
// =============================================================================

export const AnimationDuration = {
  instant: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  slower: 400,
  selection: 500, // Delay to show selection before transitioning
} as const;

// =============================================================================
// EASING PRESETS
// =============================================================================

export const AnimationEasing = {
  // Standard easings
  linear: Easing.linear,
  ease: Easing.ease,
  
  // Entrance - elements coming into view
  enterCubic: Easing.out(Easing.cubic),
  enterQuad: Easing.out(Easing.quad),
  enterBack: Easing.out(Easing.back(1.5)), // Slight overshoot
  
  // Exit - elements leaving view
  exitCubic: Easing.in(Easing.cubic),
  exitQuad: Easing.in(Easing.quad),
  
  // Emphasis - drawing attention
  bounce: Easing.bounce,
  spring: Easing.out(Easing.back(2)),
  
  // Smooth transitions
  inOut: Easing.inOut(Easing.cubic),
} as const;

// =============================================================================
// ANIMATION CONFIGS (for Animated.timing)
// =============================================================================

export interface AnimationConfig {
  duration: number;
  easing: EasingFunction;
  useNativeDriver: boolean;
}

export const AnimationConfigs = {
  // Fade animations
  fadeIn: {
    duration: AnimationDuration.slow,
    easing: AnimationEasing.enterCubic,
    useNativeDriver: true,
  },
  fadeOut: {
    duration: AnimationDuration.normal,
    easing: AnimationEasing.exitCubic,
    useNativeDriver: true,
  },
  
  // Slide animations
  slideIn: {
    duration: AnimationDuration.slow,
    easing: AnimationEasing.enterCubic,
    useNativeDriver: true,
  },
  slideOut: {
    duration: AnimationDuration.normal,
    easing: AnimationEasing.exitCubic,
    useNativeDriver: true,
  },
  
  // Scale animations
  scaleIn: {
    duration: AnimationDuration.slow,
    easing: AnimationEasing.enterCubic,
    useNativeDriver: true,
  },
  scaleOut: {
    duration: AnimationDuration.normal,
    easing: AnimationEasing.exitCubic,
    useNativeDriver: true,
  },
  
  // Selection feedback
  selectionPop: {
    duration: AnimationDuration.normal,
    easing: AnimationEasing.enterBack,
    useNativeDriver: true,
  },
  
  // Progress bar
  progressBar: {
    duration: AnimationDuration.slow,
    easing: AnimationEasing.enterCubic,
    useNativeDriver: false, // Width requires layout
  },
} as const;

// =============================================================================
// TRANSITION VALUES
// =============================================================================

export const TransitionValues = {
  // Slide distances
  slideDistance: 40,
  slideExitDistance: -30,
  
  // Scale values
  scaleNormal: 1,
  scalePressed: 0.95,
  scaleEnter: 0.98,
  
  // Opacity
  visible: 1,
  hidden: 0,
} as const;

// =============================================================================
// ANIMATION HELPERS
// =============================================================================

/**
 * Create a fade animation
 */
export function createFadeAnimation(
  animValue: Animated.Value,
  toValue: number,
  config: Partial<AnimationConfig> = {}
): Animated.CompositeAnimation {
  const baseConfig = toValue === 1 ? AnimationConfigs.fadeIn : AnimationConfigs.fadeOut;
  return Animated.timing(animValue, {
    toValue,
    ...baseConfig,
    ...config,
  });
}

/**
 * Create a slide animation
 */
export function createSlideAnimation(
  animValue: Animated.Value,
  toValue: number,
  config: Partial<AnimationConfig> = {}
): Animated.CompositeAnimation {
  const baseConfig = toValue === 0 ? AnimationConfigs.slideIn : AnimationConfigs.slideOut;
  return Animated.timing(animValue, {
    toValue,
    ...baseConfig,
    ...config,
  });
}

/**
 * Create a scale animation
 */
export function createScaleAnimation(
  animValue: Animated.Value,
  toValue: number,
  config: Partial<AnimationConfig> = {}
): Animated.CompositeAnimation {
  const baseConfig = toValue === 1 ? AnimationConfigs.scaleIn : AnimationConfigs.scaleOut;
  return Animated.timing(animValue, {
    toValue,
    ...baseConfig,
    ...config,
  });
}

/**
 * Create a selection pop animation (for checkmarks, etc.)
 */
export function createSelectionAnimation(
  animValue: Animated.Value,
  config: Partial<AnimationConfig> = {}
): Animated.CompositeAnimation {
  return Animated.timing(animValue, {
    toValue: 1,
    ...AnimationConfigs.selectionPop,
    ...config,
  });
}

/**
 * Create a complete question transition (exit + enter)
 * Returns a function that takes a callback to run between animations
 */
export function createQuestionTransition(
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  scaleAnim: Animated.Value
) {
  return (onMiddle: () => void, onComplete?: () => void) => {
    // Exit animation
    Animated.parallel([
      createFadeAnimation(fadeAnim, 0),
      Animated.timing(slideAnim, {
        toValue: TransitionValues.slideExitDistance,
        ...AnimationConfigs.slideOut,
      }),
      createScaleAnimation(scaleAnim, TransitionValues.scalePressed),
    ]).start(() => {
      // Run callback between animations
      onMiddle();
      
      // Reset for enter
      slideAnim.setValue(TransitionValues.slideDistance);
      scaleAnim.setValue(TransitionValues.scaleEnter);
      
      // Enter animation
      Animated.parallel([
        createFadeAnimation(fadeAnim, 1),
        createSlideAnimation(slideAnim, 0),
        createScaleAnimation(scaleAnim, 1),
      ]).start(onComplete);
    });
  };
}

/**
 * Create selection with delay before callback
 * Good for showing selection feedback before moving to next question
 */
export function createSelectionWithDelay(
  checkmarkAnim: Animated.Value,
  delayMs: number = AnimationDuration.selection
) {
  return (onComplete: () => void) => {
    checkmarkAnim.setValue(0);
    Animated.sequence([
      createSelectionAnimation(checkmarkAnim),
      Animated.delay(delayMs),
    ]).start(() => onComplete());
  };
}

// =============================================================================
// ANIMATED STYLE HELPERS
// =============================================================================

/**
 * Get animated transform style for question cards
 */
export function getQuestionAnimatedStyle(
  fadeAnim: Animated.Value,
  slideAnim: Animated.Value,
  scaleAnim: Animated.Value
) {
  return {
    opacity: fadeAnim,
    transform: [
      { translateX: slideAnim },
      { scale: scaleAnim },
    ],
  };
}

/**
 * Get animated style for selection checkmarks
 */
export function getSelectionCheckmarkStyle(checkmarkAnim: Animated.Value) {
  return {
    transform: [{ scale: checkmarkAnim }],
    opacity: checkmarkAnim,
  };
}

/**
 * Get animated progress bar width
 */
export function getProgressBarWidth(
  progressAnim: Animated.Value,
  maxWidth: number = 100
) {
  return progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });
}
