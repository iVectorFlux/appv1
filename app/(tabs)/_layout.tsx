/**
 * Tabs Layout
 *
 * Bottom tab navigation for main app screens.
 * Protects all tab routes: direct /home, /profile, etc. require sign-in.
 * Uses safe area insets so tab bar is not cut off on Android phone browser / notched devices.
 */

import { Redirect } from 'expo-router';
import { Tabs } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, Spacing } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '@/stores/auth-store';

export default function TabsLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();

  const tabBarPaddingBottom = Math.max(insets.bottom, 12);
  const tabBarContentHeight = 52;
  const tabBarHeight = tabBarContentHeight + tabBarPaddingBottom;

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/sign-in" />;
  }
  if (needsEmailConfirmation) {
    return <Redirect href="/(auth)/confirm-email" />;
  }
  if (hasCompletedOnboarding === false) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarShowLabel: true,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.floating,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: 10,
          paddingBottom: tabBarPaddingBottom,
          height: tabBarHeight,
          minHeight: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
        tabBarItemStyle: {
          paddingVertical: 4,
        },
        sceneStyle: { flex: 1 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => (
            <Ionicons name="compass-outline" size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reflect"
        options={{
          title: 'Reflect',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="heart-outline" size={22} color={focused ? '#C45C5C' : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="recover"
        options={{
          title: 'Recover',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="fitness-outline" size={22} color={focused ? colors.primary : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="insights"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name="bulb-outline" size={22} color={focused ? '#E8952F' : color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={22} color={color} />
          ),
        }}
      />
      {/* Hidden screens - accessible via navigation but not in tab bar */}
      <Tabs.Screen
        name="eq"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="assist"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
