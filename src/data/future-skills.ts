/**
 * Skill Lab data (routes remain /future-skills/*)
 *
 * Ten core skills for an AI-shaped workplace, each with atomic sub-skills.
 * First principles thinking is an atomic under Critical Thinking (not an 11th pillar).
 */

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
  atomicSkills: AtomicSkill[];
}

export const FUTURE_SKILLS: FutureSkill[] = [
  {
    id: 'ai_literacy',
    name: 'AI Literacy',
    tagline: 'Work with AI, not against it',
    description:
      'Understand how AI systems work, when to trust them, and how to get the most out of them — without being replaced by them.',
    why: 'AI is reshaping every industry. People who can direct, question, and collaborate with AI tools will outperform those who can\'t.',
    icon: 'hardware-chip-outline',
    color: '#6366F1',
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
    id: 'emotional_intelligence',
    name: 'Emotional Intelligence',
    tagline: 'Lead with awareness',
    description:
      'Recognise your own emotions and those of others, and use that awareness to navigate relationships and decisions effectively.',
    why: 'EQ is increasingly cited as the differentiator between average and exceptional leaders — and it can\'t be automated.',
    icon: 'heart-outline',
    color: '#EC4899',
    atomicSkills: [
      {
        id: 'self_awareness_eq',
        name: 'Self-Awareness',
        description: 'Notice your emotions, triggers, and patterns in real time.',
      },
      {
        id: 'empathy_eq',
        name: 'Empathy',
        description: 'Understand others\' perspectives and emotional experiences without judgment.',
      },
      {
        id: 'conflict_navigation',
        name: 'Conflict Navigation',
        description: 'Handle disagreements constructively while maintaining relationships.',
      },
      {
        id: 'influence',
        name: 'Positive Influence',
        description: 'Motivate and inspire others through authentic connection.',
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
    id: 'digital_collaboration',
    name: 'Digital Collaboration',
    tagline: 'Make remote work, work',
    description:
      'Communicate, coordinate, and build trust with teammates across tools, time zones, and remote or hybrid environments.',
    why: 'The majority of knowledge work now happens digitally. The ability to collaborate asynchronously and across cultures is essential.',
    icon: 'people-outline',
    color: '#3B82F6',
    atomicSkills: [
      {
        id: 'async_communication',
        name: 'Async Communication',
        description: 'Write clearly and set context so others can act without needing you live.',
      },
      {
        id: 'virtual_facilitation',
        name: 'Virtual Facilitation',
        description: 'Lead engaging and productive meetings and workshops in digital spaces.',
      },
      {
        id: 'tool_literacy_collab',
        name: 'Tool Literacy',
        description: 'Use collaboration platforms effectively (e.g. Notion, Slack, Figma, Miro).',
      },
      {
        id: 'digital_presence',
        name: 'Digital Presence',
        description: 'Build rapport and trust through screens with intentional communication.',
      },
    ],
  },
  {
    id: 'data_literacy',
    name: 'Data Literacy',
    tagline: 'Read numbers like a story',
    description:
      'Understand, interpret, and communicate data — without needing to be a data scientist.',
    why: 'Every role now involves data in some form. Those who can read, question, and use it effectively make better decisions.',
    icon: 'bar-chart-outline',
    color: '#8B5CF6',
    atomicSkills: [
      {
        id: 'chart_reading',
        name: 'Chart & Graph Reading',
        description: 'Extract the right insights from visualisations quickly and accurately.',
      },
      {
        id: 'stats_interpretation',
        name: 'Statistical Interpretation',
        description: 'Understand averages, trends, correlations, and what they do (and don\'t) mean.',
      },
      {
        id: 'misinformation_spotting',
        name: 'Misinformation Spotting',
        description: 'Identify misleading or manipulated data presentations.',
      },
      {
        id: 'data_questions',
        name: 'Asking Data Questions',
        description: 'Frame the right questions before diving into analysis.',
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

export function getAtomicSkillById(
  skillId: string,
  atomicId: string
): AtomicSkill | undefined {
  return getSkillById(skillId)?.atomicSkills.find((a) => a.id === atomicId);
}
