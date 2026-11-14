/**
 * Tabs Layout - Adaptive Enterprise Shell
 *
 * Desktop Web (>= 1024px): Persistent Shadcn-inspired left sidebar + full-width main stage.
 * Mobile / Narrow Web (< 1024px): Crisp modern bottom tab bar (Home, Learn EQ, Companion, Profile).
 */

import React from 'react';
import { Redirect, Tabs } from 'expo-router';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { DesktopSidebar } from '@/components/layout/desktop-sidebar';

interface TabButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  focused: boolean;
  colors: ReturnType<typeof useColors>;
  onPress: () => void;
  onLongPress: () => void;
}

function TabButton({ icon, label, focused, colors, onPress, onLongPress }: TabButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={styles.tabButton}
    >
      <View
        style={[
          styles.iconPill,
          focused && { backgroundColor: colors.primary + '16' },
        ]}
      >
        <Ionicons
          name={focused ? (icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : icon}
          size={20}
          color={focused ? colors.primary : colors.textMuted}
        />
      </View>
      <Text
        style={[
          styles.tabLabel,
          { color: focused ? colors.primary : colors.textMuted, fontWeight: focused ? '600' : '500' },
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const isDesktop = useWebLaptopLayout();
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();

  const tabBarPaddingBottom = Math.max(insets.bottom, 10);

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

  const tabBarStyleHidden = {
    display: 'none' as const,
    height: 0,
    overflow: 'hidden' as const,
  };

  const tabBarStyleMobile = {
    backgroundColor: colors.floating,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: 58 + tabBarPaddingBottom,
    paddingBottom: tabBarPaddingBottom,
    paddingTop: 4,
    elevation: 0,
    shadowOpacity: 0,
  };

  const tabButton = (icon: keyof typeof Ionicons.glyphMap, label: string) => {
    const TabBarButton = (props: Record<string, unknown>) => (
      <TabButton
        icon={icon}
        label={label}
        focused={!!(props.accessibilityState as { selected?: boolean } | undefined)?.selected}
        colors={colors}
        onPress={props.onPress as () => void}
        onLongPress={props.onLongPress as () => void}
      />
    );
    TabBarButton.displayName = `TabBarButton(${label})`;
    return TabBarButton;
  };

  const tabsContent = (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: false,
        tabBarStyle: isDesktop ? tabBarStyleHidden : tabBarStyleMobile,
        tabBarItemStyle: { flex: 1 },
        sceneStyle: { flex: 1, backgroundColor: colors.background },
      }}
    >
      <Tabs.Screen name="home" options={{ tabBarButton: tabButton('grid-outline', 'Home') }} />
      <Tabs.Screen name="learn" options={{ tabBarButton: tabButton('book-outline', 'Learn EQ') }} />
      <Tabs.Screen
        name="companion"
        options={{
          tabBarButton: tabButton('chatbubble-ellipses-outline', 'Companion'),
          tabBarStyle: isDesktop ? tabBarStyleHidden : tabBarStyleHidden,
        }}
      />
      <Tabs.Screen name="profile" options={{ tabBarButton: tabButton('person-outline', 'Profile') }} />
      <Tabs.Screen name="eq" options={{ href: null, tabBarStyle: tabBarStyleHidden }} />
      <Tabs.Screen name="recover" options={{ href: null, tabBarStyle: tabBarStyleHidden }} />
      <Tabs.Screen name="progress" options={{ href: null, tabBarStyle: tabBarStyleHidden }} />
    </Tabs>
  );

  if (isDesktop) {
    return (
      <View style={[styles.desktopShell, { backgroundColor: colors.background }]}>
        <DesktopSidebar />
        <View style={styles.desktopContent}>{tabsContent}</View>
      </View>
    );
  }

  return tabsContent;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  desktopShell: {
    flex: 1,
    flexDirection: 'row',
  },
  desktopContent: {
    flex: 1,
    minWidth: 0,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    ...(Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null),
  },
  iconPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
  },
  tabLabel: {
    fontSize: 11,
  },
});
