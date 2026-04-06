/**
 * Skill Lab data (routes: /skill-lab/*)
 *
 * Eight core skills for an AI-shaped workplace.
 * Each skill declares its practiceMode, which drives which AI workflow is used.
 *
 * Practice modes:
 *  - decision_simulator  → scenario → forced A–D choice → reasoning → feedback
 *  - output_audit        → flawed AI output → learner evaluates/critiques it → feedback
 *  - open_reflection     → interpersonal/systemic situation → open-ended response → coaching
 *  - generative_brainstorm → creative constraint → generate 4+ ideas → originality feedback
 *  - draft_and_refine    → communication brief → learner drafts a message → audience-fit feedback
 */

export type PracticeMode =
  | 'decision_simulator'
  | 'output_audit'
  | 'open_reflection'
  | 'generative_brainstorm'
  | 'draft_and_refine';

export interface AtomicSkill {
  id: string;
  name: string;
  description: string;
}

export interface FutureSkill {
  id: string;
  name: string;
  tagline: string;
  description: string;
  why: string;
  icon: string;
  color: string;
  practiceMode: PracticeMode;
  atomicSkills: AtomicSkill[];
}

export const FUTURE_SKILLS: FutureSkill[] = [
  {
    id: 'emotional_intelligence',
    name: 'Emotional Intelligence',
    tagline: 'Lead with awareness',
    description:
      'Recognise your own emotions and those of others, and use that awareness to navigate relationships and decisions effectively.',
    why: 'EQ is increasingly cited as the differentiator between average and exceptional leaders — and it can\'t be automated.',
    icon: 'heart-outline',
    color: '#EC4899',
    practiceMode: 'open_reflection',
    atomicSkills: [
      {
        id: 'eq_self_awareness',
        name: 'Self Awareness',
        description: 'Notice your emotions, triggers, and patterns in real time.',
      },
      {
        id: 'eq_self_regulation',
        name: 'Self Regulation',
        description: 'Manage your emotional responses so they serve rather than undermine you.',
      },
      {
        id: 'eq_empathy',
        name: 'Empathy',
        description: 'Understand others\' perspectives and emotional experiences without judgment.',
      },
      {
        id: 'eq_social_skills',
        name: 'Social Skills',
        description: 'Build rapport, communicate clearly, and navigate group dynamics effectively.',
      },
      {
        id: 'eq_motivation',
        name: 'Motivation',
        description: 'Harness intrinsic drive to pursue goals with energy and persistence.',
      },
      {
        id: 'eq_resilience',
        name: 'Resilience',
        description: 'Bounce back from setbacks and adapt constructively under pressure.',
      },
    ],
  },
  {
    id: 'ai_literacy',
    name: 'AI Literacy',
    tagline: 'Work with AI, not against it',
    description:
      'Understand how AI systems work, when to trust them, and how to get the most out of them — without being replaced by them.',
    why: 'AI is reshaping every industry. People who can direct, question, and evaluate AI tools will consistently outperform those who can\'t.',
    icon: 'hardware-chip-outline',
    color: '#6366F1',
    practiceMode: 'output_audit',
    atomicSkills: [
      {
        id: 'prompt_craft',
        name: 'Prompt Crafting',
        description: 'Write clear, specific instructions that get useful AI outputs.',
      },
      {
        id: 'output_evaluation',
        name: 'Output Evaluation',
        description: 'Critically assess AI-generated content for accuracy, bias, and relevance.',
      },
      {
        id: 'ai_ethics',
        name: 'AI Ethics Awareness',
        description: 'Recognise ethical risks: bias, privacy, intellectual property, and misuse.',
      },
      {
        id: 'tool_fluency',
        name: 'Tool Fluency',
        description: 'Select and switch between AI tools based on the task at hand.',
      },
    ],
  },
  {
    id: 'critical_thinking',
    name: 'Critical Thinking',
    tagline: 'Question before you accept',
    description:
      'Evaluate arguments, detect logical gaps, and form well-reasoned conclusions — especially in a world of information overload.',
    why: 'With AI generating content at scale, the ability to distinguish good reasoning from plausible-sounding nonsense is a superpower.',
    icon: 'bulb-outline',
    color: '#F59E0B',
    practiceMode: 'decision_simulator',
    atomicSkills: [
      {
        id: 'bias_detection',
        name: 'Bias Detection',
        description: 'Spot cognitive biases in yourself and others that distort judgement.',
      },
      {
        id: 'first_principles_thinking',
        name: 'First Principles Thinking',
        description:
          'Strip away analogy and convention; break problems down to fundamental truths, then reason up from there.',
      },
      {
        id: 'argument_analysis',
        name: 'Argument Analysis',
        description: 'Break down claims into premises and conclusions to evaluate their logic.',
      },
      {
        id: 'evidence_evaluation',
        name: 'Evidence Evaluation',
        description: 'Assess the quality, relevance, and source credibility of evidence.',
      },
      {
        id: 'logical_reasoning',
        name: 'Logical Reasoning',
        description: 'Apply deductive and inductive reasoning to draw sound conclusions.',
      },
    ],
  },
  {
    id: 'problem_solving',
    name: 'Problem Solving',
    tagline: 'Find the real problem first',
    description:
      'Move from vague challenges to clear solutions by diagnosing root causes, generating options, and testing your way forward.',
    why: 'Complex, novel problems are exactly what humans are still uniquely positioned to solve — if they have a structured approach.',
    icon: 'construct-outline',
    color: '#10B981',
    practiceMode: 'decision_simulator',
    atomicSkills: [
      {
        id: 'root_cause',
        name: 'Root Cause Analysis',
        description: 'Dig beneath symptoms to find the underlying cause of a problem.',
      },
      {
        id: 'ideation',
        name: 'Ideation',
        description: 'Generate a diverse range of possible solutions before evaluating any.',
      },
      {
        id: 'decision_frameworks',
        name: 'Decision Frameworks',
        description: 'Use structured tools (e.g. pros/cons, impact vs effort) to choose wisely.',
      },
      {
        id: 'iteration',
        name: 'Iteration & Testing',
        description: 'Test small, learn fast, and refine your solution in cycles.',
      },
    ],
  },
  {
    id: 'adaptability',
    name: 'Adaptability',
    tagline: 'Thrive in change',
    description:
      'Adjust your thinking, behaviour, and skills quickly in response to new information, shifting priorities, and unexpected challenges.',
    why: 'The pace of change is accelerating. Adaptability is what separates people who grow through disruption from those who freeze.',
    icon: 'refresh-outline',
    color: '#14B8A6',
    practiceMode: 'decision_simulator',
    atomicSkills: [
      {
        id: 'cognitive_flexibility',
        name: 'Cognitive Flexibility',
        description: 'Shift between mental frameworks and consider multiple perspectives.',
      },
      {
        id: 'ambiguity_tolerance',
        name: 'Ambiguity Tolerance',
        description: 'Act decisively even when information is incomplete or unclear.',
      },
      {
        id: 'learning_agility',
        name: 'Learning Agility',
        description: 'Pick up new skills and knowledge quickly and apply them effectively.',
      },
      {
        id: 'pivot_speed',
        name: 'Pivot Speed',
        description: 'Change direction without losing momentum when circumstances shift.',
      },
    ],
  },
  {
    id: 'creative_thinking',
    name: 'Creative Thinking',
    tagline: 'Make new connections',
    description:
      'Generate novel ideas, reframe problems, and combine things in ways that haven\'t been tried before.',
    why: 'Creativity is cited repeatedly as a top skill by future-of-work researchers — and it\'s something AI augments but can\'t replace.',
    icon: 'color-wand-outline',
    color: '#F97316',
    practiceMode: 'generative_brainstorm',
    atomicSkills: [
      {
        id: 'lateral_thinking',
        name: 'Lateral Thinking',
        description: 'Approach problems from unexpected angles to unlock new solutions.',
      },
      {
        id: 'reframing',
        name: 'Reframing',
        description: 'Reshape how a problem is defined to open up new possibilities.',
      },
      {
        id: 'synthesis',
        name: 'Synthesis',
        description: 'Combine ideas from different domains into something new and coherent.',
      },
      {
        id: 'generative_brainstorming',
        name: 'Generative Brainstorming',
        description: 'Generate a high quantity of ideas without premature evaluation.',
      },
    ],
  },
  {
    id: 'systems_thinking',
    name: 'Systems Thinking',
    tagline: 'See the whole picture',
    description:
      'Understand how parts of a system interact, anticipate second-order effects, and design interventions that don\'t create new problems.',
    why: 'Today\'s challenges — organisational, social, technological — are complex systems. Reductionist thinking alone won\'t solve them.',
    icon: 'git-network-outline',
    color: '#06B6D4',
    practiceMode: 'open_reflection',
    atomicSkills: [
      {
        id: 'feedback_loops',
        name: 'Feedback Loops',
        description: 'Identify reinforcing and balancing loops that drive system behaviour.',
      },
      {
        id: 'second_order_effects',
        name: 'Second-Order Effects',
        description: 'Ask "and then what?" to anticipate downstream consequences of decisions.',
      },
      {
        id: 'dependency_mapping',
        name: 'Dependency Mapping',
        description: 'Map how elements of a system depend on and influence each other.',
      },
      {
        id: 'pattern_recognition',
        name: 'Pattern Recognition',
        description: 'Spot recurring patterns and archetypes across different contexts.',
      },
    ],
  },
  {
    id: 'communication_influence',
    name: 'Communication & Influence',
    tagline: 'Ideas are nothing without buy-in',
    description:
      'Convey ideas clearly, listen deeply, and bring others along — whether you\'re presenting to a board or writing a Slack message.',
    why: 'The best ideas fail without effective communication. This skill amplifies everything else you do.',
    icon: 'chatbubbles-outline',
    color: '#EF4444',
    practiceMode: 'draft_and_refine',
    atomicSkills: [
      {
        id: 'storytelling',
        name: 'Storytelling',
        description: 'Use narrative structure to make ideas memorable and emotionally resonant.',
      },
      {
        id: 'active_listening',
        name: 'Active Listening',
        description: 'Listen to understand, not just to respond — and make others feel heard.',
      },
      {
        id: 'framing',
        name: 'Framing',
        description: 'Present ideas in a way that resonates with your specific audience.',
      },
      {
        id: 'persuasion',
        name: 'Ethical Persuasion',
        description: 'Build genuine agreement through evidence, empathy, and clarity.',
      },
    ],
  },
];

export function getSkillById(id: string): FutureSkill | undefined {
  return FUTURE_SKILLS.find((s) => s.id === id);
}

