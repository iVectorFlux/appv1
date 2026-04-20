/**
 * Skill Lab — copy and “how to solve” lines keyed by skill + atomic sub-skill.
 * Single source of truth so UI never shows the wrong playbook (e.g. EQ bullets on Critical Thinking).
 */

import type { PracticeMode } from '@/data/future-skills';

export interface PracticeFieldCopy {
  scenarioLabel: string;
  inputPlaceholder: string;
  hint: string;
  loadingText: string;
}

const DECISION_BULLETS = [
  'Read the scenario for stakes, constraints, and who is affected.',
  'Pick the option you would honestly take — not the one that sounds most polished in a panel interview.',
  'In your reasoning, name trade-offs, risks, and what you would watch after you act.',
] as const;

const OUTPUT_AUDIT_BULLETS = [
  'Separate what the text claims from what it proves — flag overconfidence, missing caveats, and weak sourcing.',
  'Say what you would verify, and how, before trusting or sharing the output.',
] as const;

const GENERATIVE_BULLETS = [
  'Aim for range before polish — quantity helps you escape the first obvious idea.',
  'Include one idea that challenges an assumption and one borrowed from a different domain.',
] as const;

const DRAFT_BULLETS = [
  'State your goal in one line, then write for a sceptical reader in that room.',
  'Keep the ask clear: one main request and one obvious next step.',
] as const;

