import type {
  GameTheoryCategory,
  GameTheoryCategoryId,
  GameTheoryGame,
} from './game-theory-types';

export const GAME_THEORY_CATEGORIES: GameTheoryCategory[] = [
  {
    id: 'foundations',
    label: 'Foundations',
    description: 'Classic two-player games that explain cooperation, conflict, and coordination.',
    icon: 'grid-outline',
    color: '#6366F1',
  },
  {
    id: 'trust',
    label: 'Trust & fairness',
    description: 'How people share, split, and decide what is fair.',
    icon: 'heart-outline',
    color: '#EC4899',
  },
  {
    id: 'sequential',
    label: 'Sequential moves',
    description: 'Games where order matters — commit, threaten, or fold.',
    icon: 'git-branch-outline',
    color: '#8B5CF6',
  },
  {
    id: 'information',
    label: 'Information',
    description: 'Hidden types, signals, and when talk is cheap.',
    icon: 'eye-outline',
    color: '#0EA5E9',
  },
  {
    id: 'repeated',
    label: 'Repeated play',
    description: 'Reputation, reciprocity, and long-run strategy.',
    icon: 'repeat-outline',
    color: '#14B8A6',
  },
  {
    id: 'markets',
    label: 'Markets',
    description: 'Competition, pricing, and bidding logic.',
    icon: 'trending-up-outline',
    color: '#F59E0B',
  },
  {
    id: 'negotiation',
    label: 'Negotiation',
    description: 'Splitting value, bargaining power, and coalitions.',
    icon: 'hand-left-outline',
    color: '#C45C5C',
  },
];

