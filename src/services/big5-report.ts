/**
 * Big Five reporting — rule-based narratives from OCEAN scores (1–5 means).
 * For self-insight only; not a clinical or hiring instrument.
 */

import { BIG5_TRAIT_LABELS, type Big5Trait } from '@/data/big5-questions';
import { formatScore1dp, type Big5Scores } from '@/services/big5-scoring';

export type TraitBand = 'very_low' | 'low' | 'moderate' | 'high' | 'very_high';

const ORDER: (keyof Big5Scores)[] = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];

const TRAIT_TO_BIG5: Record<keyof Big5Scores, Big5Trait> = {
  openness: 'O',
  conscientiousness: 'C',
  extraversion: 'E',
  agreeableness: 'A',
  neuroticism: 'N',
};

/** Finer bands than low/moderate/high — used for narrative selection. */
export function getTraitBand(score: number): TraitBand {
  if (score < 2.0) return 'very_low';
  if (score < 2.6) return 'low';
  if (score < 3.4) return 'moderate';
  if (score < 4.2) return 'high';
  return 'very_high';
}

function bandLabel(band: TraitBand): string {
  switch (band) {
    case 'very_low':
      return 'Very low';
    case 'low':
      return 'Low';
    case 'moderate':
      return 'Moderate';
    case 'high':
      return 'High';
    case 'very_high':
      return 'Very high';
    default:
      return 'Moderate';
  }
}

type Copy = { oneLine: string; detail: string };