/** Optional: finer guidance when a sub-skill needs different steps than its parent skill. Key: `${skillId}::${atomicSkillId}` */
const HOW_TO_ATOMIC: Record<string, readonly [string, string]> = {
  'critical_thinking::first_principles_thinking': [
    'List what you are treating as “given” versus what is only analogy, habit, or authority — then keep only what you can justify as fundamental.',
    'Reason upward from those basics: options, trade-offs, and what would falsify your conclusion.',
  ],
  'critical_thinking::bias_detection': [
    'Name the bias or blind spot (yours or in the situation) and how it could distort the outcome.',
    'Say what you would check, re-weight, or ask a challenger before you commit.',
  ],
  'critical_thinking::argument_analysis': [
    'Separate conclusions from premises — flag missing links, hidden assumptions, or vague terms.',
    'State what would strengthen or weaken the argument with one concrete test.',
  ],
  'critical_thinking::evidence_evaluation': [
    'Classify evidence by type and strength — not all facts are equal.',
    'Say what additional evidence you would want and why it would change your confidence.',
  ],
  'critical_thinking::logical_reasoning': [
    'Make the inference chain explicit: if A and B, then what follows — and where could the chain break?',
    'Note one alternative explanation that still fits part of the data.',
  ],
  'problem_solving::root_cause': [
    'Separate symptom from cause — say what you would observe or measure before locking a diagnosis.',
    'Propose the smallest test that would confirm or rule out your leading hypothesis.',
  ],
  'problem_solving::ideation': [
    'Generate breadth first — defer scoring until you have genuinely different solution shapes.',
    'Include one unconventional option and say what constraint it relaxes.',
  ],
  'problem_solving::decision_frameworks': [
    'Name the criteria that matter for this decision and their weights — avoid fake precision.',
    'Compare top options on those criteria and say what you would revisit first if you were wrong.',
  ],
  'problem_solving::iteration': [
    'Define the smallest experiment or slice you can ship to learn fast.',
    'Say what signal you would watch to decide whether to scale, pivot, or stop.',
  ],
  'adaptability::cognitive_flexibility': [
    'Hold two competing frames of the situation — what does each explain best?',
    'Say what would make you switch frames or blend them in practice.',
  ],
  'adaptability::ambiguity_tolerance': [
    'List what is unknown versus unknowable right now — then what you can still decide.',
    'Choose a default or probe that moves you forward without false certainty.',
  ],
  'adaptability::learning_agility': [
    'Name the gap between what you know and what the situation demands — one skill or fact to acquire next.',
    'Describe how you would learn it on a short horizon and apply it once.',
  ],
  'adaptability::pivot_speed': [
    'State what changed and which prior plan no longer fits.',
    'Give the next concrete move and one thing you deliberately stop doing.',
  ],
  'systems_thinking::feedback_loops': [
    'Name the reinforcing or balancing loops — what accelerates or dampens the pattern?',
    'Point to one intervention and the delay before you would expect to see an effect.',
  ],
  'systems_thinking::second_order_effects': [
    'Trace “and then what?” at least two steps beyond the obvious first outcome.',
    'Say who wins, who bears cost, and what metric could hide a problem.',
  ],
  'systems_thinking::dependency_mapping': [
    'List who or what depends on whom — including hidden vendors, data, or incentives.',
    'Say which dependency is the riskiest single point of failure and why.',
  ],
  'systems_thinking::pattern_recognition': [
    'Name the archetype or pattern you see — avoid vague “it’s complex.”',
    'Say where else you’ve seen this pattern and what transferred (or didn’t).',
  ],
  'creative_thinking::lateral_thinking': [
    'Offer an angle that breaks the default framing of the problem.',
    'Say what you would steal from an unrelated domain and how it applies.',
  ],
  'creative_thinking::reframing': [
    'State the old frame in one line, then a sharper frame that changes the solution space.',
    'Explain what becomes easier or harder under the new frame.',
  ],
  'creative_thinking::synthesis': [
    'Combine at least two distinct ideas into one coherent proposal.',
    'Name the tension you had to resolve and how you resolved it.',
  ],
  'creative_thinking::generative_brainstorming': [
    'Prioritise quantity and variety before judging — include one deliberately weird option.',
    'Circle back: which two ideas would you merge or test first, and why.',
  ],
  'emotional_intelligence::eq_self_awareness': [
    'Name the emotion(s) you notice in yourself and what likely triggered them.',
    'Say how that state could help or hurt your next move — with one grounding behaviour.',
  ],
  'emotional_intelligence::eq_self_regulation': [
    'Describe the urge or impulse — then the gap you want between feeling and acting.',
    'Give one tactic you would use in the next 60 seconds to stay effective.',
  ],
  'emotional_intelligence::eq_empathy': [
    'Infer the other side’s constraint or fear — not a caricature.',
    'Say what you would validate aloud before problem-solving.',
  ],
  'emotional_intelligence::eq_social_skills': [
    'Choose a social move (repair, align, clarify) that fits this room.',
    'Anticipate one objection and how you’d address it without being defensive.',
  ],
  'emotional_intelligence::eq_motivation': [
    'Separate intrinsic drive from external pressure in this situation.',
    'Name a small win you would pursue first to rebuild momentum.',
  ],
  'emotional_intelligence::eq_resilience': [
    'Acknowledge the setback without catastrophising — what is still in your control?',
    'Give one recovery step and who you might enlist for support.',
  ],
  'communication_influence::storytelling': [
    'Set up tension, turn, and takeaway — why should this audience care now?',
    'Cut one sentence that is pure jargon or filler.',
  ],
  'communication_influence::active_listening': [
    'Reflect what you heard in their words before adding your view.',
    'Ask one question that proves you listened to what mattered to them.',
  ],
  'communication_influence::framing': [
    'Name the audience’s fear or goal — then frame your idea to meet them there.',
    'Offer an alternative frame and say when you would switch.',
  ],
  'communication_influence::persuasion': [
    'Lead with shared interest or evidence — not pressure.',
    'Name the ethical line you will not cross in this influence attempt.',
  ],
  'ai_literacy::prompt_craft': [
    'Diagnose what is vague, missing, or risky in the prompt.',
    'Rewrite or extend the prompt so a model can succeed — constraints, format, success criteria.',
  ],
  'ai_literacy::output_evaluation': [
    'List specific failure modes: factual, logical, tone, missing caveats.',
    'Say what you would verify externally before acting on the output.',
  ],
  'ai_literacy::ai_ethics': [
    'Name stakeholders harmed or exposed — privacy, fairness, misuse, IP.',
    'Propose guardrails or process changes proportional to the risk.',
  ],
  'ai_literacy::tool_fluency': [
    'Compare tools or workflows for fit: accuracy, cost, latency, auditability.',
    'Say what you would automate vs keep human-in-the-loop, and why.',
  ],
};

