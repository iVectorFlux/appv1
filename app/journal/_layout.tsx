/**
 * Journal Standalone Product Layout
 * 
 * This is a standalone journaling product that can work independently
 * from the main EQ app. It has its own navigation structure and can be
 * accessed as a separate product.
 */

import { Stack } from 'expo-router';
import { useColors } from '@/constants/design-tokens';

export default function JournalLayout() {
  const colors = useColors();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="index" 
        options={{ 
          presentation: 'card',
        }} 
      />
      <Stack.Screen 
        name="new-entry" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
      <Stack.Screen 
        name="entry/[id]" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
      <Stack.Screen 
        name="history" 
        options={{ 
          presentation: 'card',
          animation: 'slide_from_right',
        }} 
      />
    </Stack>
  );
}
