/**
 * Journal Layout
 *
 * Protects journal routes: direct /journal, /journal/history, etc. require sign-in.
 */

import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function JournalLayout() {
  const colors = useColors();
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();

  if (isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/signin" />;
  }
  if (needsEmailConfirmation) {
    return <Redirect href="/(auth)/confirmemail" />;
  }
  if (hasCompletedOnboarding === false) {
    return <Redirect href="/onboarding" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="new-entry" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
      <Stack.Screen 
        name="entry/[id]" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
