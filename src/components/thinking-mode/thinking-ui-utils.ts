import type { ThinkingBranch, ThinkingNode, ThinkingProcessStep } from '@/data/thinking-mode-types';

const TOPIC_EMOJI: [RegExp, string][] = [
  [/sky|blue|light|sun|rainbow|cloud|weather|rain/i, '🌤️'],
  [/water|ocean|river|rain|liquid/i, '💧'],
  [/plant|tree|leaf|photosynth|grow|flower/i, '🌱'],
  [/animal|bird|fish|dog|cat|life/i, '🐾'],
  [/space|star|planet|moon|galaxy|universe/i, '🪐'],
  [/brain|think|mind|dream|memory|feel/i, '🧠'],
  [/computer|internet|code|data|ai|robot/i, '💻'],
  [/math|number|equation|calculate|percent/i, '🔢'],
  [/history|time|year|ancient|past|war/i, '📜'],
  [/body|health|heart|blood|muscle|cell/i, '❤️'],
  [/food|cook|eat|nutrition|energy/i, '🍎'],
  [/music|sound|hear|wave|frequency/i, '🎵'],
  [/money|econom|trade|market|price/i, '💰'],
  [/game|play|strategy|choice/i, '🎮'],
];

export const BRANCH_EMOJI: Record<string, string> = {
  why: '🤔',
  how: '⚙️',
  what: '📦',
  what_if: '✨',
  example: '💡',
  challenge: '🎯',
  connect: '🔗',
  simulate: '▶️',
};

export function pickNodeEmoji(node: Pick<ThinkingNode, 'emoji' | 'question' | 'tldr'>): string {
  if (node.emoji?.trim()) return node.emoji.trim();
  const hay = `${node.question} ${node.tldr ?? ''}`;
  for (const [re, em] of TOPIC_EMOJI) {
    if (re.test(hay)) return em;
  }
  return '💭';
}

export function branchEmoji(branch: ThinkingBranch): string {
  if (branch.emoji?.trim()) return branch.emoji.trim();
  return BRANCH_EMOJI[branch.type] ?? '➡️';
}

export function normalizeProcessSteps(raw: ThinkingNode['processSteps']): ThinkingProcessStep[] {
  if (!raw?.length) return [];
  return raw.map((s, i) => {
    if (typeof s === 'string') {
      return { emoji: STEP_EMOJI[i % STEP_EMOJI.length], label: s };
    }
    return {
      emoji: s.emoji?.trim() || STEP_EMOJI[i % STEP_EMOJI.length],
      label: s.label.trim(),
    };
  });
}

const STEP_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

/** Split long explanation into bite-sized bullets (max 3). */
export function explanationBullets(node: ThinkingNode): string[] {
  if (node.explanationBullets?.length) {
    return node.explanationBullets.slice(0, 3);
  }
  const text = node.explanation.trim();
  if (!text) return [];
  const byNewline = text.split(/\n+/).map((s) => s.trim()).filter(Boolean);
  if (byNewline.length >= 2) return byNewline.slice(0, 3);
  const sentences = text.match(/[^.!?]+[.!?]+/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  if (sentences.length <= 3) return sentences;
  return [sentences[0], sentences.slice(1, -1).join(' '), sentences[sentences.length - 1]].filter(Boolean);
}

export function nodeTldr(node: ThinkingNode): string {
  if (node.tldr?.trim()) return node.tldr.trim();
  const bullets = explanationBullets(node);
  return bullets[0] ?? node.explanation.slice(0, 140);
}

/** Sentence-case labels — no shouting uppercase. */
export function friendlyLabel(text: string): string {
  const t = text.trim();
  if (!t) return t;
  if (t === t.toUpperCase() && t.length > 3) {
    return t.charAt(0) + t.slice(1).toLowerCase();
  }
  return t;
}
