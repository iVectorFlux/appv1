/**
 * Root Layout — Glassmorphism v5
 * 
 * Expo Router root layout with navigation setup.
 * On web desktop: mobile frame wrapper. On web mobile: full viewport.
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { AppState, Platform, View, StyleSheet, useWindowDimensions, type ViewStyle } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { initializeDatabase } from '@/services/database';
import { useColors } from '@/constants/design-tokens';

const MOBILE_WEB_BREAKPOINT = 500;

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const { initialize: initializeTheme } = useThemeStore();
  const colors = useColors();
  const { width: windowWidth } = useWindowDimensions();
  const isMobileWeb = Platform.OS === 'web' && windowWidth <= MOBILE_WEB_BREAKPOINT;

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

  const stackScreens = (
    <>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="full-eq-test" 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="learning-detail" 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="grounding" 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="chat" 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen 
        name="skill-lab" 
        options={{ presentation: 'card', animation: 'slide_from_right' }} 
      />
      <Stack.Screen
        name="future-skills"
        options={{ presentation: 'card', animation: 'slide_from_right' }}
      />
    </>
  );

  const stackContent = (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background, flex: 1 },
      }}
    >
      {stackScreens}
    </Stack>
  );

  if (Platform.OS === 'web') {
    const wrapped = isMobileWeb ? (
      <View style={[styles.webFullScreen, { backgroundColor: colors.background }]}>
        {stackContent}
      </View>
    ) : (
      <View style={styles.webContainer}>
        <View style={[styles.mobileFrame, { backgroundColor: colors.background }]}>
          {stackContent}
        </View>
      </View>
    );
    return <SafeAreaProvider>{wrapped}</SafeAreaProvider>;
  }

  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        {stackScreens}
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    minHeight: '100vh' as any,
  },
  webFullScreen: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mobileFrame: {
    width: 393,
    height: 852,
    maxWidth: 'calc(100vw - 40px)' as any,
    maxHeight: 'calc(100vh - 40px)' as any,
    aspectRatio: 393 / 852,
    borderRadius: 40,
    overflow: 'hidden',
    ...(Platform.OS === 'web'
      ? ({ boxShadow: '0 20px 40px rgba(0,0,0,0.3)' } as ViewStyle)
      : {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 20 },
          shadowOpacity: 0.3,
          shadowRadius: 40,
          elevation: 20,
        }),
    borderWidth: 8,
    borderColor: '#1C1C1E',
    position: 'relative' as any,
  },
});
