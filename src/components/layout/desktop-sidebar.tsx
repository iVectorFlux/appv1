/**
 * Enterprise Desktop Sidebar & Responsive Layout Shell
 *
 * On desktop web (>= 1024px): renders a persistent Shadcn-style 248px left sidebar
 * with brand header, clear workspace links, Admin Analytics (when role === 'admin'),
 * theme switcher, and user profile footer.
 * On mobile / narrow viewports: renders children directly without adding a sidebar.
 */

import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { usePathname, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Radius, Typography } from '@/constants/design-tokens';
import { useWebLaptopLayout } from '@/hooks/useWebLaptopLayout';
import { useEqTestAvailability } from '@/hooks/useEqTestAvailability';
import { useAuthStore } from '@/stores/auth-store';
import { useThemeStore } from '@/stores/theme-store';

interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
  href: Href;
  match: (pathname: string) => boolean;
}

function SidebarNavRow({
  item,
  active,
  onPress,
}: {
  item: NavItem;
  active: boolean;
  onPress: () => void;
}) {
  const colors = useColors();
  const [hovered, setHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={Platform.OS === 'web' ? () => setHovered(true) : undefined}
      onHoverOut={Platform.OS === 'web' ? () => setHovered(false) : undefined}
      style={[
        styles.navRow,
        {
          backgroundColor: active
            ? colors.primary + '14'
            : hovered
              ? colors.surface
              : 'transparent',
          borderColor: active ? colors.primary + '30' : 'transparent',
        },
        Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
      ]}
    >
      <Ionicons
        name={active ? item.activeIcon : item.icon}
        size={18}
        color={active ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.navText,
          {
            color: active ? colors.primary : colors.textPrimary,
            fontWeight: active ? '600' : '500',
          },
        ]}
        numberOfLines={1}
      >
        {item.label}
      </Text>
    </Pressable>
  );
}

