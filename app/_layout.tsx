/**
 * Root Layout - Editorial wellness (2026)
 *
 * Stack must be the direct layout child (no arbitrary View wrappers) so Expo Router
 * does not warn "Layout children must be of type Screen".
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { initializeDatabase } from '@/services/database';
import { useColors } from '@/constants/design-tokens';

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const { initialize: initializeTheme } = useThemeStore();
  const colors = useColors();
  const { revalidateSession } = useAuthStore();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeTheme();
        if (Platform.OS !== 'web') {
          await initializeDatabase();
        }
        await initialize();
      } catch (error) {
        console.error('Initialization failed:', error);
      }
    };
    init();
  }, [initialize, initializeTheme]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        revalidateSession();
      }
    });
    return () => subscription.remove();
  }, [revalidateSession]);

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background, flex: 1 },
        }}
      >
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="full-eq-test" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="big5-test" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="trait-test" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="learning-detail" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="grounding" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="chat" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="skill-lab" options={{ presentation: 'card', animation: 'slide_from_right' }} />
        <Stack.Screen name="future-skills" options={{ presentation: 'card', animation: 'slide_from_right' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
