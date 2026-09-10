import React from 'react';
import type { ThinkingNode } from '@/data/thinking-mode-types';
import { ThinkingNodeJourney } from './thinking-node-journey';

interface ThinkingNodeViewProps {
  node: ThinkingNode;
  loading?: boolean;
  challengeFeedback?: string | null;
  onExploreConcept: (term: string) => void;
  onSubmitChallenge: (answer: string) => void;
}

/** Step-by-step lesson for the root topic — branches live below in ThinkingBranchHub. */
export function ThinkingNodeView(props: ThinkingNodeViewProps) {
  return <ThinkingNodeJourney {...props} />;
}
