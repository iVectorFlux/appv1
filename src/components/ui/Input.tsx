/**
 * Input Component
 * 
 * Reusable text input following design system tokens.
 */

import React from 'react';
import { TextInput, StyleSheet, View, Text, ViewStyle, TextStyle } from 'react-native';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  label?: string;
  secureTextEntry?: boolean;
  error?: string;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
}

export function Input({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry = false,
  error,
  autoCapitalize = 'none',
  autoCorrect = false,
  keyboardType = 'default',
}: InputProps) {
  const colors = useColors();
  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  label: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
  input: {
    backgroundColor: colors.inputBackground,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    fontSize: Typography.fontSize.base,
    color: colors.textPrimary,
    fontFamily: Typography.fontFamily.primary,
    minHeight: 44,
  },
  inputError: {
    borderColor: colors.destructive,
  },
  errorText: {
    fontSize: Typography.fontSize.sm,
    color: colors.destructive,
    marginTop: Spacing.xs,
    fontFamily: Typography.fontFamily.primary,
  },
});
