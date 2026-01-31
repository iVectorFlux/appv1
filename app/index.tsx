/**
 * Index Route
 *
 * Redirects by state: auth → confirm email (if required) → onboarding → home.
 */

import { Redirect } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';

export default function Index() {
  const { isAuthenticated, isLoading, needsEmailConfirmation, hasCompletedOnboarding } = useAuthStore();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  if (needsEmailConfirmation) {
    return <Redirect href="/(auth)/confirm-email" />;
  }

  if (hasCompletedOnboarding === false) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)/home" />;
}
