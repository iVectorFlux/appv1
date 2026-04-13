/**
 * Tabs Layout — 3 icon-only tabs inside a floating glass capsule.
 *
 * Home, AI Companion, Profile.
 * Hidden routes: learn, eq, recover, progress.
 * Active tab gets a highlighted pill glow.
 */

import React from 'react';
import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';

const CAPSULE_H = 56;
const CAPSULE_HORIZONTAL = 12;

interface TabButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({ icon, focused, colors, onPress, onLongPress }: TabButtonProps) {
  const anim = React.useRef(new Animated.Value(focused ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      speed: 18,
      bounciness: focused ? 8 : 4,
    }).start();
  }, [focused]);

  const pillScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const pillOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const iconScale = anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.7}
      style={styles.tabButton}
    >
      <Animated.View
        style={[
          styles.activePill,
          {
            backgroundColor: colors.primary + '20',
            opacity: pillOpacity,
            transform: [{ scale: pillScale }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: iconScale }] }}>
        <Ionicons
          name={focused ? (icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : icon}
          size={22}
          color={focused ? colors.primary : colors.textMuted}
        />
      </Animated.View>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();
  const isDark = colors.glassTint === 'dark';

  const tabBarPaddingBottom = Math.max(insets.bottom, 12);

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) return <Redirect href="/(auth)/sign-in" />;
  if (needsEmailConfirmation) return <Redirect href="/(auth)/confirm-email" />;
  if (hasCompletedOnboarding === false) return <Redirect href="/onboarding" />;

  const tabBarStyleVisible = {
    position: 'absolute' as const,
    backgroundColor: 'transparent',
    borderTopWidth: 0,
    height: CAPSULE_H + tabBarPaddingBottom + 8,
    paddingBottom: tabBarPaddingBottom,
    paddingTop: 0,
    elevation: 0,
    shadowOpacity: 0,
  };

  const tabBarStyleHidden = {
    display: 'none' as const,
    height: 0,
    overflow: 'hidden' as const,
  };

  const tabBarBackground = () => (
    <View style={[styles.capsuleOuter, { bottom: tabBarPaddingBottom }]}>
      {Platform.OS !== 'web' ? (
        <BlurView
          tint={colors.glassTint as 'light' | 'dark'}
          intensity={isDark ? 50 : 65}
          style={[StyleSheet.absoluteFill, { borderRadius: CAPSULE_H / 2 }]}
        />
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            borderRadius: CAPSULE_H / 2,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.08)'
              : 'rgba(255,255,255,0.55)',
            borderWidth: 1,
            borderColor: isDark
              ? 'rgba(255,255,255,0.12)'
              : 'rgba(255,255,255,0.65)',
          },
        ]}
      />
    </View>
  );

  const tabButton = (icon: keyof typeof Ionicons.glyphMap) => (props: Record<string, unknown>) => (
    <TabButton
      icon={icon}
      focused={!!(props.accessibilityState as { selected?: boolean } | undefined)?.selected}
      colors={colors}
      onPress={props.onPress as () => void}
      onLongPress={props.onLongPress as () => void}
    />
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: tabBarStyleVisible,
        tabBarItemStyle: { flex: 1 },
        sceneStyle: { flex: 1 },
        tabBarBackground,
      }}
    >
      <Tabs.Screen name="home" options={{ tabBarButton: tabButton('home-outline') }} />
      <Tabs.Screen
        name="companion"
        options={{
          tabBarButton: tabButton('chatbubble-ellipses-outline'),
          tabBarStyle: tabBarStyleHidden,
        }}
      />
      <Tabs.Screen name="profile" options={{ tabBarButton: tabButton('person-outline') }} />
      <Tabs.Screen name="eq" options={{ href: null }} />
      <Tabs.Screen name="learn" options={{ href: null }} />
      <Tabs.Screen name="recover" options={{ href: null }} />
      <Tabs.Screen name="progress" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleOuter: {
    position: 'absolute',
    left: CAPSULE_HORIZONTAL,
    right: CAPSULE_HORIZONTAL,
    height: CAPSULE_H,
    borderRadius: CAPSULE_H / 2,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? { backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)' } as object
      : {}),
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePill: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
  },
});
