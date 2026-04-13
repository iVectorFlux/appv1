/**
 * AI Companion Tab
 *
 * Wraps ChatScreen in GlassBackground so the glassmorphic
 * design shows through the transparent chat UI.
 */

import React from 'react';
import { GlassBackground } from '@/components/ui/glass-background';
import ChatScreen from '../chat/index';

export default function CompanionTab() {
  return (
    <GlassBackground>
      <ChatScreen asTab hideBottomTabBar />
    </GlassBackground>
  );
}