const HOW_TO_BY_SKILL_OPEN: Record<string, readonly [string, string]> = {
  emotional_intelligence: [
    'Name emotions and incentives for each side before you decide what you would say or do.',
    'Ground your answer in the sub-skill you selected — reference a concrete detail from the scenario.',
  ],
  critical_thinking: [
    'Surface hidden assumptions and what you treat as a fundamental truth versus borrowed convention.',
    'Reason step by step toward a conclusion — name trade-offs, risks, and what evidence would change your mind.',
  ],
  problem_solving: [
    'Separate symptom from cause — say what you would check before committing to a solution.',
    'Offer options with trade-offs and the smallest experiment you would run next.',
  ],
  adaptability: [
    'Name what is ambiguous or changing, then how you would update your plan with new information.',
    'Give concrete next steps — not generic resilience clichés.',
  ],
  systems_thinking: [
    'Trace causes, feedback loops, and dependencies — not just the visible complaint.',
    'Say what might happen next if someone intervened at a leverage point you name.',
  ],
};

const GENERIC_OPEN = [
  'Read the situation and the question carefully, then answer in your own words with specifics.',
  'Tie each paragraph to the sub-skill you chose — use at least one concrete detail from the scenario.',
] as const;

/** UI field copy for practice area + idle hints (per skill for open_reflection). */
const OPEN_FIELD_BY_SKILL: Record<string, PracticeFieldCopy> = {
  emotional_intelligence: {
    scenarioLabel: 'Situation',
    inputPlaceholder:
      "Share your honest thinking — what you notice, how you'd respond, and why — with emotional specificity.",
    hint: 'Read the situation → reflect openly → get coaching on your response.',
    loadingText: 'Generating your scenario...',
  },
  critical_thinking: {
    scenarioLabel: 'Situation',
    inputPlaceholder:
      'Unpack assumptions, what you treat as fundamental vs convention, then reason step by step — trade-offs and what would change your mind.',
    hint: 'Read the situation → write your full analysis → get coaching.',
    loadingText: 'Generating your scenario...',
  },
  problem_solving: {
    scenarioLabel: 'Situation',
    inputPlaceholder:
      'Clarify the real problem vs symptoms, your root-cause hypothesis, options with trade-offs, and the smallest test you’d run next.',
    hint: 'Read the situation → explain how you’d diagnose and move forward in writing.',
    loadingText: 'Generating your scenario...',
  },
  adaptability: {
    scenarioLabel: 'Situation',
    inputPlaceholder:
      'Name what changed or what’s unknown, how you’d update your approach, and concrete next steps.',
    hint: 'Read the situation → describe how you’d adapt with specifics.',
    loadingText: 'Generating your scenario...',
  },
  systems_thinking: {
    scenarioLabel: 'Situation',
    inputPlaceholder:
      'Map loops, dependencies, and second-order effects — then what you would try to shift and what you’d watch.',
    hint: 'Read the situation → analyse the system in writing → get coaching.',
    loadingText: 'Generating your scenario...',
  },
};

const DEFAULT_OPEN_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Situation',
  inputPlaceholder: "Share your honest thinking — what you notice, how you'd respond, and why.",
  hint: 'Read the situation → reflect openly → get coaching on your response.',
  loadingText: 'Generating your scenario...',
};

const OUTPUT_AUDIT_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Exercise',
  inputPlaceholder: "Be specific — what you noticed, why it matters, what you'd change or verify.",
  hint: 'Each sub-skill uses a different exercise. Pick a sub-skill, then start practice.',
  loadingText: 'Generating your exercise...',
};

const GENERATIVE_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Creative Challenge',
  inputPlaceholder: 'List your ideas — aim for at least 4. Range over polish. One should challenge an assumption.',
  hint: 'Read the challenge → generate ideas (range over polish) → get feedback on originality.',
  loadingText: 'Generating your creative challenge...',
};

