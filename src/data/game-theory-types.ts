import type { Ionicons } from '@expo/vector-icons';

export type GameTheoryCategoryId =
  | 'foundations'
  | 'trust'
  | 'sequential'
  | 'information'
  | 'repeated'
  | 'markets'
  | 'negotiation';

export interface GameTheoryCategory {
  id: GameTheoryCategoryId;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}

export type PayoffCell = [number, number];

export interface PayoffMatrixSpec {
  rowPlayer: string;
  colPlayer: string;
  rowLabel: string;
  colLabel: string;
  rows: [string, string];
  cols: [string, string];
  /** 2×2 — [row][col] → [rowPlayerPayoff, colPlayerPayoff] */
  payoffs: [PayoffCell, PayoffCell][];
  equilibriumNote: string;
}

export interface GamePlayChoice {
  id: string;
  label: string;
  outcome: string;
  lesson: string;
}

/** How the Play tab renders — each mode has its own interactive experience. */
export type GamePlayMode =
  | 'matrix_duel'
  | 'coin_flip'
  | 'monty_hall'
  | 'split_offer'
  | 'take_or_pass'
  | 'brinkmanship'
  | 'trust_invest'
  | 'bid'
  | 'scenario';

export interface GameTheoryGame {
  id: string;
  order: number;
  category: GameTheoryCategoryId;
  title: string;
  tagline: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  storyHook: string;
  description: string;
  players: string;
  keyConcept: string;
  whatYouLearn: string[];
  workplaceExample: string;
  reflectionPrompt: string;
  /** Preferred play UI; inferred from matrix / choices / id if omitted */
  playMode?: GamePlayMode;
  matrix?: PayoffMatrixSpec;
  choices?: GamePlayChoice[];
}
