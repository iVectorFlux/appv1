/**
 * Auth Layout
 * 
 * Layout for authentication screens.
 */

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F7F9F8' },
      }}
    >
      <Stack.Screen name="login" />
    </Stack>
  );
}