const DRAFT_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Communication Brief',
  inputPlaceholder: 'Draft your message — email, Slack, memo, or opening line. Keep it under 150 words.',
  hint: 'Read the brief → draft your message → get feedback on clarity, framing, and audience fit.',
  loadingText: 'Generating your communication brief...',
};

const DECISION_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Scenario',
  inputPlaceholder: 'Short answer is fine — focus on your logic and trade-offs.',
  hint: 'Scenario → pick a move → explain your reasoning → feedback, trade-offs, and a reflection prompt.',
  loadingText: 'Generating your scenario...',
};

function outputAuditScenarioLabel(skillId: string | undefined, atomicSkillId: string | null): string {
  if (skillId === 'ai_literacy') {
    switch (atomicSkillId) {
      case 'prompt_craft':
        return 'Weak prompt + AI reply';
      case 'output_evaluation':
        return 'AI output to evaluate';
      case 'ai_ethics':
        return 'AI / policy scenario';
      case 'tool_fluency':
        return 'Tool & workflow';
      default:
        return 'AI literacy exercise';
    }
  }
  return 'AI output to evaluate';
}

/**
 * Normalize Expo Router dynamic segment (web may pass string[]).
 */
export function normalizeSkillRouteParam(
  raw: string | string[] | undefined
): string {
  if (raw == null) return '';
  const s = Array.isArray(raw) ? raw[0] : raw;
  return typeof s === 'string' ? s : '';
}

/** Optional “Your situation” field — wording matches analytical vs interpersonal skills. */
export function getOptionalSituationCopy(skillId: string): { hint: string; placeholder: string } {
  if (skillId === 'emotional_intelligence') {
    return {
      hint: 'Describe a real interpersonal moment. The AI will anchor the scenario when it fits.',
      placeholder: 'Example: my manager challenged my timeline in front of the client…',
    };
  }
  return {
    hint: 'Optional: add real constraints (market, price, org politics, deadlines). The AI will anchor the scenario when it fits.',
    placeholder:
      'Example: enterprise buyers in our region see us as too expensive versus local alternatives…',
  };
}

export function getHowToSolveLines(args: {
  skillId: string;
  atomicSkillId: string | null;
  practiceMode: PracticeMode;
  isDecisionMode: boolean;
}): string[] {
  const { skillId, atomicSkillId, practiceMode, isDecisionMode } = args;

  if (isDecisionMode) {
    return [...DECISION_BULLETS];
  }

  const atomicKey =
    skillId && atomicSkillId ? `${skillId}::${atomicSkillId}` : '';
  if (atomicKey && HOW_TO_ATOMIC[atomicKey]) {
    const pair = HOW_TO_ATOMIC[atomicKey];
    return [pair[0], pair[1]];
  }

  switch (practiceMode) {
    case 'output_audit':
      return [...OUTPUT_AUDIT_BULLETS];
    case 'generative_brainstorm':
      return [...GENERATIVE_BULLETS];
    case 'draft_and_refine':
      return [...DRAFT_BULLETS];
    case 'open_reflection': {
      const lines = HOW_TO_BY_SKILL_OPEN[skillId];
      return lines ? [...lines] : [...GENERIC_OPEN];
    }
    default:
      return [...GENERIC_OPEN];
  }
}

export function getPracticeFieldCopy(args: {
  skillId: string;
  practiceMode: PracticeMode;
  atomicSkillId: string | null;
}): PracticeFieldCopy {
  const { skillId, practiceMode, atomicSkillId } = args;

  switch (practiceMode) {
    case 'output_audit': {
      const base = { ...OUTPUT_AUDIT_FIELD };
      base.scenarioLabel = outputAuditScenarioLabel(skillId, atomicSkillId);
      return base;
    }
    case 'generative_brainstorm':
      return { ...GENERATIVE_FIELD };
    case 'draft_and_refine':
      return { ...DRAFT_FIELD };
    case 'decision_simulator':
      return { ...DECISION_FIELD };
    case 'open_reflection':
      return { ...(OPEN_FIELD_BY_SKILL[skillId] ?? DEFAULT_OPEN_FIELD) };
    default:
      return { ...DEFAULT_OPEN_FIELD };
  }
}
