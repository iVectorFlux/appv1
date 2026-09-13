/**
 * Interactive Mode stack — auth + onboarding gate.
 */

import { Redirect, Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useColors } from '@/constants/design-tokens';
import { useAuthStore } from '@/stores/auth-store';

export default function InteractiveModeLayout() {
  const colors = useColors();
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } =
    useAuthStore();

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

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
    </Stack>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
