import React from 'react';
import type { ThinkingBranch, ThinkingNode } from '@/data/thinking-mode-types';
import { ThinkingNodeJourney } from './thinking-node-journey';

interface ThinkingNodeViewProps {
  node: ThinkingNode;
  loading?: boolean;
  challengeFeedback?: string | null;
  onExpandBranch: (branch: ThinkingBranch) => void;
  onExploreConcept: (term: string) => void;
  onSubmitChallenge: (answer: string) => void;
}

/** Step-by-step, visual thinking node — one card at a time. */
export function ThinkingNodeView(props: ThinkingNodeViewProps) {
  return <ThinkingNodeJourney {...props} />;
}
