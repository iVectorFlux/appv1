/**
 * Sign In Screen
 *
 * Supabase Auth sign-in. Real users only.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { getSupabaseConnectionInfo } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export default function SignInScreen() {
  const router = useRouter();
  const { login, resetPassword } = useAuthStore();
  const colors = useColors();
  const supabaseInfo = getSupabaseConnectionInfo();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }

    setLoading(true);
    setError('');
    setInfo('');

    try {
      const result = await login(email.trim(), password);

      if (result.success) {
        router.replace('/');
      } else {
        const base = result.error ?? 'Invalid email or password';
        const projectHint = supabaseInfo.projectRef
          ? ` (app connected to Supabase project: ${supabaseInfo.projectRef})`
          : ' (Supabase is not configured — check .env and restart Expo)';
        setError(`${base}${projectHint}`);
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
      console.error('Sign in error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Enter your email above, then tap Forgot password');
      return;
    }
    setResetLoading(true);
    setError('');
    setInfo('');
    try {
      const result = await resetPassword(email.trim());
      if (result.success) {
        setInfo('Password reset email sent — check your inbox.');
      } else {
        setError(result.error ?? 'Could not send reset email');
      }
    } finally {
      setResetLoading(false);
    }
  };

  const styles = createStyles(colors);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://ungxepwjsmhckjgxphpa.supabase.co/storage/v1/object/public/Images/icon.png' }}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="App logo"
            />
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your emotional intelligence journey
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={error ? '' : undefined}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />

            {info ? <Text style={styles.infoText}>{info}</Text> : null}

            <Button
              title="Sign In"
              onPress={handleSignIn}
              loading={loading}
              fullWidth
              size="lg"
            />

            <TouchableOpacity
              style={styles.forgotLink}
              onPress={handleForgotPassword}
              disabled={resetLoading}
            >
              <Text style={styles.forgotLinkText}>
                {resetLoading ? 'Sending reset email…' : 'Forgot password?'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signUpLink}
              onPress={() => router.push('/(auth)/sign-up')}
            >
              <Text style={styles.signUpLinkText}>Don't have an account? Sign up</Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              Your privacy is protected. Your data is encrypted and stays private.
            </Text>
            {supabaseInfo.isPlaceholder ? (
              <Text style={styles.debugTextWarn}>
                Wrong Supabase URL loaded (your-project). Stop Expo → npx expo start -c → hard refresh browser.
              </Text>
            ) : supabaseInfo.projectRef ? (
              <Text style={styles.debugText}>Auth server: {supabaseInfo.projectRef}</Text>
            ) : (
              <Text style={styles.debugTextWarn}>
                Supabase not loaded — run npx expo start -c after editing .env
              </Text>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  header: {
    marginBottom: Spacing['4xl'],
    alignItems: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: colors.textPrimary,
    marginBottom: Spacing.md,
    fontFamily: Typography.fontFamily.heading,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    textAlign: 'center',
  },
  form: {
    marginBottom: Spacing.xl,
  },
  infoText: {
    fontSize: Typography.fontSize.sm,
    color: colors.accentSage,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  forgotLink: {
    marginTop: Spacing.md,
    alignItems: 'center',
  },
  forgotLinkText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  signUpLink: {
    marginTop: Spacing.lg,
    alignItems: 'center',
  },
  signUpLinkText: {
    fontSize: Typography.fontSize.sm,
    color: colors.primary,
    fontWeight: Typography.fontWeight.medium,
    fontFamily: Typography.fontFamily.primary,
  },
  privacyNote: {
    marginTop: Spacing.xl,
    padding: Spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: Radius.lg,
  },
  privacyText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm,
    textAlign: 'center',
    fontFamily: Typography.fontFamily.primary,
  },
  debugText: {
    fontSize: Typography.fontSize.xs,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  debugTextWarn: {
    fontSize: Typography.fontSize.xs,
    color: colors.destructive,
    textAlign: 'center',
    marginTop: Spacing.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});
