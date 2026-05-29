/**
 * Skill Lab, copy and “how to solve” lines keyed by skill + atomic sub-skill.
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
  'Pick the option you would honestly take, not the one that sounds most polished in a panel interview.',
  'In your reasoning, name trade-offs, risks, and what you would watch after you act.',
] as const;

const OUTPUT_AUDIT_BULLETS = [
  'Separate what the text claims from what it proves, flag overconfidence, missing caveats, and weak sourcing.',
  'Say what you would verify, and how, before trusting or sharing the output.',
] as const;

const GENERATIVE_BULLETS = [
  'Aim for range before polish, quantity helps you escape the first obvious idea.',
  'Include one idea that challenges an assumption and one borrowed from a different domain.',
] as const;

const DRAFT_BULLETS = [
  'State your goal in one line, then write for a sceptical reader in that room.',
  'Keep the ask clear: one main request and one obvious next step.',
] as const;

/** Optional: finer guidance when a sub-skill needs different steps than its parent skill. Key: `${skillId}::${atomicSkillId}` */
const HOW_TO_ATOMIC: Record<string, readonly [string, string]> = {
  'critical_thinking::first_principles_thinking': [
    'List what you are treating as “given” versus what is only analogy, habit, or authority, then keep only what you can justify as fundamental.',
    'Reason upward from those basics: options, trade-offs, and what would falsify your conclusion.',
  ],
  'critical_thinking::bias_detection': [
    'Name the bias or blind spot (yours or in the situation) and how it could distort the outcome.',
    'Say what you would check, re-weight, or ask a challenger before you commit.',
  ],
  'critical_thinking::argument_analysis': [
    'Separate conclusions from premises, flag missing links, hidden assumptions, or vague terms.',
    'State what would strengthen or weaken the argument with one concrete test.',
  ],
  'critical_thinking::evidence_evaluation': [
    'Classify evidence by type and strength. Not all facts are equal.',
    'Say what additional evidence you would want and why it would change your confidence.',
  ],
  'critical_thinking::logical_reasoning': [
    'Make the inference chain explicit: if A and B, then what follows, and where could the chain break?',
    'Note one alternative explanation that still fits part of the data.',
  ],
  'problem_solving::root_cause': [
    'Separate symptom from cause, say what you would observe or measure before locking a diagnosis.',
    'Propose the smallest test that would confirm or rule out your leading hypothesis.',
  ],
  'problem_solving::ideation': [
    'Generate breadth first, defer scoring until you have genuinely different solution shapes.',
    'Include one unconventional option and say what constraint it relaxes.',
  ],
  'problem_solving::decision_frameworks': [
    'Name the criteria that matter for this decision and their weights, avoid fake precision.',
    'Compare top options on those criteria and say what you would revisit first if you were wrong.',
  ],
  'problem_solving::iteration': [
    'Define the smallest experiment or slice you can ship to learn fast.',
    'Say what signal you would watch to decide whether to scale, pivot, or stop.',
  ],
  'adaptability::cognitive_flexibility': [
    'Hold two competing frames of the situation, what does each explain best?',
    'Say what would make you switch frames or blend them in practice.',
  ],
  'adaptability::ambiguity_tolerance': [
    'List what is unknown versus unknowable right now, then what you can still decide.',
    'Choose a default or probe that moves you forward without false certainty.',
  ],
  'adaptability::learning_agility': [
    'Name the gap between what you know and what the situation demands, one skill or fact to acquire next.',
    'Describe how you would learn it on a short horizon and apply it once.',
  ],
  'adaptability::pivot_speed': [
    'State what changed and which prior plan no longer fits.',
    'Give the next concrete move and one thing you deliberately stop doing.',
  ],
  'systems_thinking::feedback_loops': [
    'Name the reinforcing or balancing loops, what accelerates or dampens the pattern?',
    'Point to one intervention and the delay before you would expect to see an effect.',
  ],
  'systems_thinking::second_order_effects': [
    'Trace “and then what?” at least two steps beyond the obvious first outcome.',
    'Say who wins, who bears cost, and what metric could hide a problem.',
  ],
  'systems_thinking::dependency_mapping': [
    'List who or what depends on whom, including hidden vendors, data, or incentives.',
    'Say which dependency is the riskiest single point of failure and why.',
  ],
  'systems_thinking::pattern_recognition': [
    'Name the archetype or pattern you see, avoid vague “it’s complex.”',
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
    'Prioritise quantity and variety before judging, include one deliberately weird option.',
    'Circle back: which two ideas would you merge or test first, and why.',
  ],
  'emotional_intelligence::eq_self_awareness': [
    'Name the emotion(s) you notice in yourself and what likely triggered them.',
    'Say how that state could help or hurt your next move, with one grounding behaviour.',
  ],
  'emotional_intelligence::eq_self_regulation': [
    'Describe the urge or impulse, then the gap you want between feeling and acting.',
    'Give one tactic you would use in the next 60 seconds to stay effective.',
  ],
  'emotional_intelligence::eq_empathy': [
    'Infer the other side’s constraint or fear, not a caricature.',
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
    'Acknowledge the setback without catastrophising, what is still in your control?',
    'Give one recovery step and who you might enlist for support.',
  ],
  'communication_influence::storytelling': [
    'Set up tension, turn, and takeaway, why should this audience care now?',
    'Cut one sentence that is pure jargon or filler.',
  ],
  'communication_influence::active_listening': [
    'Reflect what you heard in their words before adding your view.',
    'Ask one question that proves you listened to what mattered to them.',
  ],
  'communication_influence::framing': [
    'Name the audience’s fear or goal, then frame your idea to meet them there.',
    'Offer an alternative frame and say when you would switch.',
  ],
  'communication_influence::persuasion': [
    'Lead with shared interest or evidence, not pressure.',
    'Name the ethical line you will not cross in this influence attempt.',
  ],
  'ai_literacy::prompt_craft': [
    'Diagnose what is vague, missing, or risky in the prompt.',
    'Rewrite or extend the prompt so a model can succeed, constraints, format, success criteria.',
  ],
  'ai_literacy::output_evaluation': [
    'List specific failure modes: factual, logical, tone, missing caveats.',
    'Say what you would verify externally before acting on the output.',
  ],
  'ai_literacy::ai_ethics': [
    'Name stakeholders harmed or exposed, privacy, fairness, misuse, IP.',
    'Propose guardrails or process changes proportional to the risk.',
  ],
  'ai_literacy::tool_fluency': [
    'Compare tools or workflows for fit: accuracy, cost, latency, auditability.',
    'Say what you would automate vs keep human-in-the-loop, and why.',
  ],
  // Strategic Sales
  'strategic_sales::discovery_questioning': [
    'Ask questions that move from surface symptoms to root business pain: budget, authority, timeline, decision process.',
    'Identify what disqualifies the opportunity as early as what qualifies it.',
  ],
  'strategic_sales::value_articulation': [
    'State the business outcome in the buyer\'s language and metric, not your product\'s feature name.',
    'Connect your value to one of: revenue gain, cost reduction, risk mitigation, or time saved.',
  ],
  'strategic_sales::objection_handling': [
    'Acknowledge the concern before reframing; never dismiss or talk past it.',
    'Separate the stated objection from the underlying fear, then address the fear.',
  ],
  'strategic_sales::negotiation_closing': [
    'Anchor on value delivered, not list price; then trade concessions, never give them away.',
    'Name the next concrete step and who owns it before ending the conversation.',
  ],
  'strategic_sales::relationship_building': [
    'Demonstrate understanding of their world before asking for anything: research, reference, specificity.',
    'Follow up on something personal they mentioned; consistency builds trust faster than charm.',
  ],
  'strategic_sales::pipeline_management': [
    'Rank opportunities by close probability times deal value, not by how much time you have invested.',
    'Identify the one stuck deal you should either unstick this week or consciously park.',
  ],
  // Leadership Essentials
  'leadership_essentials::vision_setting': [
    'State the future state in one sentence a new hire could repeat, then link it to this quarter\'s priorities.',
    'Say what you are deliberately not pursuing and why that focus creates advantage.',
  ],
  'leadership_essentials::delegation': [
    'Define the outcome and constraints, not the method; then ask what support they need, not how they will do it.',
    'Choose the person who will grow most from this task, not the person who will do it fastest.',
  ],
  'leadership_essentials::feedback_culture': [
    'Be specific about the behaviour, its impact, and the change you are asking for; avoid vague praise or criticism.',
    'Ask for feedback on your own leadership in the same conversation; model what you expect.',
  ],
  'leadership_essentials::team_development': [
    'Name the skill gap between where each person is and where the role needs them in 6 months.',
    'Create one stretch opportunity this quarter that pairs a strength with a growth area.',
  ],
  'leadership_essentials::decision_making_under_pressure': [
    'State the decision, your reasoning, and what would make you reverse it, within the time available.',
    'Communicate the call clearly, including what is uncertain, so people can execute without second-guessing.',
  ],
  'leadership_essentials::executive_presence': [
    'Open with your conclusion, then support it; do not build up to the point.',
    'When challenged, pause before responding; your composure communicates more than your words.',
  ],
};

