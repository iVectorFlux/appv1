import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, Radius } from '@/constants/design-tokens';

const SCORE_RING_PLACEHOLDER = 120;

const SWEEP_WIDTH = 160;

type ShimmerBoxProps = {
  width?: DimensionValue;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/**
 * A subtle moving highlight for loading placeholders (cards, list rows, titles).
 */
export function ShimmerBox({ width = '100%' as const, height, borderRadius = Radius.md, style }: ShimmerBoxProps) {
  const colors = useColors();
  const anim = useRef(new Animated.Value(0)).current;
  const isDark = colors.glassTint === 'dark';

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(anim, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  const translateX = anim.interpolate({ inputRange: [0, 1], outputRange: [-SWEEP_WIDTH, SWEEP_WIDTH] });
  const base = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)';
  const sheen = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.7)';

  return (
    <View style={[{ width, height, borderRadius, overflow: 'hidden', backgroundColor: base }, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFillObject, { transform: [{ translateX }], width: '200%' }]}
        pointerEvents="none"
      >
        <LinearGradient
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{ flex: 1, width: '50%' }}
          colors={[base, sheen, base]}
        />
      </Animated.View>
    </View>
  );
}

type ShimmerLinesProps = {
  lineHeight?: number;
  gaps?: number;
  lines: number;
  widths?: (number | `${number}%`)[];
  style?: ViewStyle;
};

export function ShimmerLines({ lineHeight = 12, gaps = 10, lines, widths, style }: ShimmerLinesProps) {
  return (
    <View style={[{ gap: gaps }, style]}>
      {Array.from({ length: lines }, (_, i) => (
        <ShimmerBox
          key={i}
          height={lineHeight}
          borderRadius={lineHeight / 2}
          width={widths?.[i] ?? (i === lines - 1 ? '70%' : '100%')}
        />
      ))}
    </View>
  );
}

type ShimmerCardBlockProps = {
  padding?: number;
  style?: ViewStyle;
  /** Renders title bar + 2-3 text lines in glass-card style. */
  variant: 'assessment' | 'learning' | 'eqPanel';
};

export function ShimmerCardBlock({ style, variant }: ShimmerCardBlockProps) {
  const colors = useColors();
  const st = { padding: 16, gap: 12 };
  if (variant === 'assessment') {
    return (
      <View style={[{ padding: st.padding, gap: st.gap * 1.5 }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <ShimmerBox width={20} height={20} borderRadius={10} />
          <View style={{ flex: 1 }}>
            <ShimmerBox height={10} width="45%" borderRadius={5} style={{ marginBottom: 10 }} />
            <ShimmerLines lineHeight={11} gaps={6} lines={2} widths={['100%', '85%']} />
          </View>
        </View>
        <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 4 }}>
          <ShimmerBox width={20} height={20} borderRadius={10} />
          <View style={{ flex: 1 }}>
            <ShimmerBox height={10} width="50%" borderRadius={5} style={{ marginBottom: 10 }} />
            <ShimmerLines lineHeight={11} gaps={6} lines={2} />
          </View>
        </View>
      </View>
    );
  }
  if (variant === 'eqPanel') {
    return (
      <View style={[{ padding: st.padding, gap: 16 }, style]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <ShimmerBox
            width={SCORE_RING_PLACEHOLDER}
            height={SCORE_RING_PLACEHOLDER}
            borderRadius={SCORE_RING_PLACEHOLDER / 2}
          />
          <View style={{ flex: 1, gap: 10 }}>
            <ShimmerBox height={28} width="50%" borderRadius={8} />
            <ShimmerBox height={14} width="70%" borderRadius={6} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <ShimmerBox height={22} width={56} borderRadius={8} />
              <ShimmerBox height={22} width={56} borderRadius={8} />
            </View>
          </View>
        </View>
      </View>
    );
  }
  return (
    <View style={[{ padding: st.padding, gap: st.gap }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <ShimmerBox width={22} height={22} borderRadius={6} />
        <ShimmerBox height={16} width="40%" borderRadius={6} />
      </View>
      <ShimmerLines lineHeight={12} gaps={10} lines={4} widths={['100%', '95%', '88%', '50%']} />
    </View>
  );
}
