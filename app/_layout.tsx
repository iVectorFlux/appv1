/**
 * Root Layout
 * 
 * Expo Router root layout with navigation setup.
 * Includes mobile frame wrapper for web platform.
 */

import { Stack } from 'expo-router';
import { useEffect } from 'react';
import { Platform, View, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { initializeDatabase } from '@/services/database';
import { useColors } from '@/constants/design-tokens';

export default function RootLayout() {
  const { initialize } = useAuthStore();
  const { initialize: initializeTheme } = useThemeStore();
  const colors = useColors();

  useEffect(() => {
    // Initialize database, auth, and theme
    // Note: SQLite only works on native platforms, not web
    const init = async () => {
      try {
        // Initialize theme first
        await initializeTheme();
        // Only initialize database on native platforms
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

  // On web, wrap in mobile frame
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webContainer}>
        <View style={[styles.mobileFrame, { backgroundColor: colors.background }]}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background },
            }}
          >
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen 
              name="full-eq-test" 
              options={{ 
                // On web, use card presentation to stay within mobile frame
                presentation: 'card',
                animation: 'slide_from_right',
              }} 
            />
          </Stack>
        </View>
      </View>
    );
  }

  // On native platforms, use standard Stack
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen 
        name="full-eq-test" 
        options={{ 
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }} 
      />
    </Stack>
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
  mobileFrame: {
    width: 393,
    height: 852,
    maxWidth: 'calc(100vw - 40px)' as any,
    maxHeight: 'calc(100vh - 40px)' as any,
    aspectRatio: 393 / 852,
    borderRadius: 40,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 20,
    // iPhone 16 Pro frame styling
    borderWidth: 8,
    borderColor: '#1C1C1E',
    position: 'relative' as any,
  },
});