/** Narrative templates per domain and band (plain language, inclusive). */
const NARRATIVE: Record<keyof Big5Scores, Record<TraitBand, Copy>> = {
  openness: {
    very_low: {
      oneLine: 'You tend to prefer the familiar, concrete, and practical over novelty and abstraction.',
      detail:
        'You likely gravitate toward what is tried-and-true, predictable, and hands-on. You may enjoy clear steps and real-world tasks more than open-ended theory. That steadiness can make you reliable where consistency matters. If you ever want more variety, small experiments—new topics, short creative side projects—can stretch comfort without changing who you are.',
    },
    low: {
      oneLine: 'You are fairly grounded in the practical and familiar, with some room for new ideas.',
      detail:
        'You probably balance routine with occasional curiosity. You may learn best when ideas connect to something you can use or see. Others may experience you as sensible and down-to-earth. Leaning into one new interest at a time can deepen openness without overwhelming your need for clarity.',
    },
    moderate: {
      oneLine: 'You show a balanced mix of curiosity and practicality.',
      detail:
        'You can enjoy both new ideas and stable habits. You might like learning when it has a point, and you can tolerate some ambiguity without needing everything novel. This middle ground often helps you adapt across work and relationships: neither chasing every new thing nor resisting all change.',
    },
    high: {
      oneLine: 'You are curious, imaginative, and open to new ideas and perspectives.',
      detail:
        'You likely enjoy learning, variety, and thinking beyond the obvious. You may get energized by “what if” questions, arts, ideas, or different worldviews. That openness can fuel creativity and growth. Pairing it with a few routines or priorities helps you turn ideas into something lasting.',
    },
    very_high: {
      oneLine: 'You are strongly drawn to novelty, ideas, and imaginative thinking.',
      detail:
        'You may crave intellectual or aesthetic variety and get restless when things feel too narrow or repetitive. You might connect ideas quickly and see many possibilities—which is a strength—and sometimes benefit from choosing what to finish or follow through. Channeling this energy into a few meaningful directions can make your openness even more rewarding.',
    },
  },
  conscientiousness: {
    very_low: {
      oneLine: 'Structure, deadlines, and tidy follow-through may not come naturally right now.',
      detail:
        'You might prefer flexibility, spontaneity, or responding in the moment over plans and lists. That can make you adaptable in fast-changing situations. When outcomes matter, tiny anchors—one calendar block, one checklist, or one “good enough” standard—can help without forcing a rigid style.',
    },
    low: {
      oneLine: 'You balance structure with flexibility; consistency may vary by area of life.',
      detail:
        'You may do well in some routines and slip in others. You might work in bursts or rely on memory more than systems. That flexibility helps in dynamic environments. Naming your top one or two priorities and protecting time for them often boosts follow-through without turning life into a spreadsheet.',
    },
    moderate: {
      oneLine: 'You are reasonably organized and dependable without being rigid.',
      detail:
        'You can plan when it matters and relax when it does not. Others may see you as responsible yet human—able to meet expectations without controlling every detail. This balance works well in many roles; when stress rises, a short reset (what matters this week?) usually helps more than overhauling your whole system.',
    },
    high: {
      oneLine: 'You are disciplined, goal-oriented, and attentive to responsibilities.',
      detail:
        'You likely value commitments, quality, and getting things done. People may rely on you to remember, prepare, and follow through. That reliability is a major strength. Watch for overwork or self-criticism when plans slip—perfectionism often rides along with high conscientiousness. Recovery and “done enough” are skills too.',
    },
    very_high: {
      oneLine: 'You hold very high standards for yourself and your work, with strong focus on duty and order.',
      detail:
        'You may excel at planning, persistence, and delivering what you promise. The trade-off can be stress when things are messy, late, or out of control—others may not match your bar. Deliberately scheduling rest, delegation, or “good enough” zones protects your energy while keeping your strengths.',
    },
  },
  extraversion: {
    very_low: {
      oneLine: 'You recharge in quiet settings and may prefer depth with a few people over large social scenes.',
      detail:
        'Long or noisy social time might drain you; solitude or small groups may feel restorative. You can still be warm and engaged—often in a selective, thoughtful way. Your reflection and listening can be strengths. Protecting downtime after social obligations helps you stay balanced.',
    },
    low: {
      oneLine: 'You lean toward introversion: social energy is limited and you value calm or one-to-one time.',
      detail:
        'You might enjoy people in smaller doses or familiar contexts. You may think before you speak and dislike being put on the spot. None of this means you lack social skill—many introverts lead and connect well with intention. Choosing when to engage, and recovering after, keeps you at your best.',
    },
    moderate: {
      oneLine: 'You are neither strongly outgoing nor strongly reserved—you adapt to the situation.',
      detail:
        'You might enjoy groups sometimes and need quiet other times. You can participate or step back depending on context. This flexibility helps in diverse settings; clarity about what restores you (people vs. alone time) makes planning your week easier.',
    },
    high: {
      oneLine: 'You gain energy from people, conversation, and activity around you.',
      detail:
        'You may speak up easily, enjoy teamwork or networking, and feel flat if isolated too long. Others often experience you as approachable and animated. The edge case is overstimulation or saying yes too often—blocking recovery time keeps your social battery sustainable.',
    },
    very_high: {
      oneLine: 'You are strongly outgoing, expressive, and stimulated by social contact and stimulation.',
      detail:
        'You may seek the spotlight, fast pace, or frequent interaction. That drive can motivate teams and break ice in new groups. When others need quiet or slow decisions, pausing to listen and dial down intensity builds trust. Your energy is an asset when paired with sensitivity to different comfort levels.',
    },
  },
  agreeableness: {
    very_low: {
      oneLine: 'You prioritize frankness and self-interest at times over softening or harmony.',
      detail:
        'You may challenge ideas directly, push back, or put your goals first when they clash with others. That can be decisive and honest; it can also feel sharp if warmth is scarce. Context matters—competitive or high-stakes environments may suit this style; close relationships often still benefit from occasional gentleness.',
    },
    low: {
      oneLine: 'You are direct and willing to disagree; cooperation is selective.',
      detail:
        'You might debate, critique, or protect boundaries rather than smoothing everything over. You are not required to please everyone; clarity has value. Where trust matters, small acts of warmth (acknowledgment, timing) can prevent unnecessary friction without changing your backbone.',
    },
    moderate: {
      oneLine: 'You balance honesty with cooperation—you can be firm and fair.',
      detail:
        'You can stand your ground without always yielding, and you can compromise without feeling like a pushover. Many roles benefit from this mix. Under pressure, you might tilt toward either bluntness or appeasement; noticing which helps you stay aligned with your values.',
    },
    high: {
      oneLine: 'You are cooperative, considerate, and attuned to others’ feelings and needs.',
      detail:
        'You may avoid conflict, offer help, or put harmony first. People often feel safe and heard around you. The common pitfall is overcommitting or absorbing others’ stress. Boundaries and “no” are not selfish—they keep your kindness sustainable.',
    },
    very_high: {
      oneLine: 'You strongly prioritize empathy, harmony, and others’ wellbeing—sometimes ahead of your own.',
      detail:
        'You may go far to keep peace, forgive quickly, or carry emotional load for others. That depth of care is rare and valuable. It can also lead to burnout or resentment if your needs stay last. Naming your limits early protects both you and the relationships you care about.',
    },
  },
  neuroticism: {
    very_low: {
      oneLine: 'You tend to stay emotionally steady and resilient under everyday stress.',
      detail:
        'Mood swings and worry may be relatively rare for you; you might bounce back after setbacks. Others may see you as calm or unflappable. This stability supports decision-making. If you ever seem “too unaffected,” remember some situations still call for visible care—even when you feel fine inside.',
    },
    low: {
      oneLine: 'You generally handle stress well; strong feelings usually pass without dominating your day.',
      detail:
        'You may worry at times but not get stuck as often. You likely recover after conflict or bad news. This profile supports focus and sleep. When people around you are more sensitive, patience and naming emotions can bridge differences.',
    },
    moderate: {
      oneLine: 'Your mood and stress rise and fall in a typical range—sometimes reactive, often manageable.',
      detail:
        'You have good days and harder days; stress, irritation, or low mood show up but usually in proportion to events. Self-care, sleep, and talking things through tend to help. If the same worries loop for weeks, that is worth attention—regardless of score.',
    },
    high: {
      oneLine: 'You feel stress, worry, or emotional shifts more strongly and more often than average.',
      detail:
        'You may replay situations, anticipate problems, or feel drained by uncertainty. That sensitivity can also mean strong empathy and attention to risk. Skills like grounding, boundaries, sleep, and professional support when needed are not weakness—they match a nervous system that runs hot.',
    },
    very_high: {
      oneLine: 'You experience intense or frequent stress, mood shifts, or worry that can strongly shape your days.',
      detail:
        'Little things may hit hard; recovery might take longer. This pattern is common and treatable—not a character flaw. Evidence-based tools (sleep, movement, therapy, sometimes medicine) can help a lot. If you ever feel unsafe or hopeless, reach out to crisis services or a trusted professional immediately.',
    },
  },
};

