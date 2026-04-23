/**
 * Web-only “Add to Home Screen” nudge.
 * - Standalone / installed: never show
 * - Android Chrome: `beforeinstallprompt`, prompt on button tap; `a2hs_done` on accept
 * - iOS Safari (and other iOS browsers): one-time Share → Add to Home Screen hint
 * - Persistence: `a2hs_seen` (shown once), `a2hs_done` (installed via native prompt)
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useColors, Spacing, Typography, Radius } from '@/constants/design-tokens';

const LS_SEEN = 'a2hs_seen';
const LS_DONE = 'a2hs_done';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function readLs(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function writeLs(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* quota / private mode */
  }
}

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (window.matchMedia('(display-mode: standalone)').matches) return true;
  } catch {
    /* matchMedia unavailable */
  }
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return nav.standalone === true;
}

function isIosDevice(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return false;
  if (/iPad|iPhone|iPod/i.test(ua)) return true;
  const maxTouch = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints;
  return navigator.platform === 'MacIntel' && typeof maxTouch === 'number' && maxTouch > 1;
}

export function AddToHomeScreenBanner() {
  const colors = useColors();
  const [visible, setVisible] = useState(false);
  const [variant, setVariant] = useState<'android' | 'ios' | null>(null);
  const deferredRef = useRef<BeforeInstallPromptEvent | null>(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setVariant(null);
  }, []);

  const markSeenIfNeeded = useCallback(() => {
    if (readLs(LS_SEEN) !== '1') writeLs(LS_SEEN, '1');
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (isStandaloneDisplay()) return;
    if (readLs(LS_DONE) === '1') return;
    if (readLs(LS_SEEN) === '1') return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredRef.current = e as BeforeInstallPromptEvent;
      markSeenIfNeeded();
      setVariant('android');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);

    if (isIosDevice()) {
      markSeenIfNeeded();
      setVariant('ios');
      setVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  }, [markSeenIfNeeded]);

  const onInstallPress = useCallback(async () => {
    const ev = deferredRef.current;
    if (!ev) return;
    try {
      await ev.prompt();
      const { outcome } = await ev.userChoice;
      deferredRef.current = null;
      if (outcome === 'accepted') writeLs(LS_DONE, '1');
    } catch {
      deferredRef.current = null;
    } finally {
      dismiss();
    }
  }, [dismiss]);

  if (Platform.OS !== 'web' || !visible || !variant) return null;

  const st = createStyles();

  return (
    <View
      style={[
        st.wrap,
        {
          backgroundColor: colors.primary + '18',
          borderColor: colors.primary + '40',
        },
      ]}
    >
      <View style={st.row}>
        <Ionicons name="phone-portrait-outline" size={22} color={colors.primary} style={st.icon} />
        <View style={st.textCol}>
          <Text style={[st.title, { color: colors.textPrimary }]}>Add to Home Screen</Text>
          {variant === 'ios' ? (
            <Text style={[st.body, { color: colors.textSecondary }]}>
              Tap Share → Add to Home Screen to open this app like a native shortcut.
            </Text>
          ) : (
            <Text style={[st.body, { color: colors.textSecondary }]}>
              Install for quick access from your home screen.
            </Text>
          )}
        </View>
      </View>
      <View style={st.actions}>
        {variant === 'android' && deferredRef.current ? (
          <TouchableOpacity
            onPress={onInstallPress}
            style={[st.primaryBtn, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={[st.primaryBtnText, { color: colors.primaryForeground }]}>Install</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity onPress={dismiss} style={st.secondaryBtn} hitSlop={8} accessibilityRole="button">
          <Text style={[st.secondaryBtnText, { color: colors.textSecondary }]}>Not now</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const createStyles = () =>
  StyleSheet.create({
    wrap: {
      borderRadius: Radius.lg,
      borderWidth: 1,
      padding: Spacing.md,
      marginBottom: Spacing.lg,
    },
    row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.sm },
    icon: { marginTop: 2 },
    textCol: { flex: 1, minWidth: 0 },
    title: {
      fontSize: Typography.fontSize.base,
      fontWeight: Typography.fontWeight.semibold,
      fontFamily: Typography.fontFamily.heading,
      marginBottom: 4,
    },
    body: {
      fontSize: Typography.fontSize.sm,
      lineHeight: Typography.fontSize.sm * 1.45,
      fontFamily: Typography.fontFamily.primary,
    },
    actions: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      flexWrap: 'wrap',
      gap: Spacing.md,
      marginTop: Spacing.md,
    },
    primaryBtn: {
      paddingVertical: 10,
      paddingHorizontal: Spacing.lg,
      borderRadius: Radius.md,
    },
    primaryBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.semibold },
    secondaryBtn: { paddingVertical: 8, paddingHorizontal: Spacing.sm },
    secondaryBtnText: { fontSize: Typography.fontSize.sm, fontWeight: Typography.fontWeight.medium },
  });
