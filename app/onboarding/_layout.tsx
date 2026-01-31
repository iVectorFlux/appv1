/**
 * Onboarding Layout
 *
 * Shown after auth until the user completes onboarding.
 * Direct /onboarding requires sign-in; if already onboarded, redirect to home.
 */

import { Redirect } from 'expo-router';
import { Stack } from 'expo-router';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useColors } from '@/constants/design-tokens';

export default function OnboardingLayout() {
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
  if (hasCompletedOnboarding === true) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F7F9F8' },
      }}
    >
      <Stack.Screen name="index" />
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
