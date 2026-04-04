/**
 * Legacy route /future-skills → redirects to /skill-lab (same screens).
 * Keeps old links, bookmarks, and Metro cache from breaking after the rename.
 */

import { Stack } from 'expo-router';

export default function LegacyFutureSkillsLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[skillId]" />
    </Stack>
  );
}
