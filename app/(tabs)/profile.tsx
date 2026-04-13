/**
 * Profile Screen — Glassmorphism v5
 *
 * User profile, dark mode toggle, EQ test, settings.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';
import { Button } from '@/components/ui/button';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '@/lib/supabase';
import { GlassBackground } from '@/components/ui/glass-background';
import { GlassCard } from '@/components/ui/glass-card';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { colorMode, toggleColorMode } = useThemeStore();
  const colors = useColors();
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.from('profiles').select('display_name').eq('id', user.id).maybeSingle();
        if (!cancelled && data?.display_name) setDisplayName(data.display_name);
      } catch {
        if (!cancelled) setDisplayName(null);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/sign-in');
  };

  const nameToShow = (displayName?.trim() || user?.username || 'User').replace(/^\w/, (c) => c.toUpperCase());
  const st = createStyles(colors);

  return (
    <GlassBackground>
      <ScrollView style={st.container} contentContainerStyle={st.content}>
        {/* Profile header */}
        <View style={st.header}>
          <View style={[st.avatar, { borderColor: colors.primary }]}>
            <Ionicons name="person" size={40} color={colors.primary} />
          </View>
          <Text style={st.username}>{nameToShow}</Text>
          {user?.email ? <Text style={st.email}>{user.email}</Text> : null}
        </View>

        {/* Appearance */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Appearance</Text>
          <GlassCard>
            <View style={st.settingRow}>
              <Ionicons name={colorMode === 'dark' ? 'moon' : 'sunny-outline'} size={22} color={colors.textPrimary} />
              <View style={{ flex: 1 }}>
                <Text style={st.settingText}>Dark Mode</Text>
                <Text style={st.settingDesc}>{colorMode === 'dark' ? 'Enabled' : 'Disabled'}</Text>
              </View>
              <Switch
                value={colorMode === 'dark'}
                onValueChange={toggleColorMode}
                trackColor={{ false: colors.surface, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>
          </GlassCard>
        </View>

        {/* EQ Assessment */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>EQ Assessment</Text>
          <GlassCard onPress={() => router.push('/full-eq-test')}>
            <View style={st.settingRow}>
              <View style={[st.eqIcon, { backgroundColor: colors.primary + '18' }]}>
                <Ionicons name="analytics-outline" size={24} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={st.settingText}>Take Full EQ Test</Text>
                <Text style={st.settingDesc}>60+ questions across 7 dimensions · ~25 min</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </GlassCard>
        </View>

        {/* Settings */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Settings</Text>
          <View style={st.settingsList}>
            {[
              { icon: 'notifications-outline' as const, label: 'Notifications' },
              { icon: 'lock-closed-outline' as const, label: 'Privacy & Security' },
              { icon: 'help-circle-outline' as const, label: 'Help & Support' },
              { icon: 'information-circle-outline' as const, label: 'About' },
            ].map((item) => (
              <GlassCard key={item.label}>
                <View style={st.settingRow}>
                  <Ionicons name={item.icon} size={22} color={colors.textPrimary} />
                  <Text style={[st.settingText, { flex: 1 }]}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                </View>
              </GlassCard>
            ))}
          </View>
        </View>

        {/* Privacy */}
        <GlassCard>
          <View style={st.privacyContent}>
            <Ionicons name="shield-checkmark-outline" size={28} color={colors.primary} />
            <Text style={st.privacyTitle}>Your Privacy is Protected</Text>
            <Text style={st.privacyText}>Your data is encrypted and private. We never analyze or share your personal information.</Text>
          </View>
        </GlassCard>

        {/* Logout */}
        <View style={st.logoutSection}>
          <Button title="Sign Out" onPress={handleLogout} variant="ghost" fullWidth size="lg" />
        </View>
      </ScrollView>
    </GlassBackground>
  );
}

const createStyles = (colors: ReturnType<typeof useColors>) => StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: Spacing.md, paddingTop: Platform.OS === 'ios' ? 52 : Spacing.xl, paddingBottom: 120 },
  header: { alignItems: 'center', marginBottom: Spacing['3xl'] },
  avatar: { width: 80, height: 80, borderRadius: Radius.full, backgroundColor: colors.glass, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.md, borderWidth: 2 },
  username: { fontSize: Typography.fontSize.xl, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, marginBottom: Spacing.xs, textTransform: 'capitalize' },
  email: { fontSize: Typography.fontSize.sm, color: colors.textSecondary },
  section: { marginBottom: Spacing.xl },
  sectionTitle: { fontSize: Typography.fontSize.xs, color: colors.textMuted, fontWeight: Typography.fontWeight.semibold, marginBottom: Spacing.sm, textTransform: 'uppercase', letterSpacing: 0.8 },
  settingsList: { gap: Spacing.sm },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  settingText: { fontSize: Typography.fontSize.base, color: colors.textPrimary, fontWeight: Typography.fontWeight.medium },
  settingDesc: { fontSize: Typography.fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  eqIcon: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  privacyContent: { alignItems: 'center', gap: Spacing.sm },
  privacyTitle: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: colors.textPrimary, textAlign: 'center' },
  privacyText: { fontSize: Typography.fontSize.sm, color: colors.textSecondary, textAlign: 'center', lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.sm },
  logoutSection: { marginTop: Spacing.xl },
});
