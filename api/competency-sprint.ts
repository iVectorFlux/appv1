import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyCors, handleCorsPreflight } from './_lib/cors';
import { GROQ_CHAT_COMPLETIONS_URL, getGroqEnv } from './_lib/groq-config';

// Pre-seeded master templates for Have Difficult Conversations demo
const DEFAULT_MICRO_SKILLS = [
  {
    id: 'active_validation',
    name: 'Active Validation & Empathy',
    description: 'Acknowledge the other person\'s feelings and perspective before pushing your own agenda.',
    why: 'Validation disarms defensiveness and signals that you are engaging in a dialogue, not a battle.',
    goodExample: '"I hear how frustrating it was to find out about the delay at the last minute, and I can see how that put your team in a tough spot."',
    badExample: '"Well, we had other priorities, so you just have to deal with the schedule as it is."'
  },
  {
    id: 'objective_framing',
    name: 'Objective Truth Framing',
    description: 'Separate clear, observable facts from personal interpretations, emotional projections, or blame.',
    why: 'Stating facts prevents the conversation from devolving into an argument about intent or character.',
    goodExample: '"The technical specifications were sent on Thursday afternoon, and our deadline was Tuesday morning."',
    badExample: '"Your team lazy-walked the deliverables and totally sabotaged our launch date!"'
  },
  {
    id: 'clear_assertion',
    name: 'Clear, Non-Defensive Assertion',
    description: 'State your boundary, perspective, or request directly without apology or aggression.',
    why: 'Passive communicators breed resentment; aggressive ones trigger war. Clear assertion maintains mutual respect.',
    goodExample: '"In order to ensure high-quality output, I need at least 48 hours to review files before they go live. Moving forward, I cannot approve last-minute changes."',
    badExample: '"Sorry to complain, but I guess maybe if you have time, could you possibly try to send things a bit earlier? If not, it\'s fine..."'
  },
  {
    id: 'emotional_containment',
    name: 'De-escalation & Containment',
    description: 'Maintain internal calm and a steady tone when the other party gets defensive or aggressive.',
    why: 'Emotional contagion is real. By staying anchored, you prevent a professional discussion from turning into an emotional argument.',
    goodExample: '"I notice we are both feeling passionate about this. Let\'s take a breath and focus on how we can resolve the current blocker together."',
    badExample: '"Don\'t take that tone with me! You\'re the one who started this mess!"'
  },
  {
    id: 'co_creative_problem_solving',
    name: 'Co-Creative Problem Solving',
    description: 'Pivot the conversation from arguing about the past to co-designing a collaborative forward-looking agreement.',
    why: 'The ultimate goal of a difficult conversation is not to win, but to build a stronger working relationship.',
    goodExample: '"Let\'s look at our handoff process. What is one concrete adjustment we can both make to prevent this scheduling gap next month?"',
    badExample: '"Just make sure this never happens again. I\'m watching you."'
  }
];

const DEFAULT_DRILLS = {
  active_validation: {
    scenario: "Your product manager says: 'You are always complaining about the timeline, but we have strict market deadlines to meet!'",
    question: "Acknowledge their timeline pressure first with genuine validation, without immediately agreeing to work overtime."
  },
  objective_framing: {
    scenario: "A peer from sales confronts you: 'Your division is completely ignoring our client requests! You guys are totally unresponsive!'",
    question: "Frame your reply objectively by asking for facts and separating observations from their emotional generalizations."
  },
  clear_assertion: {
    scenario: "A teammate says: 'Hey, I can't finish my part of the slides. Can you just write the executive summary for me tonight? Thanks!'",
    question: "Assert a firm, respectful boundary saying 'No' because of your prior commitments, without over-apologizing."
  },
  emotional_containment: {
    scenario: "In a review, a stakeholder slams their laptop: 'This design is completely garbage! Who signed off on this rubbish?'",
    question: "Respond with absolute calm and composure to de-escalate their anger and anchor the talk around constructive specifics."
  },
  co_creative_problem_solving: {
    scenario: "Your developer says: 'Look, I hate this new reporting system. It's a waste of time. I'm just not going to fill it out.'",
    question: "Pivot them away from their refusal into a co-creative brainstorming loop to find a method that satisfies tracking needs without frustrating them."
  }
};




