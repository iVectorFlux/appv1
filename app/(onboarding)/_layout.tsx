/**
 * Onboarding Layout
 *
 * Shown after auth until the user completes onboarding.
 */

import { Stack } from 'expo-router';

export default function OnboardingLayout() {
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