export interface Big5DomainReport {
  traitKey: keyof Big5Scores;
  displayName: string;
  score: number;
  band: TraitBand;
  bandLabel: string;
  oneLine: string;
  detail: string;
}

export interface Big5PatternSummary {
  /** Highest-scoring traits (may be multiple if tied). */
  emphasis: { traitKey: keyof Big5Scores; label: string; score: number }[];
  /** Lowest-scoring traits. */
  quieter: { traitKey: keyof Big5Scores; label: string; score: number }[];
  /** One sentence on spread vs middle profile. */
  spreadNote: string;
}

export interface Big5Report {
  /** Single headline for dashboards. */
  headline: string;
  /** 2–4 sentences: overall story without jargon. */
  executiveSummary: string;
  patterns: Big5PatternSummary;
  domains: Big5DomainReport[];
  disclaimer: string;
}

function labelFor(key: keyof Big5Scores): string {
  return BIG5_TRAIT_LABELS[TRAIT_TO_BIG5[key]];
}

/**
 * Build a full narrative report from OCEAN scores.
 */
export function generateBig5Report(scores: Big5Scores): Big5Report {
  const domains: Big5DomainReport[] = ORDER.map((traitKey) => {
    const score = scores[traitKey];
    const band = getTraitBand(score);
    const copy = NARRATIVE[traitKey][band];
    return {
      traitKey,
      displayName: labelFor(traitKey),
      score,
      band,
      bandLabel: bandLabel(band),
      oneLine: copy.oneLine,
      detail: copy.detail,
    };
  });

  const entries = ORDER.map((k) => ({
    traitKey: k,
    label: labelFor(k),
    score: scores[k],
  })).sort((a, b) => b.score - a.score);

  const maxScore = entries[0].score;
  const minScore = entries[entries.length - 1].score;
  const emphasis = entries.filter((e) => e.score >= maxScore - 0.15).slice(0, 3);

  const spread = maxScore - minScore;
  let spreadNote: string;
  if (spread < 0.5) {
    spreadNote =
      'Your scores sit close together across domains—a relatively even profile without one trait dominating the rest.';
  } else if (spread < 1.0) {
    spreadNote =
      'You show a moderate spread: a few traits stand out a bit more than others, without one extreme peak.';
  } else {
    spreadNote =
      'Your profile shows clear peaks and valleys: some traits stand out much more than others, which often shapes how you show up day to day.';
  }

  const topTwo = entries.slice(0, 2);
  const bottomTwo = entries.slice(-2);
  const topLine = topTwo.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' and ');
  const bottomLine = bottomTwo.map((e) => `${e.label} (${formatScore1dp(e.score)})`).join(' and ');

  const executiveSummary = `High level: In this snapshot, your highest scores are in ${topLine}. Your relatively lower scores are in ${bottomLine}. ${spreadNote} These numbers describe how you see yourself today—mood and life context can shift them. Use this as a mirror for self-understanding, not a fixed label.`;

  const headline =
    emphasis.length >= 2
      ? `Strongest themes: ${emphasis[0].label} and ${emphasis[1].label}.`
      : `Strongest theme: ${emphasis[0].label}.`;

  const disclaimer =
    'This report is generated from your self-report scores for personal insight only. It is not a diagnosis, medical advice, or a hiring or legal assessment. If you are in distress, contact a qualified professional or crisis line.';

  return {
    headline,
    executiveSummary,
    patterns: {
      emphasis,
      quieter: bottomTwo,
      spreadNote,
    },
    domains,
    disclaimer,
  };
}
