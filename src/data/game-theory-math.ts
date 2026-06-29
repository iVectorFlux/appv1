/**
 * Plain-language math & stats for each game theory lesson.
 */

export interface MathExplanation {
  title: string;
  intro: string;
  steps: string[];
  /** Simple numbers or ratio — no jargon required to understand */
  formula?: string;
  takeaway: string;
}

export const GAME_MATH_EXPLANATIONS: Record<string, MathExplanation> = {
  prisoners_dilemma: {
    title: 'Why betraying seems smart',
    intro:
      'Imagine points for each outcome: both quiet = 3 each, one betrays = 5 vs 0, both betray = 1 each. You cannot talk to your partner.',
    steps: [
      'If they stay quiet: betraying gives you 5, staying quiet gives 3 — betraying wins.',
      'If they betray: betraying gives you 1, staying quiet gives 0 — betraying still wins.',
      'So betraying is always your best move, no matter what they do.',
      'They think the same way — so you both end up betraying and get 1 each.',
      'You both would have been better off at 3 each if you had both stayed quiet.',
    ],
    formula: 'Both betray = 1 point each · Both cooperate = 3 each (better, but hard to reach).',
    takeaway: 'The trap is built into the rules — not because people are selfish, but because the incentives push that way.',
  },
  stag_hunt: {
    title: 'Big reward vs safe choice',
    intro: 'Hunting a stag together pays 4 each. Hunting a hare alone pays 2. If you hunt stag alone, you get 0.',
    steps: [
      'If you both hunt stag → 4 each (best outcome).',
      'If you hunt stag but they hunt hare → you get 0, they get 3.',
      'If you both hunt hare → 2 each (safe but smaller).',
      'Two stable outcomes: both stag, or both hare.',
      'Hare feels safer when you are not sure they will show up.',
    ],
    formula: 'Stag together: 4+4 · Hare together: 2+2 · Mixed: someone gets 0.',
    takeaway: 'Big wins need trust. Without it, groups settle for the safe small prize.',
  },
  chicken: {
    title: 'Who blinks first?',
    intro: 'Two drivers race at each other. Swerve = lose face. Both stay = crash (worst for both).',
    steps: [
      'If you think they will swerve, staying straight lets you “win.”',
      'If they think the same about you, you crash.',
      'Credible threats only work if the other person believes you will not swerve.',
      'A clear exit (compromise signal) can save both sides.',
    ],
    formula: 'Crash hurts both most · One swerves = one “loser,” one “winner.”',
    takeaway: 'Empty toughness is dangerous. Face-saving exits beat silent standoffs.',
  },
  battle_of_sexes: {
    title: 'Meet up, pick something together',
    intro: 'You both want to hang out. You prefer Activity A, they prefer B. Being apart is worst for both.',
    steps: [
      'Best for you: both pick A (you get 3, they get 2).',
      'Best for them: both pick B (you get 2, they get 3).',
      'If you pick different things → 0 for both (you miss each other).',
      'Any matching pair works — the fight is over which match.',
      'Defaults and tradition (“we always do A on Fridays”) break the tie.',
    ],
    formula: 'Match = good for both · Mismatch = 0 · Which match? Use a shared default.',
    takeaway: 'When you need to align, pick an obvious default everyone can follow.',
  },
  matching_pennies: {
    title: 'Pure opposition — mix it up',
    intro: 'One player wins if the coins match. The other wins if they differ. Zero-sum: your gain is their loss.',
    steps: [
      'If you always pick Heads, they always pick Tails — you always lose.',
      'If you are predictable, they exploit you.',
      'Best long-run play: random — Heads half the time, Tails half the time.',
      'Same for them — 50/50 is the balanced mix.',
    ],
    formula: 'Flip a fair coin each round → 50% Heads, 50% Tails.',
    takeaway: 'In pure conflict, being unpredictable is smart — not random for no reason.',
  },
  pure_coordination: {
    title: 'Pick the same thing',
    intro: 'You only win if both pick the same label. Which label does not matter — matching does.',
    steps: [
      'Without talking, people grab the most obvious option.',
      '“Meet in NYC” → Grand Central. “Pick a side” → right side.',
      'Clever unique picks fail because others will not guess them.',
      'Make the right choice visible in your team (default channel, default doc).',
    ],
    formula: 'Success = same pick · Obvious pick wins when nobody can talk.',
    takeaway: 'Make the cooperative choice the easy, visible one.',
  },
  ultimatum_game: {
    title: 'Fair splits get accepted',
    intro: 'You split $10. They can accept (both get the split) or reject (both get $0).',
    steps: [
      'Selfish math says offer them $0.01 and keep $9.99.',
      'In real life, very unfair offers get rejected — people punish unfairness.',
      'Offers around 40–50% usually get accepted.',
      'Rejection means they care about fairness, not just money.',
    ],
    formula: 'Accept if their share feels fair enough · Reject if offer feels insulting.',
    takeaway: 'People reject unfair deals even when it costs them — factor that into negotiations.',
  },
  dictator_game: {
    title: 'Total power, partial generosity',
    intro: 'You split money. The other person cannot reject — you have all the power.',
    steps: [
      'Selfish math: keep everything.',
      'In labs, people still give away about 20–30% on average.',
      'When nobody is watching, people give less.',
      'Generosity here is about norms and empathy, not fear of rejection.',
    ],
    formula: 'Keep all = max money for you · Many still give some away.',
    takeaway: 'Power shows true preferences — but most people still share a little.',
  },
  trust_game: {
    title: 'Send money, hope it comes back',
    intro: 'You send part of $10 to a partner. It triples for them. They choose how much to return.',
    steps: [
      'If they are purely selfish, they return $0.',
      'You expect that, so you send $0 — nobody gains.',
      'When people do return money, sending pays off for both.',
      'Trust grows with repeat play and reputation.',
    ],
    formula: 'Send $5 → becomes $15 for them · If they return $7+, you both win vs keeping $10 alone.',
    takeaway: 'Trust is an investment — it only works when reciprocity is likely.',
  },
  public_goods: {
    title: 'Everyone benefits, few want to pay',
    intro: 'Each person chooses how much to chip in. The total pot helps everyone, but your contribution costs you alone.',
    steps: [
      'You get a share of the group pot, but you pay the full cost of your contribution.',
      'So each person puts in less than what would be best for the group.',
      'Result: the pot is smaller than it could be — free-riding.',
      'Fixes: make giving visible, match contributions, or require minimums.',
    ],
    formula: 'Group best = everyone chips in fully · Individual best = chip in less.',
    takeaway: 'Shared resources need norms or rules — voluntary giving alone usually falls short.',
  },
  gift_exchange: {
    title: 'Pay well, get effort back',
    intro: 'Boss pays above minimum. Worker chooses effort. Both win if each reciprocates.',
    steps: [
      'One-shot selfish worker: minimum effort always.',
      'Fair-minded workers try harder when pay feels generous.',
      'Bosses who expect this may pay above market.',
      'Works when effort is visible and relationships continue.',
    ],
    formula: 'Fair wage → more effort → both better off over time.',
    takeaway: 'Kindness and reciprocity can substitute for strict contracts.',
  },
  centipede: {
    title: 'Take now or wait for more?',
    intro: 'Pot starts at $1 and doubles when you pass. Either player can grab it on their turn.',
    steps: [
      'Working backward: on the last turn, taking everything is best.',
      'That means the previous player should take before the last turn.',
      'Logic chains back — “take early” is the textbook answer.',
      'Real people pass when they trust the other person will pass too.',
    ],
    formula: 'Each pass doubles the pot · Last mover takes all in pure logic.',
    takeaway: 'Logic says grab early; trust lets people wait — until someone does not.',
  },
  entry_deterrence: {
    title: 'Can you scare off a newcomer?',
    intro: 'A new firm can enter your market. You can fight ( hurts both) or accommodate (share).',
    steps: [
      'Empty threat: “I will fight” — but fighting hurts you too, so they enter anyway.',
      'Credible threat: sunk costs or reputation make fighting believable.',
      'If fight is costly and accommodation pays both more, you may share instead.',
    ],
    formula: 'They enter if profit after entry > staying out · Deter only if fight is believable.',
    takeaway: 'Threats work only when backing them up is actually in your interest.',
  },
  hold_up: {
    title: 'Invest now, renegotiate later',
    intro: 'You build something custom for one buyer. After you invest, they push the price down.',
    steps: [
      'You fear being squeezed, so you invest less than you would ideally.',
      'Contracts, backup buyers, or owning the asset protects you.',
      'Without protection, specialized investments shrink.',
    ],
    formula: 'Invest if expected profit after hold-up > cost · Otherwise under-invest.',
    takeaway: 'Only specialize when you have contractual protection or other options.',
  },
  commitment_game: {
    title: 'Burn your escape routes',
    intro: 'You remove your own options so the other side believes you will follow through.',
    steps: [
      'Commitment helps when it changes what they do (they believe you will not back down).',
      'It must be visible and hard to undo.',
      'Over-committing locks you in when new information arrives.',
    ],
    formula: 'Good commitment = changes their move in your favor.',
    takeaway: 'Credible commitment is power — use it carefully.',
  },
  backward_induction: {
    title: 'Think from the end',
    intro: 'In games with turns, solve what happens last, then second-to-last, and so on.',
    steps: [
      'Start at the final move: what would each player do?',
      'Given that, what happens one step earlier?',
      'Work back to the first move.',
      'Ignore threats that would not actually be carried out later.',
    ],
    formula: 'Last move → second-to-last → … → first move.',
    takeaway: 'Plan backward from the endgame to find credible strategies.',
  },
  signaling_job_market: {
    title: 'Prove you are the real deal',
    intro: 'High-skill workers can send a costly signal (degree, cert). Low-skill workers find it too expensive to fake.',
    steps: [
      'Cheap talk (“trust me”) — everyone says it, so employers ignore it.',
      'Costly signal — only high types afford it comfortably.',
      'Employers pay more when they believe the signal.',
      'Education can signal ability even when classroom content is not the job skill.',
    ],
    formula: 'Signal works if faking is too expensive for low types.',
    takeaway: 'Show credentials that are hard to fake, not just easy claims.',
  },
  screening_insurance: {
    title: 'Let them pick their plan',
    intro: 'Insurer offers menu of plans. Low-risk and high-risk customers self-sort.',
    steps: [
      'One plan for everyone → high-risk crowd in, costs rise.',
      'Menu: high deductible cheap plan for low risk, low deductible pricey plan for high risk.',
      'Each type picks the plan meant for them.',
      'Insurer learns risk without a medical exam on every person.',
    ],
    formula: 'Different plans → different types choose differently.',
    takeaway: 'Design choices so people reveal their type through what they pick.',
  },
  cheap_talk: {
    title: 'Talk is free — is it true?',
    intro: 'Someone sends a message before acting. Messages cost nothing.',
    steps: [
      'If interests fully oppose, all talk is ignored — no reason to be honest.',
      'If interests overlap somewhat, honest talk can happen.',
      'Verify with stakes when talk is free and interests diverge.',
    ],
    formula: 'Free message + opposing interests = low trust in words.',
    takeaway: 'Believe talk when interests align; verify when they do not.',
  },
  adverse_selection: {
    title: 'Bad quality drives out good',
    intro: 'Sellers know quality. Buyers only see average quality at a given price.',
    steps: [
      'Buyers offer a price based on average quality.',
      'High-quality sellers leave — price too low for them.',
      'Average quality drops → buyers lower price → more good sellers leave.',
      'Market can collapse (“lemons problem”).',
      'Fixes: warranties, inspections, returns.',
    ],
    formula: 'Low average price → good sellers exit → average gets worse.',
    takeaway: 'Transparency and guarantees keep quality in the market.',
  },
  monty_hall: {
    title: 'Why switching wins 2 out of 3',
    intro: '3 doors: 1 car, 2 goats. You pick 1. Host opens a goat (never the car). Should you switch?',
    steps: [
      'At the start, your door has a 1 in 3 chance of the car.',
      'The other two doors together have a 2 in 3 chance.',
      'Host always opens a goat from those “other two” — not random among all three.',
      'That 2 in 3 chance now sits on the one remaining closed door.',
      'Switching grabs that 2 in 3 chance. Staying keeps your original 1 in 3.',
    ],
    formula: 'Stay = 1/3 win · Switch = 2/3 win.',
    takeaway: 'New information changes the odds — the other door is not a coin flip.',
  },
  repeated_prisoners_dilemma: {
    title: 'Play again — cooperation can return',
    intro: 'Same prisoners’ dilemma, but you meet the same partner many times.',
    steps: [
      'One round only → betray still wins.',
      'Many rounds → future payoffs matter.',
      'Tit-for-tat: start nice, copy what they did last time.',
      'Grim trigger: cooperate until betrayed, then betray forever.',
      'If the future matters enough, cooperation can hold.',
    ],
    formula: 'Cooperation works when future rewards > one-time gain from betraying.',
    takeaway: 'Long relationships change the math — the shadow of the future enables trust.',
  },
  tit_for_tat: {
    title: 'Copy their last move',
    intro: 'Round 1: cooperate. After that: do whatever they did last round.',
    steps: [
      'Nice — never betrays first.',
      'Provocable — punishes betrayal immediately.',
      'Forgiving — returns to cooperate when they do.',
      'Clear — easy for partners to understand.',
    ],
    formula: 'Start: Cooperate · Then: mirror their previous move.',
    takeaway: 'Simple reciprocity often beats clever exploitation.',
  },
  grim_trigger: {
    title: 'One strike, forever out',
    intro: 'Cooperate until the other person betrays once — then betray every round after.',
    steps: [
      'Harsh punishment can scare people into cooperating.',
      'One mistake locks both into mutual betrayal forever.',
      'Softer rules (two strikes) handle accidents better.',
    ],
    formula: 'Cooperate until betrayed · Then defect always.',
    takeaway: 'Hard punishment deters but amplifies mistakes — balance with forgiveness.',
  },
  cournot_duopoly: {
    title: 'Two firms, choose how much to make',
    intro: 'More total output → lower price. Each firm picks quantity without knowing the other’s exact pick.',
    steps: [
      'If you make a lot, price drops for both of you.',
      'Each firm picks quantity thinking about the other’s likely output.',
      'Stable outcome: both make more than a monopoly, less than perfect competition.',
      'Your output hurts both via lower price — strategic substitute.',
    ],
    formula: 'More total supply → lower price → affects both firms.',
    takeaway: 'In quantity competition, your production lowers everyone’s price.',
  },
  bertrand_competition: {
    title: 'Matching prices to zero profit',
    intro: 'Two firms sell the same product. Customers buy from whoever is cheaper.',
    steps: [
      'Undercut by $1 → you get all customers.',
      'They undercut you back.',
      'Price war drives price down to cost — zero profit for both.',
      'Differentiation or limited capacity restores margins.',
    ],
    formula: 'Same product + price war → price ≈ cost, profit ≈ 0.',
    takeaway: 'Commodity competition erodes profit — differentiate or limit capacity.',
  },
  first_price_auction: {
    title: 'Bid high, win — but pay your bid',
    intro: 'Highest bidder wins and pays their own bid. Item has a true value to you.',
    steps: [
      'Bid your true value → you might overpay when you win.',
      'Bid below value → safer profit if you win, but you win less often.',
      'When everyone shares similar uncertainty, shade bids below value.',
      '“Winner’s curse”: winning may mean you overestimated.',
    ],
    formula: 'Profit if win = true value − your bid · Bid lower than value to stay safe.',
    takeaway: 'In first-price auctions, do not bid your full value — leave margin.',
  },
  second_price_auction: {
    title: 'Bid truthfully — pay second place',
    intro: 'Highest bidder wins but pays the second-highest bid (Vickrey auction).',
    steps: [
      'Your bid decides if you win, not what you pay (payment = second bid).',
      'Overbid: win when value < second price → lose money.',
      'Underbid: lose when value > second price → miss good deals.',
      'Bidding your true value is the safe strategy.',
    ],
    formula: 'Win if highest · Pay = second-highest bid · Best bid = your true value.',
    takeaway: 'When payment is second-price, honesty is the smart default.',
  },
  nash_bargaining: {
    title: 'Split the pie — or walk away',
    intro: 'You split surplus above your “walk away” option (BATNA). Better outside option = more leverage.',
    steps: [
      'Know your walk-away value before negotiating.',
      'Improving your BATNA shifts power to you.',
      'Efficient deals use the full surplus — no waste.',
      'Threats to walk must be credible.',
    ],
    formula: 'Your power ≈ how good your walk-away option is.',
    takeaway: 'Strengthen your alternatives before you sit down to negotiate.',
  },
  divide_dollar: {
    title: 'Do not ask for more than exists',
    intro: 'Each person names a share of $1. If shares add to more than $1, both get $0.',
    steps: [
      'Greedy claims can zero out the pot for everyone.',
      'Fair focal point: each asks for 50%.',
      'Coordinate claims to fit the real budget.',
    ],
    formula: 'If your claim + their claim > $1 → both get $0.',
    takeaway: 'Claim what the budget can actually support — or everyone loses.',
  },
  coalition_mini: {
    title: 'Who teams up with whom?',
    intro: 'Small groups can form coalitions. Bigger groups may create more total value.',
    steps: [
      'Compare payoff in the full group vs a smaller alliance.',
      'Blocking coalition: a subgroup that can do better by leaving.',
      'Players who are critical to many alliances have more power.',
    ],
    formula: 'Grand coalition value ≥ pair value — but splits decide who benefits.',
    takeaway: 'Being pivotal in many possible teams gives you bargaining power.',
  },
};

export function getMathExplanation(gameId: string): MathExplanation | undefined {
  return GAME_MATH_EXPLANATIONS[gameId];
}