export const GAME_THEORY_GAMES: GameTheoryGame[] = [
  {
    id: 'prisoners_dilemma',
    order: 1,
    category: 'foundations',
    title: "Prisoner's Dilemma",
    tagline: 'Why rational people fail to cooperate',
    icon: 'lock-closed-outline',
    color: '#6366F1',
    storyHook: 'Two suspects are questioned separately. Each can stay silent or betray the other.',
    description:
      'Each player does better by defecting no matter what the other does — yet both would earn more if they both cooperated. This is the classic tension between individual incentive and collective outcome.',
    players: '2 players · simultaneous',
    keyConcept: 'Dominant strategy & Nash equilibrium',
    whatYouLearn: [
      'Individual rationality can produce collectively worse outcomes.',
      'Trust breaks when people cannot enforce agreements.',
      'Repeated interaction and reputation can restore cooperation.',
    ],
    workplaceExample:
      'Two teams hoard data instead of sharing — each protects itself, but the company moves slower.',
    reflectionPrompt: 'Where have you seen short-term self-protection hurt long-term team results?',
    matrix: {
      rowPlayer: 'You',
      colPlayer: 'Them',
      rowLabel: 'Your move',
      colLabel: 'Their move',
      rows: ['Cooperate', 'Defect'],
      cols: ['Cooperate', 'Defect'],
      payoffs: [
        [
          [3, 3],
          [0, 5],
        ],
        [
          [5, 0],
          [1, 1],
        ],
      ],
      equilibriumNote: 'Defect–Defect is the Nash equilibrium even though Cooperate–Cooperate pays both more.',
    },
  },
  {
    id: 'stag_hunt',
    order: 2,
    category: 'foundations',
    title: 'Stag Hunt',
    tagline: 'Coordination vs safety',
    icon: 'people-outline',
    color: '#6366F1',
    storyHook: 'Hunting a stag needs both hunters. A hare can be caught alone but is smaller.',
    description:
      'Cooperation pays most, but only if you trust the other person will join. Playing safe avoids the worst outcome if they bail.',
    players: '2 players · simultaneous',
    keyConcept: 'Risk-dominant vs payoff-dominant equilibrium',
    whatYouLearn: [
      'Big wins need mutual trust.',
      'Safe options can trap groups in mediocre outcomes.',
      'Shared expectations and rituals help people coordinate.',
    ],
    workplaceExample:
      'A bold product bet needs engineering and sales aligned — if either plays safe, the big win never happens.',
    reflectionPrompt: 'What “stag” is your team trying to catch, and what would make everyone commit?',
    matrix: {
      rowPlayer: 'You',
      colPlayer: 'Partner',
      rowLabel: 'Your choice',
      colLabel: 'Partner',
      rows: ['Hunt stag', 'Hunt hare'],
      cols: ['Hunt stag', 'Hunt hare'],
      payoffs: [
        [
          [4, 4],
          [0, 3],
        ],
        [
          [3, 0],
          [2, 2],
        ],
      ],
      equilibriumNote: 'Two equilibria: both hunt stag (best) or both hunt hare (safe).',
    },
  },
  {
    id: 'chicken',
    order: 3,
    category: 'foundations',
    title: 'Chicken',
    tagline: 'Brinkmanship and credibility',
    icon: 'car-sport-outline',
    color: '#6366F1',
    storyHook: 'Two drivers race toward each other. Swerve and you look weak; stay straight and you might crash.',
    description:
      'Each wants the other to yield. Mutual stubbornness is disastrous. Credible commitment (or randomness) shifts power.',
    players: '2 players · simultaneous',
    keyConcept: 'Brinkmanship & threat credibility',
    whatYouLearn: [
      'Threats only work if the other side believes you will follow through.',
      'Escalation can be a bargaining tactic — and a trap.',
      'Face-saving exits prevent mutual damage.',
    ],
    workplaceExample:
      'Deadline standoffs in negotiations — both sides claim they will walk, but a crash hurts both.',
    reflectionPrompt: 'When have you seen a “chicken” dynamic at work, and who swerved first?',
    choices: [
      {
        id: 'swerve',
        label: 'Swerve early',
        outcome: 'You avoid disaster but lose status in the standoff.',
        lesson: 'Sometimes yielding early preserves the relationship and the project.',
      },
      {
        id: 'straight',
        label: 'Stay straight',
        outcome: 'High risk of mutual loss if they do the same.',
        lesson: 'Uncredible toughness can backfire — know what you are willing to lose.',
      },
      {
        id: 'communicate',
        label: 'Signal a timed compromise',
        outcome: 'You create a face-saving path for both sides.',
        lesson: 'Structured de-escalation beats silent brinkmanship.',
      },
    ],
  },
  {
    id: 'battle_of_sexes',
    order: 4,
    category: 'foundations',
    title: 'Battle of the Sexes',
    tagline: 'Coordination with different preferences',
    icon: 'calendar-outline',
    color: '#6366F1',
    storyHook: 'Two people want to spend time together but prefer different activities.',
    description:
      'Both prefer meeting together over being apart, but each prefers a different activity. Focal points and precedent matter.',
    players: '2 players · simultaneous',
    keyConcept: 'Coordination equilibrium & focal points',
    whatYouLearn: [
      'Alignment matters even when preferences differ.',
      'Traditions and defaults reduce friction.',
      'Alternating or taking turns can be fair over time.',
    ],
    workplaceExample:
      'Two leads prefer different tools but need one shared workflow — pick a default and revisit.',
    reflectionPrompt: 'What default helps your team coordinate when preferences clash?',
    matrix: {
      rowPlayer: 'You',
      colPlayer: 'Them',
      rowLabel: 'You choose',
      colLabel: 'They choose',
      rows: ['Option A', 'Option B'],
      cols: ['Option A', 'Option B'],
      payoffs: [
        [
          [3, 2],
          [0, 0],
        ],
        [
          [0, 0],
          [2, 3],
        ],
      ],
      equilibriumNote: 'Two pure equilibria: both pick A or both pick B — coordination is essential.',
    },
  },
  {
    id: 'matching_pennies',
    order: 5,
    category: 'foundations',
    title: 'Matching Pennies',
    tagline: 'Zero-sum and unpredictability',
    icon: 'cash-outline',
    color: '#6366F1',
    storyHook: 'One player wins if pennies match; the other wins if they differ.',
    description:
      'Pure conflict: one person’s gain is the other’s loss. Optimal play is often mixed — be unpredictable.',
    players: '2 players · simultaneous · zero-sum',
    keyConcept: 'Mixed strategy equilibrium',
    whatYouLearn: [
      'In pure conflict, patterns get exploited.',
      'Randomizing can be rational, not irrational.',
      'Watch for tells and data leaks in competitive settings.',
    ],
    workplaceExample:
      'Competitors matching your pricing moves — predictable patterns get countered.',
    reflectionPrompt: 'Where should you be less predictable to avoid being exploited?',
    matrix: {
      rowPlayer: 'Matcher',
      colPlayer: 'Mismatcher',
      rowLabel: 'Matcher',
      colLabel: 'Mismatcher',
      rows: ['Heads', 'Tails'],
      cols: ['Heads', 'Tails'],
      payoffs: [
        [
          [1, -1],
          [-1, 1],
        ],
        [
          [-1, 1],
          [1, -1],
        ],
      ],
      equilibriumNote: 'No pure equilibrium — optimal play mixes Heads and Tails 50/50.',
    },
  },
  {
    id: 'pure_coordination',
    order: 6,
    category: 'foundations',
    title: 'Pure Coordination',
    tagline: 'Same goal, same move',
    icon: 'radio-button-on-outline',
    color: '#6366F1',
    storyHook: 'You must pick the same label without talking — which convention wins?',
    description:
      'When payoffs only depend on matching, culture, visibility, and salience pick the equilibrium.',
    players: '2+ players · simultaneous',
    keyConcept: 'Focal point (Schelling point)',
    whatYouLearn: [
      'Obvious conventions beat clever uniqueness.',
      'Make the “right” choice visible in meetings and docs.',
      'Reduce ambiguity before asking people to align.',
    ],
    workplaceExample:
      'Which Slack channel is “official”? The obvious, already-used one becomes the Schelling point.',
    reflectionPrompt: 'What convention could your team make clearer so people align faster?',
    choices: [
      {
        id: 'obvious',
        label: 'Pick the most visible default',
        outcome: 'Others likely match you — coordination succeeds.',
        lesson: 'Salience beats cleverness in coordination games.',
      },
      {
        id: 'unique',
        label: 'Pick an unusual option',
        outcome: 'Low match rate — everyone wastes time.',
        lesson: 'Without communication, uniqueness fails coordination.',
      },
    ],
  },
  {
    id: 'ultimatum_game',
    order: 7,
    category: 'trust',
    title: 'Ultimatum Game',
    tagline: 'Fairness beats pure greed',
    icon: 'pie-chart-outline',
    color: '#EC4899',
    storyHook: 'One person splits $100; the other accepts or rejects. Rejection leaves both with zero.',
    description:
      'Classic economics predicts tiny offers should be accepted — real people reject unfair splits. Fairness and emotion are strategic.',
    players: '2 players · sequential',
    keyConcept: 'Fairness norms & credible rejection',
    whatYouLearn: [
      'Perceived fairness affects acceptance.',
      'Lowball offers trigger punishment even at personal cost.',
      'Anchor expectations early in negotiations.',
    ],
    workplaceExample:
      'Credit splits on a project — uneven offers damage morale even if people “accept.”',
    reflectionPrompt: 'What split would feel fair enough that your counterpart stays engaged?',
    choices: [
      {
        id: 'offer_90',
        label: 'Offer them 10%, keep 90%',
        outcome: 'They often reject — both get nothing.',
        lesson: 'Greedy ultimatums activate fairness punishment.',
      },
      {
        id: 'offer_50',
        label: 'Offer an even split',
        outcome: 'High acceptance; relationship preserved.',
        lesson: 'Equity is a cheap way to buy cooperation.',
      },
      {
        id: 'offer_40',
        label: 'Offer 40% with clear rationale',
        outcome: 'May work if you explain costs you bear.',
        lesson: 'Framing and transparency shift what feels fair.',
      },
    ],
  },
  {
    id: 'dictator_game',
    order: 8,
    category: 'trust',
    title: 'Dictator Game',
    tagline: 'Power without reciprocity',
    icon: 'person-outline',
    color: '#EC4899',
    storyHook: 'One person allocates money; the other has no veto.',
    description:
      'Pure power test: many dictators still give something — altruism, reputation, or self-image matter.',
    players: '2 players · one-sided',
    keyConcept: 'Altruism & reputational concerns',
    whatYouLearn: [
      'Power reveals values, not only incentives.',
      'Small gifts can buy goodwill cheaply.',
      'Unchecked power erodes trust over time.',
    ],
    workplaceExample:
      'A manager allocating bonus pool with no review — discretionary generosity builds loyalty.',
    reflectionPrompt: 'When you hold unilateral power, how much do you leave on the table for others?',
    choices: [
      {
        id: 'keep_all',
        label: 'Keep everything',
        outcome: 'Maximum cash, minimum goodwill.',
        lesson: 'Short-term extraction has long-term relationship costs.',
      },
      {
        id: 'share',
        label: 'Share a meaningful portion',
        outcome: 'Less cash, stronger trust and future cooperation.',
        lesson: 'Strategic generosity is an investment, not weakness.',
      },
    ],
  },
  {
    id: 'trust_game',
    order: 9,
    category: 'trust',
    title: 'Trust Game',
    tagline: 'Invest and reciprocate',
    icon: 'shield-checkmark-outline',
    color: '#EC4899',
    storyHook: 'Investor sends money that triples; trustee decides how much to return.',
    description:
      'Trust is an investment. Returns depend on reciprocity norms and expected future interaction.',
    players: '2 players · sequential',
    keyConcept: 'Trust, investment, reciprocity',
    whatYouLearn: [
      'Trust grows when returns exceed expectations.',
      'Broken trust is expensive to rebuild.',
      'Start with small stakes to test reciprocity.',
    ],
    workplaceExample:
      'Giving a junior lead visibility on a client — they can return with exceptional delivery.',
    reflectionPrompt: 'Who has invested trust in you recently, and how did you reciprocate?',
    choices: [
      {
        id: 'send_half',
        label: 'Invest half your endowment',
        outcome: 'Moderate trust signal — room to grow the relationship.',
        lesson: 'Calibrated trust tests reciprocity without overexposure.',
      },
      {
        id: 'send_all',
        label: 'Invest everything',
        outcome: 'High upside if they return fairly; painful if they defect.',
        lesson: 'Full trust only when reputation and repeat play are likely.',
      },
      {
        id: 'send_none',
        label: 'Invest nothing',
        outcome: 'Safe but no mutual gain possible.',
        lesson: 'No trust means no cooperative surplus.',
      },
    ],
  },
  {
    id: 'public_goods',
    order: 10,
    category: 'trust',
    title: 'Public Goods',
    tagline: 'Shared benefit, private cost',
    icon: 'earth-outline',
    color: '#EC4899',
    storyHook: 'Everyone benefits from a park whether they pay or not — who contributes?',
    description:
      'Free-riding tempts each person to let others pay. Groups need norms, visibility, or enforcement.',
    players: 'Many players · simultaneous',
    keyConcept: 'Free-rider problem',
    whatYouLearn: [
      'Shared resources decay without contribution norms.',
      'Visibility and recognition boost participation.',
      'Small core contributors often carry the load — watch burnout.',
    ],
    workplaceExample:
      'Documentation, tests, or on-call — everyone uses them; few want to maintain them.',
    reflectionPrompt: 'What public good does your team under-fund, and how could you make contribution visible?',
    choices: [
      {
        id: 'free_ride',
        label: 'Contribute nothing',
        outcome: 'You gain short term; the shared asset decays.',
        lesson: 'Free-riding works once, then the commons collapses.',
      },
      {
        id: 'fair_share',
        label: 'Contribute your fair share',
        outcome: 'Sustainable quality if others match.',
        lesson: 'Lead by example to shift group norms.',
      },
      {
        id: 'extra',
        label: 'Over-contribute to kickstart',
        outcome: 'Can catalyze others but risks resentment if unmatched.',
        lesson: 'Seed contributions work best with explicit ask-backs.',
      },
    ],
  },
  {
    id: 'gift_exchange',
    order: 11,
    category: 'trust',
    title: 'Gift Exchange',
    tagline: 'Reciprocity in wages and effort',
    icon: 'gift-outline',
    color: '#EC4899',
    storyHook: 'Employers pay above minimum; workers respond with above-minimum effort when treated well.',
    description:
      'Markets are not only price — reciprocal fairness sustains effort beyond strict contract.',
    players: '2 players · repeated',
    keyConcept: 'Reciprocal fairness',
    whatYouLearn: [
      'Generosity can elicit higher effort.',
      'Broken reciprocity spirals downward.',
      'Clear expectations prevent ambiguous “gifts.”',
    ],
    workplaceExample:
      'Flexibility and recognition often return as discretionary effort.',
    reflectionPrompt: 'Where does reciprocity — not rules alone — drive performance on your team?',
    choices: [
      {
        id: 'minimum',
        label: 'Do the contractual minimum',
        outcome: 'Stable but no surplus goodwill.',
        lesson: 'Contracts set floors, not ceilings.',
      },
      {
        id: 'reciprocate',
        label: 'Match extra support with extra effort',
        outcome: 'Mutual gains when both sides see it.',
        lesson: 'Reciprocity needs visible recognition.',
      },
    ],
  },
  {
    id: 'centipede',
    order: 12,
    category: 'sequential',
    title: 'Centipede Game',
    tagline: 'Take now or trust the chain',
    icon: 'footsteps-outline',
    color: '#8B5CF6',
    storyHook: 'A growing pot passes back and forth — at each step you can take or pass for a bigger later share.',
    description:
      'Backward induction says grab early — yet people pass when trust and fairness matter. Finiteness and reputation change choices.',
    players: '2 players · sequential · finite',
    keyConcept: 'Backward induction vs trust',
    whatYouLearn: [
      'Long chains need trust at each link.',
      'Early grabs destroy future surplus.',
      'Known endpoints make defection tempting — opaque futures help cooperation.',
    ],
    workplaceExample:
      'Multi-handoff projects — each owner can optimize locally or pass value downstream.',
    reflectionPrompt: 'Where could you pass value forward instead of capturing it early?',
    choices: [
      {
        id: 'take_now',
        label: 'Take the pot at your turn',
        outcome: 'You gain immediately; chain stops.',
        lesson: 'Early extraction is rational in one-shot play.',
      },
      {
        id: 'pass',
        label: 'Pass for a larger later split',
        outcome: 'Bigger pie if they also pass — risky if they grab.',
        lesson: 'Trust enables growing pies in sequential games.',
      },
    ],
  },
  {
    id: 'entry_deterrence',
    order: 13,
    category: 'sequential',
    title: 'Entry Deterrence',
    tagline: 'Incumbent vs challenger',
    icon: 'enter-outline',
    color: '#8B5CF6',
    storyHook: 'An incumbent can fight a price war if a rival enters — should the rival stay out?',
    description:
      'Threats to punish entry only work if fighting is credible. Empty threats invite entry.',
    players: '2 players · sequential',
    keyConcept: 'Credible threats',
    whatYouLearn: [
      'Deterrence requires believable costs.',
      'Sunk investments can commit you to fight.',
      'New entrants read incumbents’ history.',
    ],
    workplaceExample:
      'Defending a market segment with sustained investment — bluffs get tested.',
    reflectionPrompt: 'What commitment makes your strategic threats credible?',
    choices: [
      {
        id: 'fight',
        label: 'Fight hard if they enter',
        outcome: 'Entry may be blocked if fight is costly for both.',
        lesson: 'Credible punishment changes entrants’ calculus.',
      },
      {
        id: 'accommodate',
        label: 'Share the market',
        outcome: 'Lower conflict; both earn moderate payoffs.',
        lesson: 'Not every entry deserves a price war.',
      },
    ],
  },
  {
    id: 'hold_up',
    order: 14,
    category: 'sequential',
    title: 'Hold-Up Problem',
    tagline: 'Invest then renegotiate',
    icon: 'construct-outline',
    color: '#8B5CF6',
    storyHook: 'You build specialized assets for a partner — then they renegotiate terms.',
    description:
      'Relationship-specific investments create vulnerability. Contracts, alternatives, or integration reduce hold-up.',
    players: '2 players · sequential',
    keyConcept: 'Relationship-specific investment',
    whatYouLearn: [
      'Investments that lock you in need contractual protection.',
      'BATNA strength matters after you commit.',
      'Vertical integration solves some hold-ups.',
    ],
    workplaceExample:
      'Custom tooling for one client — they squeeze price after you are dependent.',
    reflectionPrompt: 'Where are you exposed after making a relationship-specific investment?',
    choices: [
      {
        id: 'invest_unprotected',
        label: 'Invest without contract',
        outcome: 'High vulnerability in renegotiation.',
        lesson: 'Specialization without protection invites hold-up.',
      },
      {
        id: 'invest_protected',
        label: 'Invest with exit clauses / alternatives',
        outcome: 'Lower upside maybe, but safer bargaining position.',
        lesson: 'Preserve outside options before you specialize.',
      },
    ],
  },
  {
    id: 'commitment_game',
    order: 15,
    category: 'sequential',
    title: 'Commitment Game',
    tagline: 'Burn boats to win',
    icon: 'flame-outline',
    color: '#8B5CF6',
    storyHook: 'Cortés scuttled ships — removing retreat changed allies’ and enemies’ beliefs.',
    description:
      'Strategic commitment restricts your future moves so others take you seriously.',
    players: '2 players · sequential',
    keyConcept: 'Strategic commitment',
    whatYouLearn: [
      'Burning options can strengthen bargaining.',
      'Commitment must be visible and costly.',
      'Over-commitment traps you if facts change.',
    ],
    workplaceExample:
      'Public launch date commits the team — retreat becomes costly reputationally.',
    reflectionPrompt: 'What commitment — used carefully — would clarify priorities for others?',
    choices: [
      {
        id: 'keep_options',
        label: 'Keep all options open',
        outcome: 'Flexible but others may wait you out.',
        lesson: 'Flexibility weakens some threats and promises.',
      },
      {
        id: 'commit',
        label: 'Publicly commit to one path',
        outcome: 'Others adjust; you lose easy retreat.',
        lesson: 'Visible commitment shifts others’ strategies.',
      },
    ],
  },
  {
    id: 'backward_induction',
    order: 16,
    category: 'sequential',
    title: 'Backward Induction',
    tagline: 'Think from the end',
    icon: 'arrow-undo-outline',
    color: '#8B5CF6',
    storyHook: 'Plan a multi-step negotiation by first asking what happens on the last move.',
    description:
      'Solve finite sequential games from the terminal nodes backward — today’s best move depends on tomorrow’s response.',
    players: '2 players · sequential',
    keyConcept: 'Backward induction',
    whatYouLearn: [
      'Start with the endgame when planning strategy.',
      'Anticipate how others will respond on the final step.',
      'Subgame perfection filters non-credible threats.',
    ],
    workplaceExample:
      'Promotion path: infer what hiring manager will prefer at final interview stage, then prepare backward.',
    reflectionPrompt: 'What decision are you facing where the last step should be analyzed first?',
    choices: [
      {
        id: 'forward',
        label: 'Plan only the next move',
        outcome: 'May walk into a trap on later steps.',
        lesson: 'Myopic play loses in sequential games.',
      },
      {
        id: 'backward',
        label: 'Map the last step, then work back',
        outcome: 'Clearer path; threats you cannot carry out get discarded.',
        lesson: 'Backward induction reveals credible lines of play.',
      },
    ],
  },
  {
    id: 'signaling_job_market',
    order: 17,
    category: 'information',
    title: 'Signaling (Job Market)',
    tagline: 'Costly signals reveal type',
    icon: 'school-outline',
    color: '#0EA5E9',
    storyHook: 'Degrees and certifications are costly — that is why they can signal ability.',
    description:
      'When quality is hidden, actions that are cheaper for high types than low types can separate pools.',
    players: 'Workers & employers',
    keyConcept: 'Separating equilibrium & signaling',
    whatYouLearn: [
      'Signals must be costly to fake.',
      'Not every credential is a good signal.',
      'Look for proof-of-work, not proof-of-badge.',
    ],
    workplaceExample:
      'Portfolio beats vague claims — building in public signals skill.',
    reflectionPrompt: 'What costly signal could you send that is hard for low-skill actors to mimic?',
    choices: [
      {
        id: 'cheap_talk',
        label: 'Claim expertise without proof',
        outcome: 'Employers discount — pool is not separated.',
        lesson: 'Cheap talk is ignored in equilibrium.',
      },
      {
        id: 'costly_signal',
        label: 'Ship a demonstrable project',
        outcome: 'Stronger belief in high type.',
        lesson: 'Costly signals move beliefs.',
      },
    ],
  },
  {
    id: 'screening_insurance',
    order: 18,
    category: 'information',
    title: 'Screening (Insurance)',
    tagline: 'Design menus to reveal type',
    icon: 'filter-outline',
    color: '#0EA5E9',
    storyHook: 'Insurers offer plans with deductibles — risky drivers self-select into wrong plans if priced badly.',
    description:
      'The uninformed side moves first with a menu of contracts to sort hidden types.',
    players: 'Insurer & customers',
    keyConcept: 'Screening & self-selection',
    whatYouLearn: [
      'Menus let types reveal themselves.',
      'Bad menu design pools high and low risk.',
      'Incentives beat interrogation for hidden info.',
    ],
    workplaceExample:
      'Optional overtime vs fixed salary — different risk preferences self-select.',
    reflectionPrompt: 'How could you structure choices so people reveal preferences honestly?',
    choices: [
      {
        id: 'flat',
        label: 'One-size-fits-all offer',
        outcome: 'Adverse selection — worst types crowd in.',
        lesson: 'Pooling attracts unfavorable selection.',
      },
      {
        id: 'menu',
        label: 'Tiered options with different tradeoffs',
        outcome: 'Types partially separate.',
        lesson: 'Screening menus reduce information gaps.',
      },
    ],
  },
  {
    id: 'cheap_talk',
    order: 19,
    category: 'information',
    title: 'Cheap Talk',
    tagline: 'When words are free',
    icon: 'chatbubble-outline',
    color: '#0EA5E9',
    storyHook: 'Anyone can say “trust me” — talk is cheap when sending a message costs nothing.',
    description:
      'Costless messages may still convey information if interests partially align — but skeptics default to ignoring talk.',
    players: '2 players · pre-play communication',
    keyConcept: 'Cheap talk equilibrium',
    whatYouLearn: [
      'Talk alone rarely changes minds in pure conflict.',
      'Aligned interests make cheap talk informative.',
      'Bind talk with actions or stakes.',
    ],
    workplaceExample:
      'Roadmap promises without resourcing — teams learn to ignore cheap talk.',
    reflectionPrompt: 'When has talk in your org been credible — and why?',
    choices: [
      {
        id: 'believe',
        label: 'Believe cheap talk',
        outcome: 'Fine if interests align; costly if they do not.',
        lesson: 'Check incentive alignment before trusting words.',
      },
      {
        id: 'verify',
        label: 'Ask for costly verification',
        outcome: 'Slower but filters noise.',
        lesson: 'Put skin in the game to make talk meaningful.',
      },
    ],
  },
  {
    id: 'adverse_selection',
    order: 20,
    category: 'information',
    title: 'Adverse Selection',
    tagline: 'Hidden quality in markets',
    icon: 'warning-outline',
    color: '#0EA5E9',
    storyHook: 'Used car market: sellers know lemons; buyers offer average price — good cars leave.',
    description:
      'Information asymmetry can unravel markets — average pricing drives out quality.',
    players: 'Buyers & sellers',
    keyConcept: 'Market for lemons',
    whatYouLearn: [
      'Average pricing punishes quality sellers.',
      'Warranties, audits, and guarantees reduce asymmetry.',
      'Transparency is a competitive advantage.',
    ],
    workplaceExample:
      'Hiring from anonymous résumés only — strong candidates opt out of noisy processes.',
    reflectionPrompt: 'Where does hidden quality cause your market (hiring, vendors) to skew bad?',
    choices: [
      {
        id: 'average_price',
        label: 'Price for the average item',
        outcome: 'High quality exits; market quality falls.',
        lesson: 'Adverse selection spirals without information fixes.',
      },
      {
        id: 'verify',
        label: 'Invest in verification / guarantees',
        outcome: 'Good types stay; trust improves.',
        lesson: 'Information tools protect market quality.',
      },
    ],
  },
  {
    id: 'repeated_prisoners_dilemma',
    order: 21,
    category: 'repeated',
    title: 'Repeated Prisoner’s Dilemma',
    tagline: 'Shadow of the future',
    icon: 'infinite-outline',
    color: '#14B8A6',
    storyHook: 'Same partners meet again — today’s defection invites tomorrow’s punishment.',
    description:
      'Infinite or uncertain repetition enables cooperation that one-shot play destroys.',
    players: '2 players · repeated',
    keyConcept: 'Folk theorem & future payoffs',
    whatYouLearn: [
      'Long relationships change optimal play.',
      'Punishment strategies sustain cooperation.',
      'Know when the “last round” kills trust.',
    ],
    workplaceExample:
      'Long-term vendor relationships — defect once and lose future deals.',
    reflectionPrompt: 'Who do you interact with repeatedly, and how does that change your strategy?',
    matrix: {
      rowPlayer: 'You',
      colPlayer: 'Partner',
      rowLabel: 'This round',
      colLabel: 'Partner',
      rows: ['Cooperate', 'Defect'],
      cols: ['Cooperate', 'Defect'],
      payoffs: [
        [
          [3, 3],
          [0, 5],
        ],
        [
          [5, 0],
          [1, 1],
        ],
      ],
      equilibriumNote: 'One-shot: defect. Repeated with high continuation probability: cooperation can be stable.',
    },
  },
  {
    id: 'tit_for_tat',
    order: 22,
    category: 'repeated',
    title: 'Tit-for-Tat',
    tagline: 'Nice, retaliatory, forgiving',
    icon: 'swap-horizontal-outline',
    color: '#14B8A6',
    storyHook: 'Start friendly; copy the other’s last move; return to cooperation after they do.',
    description:
      'Axelrod’s tournament winner: simple, nice, provokable, forgiving, and clear.',
    players: '2 players · repeated',
    keyConcept: 'Reciprocity strategy',
    whatYouLearn: [
      'Start cooperative unless betrayed.',
      'Punish defection quickly but forgive after.',
      'Clarity beats clever complexity in reciprocity.',
    ],
    workplaceExample:
      'Match responsiveness on cross-team requests — mirror effort, not slights.',
    reflectionPrompt: 'Are you forgiving enough after conflict to restore cooperation?',
    choices: [
      {
        id: 'always_defect',
        label: 'Always defect',
        outcome: 'Mutual low payoffs in repeated play.',
        lesson: 'Permanent hostility is self-defeating long run.',
      },
      {
        id: 'tit_for_tat',
        label: 'Cooperate, then mirror last move',
        outcome: 'Cooperation with protection against exploitation.',
        lesson: 'Reciprocity balances trust and defense.',
      },
      {
        id: 'always_cooperate',
        label: 'Always cooperate',
        outcome: 'Exploited by defectors.',
        lesson: 'Forgiveness without retaliation invites abuse.',
      },
    ],
  },
  {
    id: 'grim_trigger',
    order: 23,
    category: 'repeated',
    title: 'Grim Trigger',
    tagline: 'One strike, forever out',
    icon: 'skull-outline',
    color: '#14B8A6',
    storyHook: 'Cooperate until betrayed once — then defect forever.',
    description:
      'Harsh punishment can sustain cooperation if threats are credible and errors are rare.',
    players: '2 players · repeated',
    keyConcept: 'Trigger strategy',
    whatYouLearn: [
      'Harsh punishments deter first defection.',
      'One mistake can lock both into misery — fragile.',
      'Forgiveness mechanisms prevent spiral.',
    ],
    workplaceExample:
      'Zero-tolerance policies — strong deterrence, brittle to noise and misunderstandings.',
    reflectionPrompt: 'When is harsh punishment worth the fragility it creates?',
    choices: [
      {
        id: 'grim',
        label: 'Use grim trigger',
        outcome: 'Strong deterrence; catastrophic after one error.',
        lesson: 'Punishment severity trades off against forgiveness.',
      },
      {
        id: 'forgiving',
        label: 'Use limited punishment then reset',
        outcome: 'More robust to noise.',
        lesson: 'Real relationships need error tolerance.',
      },
    ],
  },
  {
    id: 'cournot_duopoly',
    order: 24,
    category: 'markets',
    title: 'Cournot Duopoly',
    tagline: 'Quantity competition',
    icon: 'bar-chart-outline',
    color: '#F59E0B',
    storyHook: 'Two firms choose production quantity simultaneously — more output drives price down.',
    description:
      'Each firm ignores the effect of its output on price when choosing quantity — classic strategic substitute.',
    players: '2 firms · simultaneous',
    keyConcept: 'Nash equilibrium in quantities',
    whatYouLearn: [
      'More competition lowers prices and profits.',
      'Capacity commitments shape market outcomes.',
      'Coordination (cartel) raises profit but is unstable.',
    ],
    workplaceExample:
      'Two teams shipping similar features — oversupply dilutes user attention.',
    reflectionPrompt: 'Where is your “market” oversaturated because rivals matched output?',
    choices: [
      {
        id: 'max_output',
        label: 'Maximize your output',
        outcome: 'Price crashes — both earn less.',
        lesson: 'Quantity wars hurt duopolists.',
      },
      {
        id: 'equilibrium',
        label: 'Choose best response to expected rival output',
        outcome: 'Stable middle outcome.',
        lesson: 'Think about rivals’ incentives, not only yours.',
      },
    ],
  },
  {
    id: 'bertrand_competition',
    order: 25,
    category: 'markets',
    title: 'Bertrand Competition',
    tagline: 'Price undercuts to marginal cost',
    icon: 'pricetag-outline',
    color: '#F59E0B',
    storyHook: 'Two sellers pick prices; buyers choose the cheaper identical product.',
    description:
      'With homogeneous goods, price competition can drive profits to zero — differentiation escapes the trap.',
    players: '2 firms · simultaneous',
    keyConcept: 'Bertrand paradox',
    whatYouLearn: [
      'Identical products face brutal price pressure.',
      'Differentiation restores pricing power.',
      'Capacity limits can soften price wars.',
    ],
    workplaceExample:
      'Commodity SaaS features — race to discount unless you differentiate.',
    reflectionPrompt: 'What differentiation protects you from a Bertrand price race?',
    choices: [
      {
        id: 'match_low',
        label: 'Undercut by a penny',
        outcome: 'Race toward marginal cost.',
        lesson: 'Homogeneous Bertrand is harsh for sellers.',
      },
      {
        id: 'differentiate',
        label: 'Bundle unique value',
        outcome: 'Less direct price comparison.',
        lesson: 'Escape commoditization with distinct offers.',
      },
    ],
  },
  {
    id: 'first_price_auction',
    order: 26,
    category: 'markets',
    title: 'First-Price Auction',
    tagline: 'Bid your value — pay if you win',
    icon: 'hammer-outline',
    color: '#F59E0B',
    storyHook: 'Highest bidder wins and pays their bid — shade below true value.',
    description:
      'Winners curse risk when value is uncertain — optimal bids lie below private valuation.',
    players: 'Many bidders',
    keyConcept: 'Bid shading & winner’s curse',
    whatYouLearn: [
      'Winning may mean you overestimated.',
      'Shade bids when uncertainty is high.',
      'Information aggregation improves bidding.',
    ],
    workplaceExample:
      'Competitive RFPs — winning with razor margin may mean you under-scoped.',
    reflectionPrompt: 'When you “win,” do you later discover you overbid your true capacity?',
    choices: [
      {
        id: 'true_value',
        label: 'Bid full private value',
        outcome: 'Win often but profit little — winner’s curse.',
        lesson: 'Naive bidding overpays.',
      },
      {
        id: 'shade',
        label: 'Bid below value with uncertainty buffer',
        outcome: 'Win less often but healthier margins.',
        lesson: 'Strategic shading protects profit.',
      },
    ],
  },
  {
    id: 'second_price_auction',
    order: 27,
    category: 'markets',
    title: 'Second-Price (Vickrey) Auction',
    tagline: 'Truthful bidding is optimal',
    icon: 'ribbon-outline',
    color: '#F59E0B',
    storyHook: 'Winner pays the second-highest bid — bidding true value becomes dominant.',
    description:
      'Vickrey auctions align incentives: your bid affects whether you win, not what you pay (if you win).',
    players: 'Many bidders',
    keyConcept: 'Incentive-compatible mechanism',
    whatYouLearn: [
      'Mechanism design can make honesty optimal.',
      'Payment rule shapes strategic behavior.',
      'Used in ad auctions and some procurement.',
    ],
    workplaceExample:
      'Internal resource auctions with second-price rules reduce political shading.',
    reflectionPrompt: 'Could a simpler payment rule make honest reporting optimal in your org?',
    choices: [
      {
        id: 'shade',
        label: 'Shade bid below true value',
        outcome: 'Risk losing when you should win — no payment gain.',
        lesson: 'Second-price makes shading irrational.',
      },
      {
        id: 'truthful',
        label: 'Bid true value',
        outcome: 'Optimal in private-value setup.',
        lesson: 'Good mechanisms align talk and incentives.',
      },
    ],
  },
  {
    id: 'nash_bargaining',
    order: 28,
    category: 'negotiation',
    title: 'Nash Bargaining',
    tagline: 'Split surplus fairly',
    icon: 'scale-outline',
    color: '#C45C5C',
    storyHook: 'Two parties divide a surplus — fallback options (BATNA) shape the split.',
    description:
      'Solution concepts balance efficiency and symmetry — better outside options shift bargaining power.',
    players: '2 players · cooperative bargaining',
    keyConcept: 'BATNA & bargaining power',
    whatYouLearn: [
      'Improve your BATNA before negotiating.',
      'Joint surplus is the pie — fight over shares, not destruction.',
      'Fairness norms influence real splits.',
    ],
    workplaceExample:
      'Salary negotiation — another offer strengthens your BATNA without burning bridges.',
    reflectionPrompt: 'What is your BATNA in your current key negotiation?',
    choices: [
      {
        id: 'weak_batna',
        label: 'Negotiate with no alternatives',
        outcome: 'Small share of surplus.',
        lesson: 'Weak BATNAs shrink claims.',
      },
      {
        id: 'strong_batna',
        label: 'Negotiate with a credible alternative',
        outcome: 'Larger share without needing aggression.',
        lesson: 'Options are leverage.',
      },
    ],
  },
  {
    id: 'divide_dollar',
    order: 29,
    category: 'negotiation',
    title: 'Divide the Dollar',
    tagline: 'Minimal negotiation game',
    icon: 'cash-outline',
    color: '#C45C5C',
    storyHook: 'Split $1 — if demands exceed $1, both get zero.',
    description:
      'Simple model of claims and coordination in bargaining — greed destroys the pie.',
    players: '2 players · simultaneous claims',
    keyConcept: 'Coordination of claims',
    whatYouLearn: [
      'Total claims must fit the pie.',
      'Overreach punishes everyone.',
      'Proportional norms help alignment.',
    ],
    workplaceExample:
      'Budget fights where every line item is maxed — total exceeds reality.',
    reflectionPrompt: 'Where are collective demands exceeding the actual resource pool?',
    choices: [
      {
        id: 'greedy',
        label: 'Demand $0.70 each',
        outcome: 'Total exceeds $1 — both get $0.',
        lesson: 'Infeasible joint demands destroy value.',
      },
      {
        id: 'fair',
        label: 'Demand $0.50 each',
        outcome: 'Feasible — both succeed.',
        lesson: 'Coordinate claims to the real pie size.',
      },
    ],
  },
  {
    id: 'coalition_mini',
    order: 30,
    category: 'negotiation',
    title: 'Coalition Basics',
    tagline: 'Together vs alone',
    icon: 'link-outline',
    color: '#C45C5C',
    storyHook: 'Three players — pairs can form coalitions and split gains; grand coalition may be largest.',
    description:
      'Cooperative game intro: value depends on who joins together. Power indices reflect pivotal roles.',
    players: '3+ players · coalitions',
    keyConcept: 'Coalition value & Shapley intuition',
    whatYouLearn: [
      'Some players are pivotal in many coalitions.',
      'Side deals can block grand agreements.',
      'Core outcomes must be stable against deviations.',
    ],
    workplaceExample:
      'Cross-functional launch — two teams can ship without the third, changing who has leverage.',
    reflectionPrompt: 'Who is pivotal in your current coalition — and do they know it?',
    choices: [
      {
        id: 'solo',
        label: 'Stay solo',
        outcome: 'Small guaranteed payoff.',
        lesson: 'Solo play is safe but limits surplus.',
      },
      {
        id: 'pair',
        label: 'Form a pair coalition',
        outcome: 'Medium payoff — excludes third.',
        lesson: 'Partial coalitions shift power.',
      },
      {
        id: 'grand',
        label: 'Grand coalition (all join)',
        outcome: 'Largest total if split fairly.',
        lesson: 'Max surplus often needs full alignment.',
      },
    ],
  },
];

export function getGameById(id: string): GameTheoryGame | undefined {
  return GAME_THEORY_GAMES.find((g) => g.id === id);
}

export function getGamesByCategory(category: GameTheoryCategoryId): GameTheoryGame[] {
  return GAME_THEORY_GAMES.filter((g) => g.category === category).sort((a, b) => a.order - b.order);
}

export function getCategoryMeta(id: GameTheoryCategoryId): GameTheoryCategory | undefined {
  return GAME_THEORY_CATEGORIES.find((c) => c.id === id);
}
