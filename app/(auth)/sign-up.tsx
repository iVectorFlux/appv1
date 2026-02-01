/**
 * Sign Up Screen
 *
 * Supabase Auth sign-up (email + password).
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useColors, Spacing, Typography } from '@/constants/design-tokens';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuthStore();
  const colors = useColors();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signUp(email.trim(), password);

      if (result.success) {
        router.replace('/(auth)/confirm-email');
      } else {
        setError(result.error ?? 'Sign up failed');
      }
    } catch (err) {
      setError('Sign up failed. Please try again.');
      console.error('Sign up error:', err);
    } finally {
      setLoading(false);
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
          <View style={styles.header}>
            <Image
              source={{ uri: 'https://ungxepwjsmhckjgxphpa.supabase.co/storage/v1/object/public/Images/icon.png' }}
              style={styles.logo}
              resizeMode="contain"
              accessibilityLabel="App logo"
            />
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>
              Sign up to start your emotional intelligence journey
            </Text>
          </View>

          <View style={styles.form}>
            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="At least 6 characters"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              error={error}
            />

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Sign Up"
              onPress={handleSignUp}
              loading={loading}
              fullWidth
              size="lg"
            />

            <TouchableOpacity
              style={styles.signInLink}
              onPress={() => router.replace('/(auth)/sign-in')}
              activeOpacity={0.7}
            >
              <Text style={styles.signInLinkText}>Already have an account? Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    errorContainer: {
      marginTop: -Spacing.sm,
      marginBottom: Spacing.md,
    },
    errorText: {
      fontSize: Typography.fontSize.sm,
      color: colors.destructive,
      fontFamily: Typography.fontFamily.primary,
    },
    signInLink: {
      marginTop: Spacing.lg,
      alignItems: 'center',
    },
    signInLinkText: {
      fontSize: Typography.fontSize.sm,
      color: colors.primary,
      fontWeight: Typography.fontWeight.medium,
      fontFamily: Typography.fontFamily.primary,
    },
  });
