/**
 * Index Route
 *
 * Redirects by state: auth → confirm email (if required) → onboarding → home.
 */

import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuthStore } from '@/stores/auth-store';
import { useColors } from '@/constants/design-tokens';

export default function Index() {
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();
  const colors = useColors();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator size="small" color={colors.primary} />
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

  return <Redirect href="/(tabs)/home" />;
}
