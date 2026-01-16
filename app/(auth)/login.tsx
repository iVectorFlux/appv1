/**
 * Login Screen
 * 
 * Authentication screen with dummy credentials.
 * Username: demo
 * Password: demo123
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuthStore();
  const colors = useColors();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const success = await login(username.trim(), password);
      
      if (success) {
        router.replace('/(tabs)/home');
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
      console.error('Login error:', err);
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
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Sign in to continue your emotional intelligence journey
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              label="Username"
              value={username}
              onChangeText={setUsername}
              placeholder="Enter your username"
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

            {error && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Button
              title="Sign In"
              onPress={handleLogin}
              loading={loading}
              fullWidth
              size="lg"
            />

            {/* Demo Credentials Hint */}
            <View style={styles.demoHint}>
              <Text style={styles.demoHintText}>
                Demo: username: demo, password: demo123
              </Text>
            </View>
          </View>

          {/* Privacy Note */}
          <View style={styles.privacyNote}>
            <Text style={styles.privacyText}>
              Your privacy is protected. Journal entries are encrypted and stored locally only.
            </Text>
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
  demoHint: {
    marginTop: Spacing.lg,
    padding: Spacing.md,
    backgroundColor: colors.surface,
    borderRadius: Radius.md,
  },
  demoHintText: {
    fontSize: Typography.fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
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
});
