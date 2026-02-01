/**
 * Slider Component
 * 
 * Cross-platform slider using touch events.
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  GestureResponderEvent,
  Platform,
} from 'react-native';
import { useColors, Spacing, Radius } from '@/constants/design-tokens';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
  minimumTrackTintColor?: string;
  maximumTrackTintColor?: string;
  thumbTintColor?: string;
  style?: object;
}

export function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
  minimumTrackTintColor,
  maximumTrackTintColor,
  thumbTintColor,
  style,
}: SliderProps) {
  const colors = useColors();
  const trackRef = useRef<View>(null);
  const trackLayoutRef = useRef<{ x: number; width: number } | null>(null);
  
  const range = maximumValue - minimumValue;
  const percentage = Math.max(0, Math.min(100, ((value - minimumValue) / range) * 100));

  const calculateValue = useCallback((pageX: number) => {
    if (!trackLayoutRef.current) return;
    
    const { x: trackX, width: trackWidth } = trackLayoutRef.current;
    const thumbSize = 24;
    const padding = thumbSize / 2;
    const availableWidth = trackWidth;
    
    // Calculate position relative to track
    const relativeX = pageX - trackX;
    const clampedX = Math.max(0, Math.min(availableWidth, relativeX));
    
    // Convert to value
    const newPercentage = clampedX / availableWidth;
    const rawValue = newPercentage * range + minimumValue;
    const steppedValue = Math.round(rawValue / step) * step;
    const finalValue = Math.max(minimumValue, Math.min(maximumValue, steppedValue));
    
    onValueChange(finalValue);
  }, [minimumValue, maximumValue, range, step, onValueChange]);

  const handleTouchStart = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    calculateValue(event.nativeEvent.pageX);
  }, [disabled, calculateValue]);

  const handleTouchMove = useCallback((event: GestureResponderEvent) => {
    if (disabled) return;
    calculateValue(event.nativeEvent.pageX);
  }, [disabled, calculateValue]);

  const handleLayout = useCallback(() => {
    if (trackRef.current) {
      trackRef.current.measureInWindow((x, y, width, height) => {
        trackLayoutRef.current = { x, width };
      });
    }
  }, []);

  const styles = createStyles(colors);
  
  const trackFillColor = minimumTrackTintColor || colors.primary;
  const trackBgColor = maximumTrackTintColor || colors.surface;
  const thumbColor = thumbTintColor || colors.primary;

  return (
    <View style={[styles.container, style]}>
      <View
        ref={trackRef}
        style={[styles.track, { backgroundColor: trackBgColor }]}
        onLayout={handleLayout}
        onStartShouldSetResponder={() => !disabled}
        onMoveShouldSetResponder={() => !disabled}
        onResponderGrant={handleTouchStart}
        onResponderMove={handleTouchMove}
      >
        <View 
          style={[
            styles.trackFill, 
            { 
              width: `${percentage}%`,
              backgroundColor: trackFillColor,
            }
          ]} 
        />
        <View
          style={[
            styles.thumb,
            {
              left: `${percentage}%`,
              marginLeft: -12,
              backgroundColor: thumbColor,
            },
          ]}
        />
      </View>
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    width: '100%',
    paddingVertical: Spacing.lg,
  },
  track: {
    height: 8,
    backgroundColor: colors.surface,
    borderRadius: Radius.full,
    position: 'relative',
    width: '100%',
  },
  trackFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: Radius.full,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    position: 'absolute',
    top: -8,
    borderWidth: 3,
    borderColor: colors.floating,
    ...(Platform.OS === 'web'
      ? { boxShadow: '0 2px 4px rgba(0,0,0,0.2)', elevation: 4 }
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 4,
          elevation: 4,
        }),
  },
});
