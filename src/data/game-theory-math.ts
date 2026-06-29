/**
 * Mathematical & statistical explanations for each game theory lesson.
 */

export interface MathExplanation {
  title: string;
  intro: string;
  steps: string[];
  /** Optional formula or notation (plain text / Unicode) */
  formula?: string;
  takeaway: string;
}

export const GAME_MATH_EXPLANATIONS: Record<string, MathExplanation> = {
  prisoners_dilemma: {
    title: 'Dominant strategy & Nash equilibrium',
    intro:
      'Model payoffs as T (temptation to defect), R (reward for mutual cooperation), P (punishment for mutual defection), S (sucker payoff). Standard ordering: T > R > P > S.',
    steps: [
      'If you believe they Cooperate: Defect gives T, Cooperate gives R — and T > R, so Defect is better.',
      'If you believe they Defect: Defect gives P, Cooperate gives S — and P > S, so Defect is still better.',
      'Defect is a strictly dominant strategy: best response regardless of the other player.',
      'Since both players have the same logic, the unique Nash equilibrium is (Defect, Defect) with payoffs (P, P).',
      'Cooperate–Cooperate yields (R, R) with R > P, but it is not an equilibrium because each player can deviate to T.',
    ],
    formula: 'Equilibrium: (D*, D*) where D* = Defect. Condition: T > R > P > S.',
    takeaway: 'Individual optimization can produce a Pareto-inferior outcome — the dilemma is structural, not merely psychological.',
  },
  stag_hunt: {
    title: 'Two Nash equilibria & risk dominance',
    intro: 'Payoffs: mutual stag (R,R), solo hare (h,h) with h < R but h > 0 when partner defects from stag.',
    steps: [
      '(Stag, Stag) is an equilibrium: neither wants to deviate to hare alone.',
      '(Hare, Hare) is also an equilibrium: safe best response if you expect defection.',
      'Stag–Stag Pareto-dominates Hare–Hare (higher payoffs for both).',
      'Hare–Hare is often risk-dominant: hare avoids the worst-case 0 from unilateral stag.',
      'Which equilibrium emerges depends on beliefs, culture, and past coordination success.',
    ],
    formula: 'Equilibria: (Stag, Stag) and (Hare, Hare). Risk-dominance favors Hare when stag failure is costly.',
    takeaway: 'Coordination games have multiple equilibria — expectations pick which one society lands in.',
  },
  chicken: {
    title: 'Brinkmanship & mixed strategies',
    intro: 'Two asymmetric bad outcomes: mutual crash (worst) vs one player swerving (status loss for swerver).',
    steps: [
      'Pure equilibria: (Swerve, Straight) and (Straight, Swerve) — asymmetric.',
      'Credible commitment to “stay straight” shifts power if believed.',
      'If both randomize, mixed-strategy equilibrium can involve positive crash risk.',
      'Pre-commitment devices (burn bridges) change the game by removing retreat.',
    ],
    formula: 'Mixed equilibrium: each plays Straight with probability p such that opponent is indifferent.',
    takeaway: 'Threats work only when retreat is costly and the threat is observable.',
  },
  battle_of_sexes: {
    title: 'Coordination with preference conflict',
    intro: 'Two pure-strategy Nash equilibria: both choose A or both choose B. Player 1 prefers A, Player 2 prefers B.',
    steps: [
      'Payoff structure: a > d, b > c for respective players when matched; unmatched payoffs are 0.',
      '(A,A) and (B,B) are both equilibria — coordination is necessary.',
      'Schelling focal points (tradition, salience) break symmetry without communication.',
      'Mixed strategies are unstable here — players want pure coordination.',
    ],
    formula: 'Equilibria: (A,A) and (B,B). Focal point selects among multiple equilibria.',
    takeaway: 'When preferences differ but coordination matters, conventions and defaults decide outcomes.',
  },
  matching_pennies: {
    title: 'Zero-sum & mixed strategy',
    intro: 'Zero-sum: one player’s gain equals the other’s loss. No pure-strategy equilibrium exists.',
    steps: [
      'If Matcher plays Heads with p, Mismatcher’s best response alternates — no fixed pure strategy.',
      'In equilibrium, Matcher mixes 50/50 to make Mismatcher indifferent.',
      'By symmetry, Mismatcher also mixes 50/50.',
      'Any predictable pattern gets exploited in zero-sum play.',
    ],
    formula: 'Equilibrium: p(Heads) = p(Tails) = ½ for both players.',
    takeaway: 'Pure conflict drives randomization — unpredictability is optimal, not irrational.',
  },
  pure_coordination: {
    title: 'Schelling focal points',
    intro: 'Players receive positive payoff only when choices match; which label is chosen is otherwise irrelevant.',
    steps: [
      'Any common choice is a Nash equilibrium in symmetric coordination.',
      'Without communication, salient options (defaults, culture, “obvious” labels) get selected.',
      'Experiments show people converge on focal points even when payoffs are symmetric across labels.',
    ],
    formula: 'Equilibrium set: all (x, x). Selection: argmax salience(x).',
    takeaway: 'Make the cooperative choice obvious in product and org design.',
  },
  ultimatum_game: {
    title: 'Subgame perfection vs fairness',
    intro: 'Proposer offers split (x, 1−x). Responder accepts if u_responder(x) ≥ u_reject(0).',
    steps: [
      'Standard model: responder accepts any x > 0 (money is money).',
      'Backward induction: proposer offers ε, keeps almost everything — unique SPE prediction.',
      'Data: offers cluster near 50/50; low offers rejected ~50% of the time.',
      'Fairness preferences enter utility: u = π − α·max(Δ,0) for disadvantageous inequality.',
    ],
    formula: 'SPE (money-max): offer → 0+. Behavioral: reject if x < fairness threshold θ.',
    takeaway: 'Real people punish unfairness even at cost — models need social preferences.',
  },
  dictator_game: {
    title: 'One-shot allocation',
    intro: 'Dictator chooses g ∈ [0, endowment]. Receiver has no move. Pure power exercise.',
    steps: [
      'Nash equilibrium: dictator keeps all (no reciprocal constraint).',
      'Mean give ≈ 20–30% in lab data — altruism, norms, or experimenter scrutiny.',
      'Double-blind designs reduce giving — reputation matters.',
    ],
    formula: 'Selfish optimum: g* = 0. Observed: E[g] > 0 under social context.',
    takeaway: 'Power reveals preferences; generosity under observation is partly strategic.',
  },
  trust_game: {
    title: 'Investment & reciprocity',
    intro: 'Investor sends s·I (multiplier m). Trustee returns r. Payoffs depend on m, s, r.',
    steps: [
      'If trustee is purely selfish: return r = 0. Anticipating this, investor sends s = 0.',
      'Trust collapses in one-shot selfish equilibrium.',
      'Reciprocity and repeated play support s > 0 and r > 0.',
      'Expected surplus grows with trust when returns exceed investment cost.',
    ],
    formula: 'Surplus if trusted: m·s. Equilibrium without norms: s* = 0.',
    takeaway: 'Trust is an investment requiring credible reciprocity or repeat interaction.',
  },
  public_goods: {
    title: 'Free-rider problem',
    intro: 'n players choose contributions c_i. Public good value G(Σc_i), cost is c_i per player.',
    steps: [
      'Individual FOC: contribute until private marginal benefit equals marginal cost.',
      'With public good, marginal benefit is shared — private contribution is below social optimum.',
      'Nash equilibrium: under-provision relative to efficient Σc.',
      'Mechanisms: taxes, matching, visibility, or selective incentives restore efficiency.',
    ],
    formula: 'Efficient: Σ MB_i = MC. Nash: MB_i = MC → Σc* < Σc_efficient.',
    takeaway: 'Shared resources need contribution norms or enforcement.',
  },
  gift_exchange: {
    title: 'Reciprocal fairness in contracts',
    intro: 'Employer wage w above minimum; worker effort e. Mutual gains if both reciprocate.',
    steps: [
      'One-shot selfish: minimal effort for any w.',
      'Fairness models: workers raise e when w exceeds reference wage.',
      'Employers anticipate this and may pay above market to elicit effort.',
      'Creates efficiency wage patterns without full contract enforcement.',
    ],
    formula: 'Utility: U_w = w − c(e) + f(w − w_ref); effort rises with perceived fairness.',
    takeaway: 'Recipity can substitute for incomplete contracts when visible.',
  },
  centipede: {
    title: 'Backward induction paradox',
    intro: 'Finite alternating game: take now or pass for larger pot later. Unique SPE: take on first move.',
    steps: [
      'At last node, taker grabs all — previous player would have taken one step earlier.',
      'Unravel by backward induction: unique SPE is immediate take.',
      'Humans pass early rounds — limited rounds, uncertainty, or social preferences.',
      'Laboratory behavior diverges from SPE when trust is plausible.',
    ],
    formula: 'SPE (common knowledge rationality): Take at t = 1.',
    takeaway: 'Backward induction is logically correct in SPE but behavior uses trust and error.',
  },
  entry_deterrence: {
    title: 'Sequential credibility',
    intro: 'Incumbent chooses Fight or Accommodate after entrant chooses In or Out.',
    steps: [
      'Subgame at entry: fight if credible punishment lowers entrant profit below Out.',
      'Empty threats (fight hurts incumbent too) are not subgame perfect.',
      'Sunk capacity or reputation makes fight credible — entry deterred.',
      'If accommodation Pareto-dominates fighting for both, accommodate may occur.',
    ],
    formula: 'Enter if π_in|acc > π_out. Deter if π_in|fight < π_out credibly.',
    takeaway: 'Only costly, believable commitments deter entry.',
  },
  hold_up: {
    title: 'Relationship-specific investment',
    intro: 'After sunk investment, buyer renegotiates price — hold-up extracts quasi-rents.',
    steps: [
      'Before investment: expected hold-up reduces ex-ante investment toward zero (underinvestment).',
      'Contracts, vertical integration, or competitive alternatives protect investments.',
      'Coase: assign property rights to minimize total transaction costs.',
    ],
    formula: 'Invest if E[π] − hold-up ≥ I. Hold-up → I* below efficient level.',
    takeaway: 'Specialize only with contractual protection or outside options.',
  },
  commitment_game: {
    title: 'Strategic commitment',
    intro: 'Player removes options to alter opponent’s beliefs about future play.',
    steps: [
      'Commitment is valuable when it changes opponent’s best response.',
      'Must be observable and costly to reverse (burn boats).',
      'Over-commitment locks you in when information arrives later.',
    ],
    formula: 'Value of commitment = Δ opponent payoff response × your benefit.',
    takeaway: 'Credible commitment is a strategic asset — use sparingly.',
  },
  backward_induction: {
    title: 'Subgame perfect equilibrium',
    intro: 'Solve finite sequential games from terminal nodes backward.',
    steps: [
      'At each information set, pick action maximizing continuation payoff given future optimal play.',
      'Eliminate non-credible threats not optimal in subgames.',
      'Result: Subgame Perfect Equilibrium (SPE).',
    ],
    formula: 'SPE: strategy profile optimal in every subgame.',
    takeaway: 'Plan from the endgame backward for credible sequential strategy.',
  },
  signaling_job_market: {
    title: 'Separating equilibrium',
    intro: 'High type chooses education e; cost c_H(e) < c_L(e). Employers pay w(e).',
    steps: [
      'Cheap signal: everyone picks same e — no separation.',
      'Separating: high types pick e* where low types unwilling to mimic.',
      'Condition: c_L(e*) ≥ wage gap between types.',
      'Spence: education can signal ability even if not productive, due to differential cost.',
    ],
    formula: 'Separate if ∃ e*: c_H(e*) < Δw and c_L(e*) > Δw.',
    takeaway: 'Signals work when faking is costly for low types.',
  },
  screening_insurance: {
    title: 'Self-selection menus',
    intro: 'Uninformed principal offers menu {contract_i}; types self-select.',
    steps: [
      'Pooling: one contract — adverse selection if high-risk dominates enrollment.',
      'Separating menu: high deductible for low risk, low deductible premium for high risk.',
      'Incentive compatibility: each type prefers intended contract.',
      'Participation: each type gets at least reservation utility.',
    ],
    formula: 'IC: U_H(H) ≥ U_H(L). PC: U_θ(θ) ≥ U_θ(outside).',
    takeaway: 'Design menus so types reveal themselves through choices.',
  },
  cheap_talk: {
    title: 'Costless messaging',
    intro: 'Sender sends message m before action; no direct cost. Receiver updates beliefs and acts.',
    steps: [
      'If interests perfectly opposed, all messages ignored — babbling equilibrium.',
      'If interests partially aligned, informative cheap talk can be equilibrium.',
      'Credibility requires overlap in preferred outcomes across types.',
    ],
    formula: 'Informative equilibrium exists when sender preferences vary with state but not too sharply vs receiver.',
    takeaway: 'Talk binds when interests align enough; otherwise verify with stakes.',
  },
  adverse_selection: {
    title: 'Market for lemons',
    intro: 'Sellers know quality q; buyers offer price p based on average quality E[q|p].',
    steps: [
      'At average price, high-quality sellers exit (reservation price > p).',
      'Average quality falls → buyers lower p further — unraveling.',
      'Akerlof: asymmetric information can collapse markets.',
      'Fixes: warranties, certification, returns, signaling.',
    ],
    formula: 'Trade if p ≥ seller reserve. Unravel when E[q|p] drops with p.',
    takeaway: 'Transparency and guarantees protect market quality.',
  },
  monty_hall: {
    title: 'Conditional probability & information',
    intro: 'Three doors: one car (C), two goats. You pick door A. Host opens goat door G (G ≠ A, G ≠ C). Should you switch?',
    steps: [
      'Prior: P(C at A) = P(C at B) = P(C at C) = 1/3.',
      'You pick A. Host opens G revealing a goat — host never opens the car.',
      'If car was at A (prob 1/3): switching loses.',
      'If car was at B or C (prob 2/3 combined): host’s open was forced — switching wins.',
      'Therefore P(win | switch) = 2/3, P(win | stay) = 1/3.',
    ],
    formula: 'P(win | switch) = 2/3 · Bayes: P(C at other | goat revealed) = 2/3.',
    takeaway: 'New information updates odds — switching doubles win probability from 1/3 to 2/3.',
  },
  repeated_prisoners_dilemma: {
    title: 'Folk theorem intuition',
    intro: 'Stage game PD repeated with discount factor δ ∈ (0,1). Future payoffs weighted by δ^t.',
    steps: [
      'One-shot: Defect always. Infinite horizon: cooperation can be sustained if δ high enough.',
      'Grim trigger: cooperate until defection, then defect forever — deters if δ·R/(1−δ) ≥ T.',
      'Tit-for-tat: forgiving reciprocity approximates good equilibrium behavior.',
      'Finite known last round: backward induction unravels cooperation at end.',
    ],
    formula: 'Cooperate if δ ≥ (T−R)/(T−P) under grim trigger (simplified).',
    takeaway: 'Shadow of the future enables cooperation that one-shot play destroys.',
  },
  tit_for_tat: {
    title: 'Reciprocity strategy',
    intro: 'Start Cooperate; then copy opponent’s last move. Axelrod tournament winner properties.',
    steps: [
      'Nice: never defects first — avoids unnecessary conflict.',
      'Provocable: punishes defection immediately.',
      'Forgiving: returns to cooperate after opponent cooperates.',
      'Clear: easy for partner to understand and predict.',
    ],
    formula: 'Strategy s_t = C if t=0; else copy opponent move at t−1.',
    takeaway: 'Simple reciprocity beats complex exploitation in many repeated environments.',
  },
  grim_trigger: {
    title: 'Punishment strategies',
    intro: 'Cooperate until first defection; defect forever after (grim trigger).',
    steps: [
      'Sustains cooperation if punishment future is harsh enough (high δ).',
      'One accidental defection locks both into mutual defection forever — fragile.',
      'Forgiving variants (two strikes) improve robustness to noise.',
    ],
    formula: 'Cooperate while no past D; else Defect always.',
    takeaway: 'Harsh punishments deter but amplify mistakes — balance with forgiveness.',
  },
  cournot_duopoly: {
    title: 'Quantity competition Nash',
    intro: 'Firms choose quantities q_i; price P(Q) with Q = q_1 + q_2, typically decreasing in Q.',
    steps: [
      'Firm i maximizes π_i = q_i · P(q_i + q_{−i}) − c·q_i.',
      'FOC gives best-response function q_i* = BR_i(q_{−i}).',
      'Nash: solve simultaneous BR equations.',
      'Cournot output exceeds monopoly but below perfect competition.',
    ],
    formula: 'Nash: q_i* = BR_i(q_j*). Total Q_Cournot > Q_monopoly.',
    takeaway: 'Strategic substitutes — your output lowers price for both.',
  },
  bertrand_competition: {
    title: 'Price competition paradox',
    intro: 'Homogeneous goods: firms set prices; demand goes to lowest price.',
    steps: [
      'Undercut by ε captures all demand until price hits marginal cost c.',
      'Nash equilibrium: p_1 = p_2 = c — zero profit with identical products.',
      'Differentiation or capacity constraints restore markup.',
    ],
    formula: 'Equilibrium (homogeneous): p* = MC, π* = 0.',
    takeaway: 'Commodity competition erodes margins — differentiate or constrain capacity.',
  },
  first_price_auction: {
    title: 'Bid shading & winner’s curse',
    intro: 'Highest bidder wins, pays own bid. Private value v with possible common-value component.',
    steps: [
      'With independent private values: bid b(v) < v to preserve margin.',
      'Common values: winning implies you likely overestimated — shade more.',
      'Winner’s curse: E[value | win] < your estimate.',
    ],
    formula: 'Optimal bid b* < v when uncertainty; shade increases with winner’s curse risk.',
    takeaway: 'Winning is bad news in common-value auctions — bid below signal.',
  },
  second_price_auction: {
    title: 'Vickrey truthfulness',
    intro: 'Winner pays second-highest bid. With independent private values, truthful bidding is dominant.',
    steps: [
      'Your bid affects whether you win, not what you pay if you win (payment = second price).',
      'Overbidding: win when v < second price — loss.',
      'Underbidding: lose when v > second price — missed surplus.',
      'Truthful bid v is weakly dominant.',
    ],
    formula: 'Payment = max(other bids). Dominant strategy: b(v) = v.',
    takeaway: 'Mechanism design can make honesty optimal — payment rule matters.',
  },
  nash_bargaining: {
    title: 'Bargaining solution',
    intro: 'Split surplus S above disagreement payoffs (d_1, d_2). Power from BATNA.',
    steps: [
      'Nash bargaining maximizes (u_1 − d_1)(u_2 − d_2) subject to feasibility.',
      'Better outside option shifts split toward that player.',
      'Efficiency: full surplus consumed — no money left on table in agreement.',
    ],
    formula: 'max (u_1−d_1)(u_2−d_2) s.t. u on Pareto frontier.',
    takeaway: 'Improve BATNA before negotiating — options are leverage.',
  },
  divide_dollar: {
    title: 'Feasibility constraint',
    intro: 'Players demand d_1, d_2. If d_1 + d_2 > 1, both get 0.',
    steps: [
      'Strategy space: claims in [0,1].',
      'Equilibrium claims must satisfy d_1 + d_2 ≤ 1 or mutual destruction.',
      'Fair focal point: (0.5, 0.5) is stable convention.',
      'Greedy joint claims are dominated by coordination failure.',
    ],
    formula: 'Payoff: min(d_1, 1−d_2) style rules; feasibility: d_1 + d_2 ≤ 1.',
    takeaway: 'Coordinate claims to the real budget or everyone loses.',
  },
  coalition_mini: {
    title: 'Coalition value',
    intro: 'Characteristic function v(S) gives worth of coalition S. Grand coalition v(N) may exceed sum of pairs.',
    steps: [
      'Players compare payoff in grand coalition vs best blocking coalition.',
      'Core: allocations no subgroup can improve by deviating.',
      'Shapley value: average marginal contribution across orderings — fair division concept.',
    ],
    formula: 'Shapley φ_i = average over permutations of [v(S∪{i}) − v(S)].',
    takeaway: 'Pivotal players in many coalitions hold bargaining power.',
  },
};

export function getMathExplanation(gameId: string): MathExplanation | undefined {
  return GAME_MATH_EXPLANATIONS[gameId];
}
