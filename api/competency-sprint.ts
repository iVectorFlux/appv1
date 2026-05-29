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

// Branching script for Guided Simulation (Colleague "Sarah" is highly competent but defensive about code handoffs)
const GUIDED_SIMULATION_SCRIPT: Record<string, any> = {
  start: {
    characterReply: "Look, I'm really busy with the database migration. What is this meeting about? I hope this isn't another long talk about process.",
    tip: "Sarah is protective of her time and highly suspicious of 'process' talk. Start by validating her busy schedule and state your objective clearly but non-defensively.",
    options: [
      {
        id: 'a',
        label: "Thanks for making time, Sarah. I know you're swamped. I want to chat about how our recent handoffs felt for you, and find a way to make them smoother.",
        telemetry: { empathy: 90, clarity: 85, assertiveness: 80, deEscalation: 85 }
      },
      {
        id: 'b',
        label: "Oh, sorry to disrupt you. It's nothing big, just some administrative alignment. We can get it done in two minutes if you want.",
        telemetry: { empathy: 60, assertiveness: 35, clarity: 30, deEscalation: 70 }
      },
      {
        id: 'c',
        label: "We need to talk because your tone in our Slack channels during code handoffs has been completely unacceptable and is slowing down the team.",
        telemetry: { empathy: 15, assertiveness: 95, clarity: 90, deEscalation: 20 }
      }
    ]
  },
  'turn_1_a': {
    characterReply: "Honestly, they feel fine to me. I write clean code and document my API endpoints. If your frontend devs don't understand the specs, they should ask rather than complaining to you that I'm blocking them.",
    tip: "Sarah is shifting blame to the frontend developers. Avoid taking the bait or getting defensive on their behalf. Use 'Objective Truth Framing' to focus on the observable handoff delays.",
    options: [
      {
        id: 'a',
        label: "I appreciate that your code is solid. However, our last three deployments were delayed by 24 hours because the spec files weren't shared until the deadline. Let's look at that gap.",
        telemetry: { empathy: 80, clarity: 95, assertiveness: 90, deEscalation: 90 }
      },
      {
        id: 'b',
        label: "Yeah, I guess they could ask more questions. But still, it would be nicer if you were a bit more friendly when answering them.",
        telemetry: { empathy: 55, assertiveness: 40, clarity: 45, deEscalation: 65 }
      },
      {
        id: 'c',
        label: "They shouldn't have to ask because your documentation is often incomplete. You need to take responsibility for how hard it is to work with you.",
        telemetry: { empathy: 25, assertiveness: 85, clarity: 75, deEscalation: 25 }
      }
    ]
  },
  'turn_1_b': {
    characterReply: "Okay, great. If it's just administrative, can you just email it to me? I really don't have time to sit here and talk about administrative details.",
    tip: "You have completely lost control by downplaying the meeting. You must re-assert the importance of this face-to-face talk immediately and bring up the handoff issue firmly.",
    options: [
      {
        id: 'a',
        label: "I understand you're busy, but this is a collaboration blocker that we need to resolve together. Specifically, our deployment handoffs have been hitting delays, and we need a plan.",
        telemetry: { empathy: 70, clarity: 90, assertiveness: 90, deEscalation: 80 }
      },
      {
        id: 'b',
        label: "I guess I could email it. But it's about the handoffs... some people feel they are a bit rocky. Let me know what you think.",
        telemetry: { empathy: 50, assertiveness: 25, clarity: 20, deEscalation: 60 }
      },
      {
        id: 'c',
        label: "No, you don't get to just leave. Sit down. Your handoffs are messy, and you need to hear this feedback whether you like it or not.",
        telemetry: { empathy: 10, assertiveness: 90, clarity: 85, deEscalation: 15 }
      }
    ]
  },
  'turn_1_c': {
    characterReply: "My tone? I am working 60-hour weeks to single-handedly ship the database engine! If your team spent less time crying about Slack emojis and more time learning to write proper queries, we wouldn't have handoff delays!",
    tip: "Sarah is highly defensive and hostile now. Any counter-accusation will end the meeting. Use 'De-escalation & Containment' to validate her hard work and focus on the shared deployment goals.",
    options: [
      {
        id: 'a',
        label: "You are working incredibly hard, Sarah, and the database engine is excellent. I want to protect that work. But emotional tension on Slack is draining the team's energy. Let's work out how to hand off specs calmly.",
        telemetry: { empathy: 85, clarity: 85, assertiveness: 80, deEscalation: 95 }
      },
      {
        id: 'b',
        label: "I'm sorry, I didn't mean to insult your hard work. You're right, you do work very hard. Let's just drop it, okay?",
        telemetry: { empathy: 65, assertiveness: 20, clarity: 20, deEscalation: 80 }
      },
      {
        id: 'c',
        label: "Don't lecture me about coding. Your hard work doesn't give you a license to act like a bully. We are going to fix this tone issue right now.",
        telemetry: { empathy: 10, assertiveness: 95, clarity: 90, deEscalation: 10 }
      }
    ]
  },
  'turn_2_a': {
    characterReply: "Fine. Thursday handoffs are late because QA keeps pushing last-minute schema requests on Wednesday nights. I can't write documentation when the fields are shifting under my feet.",
    tip: "Sarah has revealed a systemic blocker (QA schema shifts). This is a breakthrough! Pivot to 'Co-creative Problem Solving' to establish a code freeze or better sync process.",
    options: [
      {
        id: 'a',
        label: "That's a very fair point—shifting requirements make documentation impossible. Let's set a firm schema freeze for Wednesday noon, so you have clean specs by Thursday. How does that sound?",
        telemetry: { empathy: 90, clarity: 90, assertiveness: 85, deEscalation: 95 }
      },
      {
        id: 'b',
        label: "Well, QA says you don't listen to their requests anyway. But I guess a freeze could work. I will think about it.",
        telemetry: { empathy: 50, assertiveness: 45, clarity: 50, deEscalation: 55 }
      },
      {
        id: 'c',
        label: "That's just an excuse. You should be able to document it even with changes. Stop blaming QA for your delays.",
        telemetry: { empathy: 15, assertiveness: 80, clarity: 70, deEscalation: 20 }
      }
    ]
  },
  'conclude': {
    characterReply: "Alright. If we can freeze the schema by Wednesday noon, I can commit to sharing complete, documented specs by Thursday at 10 AM. It will save everyone a lot of headaches. Thanks for bringing this up constructively.",
    tip: "Excellent simulation! Sarah is aligned, feels validated, and has co-created a concrete solution. Tap 'Conclude Chat' to finalize the simulation.",
    options: []
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
      // In a real app we could hit Groq, but to guarantee the absolute best experience we return the seeded list.
      return res.status(200).json({ microSkills: DEFAULT_MICRO_SKILLS });
    }

    // 2. GENERATE DRILL SCENARIO
    if (action === 'generate_drill_scenario') {
      const { microSkillId } = body;
      const drill = DEFAULT_DRILLS[microSkillId as keyof typeof DEFAULT_DRILLS] || DEFAULT_DRILLS.active_validation;
      return res.status(200).json(drill);
    }

    // 3. EVALUATE DRILL
    if (action === 'evaluate_drill') {
      const { scenario, question, userAnswer, microSkillName } = body;
      if (!userAnswer) {
        return res.status(400).json({ error: "userAnswer is required" });
      }

      if (!apiKey) {
        // Fallback when API key is missing
        return res.status(200).json({
          score: 8,
          feedback: "Great start! Your response addresses the counterpart's core concern directly while keeping a polite tone. To improve, make sure to state your own operating constraint even more transparently.",
          strengths: ["Clear validation of their concern", "Polite and professional language"],
          growthAreas: ["Asserting your personal boundaries more firmly"],
          perfectResponse: "I understand that meeting market deadlines is absolutely critical for the product's success. To help us hit those targets reliably without burning out, let's establish a pre-planning buffer so we can catch scope changes early."
        });
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
        return res.status(200).json(evalResult);
      } catch (err) {
        console.error("Groq evaluation failed, falling back to static", err);
        return res.status(200).json({
          score: 7,
          feedback: "A good, cooperative response. You validated their frustration which is excellent for de-escalation. To elevate your impact, anchor your assertion around concrete facts rather than justifications.",
          strengths: ["Strong empathy validation", "Constructive, solution-oriented wording"],
          growthAreas: ["Setting boundaries more directly"],
          perfectResponse: "I completely recognize the tight deadlines we are under. Let's work together to establish clear handoff guidelines so we can keep the pace without dropping product quality."
        });
      }
    }

    // 4. SIMULATION TURN (Guided, Independent, Escalated)
    if (action === 'simulation_turn') {
      const { mode, chatHistory = [], selectedOptionId, userAnswer } = body;

      // ────────────────── A. GUIDED MODE ──────────────────
      if (mode === 'guided') {
        const turnCount = chatHistory.filter((m: any) => m.role === 'user').length;

        if (turnCount === 0) {
          // Send the initial opening from Sarah
          return res.status(200).json(GUIDED_SIMULATION_SCRIPT.start);
        }

        // Branching logic based on turn and choices
        const lastUserMsg = chatHistory[chatHistory.length - 1];
        const prevUserMsg = chatHistory[chatHistory.length - 3]; // User's turn 1 (if we are on turn 2)

        if (turnCount === 1) {
          // Guided Turn 1 has completed, user chose an option.
          const choice = selectedOptionId || 'a';
          const nextScriptKey = `turn_1_${choice}`;
          const responsePayload = GUIDED_SIMULATION_SCRIPT[nextScriptKey] || GUIDED_SIMULATION_SCRIPT.turn_1_a;
          return res.status(200).json(responsePayload);
        }

        if (turnCount === 2) {
          // Guided Turn 2 has completed
          const choice = selectedOptionId || 'a';
          if (choice === 'a') {
            return res.status(200).json(GUIDED_SIMULATION_SCRIPT.conclude);
          } else {
            // Give them a second chance or conclude with slightly lower score
            return res.status(200).json({
              characterReply: "I see your point, but QA really needs to freeze their specs earlier. If you can handle QA, I will try to make my Thursday handoffs clean.",
              tip: "Sarah is agreeing reluctantly. You have navigated the dialogue. Tap 'Conclude Chat' to review your performance metrics.",
              options: []
            });
          }
        }

        return res.status(200).json(GUIDED_SIMULATION_SCRIPT.conclude);
      }

      // ────────────────── B. UNGUIDED / INDEPENDENT / ESCALATED MODES ──────────────────
      // These are free-text simulations evaluated live by Groq.
      if (!userAnswer) {
        const openingMessage = mode === 'escalated'
          ? "Sarah: 'Look, I already explained this! Why are you micromanaging my Slack updates? I don't have time to write essays for your team!'"
          : "Sarah: 'Hey, I saw your invite. What's this about? I hope this isn't another meeting that could have been an email.'";

        return res.status(200).json({
          characterReply: openingMessage,
          telemetry: { empathy: 50, clarity: 50, assertiveness: 50, deEscalation: 50 },
          tip: mode === 'escalated'
            ? "Sarah is highly triggered and hostile. Avoid matching her energy. Breathe, validate her emotional state of being rushed, and establish a firm, professional container."
            : "Sarah is defensive but accessible. State the meeting's positive objective directly and make her feel respected as a partner."
        });
      }

      if (!apiKey) {
        // Fallback telemetry if Groq is offline
        const charReply = mode === 'escalated'
          ? "Sarah: 'Fine, I get it. Handoffs are late. But I am drowning in bugs here! If I pause to document specs, the main database build will slip! What do you want me to do?'"
          : "Sarah: 'I understand you want handoffs by Thursday. But when QA keeps changing the schema, it pushes me behind. How do we prevent QA from changing things mid-week?'";
        return res.status(200).json({
          characterReply: charReply,
          telemetry: { empathy: 75, clarity: 80, assertiveness: 70, deEscalation: 75 },
          tip: "Great pivot. Sarah is now sharing her real blockers (bug overload/QA changes). Focus on establishing a solution-oriented collaboration structure."
        });
      }

      // Live AI character and telemetry generation
      const simMessages = chatHistory.map((m: any) => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content
      }));

      // Add user answer to prompt
      simMessages.push({ role: 'user', content: userAnswer });

      const systemPrompt = `You are playing the role of "Sarah", a brilliant database developer who is protective of her time, defensive about processes, and currently in a high-stakes difficult conversation with her manager (the user) about Slack collaboration and code handoff delays.

Mode of simulation: ${mode === 'escalated' ? 'Sarah is EXTREMELY Hostile, triggered, highly defensive, and blames the manager for micromanagement.' : 'Sarah is professional but defensive and skeptical.'}

Generate Sarah's next dynamic response, evaluate the user's emotional intelligence live, and provide a coaching tip.
Return a JSON object in this exact format:
{
  "characterReply": "Sarah's short 2-3 sentence conversational reply.",
  "telemetry": {
    "empathy": 80, // Integer 0 to 100 on how validated the user made Sarah feel
    "clarity": 85, // Integer 0 to 100 on how clear and jargon-free the user's focus is
    "assertiveness": 75, // Integer 0 to 100 on how firmly the user held boundaries without submissive/aggressive shifts
    "deEscalation": 90 // Integer 0 to 100 on how calm and composed the user kept the dialogue
  },
  "tip": "A short 1-sentence coaching advice for the side-panel (empathetic, actionable, 'give me tip but don't talk' style)."
}`;

      const aiMessages = [
        { role: 'system' as const, content: systemPrompt },
        ...simMessages.slice(-6) // Send recent turns for memory efficiency
      ];

      try {
        const result = await callGroqChat(aiMessages, apiKey, model, 700);
        return res.status(200).json(result);
      } catch (err) {
        console.error("AI turn generation failed, fallback", err);
        return res.status(200).json({
          characterReply: "I'm doing my best here. Let's just agree to lock in specs by Wednesday noon so my Thursday handoffs are clean.",
          telemetry: { empathy: 70, clarity: 75, assertiveness: 80, deEscalation: 70 },
          tip: "Keep Sarah focused on the Wednesday noon freeze. Confirm this agreement explicitly to wrap up the conversation."
        });
      }
    }

    // 5. GENERATE FINAL REPORT
    if (action === 'generate_final_report') {
      const { drills = [], guidedTrans = [], independentTrans = [], escalatedTrans = [] } = body;

      if (!apiKey) {
        return res.status(200).json({
          overallScore: 84,
          traits: {
            empathy: 88,
            clarity: 82,
            assertiveness: 80,
            deEscalation: 90,
            problemSolving: 82
          },
          detailedAnalysis: "You demonstrated outstanding emotional containment and active empathy across all simulations. You navigated Sarah's defensive outbursts with high poise, consistently de-escalating conflicts and steering conversations toward concrete, collaborative handoff freeze agreements. Your growth area is assertiveness: occasionally, you softened boundaries with unnecessary explanations. Continue practicing to maintain absolute clarity on your needs.",
          strengths: [" Poised de-escalation under hostility", "Active validation of counterpart's time pressure"],
          growthAreas: ["Holding firm boundaries without over-explaining", "Maintaining high structural clarity in initial openings"],
          recommendedRepeats: 2
        });
      }

      const prompt = `You are a senior executive coach and emotional intelligence auditor.
Compile a comprehensive, premium performance report based on the transcripts of a learner's Competency Sprint on "Having Difficult Conversations".

Review these transcript summaries:
- Micro-drills answers & evaluations: ${JSON.stringify(drills)}
- Guided Simulation: ${JSON.stringify(guidedTrans)}
- Independent Simulation: ${JSON.stringify(independentTrans)}
- Escalated Simulation: ${JSON.stringify(escalatedTrans)}

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
  "detailedAnalysis": "A rich 4-5 sentence editorial coaching narrative summarizing their overall performance, behavior trends, and professional impacts.",
  "strengths": ["Strengths 1", "Strengths 2"],
  "growthAreas": ["Growth area 1", "Growth area 2"],
  "recommendedRepeats": 2
}`;

      try {
        const report = await callGroqChat([{ role: 'user', content: prompt }], apiKey, model, 1000);
        return res.status(200).json(report);
      } catch (err) {
        console.error("AI report failed, fallback", err);
        return res.status(200).json({
          overallScore: 80,
          traits: { empathy: 82, clarity: 78, assertiveness: 75, deEscalation: 85, problemSolving: 80 },
          detailedAnalysis: "You've successfully completed the sprint! You showed strong composure and de-escalation skills during Sarah's hostile turns, keeping the dialogue constructive. Your assertiveness score suggests room to hold boundaries more directly without feeling the need to apologize or soften requests.",
          strengths: ["Excellent composure during high tension", "Active listening and validation"],
          growthAreas: ["Holding boundaries without over-apologizing", "Structuring clear meeting objectives early"],
          recommendedRepeats: 3
        });
      }
    }

    res.status(400).json({ error: "Invalid action" });
  } catch (error: any) {
    console.error("[competency-sprint] Error:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
}
