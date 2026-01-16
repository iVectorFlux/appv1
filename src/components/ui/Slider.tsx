/**
 * Slider Component
 * 
 * Simple slider for React Native using touch events.
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  PanResponder,
  LayoutRectangle,
} from 'react-native';
import { useColors, Spacing, Radius } from '@/constants/design-tokens';

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  minimumValue?: number;
  maximumValue?: number;
  step?: number;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  minimumValue = 0,
  maximumValue = 100,
  step = 1,
  disabled = false,
}: SliderProps) {
  const colors = useColors();
  const trackLayout = useRef<LayoutRectangle | null>(null);
  const range = maximumValue - minimumValue;
  const percentage = ((value - minimumValue) / range) * 100;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !disabled,
      onMoveShouldSetPanResponder: () => !disabled,
      onPanResponderGrant: () => {},
      onPanResponderMove: (_, gestureState) => {
        if (!trackLayout.current) return;
        
        const trackWidth = trackLayout.current.width;
        const thumbSize = 24;
        const availableWidth = trackWidth - thumbSize;
        const touchX = gestureState.moveX - (trackLayout.current.x || 0) - thumbSize / 2;
        const clampedX = Math.max(0, Math.min(availableWidth, touchX));
        const newPercentage = (clampedX / availableWidth) * 100;
        const newValue = (newPercentage / 100) * range + minimumValue;
        const steppedValue = Math.round(newValue / step) * step;
        onValueChange(Math.max(minimumValue, Math.min(maximumValue, steppedValue)));
      },
    })
  ).current;

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <View
        style={styles.track}
        onLayout={(event) => {
          trackLayout.current = event.nativeEvent.layout;
        }}
        {...panResponder.panHandlers}
      >
        <View style={[styles.trackFill, { width: `${percentage}%` }]} />
        <View
          style={[
            styles.thumb,
            {
              left: `${percentage}%`,
              marginLeft: -12,
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
    paddingVertical: Spacing.md,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
