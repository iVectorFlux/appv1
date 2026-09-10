/** Universal node contract — meaning comes from the model, not pre-filled domain metadata. */

export type ThinkingRepresentation =
  | 'text'
  | 'flow'
  | 'concept_tree'
  | 'timeline'
  | 'comparison'
  | 'cause_effect';

export type ThinkingBranchType =
  | 'why'
  | 'how'
  | 'what'
  | 'what_if'
  | 'example'
  | 'challenge'
  | 'connect'
  | 'simulate';

export interface ThinkingConceptLink {
  term: string;
  /** Why this concept may block understanding right now */
  reason: string;
}

export interface ThinkingBranch {
  type: ThinkingBranchType | string;
  label: string;
  emoji?: string;
}

export interface ThinkingProcessStep {
  emoji?: string;
  label: string;
}

export interface ThinkingNode {
  id: string;
  question: string;
  /** Topic emoji for the card hero (e.g. 🌤️). */
  emoji?: string;
  /** One-sentence hook — the gist before details. */
  tldr?: string;
  /** First-principles explanation in plain language (2–4 sentences). */
  firstPrinciples?: string;
  whyItMatters?: string;
  explanation: string;
  /** 2–3 short bullets; preferred over one long paragraph. */
  explanationBullets?: string[];
  socraticQuestion?: string;
  concepts: ThinkingConceptLink[];
  processSteps?: Array<string | ThinkingProcessStep>;
  evidence?: string;
  visualizationHint?: string;
  representation: ThinkingRepresentation;
  branches: ThinkingBranch[];
  challengePrompt?: string;
}

export interface ThinkingPathItem {
  nodeId: string;
  label: string;
}

export type ThinkingModeAction =
  | 'root'
  | 'expand_branch'
  | 'explore_concept'
  | 'evaluate_challenge';

export interface ThinkingModeRequest {
  action: ThinkingModeAction;
  rootQuestion: string;
  currentNodeId?: string;
  branchType?: string;
  branchLabel?: string;
  conceptTerm?: string;
  parentContext?: string;
  challengeAnswer?: string;
  sessionPath?: ThinkingPathItem[];
  depth?: number;
}

export interface ThinkingModeResponse {
  node: ThinkingNode;
  challengeFeedback?: string;
}

export const THINKING_STARTER_QUESTIONS = [
  { emoji: '🌈', text: 'How does a rainbow appear during rain?' },
  { emoji: '🌤️', text: 'Why is the sky blue?' },
  { emoji: '🌱', text: 'How do plants make food from sunlight?' },
  { emoji: '💤', text: 'Why do we dream?' },
  { emoji: '🌐', text: 'How does the internet send a message across the world?' },
] as const;

export const BRANCH_LABELS: Record<string, { icon: string; color: string }> = {
  why: { icon: 'help-circle-outline', color: '#6366F1' },
  how: { icon: 'git-branch-outline', color: '#0EA5E9' },
  what: { icon: 'cube-outline', color: '#14B8A6' },
  what_if: { icon: 'flash-outline', color: '#F59E0B' },
  example: { icon: 'bulb-outline', color: '#EC4899' },
  challenge: { icon: 'fitness-outline', color: '#C45C5C' },
  connect: { icon: 'link-outline', color: '#8B5CF6' },
  simulate: { icon: 'play-circle-outline', color: '#10B981' },
};