const HOW_TO_BY_SKILL_OPEN: Record<string, readonly [string, string]> = {
  emotional_intelligence: [
    'Name emotions and incentives for each side before you decide what you would say or do.',
    'Ground your answer in the sub-skill you selected, reference a concrete detail from the scenario.',
  ],
  critical_thinking: [
    'Surface hidden assumptions and what you treat as a fundamental truth versus borrowed convention.',
    'Reason step by step toward a conclusion, name trade-offs, risks, and what evidence would change your mind.',
  ],
  problem_solving: [
    'Separate symptom from cause, say what you would check before committing to a solution.',
    'Offer options with trade-offs and the smallest experiment you would run next.',
  ],
  adaptability: [
    'Name what is ambiguous or changing, then how you would update your plan with new information.',
    'Give concrete next steps, not generic resilience clichés.',
  ],
  systems_thinking: [
    'Trace causes, feedback loops, and dependencies, not just the visible complaint.',
    'Say what might happen next if someone intervened at a leverage point you name.',
  ],
  strategic_sales: [
    'Diagnose the buyer\'s real situation: pain, constraints, decision process, before proposing anything.',
    'Ground your response in the sub-skill you selected; use a specific detail from the scenario to show you read the room.',
  ],
  leadership_essentials: [
    'Name the leadership challenge clearly, then describe what you would say or do, and what you would deliberately avoid.',
    'Tie your response to the sub-skill you chose; a great leader is specific, not generic.',
  ],
};