// Groq Upstream helper
async function callGroqChat(messages: any[], apiKey: string, model: string, maxTokens = 800) {
  const body = {
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    response_format: { type: 'json_object' }
  };

  const res = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq failed: ${text}`);
  }

  const data = await res.json();
  const rawContent = data.choices?.[0]?.message?.content ?? '{}';
  return JSON.parse(rawContent.trim());
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  applyCors(res);
  if (handleCorsPreflight(req, res)) return;

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const groq = getGroqEnv();
  const apiKey = groq?.apiKey ?? '';
  const model = groq?.model ?? 'llama-3.3-70b-versatile';

  const body = req.body || {};
  const action = body.action;

  try {
    // 1. GENERATE MICRO SKILLS
    if (action === 'generate_micro_skills') {
      const context = body.context || {};
      const { industry = '', role = '', function: workSetting = '', situation = '' } = context;

      if (!apiKey) {
        // Fallback if no API key is configured
        res.status(200).json({
          microSkills: DEFAULT_MICRO_SKILLS,
          drills: Object.entries(DEFAULT_DRILLS).map(([k, v]) => ({
            microSkillId: k,
            scenario: v.scenario,
            question: v.question
          })),
          simCharacter: {
            name: "Sarah",
            role: "Database Developer",
            personality: "protective of her time and highly suspicious of 'process' talk",
            situation: "database migration and late code handoff delays causing team friction",
            openingGuided: "Look, I'm really busy with the database migration. What is this meeting about? I hope this isn't another long talk about process.",
            openingIndependent: "Hey, I saw your invite. What's this about? I hope this isn't another meeting that could have been an email.",
            openingEscalated: "Look, I already explained this! Why are you micromanaging my Slack updates? I don't have time to write essays for your team!",
            tipGuided: "Sarah is protective of her time. Start by validating her busy migration schedule and state your objective clearly.",
            tipIndependent: "Sarah is defensive but accessible. State the meeting's objective directly and make her feel respected.",
            tipEscalated: "Sarah is triggered. Avoid matching her energy. Validate her emotional state and establish a firm container."
          }
        });
        return;
      }

      const prompt = `You are a world-class EQ and executive communication coach.
The user is a professional with the following background:
- Industry: ${industry || 'General Workplace'}
- Role: ${role || 'Team Member'}
- Work Setting / Function: ${workSetting || 'Collaborative'}
- Specific Friction Situation: ${situation || 'A defensive colleague causing delays or misalignment'}

Create a fully custom, highly realistic Competency Sprint package on "Having Difficult Conversations" tailored specifically to their work context.
If the Specific Friction Situation is not provided, design a highly realistic, specific workplace friction scenario that would typically occur in their Industry and Role.

Generate the exact custom micro-skills, micro-drills, and simulation counterpart details.
You MUST return a JSON object in this exact format:
{
  "microSkills": [
    {
      "id": "skill_1_id", // alphanumeric string, e.g. "active_validation", "objective_framing", "clear_assertion", "emotional_containment", "co_creative_problem_solving"
      "name": "Skill Name",
      "description": "Clear explanation of how to use this micro-skill.",
      "why": "Why this skill is crucial in resolving friction.",
      "goodExample": "A realistic, perfect quote of what to say using this skill in the situation.",
      "badExample": "A realistic, poor quote of what NOT to say."
    }
    // Generate exactly 5 distinct micro-skills
  ],
  "drills": [
    {
      "microSkillId": "skill_1_id", // must match one of the micro-skills id generated above
      "scenario": "A highly realistic, single-sentence quote from their colleague/counterpart confronting the user.",
      "question": "A specific coach instruction detailing how to respond using the mapped micro-skill."
    }
    // Generate exactly 5 drills, each mapped to one of the 5 microSkills
  ],
  "simCharacter": {
    "name": "Firstname of counterpart",
    "role": "Their professional role",
    "personality": "Short description of their personality and defensiveness profile",
    "situation": "Short 1-sentence description of the core situation/friction",
    "openingGuided": "Their opening message (2 sentences) for the Guided simulation.",
    "openingIndependent": "Their opening message (2 sentences) for the Independent simulation.",
    "openingEscalated": "Their opening message (2 sentences) for the Escalated simulation.",
    "tipGuided": "Initial coaching tip (2 sentences) explaining the counterpart's mindset and what the user should do first.",
    "tipIndependent": "1-sentence coaching advice for the start of Independent mode.",
    "tipEscalated": "1-sentence coaching advice for the start of Escalated mode."
  }
}`;

      try {
        const result = await callGroqChat([{ role: 'user', content: prompt }], apiKey, model, 1500);
        res.status(200).json(result);
        return;
      } catch (err) {
        console.error("Groq generate_micro_skills failed, fallback to static defaults", err);
        res.status(200).json({
          microSkills: DEFAULT_MICRO_SKILLS,
          drills: Object.entries(DEFAULT_DRILLS).map(([k, v]) => ({
            microSkillId: k,
            scenario: v.scenario,
            question: v.question
          })),
          simCharacter: {
            name: "Sarah",
            role: "Database Developer",
            personality: "protective of her time and highly suspicious of 'process' talk",
            situation: "database migration and late code handoff delays causing team friction",
            openingGuided: "Look, I'm really busy with the database migration. What is this meeting about? I hope this isn't another long talk about process.",
            openingIndependent: "Hey, I saw your invite. What's this about? I hope this isn't another meeting that could have been an email.",
            openingEscalated: "Look, I already explained this! Why are you micromanaging my Slack updates? I don't have time to write essays for your team!",
            tipGuided: "Sarah is protective of her time. Start by validating her busy migration schedule and state your objective clearly.",
            tipIndependent: "Sarah is defensive but accessible. State the meeting's objective directly and make her feel respected.",
            tipEscalated: "Sarah is triggered. Avoid matching her energy. Validate her emotional state and establish a firm container."
          }
        });
        return;
      }
    }

    // 2. GENERATE DRILL SCENARIO (Legacy endpoint, fallback only)
    if (action === 'generate_drill_scenario') {
      const { microSkillId } = body;
      const drill = DEFAULT_DRILLS[microSkillId as keyof typeof DEFAULT_DRILLS] || DEFAULT_DRILLS.active_validation;
      res.status(200).json(drill);
      return;
    }

    // 3. EVALUATE DRILL
    if (action === 'evaluate_drill') {
      const { scenario, question, userAnswer, microSkillName } = body;
      if (!userAnswer) {
        res.status(400).json({ error: "userAnswer is required" });
        return;
      }

      if (!apiKey) {
        // Fallback when API key is missing
        res.status(200).json({
          score: 8,
          feedback: "Great start! Your response addresses the counterpart's core concern directly while keeping a polite tone. To improve, make sure to state your own operating constraint even more transparently.",
          strengths: ["Clear validation of their concern", "Polite and professional language"],
          growthAreas: ["Asserting your personal boundaries more firmly"],
          perfectResponse: "I understand that meeting market deadlines is absolutely critical for the product's success. To help us hit those targets reliably without burning out, let's establish a pre-planning buffer so we can catch scope changes early."
        });
        return;
      }

      const prompt = `You are a world-class EQ and executive communication coach.
Evaluate the user's response to the following micro-drill scenario for the skill: "${microSkillName}".

Scenario: ${scenario}
Question/Task: ${question}
User's Response: "${userAnswer}"

Evaluate their response strictly on how effectively they applied the "${microSkillName}" skill.
Return a JSON object in this exact format:
{
  "score": 8, // Integer 0 to 10
  "feedback": "2-3 sentences of constructive coaching.",
  "strengths": ["Strength 1", "Strength 2"],
  "growthAreas": ["Growth area 1"],
  "perfectResponse": "An exact quote of what a master communicator would say in this scenario."
}`;

      try {
        const evalResult = await callGroqChat([{ role: 'user', content: prompt }], apiKey, model, 600);
        res.status(200).json(evalResult);
        return;
      } catch (err) {
        console.error("Groq evaluation failed, falling back to static", err);
        res.status(200).json({
          score: 7,
          feedback: "A good, cooperative response. You validated their frustration which is excellent for de-escalation. To elevate your impact, anchor your assertion around concrete facts rather than justifications.",
          strengths: ["Strong empathy validation", "Constructive, solution-oriented wording"],
          growthAreas: ["Setting boundaries more directly"],
          perfectResponse: "I completely recognize the tight deadlines we are under. Let's work together to establish clear handoff guidelines so we can keep the pace without dropping product quality."
        });
        return;
      }
    }

    // 4. SIMULATION TURN (Guided, Independent, Escalated)
    if (action === 'simulation_turn') {
      const { mode, chatHistory = [], selectedOptionId, userAnswer, customContext } = body;
      const isGuided = mode === 'guided';

      const simChar = customContext?.simCharacter || {
        name: "Sarah",
        role: "Database Developer",
        personality: "protective of her time and highly suspicious of 'process' talk",
        situation: "database migration and late code handoff delays causing team friction",
        openingGuided: "Look, I'm really busy with the database migration. What is this meeting about? I hope this isn't another long talk about process.",
        openingIndependent: "Hey, I saw your invite. What's this about? I hope this isn't another meeting that could have been an email.",
        openingEscalated: "Look, I already explained this! Why are you micromanaging my Slack updates? I don't have time to write essays for your team!",
        tipGuided: "Sarah is protective of her time. Start by validating her busy migration schedule and state your objective clearly.",
        tipIndependent: "Sarah is defensive but accessible. State the meeting's objective directly and make her feel respected.",
        tipEscalated: "Sarah is triggered. Avoid matching her energy. Validate her emotional state and establish a firm container."
      };

      if (!userAnswer) {
        const openingMessage = mode === 'escalated'
          ? simChar.openingEscalated
          : isGuided
            ? simChar.openingGuided
            : simChar.openingIndependent;

        const openingTip = mode === 'escalated'
          ? simChar.tipEscalated
          : isGuided
            ? simChar.tipGuided
            : simChar.tipIndependent;

        res.status(200).json({
          characterReply: openingMessage,
          telemetry: { empathy: 50, clarity: 50, assertiveness: 50, deEscalation: 50 },
          tip: openingTip
        });
        return;
      }

      if (!apiKey) {
        // Fallback telemetry if Groq is offline
        const charReply = mode === 'escalated'
          ? `Fine, I get it. But I am drowning in work here! If I pause to slow down, the main project will slip! What do you want me to do?`
          : isGuided
            ? `Honestly, everything feels fine to me. I do my part. If others don't understand the handoff, they should ask instead of complaining.`
            : `I understand you want this resolved. But when changes keep happening, it pushes me behind. How do we prevent changes mid-week?`;
        res.status(200).json({
          characterReply: charReply,
          telemetry: { empathy: 75, clarity: 80, assertiveness: 70, deEscalation: 75 },
          tip: isGuided
            ? `Coach Guide: ${simChar.name} is shifting blame. Acknowledge that their work quality is high but bring the conversation back to the observable delays and suggest setting a firm process agreement.`
            : `Great pivot. ${simChar.name} is now sharing their real blockers. Focus on establishing a solution-oriented collaboration structure.`
        });
        return;
      }

      // Live AI character and telemetry generation
      const simMessages = chatHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content
      }));

      // Add user answer to prompt
      simMessages.push({ role: 'user', content: userAnswer });

      const systemPrompt = `You are playing the role of "${simChar.name}", a ${simChar.role} who is ${simChar.personality}. You are currently in a high-stakes difficult conversation with the user (their manager or peer) about: ${simChar.situation}.

Mode of simulation: ${
  isGuided
    ? `GUIDED SIMULATION (MODERATE DIFFICULTY). You are defensive but accessible. You want to resolve the conflict but are highly protective of your time and authority. The user needs supportive coaching guidance to handle this conversation successfully.`
    : mode === 'escalated'
      ? `EXTREMELY HOSTILE SIMULATION (HIGH DIFFICULTY). You are highly triggered, highly defensive, and blame the manager/peer for micromanagement, lack of support, or unfair demands.`
      : `INDEPENDENT SIMULATION (HARD DIFFICULTY). You are professional but defensive, skeptical, and expect clear business logic and mutual respect.`
}

CRITICAL INSTRUCTIONS FOR LIVE EQ EVALUATION (telemetry):
You MUST perform a rigorous, realistic, and highly critical evaluation of the user's latest input. Be honest and strict:
1. "empathy" (0-100): Evaluate how well the user validates, acknowledges, or shows empathy for ${simChar.name}'s feelings, constraints, or workload situation.
   - If the user's input is hostile, rude, dismissive, or aggressive (such as "shut up", "go away", "stop complaining", "be quiet", "I don't care", "you are wrong", or any insults), the empathy score MUST be exactly 0.
   - If the user completely ignores ${simChar.name}'s perspective or feelings, the score must be under 20.
   - A score above 70 is only given if the user explicitly validates or restates ${simChar.name}'s feelings and workload situation before offering a resolution.
2. "deEscalation" (0-100): How calm, composed, and productive is the user's communication?
   - If the user uses hostile commands, angry outbursts, or aggressive phrases like "shut up", the deEscalation score MUST be exactly 0.
   - If the user matches ${simChar.name}'s defensive or hostile energy, the score must be under 30.
3. "assertiveness" (0-100): How well does the user maintain professional boundaries and objective targets?
   - Over-apologizing or completely surrendering to ${simChar.name}'s pushback must score below 45.
   - Hostility, blame-shifting, or aggressive attacks must score below 30.
   - Calm, firm, and objective boundaries score 75-100.
4. "clarity" (0-100): How clear, factual, and direct is the communication?
   - Vague, general, or purely emotional arguments must score below 40.
   - Objective facts and clear, collaborative proposals score 75-100.

Generate ${simChar.name}'s next dynamic response (2-3 sentences), evaluate the user's emotional intelligence live, and provide a coaching tip.
Return a JSON object in this exact format:
{
  "characterReply": "Your short 2-3 sentence conversational reply.",
  "telemetry": {
    "empathy": 0, // Integer 0 to 100
    "clarity": 85, // Integer 0 to 100
    "assertiveness": 75, // Integer 0 to 100
    "deEscalation": 0 // Integer 0 to 100
  },
  "tip": "${
    isGuided
      ? `An extremely detailed, step-by-step coaching tip (2-3 sentences) guiding the user on what specific EQ micro-skills to deploy in their next message, explaining what they did well and suggesting a master-level communication structure they can adapt.`
      : `A short 1-sentence coaching advice for the side-panel (empathetic, actionable, 'give me tip but don't talk' style).`
  }"
}`;

      const aiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...simMessages.slice(-6) // Send recent turns for memory efficiency
      ];

      try {
        const result = await callGroqChat(aiMessages, apiKey, model, 700);
        res.status(200).json(result);
        return;
      } catch (err) {
        console.error("AI turn generation failed, fallback", err);
        res.status(200).json({
          characterReply: `Let's just agree to keep things simple. If we can freeze requirements ahead of time, my work will be clean.`,
          telemetry: { empathy: 70, clarity: 75, assertiveness: 80, deEscalation: 70 },
          tip: "Keep the counterpart focused on this agreement. Confirm it explicitly to wrap up the conversation."
        });
        return;
      }
    }

    // 5. GENERATE FINAL REPORT
    if (action === 'generate_final_report') {
      const { drills = [], guidedTrans = [], independentTrans = [], escalatedTrans = [], customContext } = body;
      const simChar = customContext?.simCharacter || { name: 'Sarah', role: 'database developer', situation: 'code handoff delays' };

      if (!apiKey) {
        res.status(200).json({
          overallScore: 84,
          traits: {
            empathy: 88,
            clarity: 82,
            assertiveness: 80,
            deEscalation: 90,
            problemSolving: 82
          },
          detailedAnalysis: `You demonstrated outstanding emotional containment and active empathy across all simulations in your role as a ${customContext?.role || 'Professional'} in the ${customContext?.industry || 'General'} industry. You navigated ${simChar.name}'s defensive outbursts with high poise, consistently de-escalating conflicts and steering conversations toward concrete, collaborative agreements. Your growth area is assertiveness: occasionally, you softened boundaries with unnecessary explanations. Continue practicing to maintain absolute clarity on your needs.`,
          strengths: ["Poised de-escalation under hostility", "Active validation of counterpart's context"],
          growthAreas: ["Holding firm boundaries without over-explaining", "Maintaining high structural clarity in initial openings"],
          recommendedRepeats: 2
        });
        return;
      }

      const prompt = `You are a senior executive coach and emotional intelligence auditor.
Compile a comprehensive, premium performance report based on the transcripts of a learner's Competency Sprint on "Having Difficult Conversations".

The user completed this sprint in the following context:
- Role: ${customContext?.role || 'Professional'}
- Industry: ${customContext?.industry || 'General'}
- Counterpart: ${simChar.name} (${simChar.role})
- Core Situation: ${simChar.situation}

Review these transcript summaries:
- Micro-drills answers & evaluations: ${JSON.stringify(drills)}
- Guided Simulation with ${simChar.name}: ${JSON.stringify(guidedTrans)}
- Independent Simulation with ${simChar.name}: ${JSON.stringify(independentTrans)}
- Escalated Simulation with ${simChar.name}: ${JSON.stringify(escalatedTrans)}

Evaluate their traits (empathy, clarity, assertiveness, de-escalation, problem solving) out of 100.
Compute an overall score (0-100).
Decide how many more repeats of the simulation are recommended (1 to 4) based on their scores (scores < 70 get 3-4, 70-85 get 2, >85 get 1).

Return a JSON object in this exact format:
{
  "overallScore": 84,
  "traits": {
    "empathy": 85,
    "clarity": 80,
    "assertiveness": 75,
    "deEscalation": 90,
    "problemSolving": 80
  },
  "detailedAnalysis": "A rich 4-5 sentence editorial coaching narrative summarizing their overall performance, behavior trends, and professional impacts in their specific workplace context.",
  "strengths": ["Strengths 1", "Strengths 2"],
  "growthAreas": ["Growth area 1", "Growth area 2"],
  "recommendedRepeats": 2
}`;

      try {
        const report = await callGroqChat([{ role: 'user', content: prompt }], apiKey, model, 1000);
        res.status(200).json(report);
        return;
      } catch (err) {
        console.error("AI report failed, fallback", err);
        res.status(200).json({
          overallScore: 80,
          traits: { empathy: 82, clarity: 78, assertiveness: 75, deEscalation: 85, problemSolving: 80 },
          detailedAnalysis: `You've successfully completed the sprint! You showed strong composure and de-escalation skills during ${simChar.name}'s hostile turns, keeping the dialogue constructive. Your assertiveness score suggests room to hold boundaries more directly without feeling the need to apologize or soften requests.`,
          strengths: ["Excellent composure during high tension", "Active listening and validation"],
          growthAreas: ["Holding boundaries without over-apologizing", "Structuring clear meeting objectives early"],
          recommendedRepeats: 3
        });
        return;
      }
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    console.error("[competency-sprint] Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
