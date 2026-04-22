/**
 * Confirm Email Screen
 *
 * Shown after signup when Supabase sends a verification email.
 * User stays on this page until they click the link in the email.
 * Once verified, they sign in and are taken to onboarding.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { useColors, Spacing, Typography } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';

export default function ConfirmEmailScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const colors = useColors();

  const handleSignOut = async () => {
    try {
      await logout();
    } catch {
      /* ignore */
    } finally {
      router.replace('/(auth)/sign-in');
    }
  };

  const styles = createStyles(colors);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="mail-unread-outline" size={48} color={colors.primary} />
        </View>
        <Text style={styles.title}>Check your email</Text>
        <Text style={styles.body}>
          We've sent a verification link to {user?.email ?? 'your email'}.
        </Text>
        <Text style={styles.body}>
          Open your inbox and click the link to verify. Once you've verified, you'll be able to sign in and we'll take you through a quick setup.
        </Text>
        <Text style={styles.hint}>
          Can't find the email? Check your spam or junk folder—sometimes it ends up there.
        </Text>
        <Text style={styles.hint}>
          After you click the link, come back here and sign in. You'll then complete a short onboarding and see your profile.
        </Text>
        <Button
          title="I've verified — Sign in"
          onPress={() => router.replace('/(auth)/sign-in')}
          fullWidth
          size="lg"
        />
        <Button
          title="Sign out"
          onPress={handleSignOut}
          variant="ghost"
          fullWidth
          size="lg"
        />
      </View>
    </ScrollView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: Spacing.xl,
      paddingBottom: Spacing['4xl'],
    },
    content: {
      maxWidth: 400,
      alignSelf: 'center',
      width: '100%',
    },
    iconWrap: {
      alignItems: 'center',
      marginBottom: Spacing.xl,
    },
    title: {
      fontSize: Typography.fontSize['2xl'],
      fontWeight: Typography.fontWeight.bold,
      color: colors.textPrimary,
      marginBottom: Spacing.md,
      fontFamily: Typography.fontFamily.heading,
      textAlign: 'center',
    },
    body: {
      fontSize: Typography.fontSize.base,
      color: colors.textSecondary,
      lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
      marginBottom: Spacing.lg,
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
    },
    hint: {
      fontSize: Typography.fontSize.sm,
      color: colors.textSecondary,
      marginBottom: Spacing['2xl'],
      fontFamily: Typography.fontFamily.primary,
      textAlign: 'center',
    },
  });