const GENERIC_OPEN = [
  'Read the situation and the question carefully, then answer in your own words with specifics.',
  'Tie each paragraph to the sub-skill you chose, use at least one concrete detail from the scenario.',
] as const;

/** UI field copy for practice area + idle hints (per skill for open_reflection). */
const OPEN_FIELD_BY_SKILL: Record<string, PracticeFieldCopy> = {
  emotional_intelligence: {
    scenarioLabel: 'Scene',
    inputPlaceholder: "What would you say or do — and why?",
    hint: 'Read the scene, write what you’d say, then get a coach take.',
    loadingText: 'Setting the scene…',
  },
  critical_thinking: {
    scenarioLabel: 'Scene',
    inputPlaceholder: "What's your read? Name your reasoning and what would change your mind.",
    hint: 'Read it, lay out your thinking, get a coach take.',
    loadingText: 'Setting the scene…',
  },
  problem_solving: {
    scenarioLabel: 'Scene',
    inputPlaceholder: 'Where do you think the real problem sits, and what would you try first?',
    hint: 'Read it, sketch your move, get a coach take.',
    loadingText: 'Setting the scene…',
  },
  adaptability: {
    scenarioLabel: 'Scene',
    inputPlaceholder: 'What changed, and what would you do differently now?',
    hint: 'Read it, name your shift, get a coach take.',
    loadingText: 'Setting the scene…',
  },
  systems_thinking: {
    scenarioLabel: 'Scene',
    inputPlaceholder: 'What loops or dependencies do you see, and where would you nudge first?',
    hint: 'Read it, map the system, get a coach take.',
    loadingText: 'Setting the scene…',
  },
  strategic_sales: {
    scenarioLabel: 'Sales scene',
    inputPlaceholder: "What would you say to the buyer right now — and why?",
    hint: 'Read it, write your move, get a coach take.',
    loadingText: 'Setting the scene…',
  },
  leadership_essentials: {
    scenarioLabel: 'Leadership scene',
    inputPlaceholder: 'What would you say to your team here — and what would you skip?',
    hint: 'Read it, write your move, get a coach take.',
    loadingText: 'Setting the scene…',
  },
};

const DEFAULT_OPEN_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Scene',
  inputPlaceholder: "What would you say or do here — and why?",
  hint: 'Read it, write your move, get a coach take.',
  loadingText: 'Setting the scene…',
};

const OUTPUT_AUDIT_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Exercise',
  inputPlaceholder: "What's off, why it matters, what you'd change or check.",
  hint: 'Each sub-skill is a different mini-exercise. Pick one and tap start.',
  loadingText: 'Cooking up your exercise…',
};

const GENERATIVE_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Creative scene',
  inputPlaceholder: 'Quick list of ideas — aim for range, not polish. One should feel a bit weird.',
  hint: 'Quantity beats polish. Aim for 4+ ideas, then get a coach take.',
  loadingText: 'Cooking up a creative scene…',
};

const DRAFT_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Communication brief',
  inputPlaceholder: 'Draft a short message — under 150 words is plenty.',
  hint: 'Read the brief, draft your line, get a coach take on tone and clarity.',
  loadingText: 'Setting up the brief…',
};

const DECISION_FIELD: PracticeFieldCopy = {
  scenarioLabel: 'Scene',
  inputPlaceholder: 'A line or two on why you picked it.',
  hint: 'Read it, pick a path, say why in a sentence or two.',
  loadingText: 'Setting the scene…',
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

/** Optional “Your situation” field, wording matches analytical vs interpersonal skills. */
export function getOptionalSituationCopy(skillId: string): { hint: string; placeholder: string } {
  if (skillId === 'emotional_intelligence') {
    return {
      hint: 'Got a real moment in mind? Drop it in and we’ll anchor the scene there.',
      placeholder: 'e.g. my manager pushed back on my timeline in front of the client…',
    };
  }
  return {
    hint: 'Got a real constraint in mind? Drop it in and we’ll anchor the scene there.',
    placeholder: 'e.g. enterprise buyers see us as pricey vs local alternatives…',
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