export function DesktopSidebar() {
  const colors = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuthStore();
  const { colorMode, toggleColorMode } = useThemeStore();
  const { availability } = useEqTestAvailability();

  const isAdmin = user?.role === 'admin';
  const displayName = user?.displayName?.trim() || user?.username || 'Member';
  const initials = displayName.slice(0, 2).toUpperCase();

  const coreNav: NavItem[] = [
    {
      key: 'home',
      label: 'Dashboard',
      icon: 'grid-outline',
      activeIcon: 'grid',
      href: '/(tabs)/home',
      match: (p) => p === '/' || p === '/home' || p.startsWith('/(tabs)/home'),
    },
    {
      key: 'learn',
      label: 'Learn EQ',
      icon: 'book-outline',
      activeIcon: 'book',
      href: '/(tabs)/learn',
      match: (p) => p.includes('/learn') || p.includes('/learning-detail'),
    },
    {
      key: 'progress',
      label: 'My Progress',
      icon: 'stats-chart-outline',
      activeIcon: 'stats-chart',
      href: '/(tabs)/progress',
      match: (p) => p.includes('/progress'),
    },
    {
      key: 'companion',
      label: 'AI Companion',
      icon: 'chatbubble-ellipses-outline',
      activeIcon: 'chatbubble-ellipses',
      href: '/(tabs)/companion',
      match: (p) => p.includes('/companion') || p.includes('/chat'),
    },
    {
      key: 'recover',
      label: 'Recover & Reset',
      icon: 'pulse-outline',
      activeIcon: 'pulse',
      href: '/grounding',
      match: (p) => p.includes('/grounding') || p.includes('/recover'),
    },
  ];

  const assessmentNav: NavItem[] = [
    ...(availability.isAvailable
      ? [
          {
            key: 'eq-test',
            label:
              availability.kind === 'resume'
                ? 'Complete EQ Test'
                : availability.kind === 'mid_learning'
                  ? 'Mid-Learning Test'
                  : 'EQ Test',
            icon: 'analytics-outline' as const,
            activeIcon: 'analytics' as const,
            href: availability.route as Href,
            match: (p: string) => p.includes('/full-eq-test'),
          },
        ]
      : []),
    {
      key: 'big5',
      label: 'Big Five Test',
      icon: 'color-wand-outline',
      activeIcon: 'color-wand',
      href: '/big5-test',
      match: (p) => p.includes('/big5-test'),
    },
  ];

  const adminNav: NavItem = {
    key: 'admin',
    label: 'Admin Analytics',
    icon: 'shield-checkmark-outline',
    activeIcon: 'shield-checkmark',
    href: '/admin',
    match: (p) => p.includes('/admin'),
  };

  return (
    <View
      style={[
        styles.sidebar,
        {
          backgroundColor: colors.floating,
          borderRightColor: colors.border,
        },
      ]}
    >
      {/* Brand Header */}
      <View style={styles.brandBlock}>
        <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={16} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.brandName, { color: colors.textPrimary }]}>Lumi6</Text>
          <Text style={[styles.brandSub, { color: colors.textMuted }]} numberOfLines={1}>
            {user?.companyName || 'Emotional Intelligence'}
          </Text>
        </View>
      </View>

      {/* Main Nav */}
      <View style={styles.navSection}>
        <Text style={[styles.navGroupLabel, { color: colors.textMuted }]}>Explore</Text>
        {coreNav.map((item) => (
          <SidebarNavRow
            key={item.key}
            item={item}
            active={item.match(pathname)}
            onPress={() => router.replace(item.href)}
          />
        ))}
      </View>

      <View style={styles.navSection}>
        <Text style={[styles.navGroupLabel, { color: colors.textMuted }]}>Assessments</Text>
        {assessmentNav.map((item) => (
          <SidebarNavRow
            key={item.key}
            item={item}
            active={item.match(pathname)}
            onPress={() => router.push(item.href)}
          />
        ))}
      </View>

      {isAdmin ? (
        <View style={styles.navSection}>
          <Text style={[styles.navGroupLabel, { color: colors.textMuted }]}>Admin</Text>
          <SidebarNavRow
            item={adminNav}
            active={adminNav.match(pathname)}
            onPress={() => router.push(adminNav.href)}
          />
        </View>
      ) : null}

      <View style={{ flex: 1 }} />

      {/* Footer: Theme toggle & Profile */}
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={toggleColorMode}
          style={[
            styles.themeBtn,
            { backgroundColor: colors.surface, borderColor: colors.border },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <Ionicons
            name={colorMode === 'dark' ? 'sunny-outline' : 'moon-outline'}
            size={16}
            color={colors.textSecondary}
          />
          <Text style={[styles.themeBtnText, { color: colors.textSecondary }]}>
            {colorMode === 'dark' ? 'Light theme' : 'Dark theme'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/profile')}
          style={[
            styles.profileRow,
            {
              backgroundColor: pathname.includes('/profile') ? colors.surface : 'transparent',
            },
            Platform.OS === 'web' ? ({ cursor: 'pointer' } as object) : null,
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary + '1A' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: colors.textPrimary }]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={[styles.userRole, { color: colors.textMuted }]} numberOfLines={1}>
              {isAdmin ? 'Company Admin' : 'Learner'} · Settings
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={14} color={colors.textLight} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Wraps stack/modal routes so desktop web preserves the persistent left sidebar.
 */
export function EnterpriseShell({ children }: { children: React.ReactNode }) {
  const isDesktop = useWebLaptopLayout();
  const colors = useColors();

  if (!isDesktop) {
    return <>{children}</>;
  }

  return (
    <View style={[styles.shellRow, { backgroundColor: colors.background }]}>
      <DesktopSidebar />
      <View style={styles.shellMain}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  shellRow: {
    flex: 1,
    flexDirection: 'row',
  },
  shellMain: {
    flex: 1,
    minWidth: 0,
  },
  sidebar: {
    width: 248,
    borderRightWidth: 1,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.lg,
  },
  brandBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 6,
    paddingBottom: 6,
  },
  brandMark: {
    width: 34,
    height: 34,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandName: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
    fontFamily: Typography.fontFamily.heading,
  },
  brandSub: {
    fontSize: 12,
    fontFamily: Typography.fontFamily.primary,
  },
  navSection: {
    gap: 4,
  },
  navGroupLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.9,
    paddingHorizontal: 10,
    marginBottom: 4,
    fontFamily: Typography.fontFamily.primary,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  navText: {
    fontSize: 14,
    fontFamily: Typography.fontFamily.primary,
    flex: 1,
  },
  footer: {
    borderTopWidth: 1,
    paddingTop: Spacing.md,
    gap: Spacing.sm,
  },
  themeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    fontFamily: Typography.fontFamily.primary,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 8,
    borderRadius: Radius.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Typography.fontFamily.primary,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: Typography.fontFamily.primary,
  },
  userRole: {
    fontSize: 11,
    fontFamily: Typography.fontFamily.primary,
  },
});

