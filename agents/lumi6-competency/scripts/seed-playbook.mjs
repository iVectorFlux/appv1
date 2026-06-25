/**
 * Seed Upstash Vector with Difficult Conversations micro-skills + drills.
 * Run: cd agents/lumi6-competency && npm install && npm run seed
 */

import 'dotenv/config';
import { Index } from '@upstash/vector';

const url = process.env.UPSTASH_VECTOR_REST_URL;
const token = process.env.UPSTASH_VECTOR_REST_TOKEN;

if (!url || !token) {
  console.error('Set UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN in .env');
  process.exit(1);
}

const index = new Index({ url, token });

const MICRO_SKILLS = [
  {
    id: 'active_validation',
    name: 'Active Validation & Empathy',
    description:
      'Acknowledge the other person\'s feelings and perspective before pushing your own agenda.',
    why: 'Validation disarms defensiveness and signals dialogue, not battle.',
    goodExample:
      '"I hear how frustrating it was to find out about the delay at the last minute."',
    badExample: '"You just have to deal with the schedule as it is."',
  },
  {
    id: 'objective_framing',
    name: 'Objective Truth Framing',
    description: 'Separate observable facts from interpretations or blame.',
    why: 'Facts prevent arguments about intent or character.',
    goodExample: '"Specs were sent Thursday; our deadline was Tuesday morning."',
    badExample: '"Your team sabotaged our launch date!"',
  },
  {
    id: 'clear_assertion',
    name: 'Clear, Non-Defensive Assertion',
    description: 'State boundaries directly without apology or aggression.',
    why: 'Clear assertion maintains mutual respect.',
    goodExample: '"I need 48 hours to review files before they go live."',
    badExample: '"Sorry, could you possibly try to send things earlier? If not, fine..."',
  },
  {
    id: 'emotional_containment',
    name: 'De-escalation & Containment',
    description: 'Stay calm when the other party gets defensive or aggressive.',
    why: 'Anchored tone prevents emotional contagion.',
    goodExample: '"Let\'s take a breath and focus on resolving the blocker together."',
    badExample: '"Don\'t take that tone with me!"',
  },
  {
    id: 'co_creative_problem_solving',
    name: 'Co-Creative Problem Solving',
    description: 'Pivot from past blame to forward-looking agreement.',
    why: 'Goal is a stronger working relationship, not winning.',
    goodExample: '"What is one adjustment we can both make next month?"',
    badExample: '"Just make sure this never happens again."',
  },
];

const DRILLS = {
  active_validation: {
    scenario:
      "Your PM says: 'You are always complaining about the timeline, but we have strict market deadlines!'",
    question:
      'Acknowledge their timeline pressure with genuine validation, without agreeing to work overtime.',
  },
  objective_framing: {
    scenario:
      "Sales says: 'Your division is completely ignoring our client requests!'",
    question: 'Reply with facts and separate observations from emotional generalizations.',
  },
  clear_assertion: {
    scenario: "A teammate asks you to write their executive summary tonight.",
    question: 'Assert a firm, respectful boundary without over-apologizing.',
  },
  emotional_containment: {
    scenario: "A stakeholder slams their laptop: 'This design is garbage!'",
    question: 'Respond with calm and anchor on constructive specifics.',
  },
  co_creative_problem_solving: {
    scenario: "A developer refuses to fill out a new reporting system.",
    question: 'Pivot into co-creative brainstorming for a workable tracking method.',
  },
};

const competency = 'difficult_conversations';
const records = [];

for (const skill of MICRO_SKILLS) {
  records.push({
    id: `playbook_skill_${skill.id}`,
    data: `${skill.name}. ${skill.description} Why: ${skill.why} Good: ${skill.goodExample} Avoid: ${skill.badExample}`,
    metadata: {
      type: 'micro_skill',
      skillId: skill.id,
      competency,
    },
  });
  const drill = DRILLS[skill.id];
  if (drill) {
    records.push({
      id: `playbook_drill_${skill.id}`,
      data: `Drill for ${skill.name}. Scenario: ${drill.scenario} Practice question: ${drill.question}`,
      metadata: {
        type: 'drill',
        skillId: skill.id,
        competency,
      },
    });
  }
}

console.log(`Upserting ${records.length} playbook vectors...`);
await index.upsert(records);
console.log('Done. Test with: npx adk web → ask about validating a frustrated PM.');
