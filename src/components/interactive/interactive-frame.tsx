import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useColors, Typography } from '@/constants/design-tokens';
import type { InteractiveViewMode } from '@/data/interactive-catalog';
import { interactiveAssetUrl } from '@/data/interactive-catalog';

interface InteractiveFrameProps {
  file: string;
  mode: InteractiveViewMode;
  title: string;
  height?: number;
}

export function InteractiveFrame({ file, mode, title, height = 540 }: InteractiveFrameProps) {
  const colors = useColors();
  const src = interactiveAssetUrl(file, mode);

  if (Platform.OS !== 'web') {
    return (
      <View style={[styles.fallback, { borderColor: colors.glassBorder, backgroundColor: colors.glass }]}>
        <Text style={[styles.fallbackText, { color: colors.textSecondary }]}>
          Open Interactive Mode on the web to play this simulation.
        </Text>
      </View>
    );
  }

  return (
    <iframe
      src={src}
      title={title}
      style={{
        width: '100%',
        height,
        border: 'none',
        borderRadius: 16,
        backgroundColor: '#f8fafc',
      }}
    />
  );
}

const styles = StyleSheet.create({
  fallback: {
    minHeight: 180,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  fallbackText: {
    fontSize: Typography.fontSize.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
});
