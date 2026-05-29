/**
 * Trait test bank: 18 × 4 scenarios (72).
 * Each prompt: "Think about the last time … What did you do first?"
 * Four options: healthy (1), neutral (3), risk (4), dominant (5) — see `TraitOptionPatternSub` in trait-test.ts.
 */

type TraitId =
  | 'irrationality'
  | 'narcissism'
  | 'role_playing'
  | 'compulsive_behavior'
  | 'covetousness'
  | 'shortsightedness'
  | 'defensiveness'
  | 'self_sabotage'
  | 'repression_shadow'
  | 'envy'
  | 'grandiosity'
  | 'gender_rigidity'
  | 'aimlessness'
  | 'conformity'
  | 'fickleness'
  | 'aggression'
  | 'generational_myopia'
  | 'death_denial';

function patternOpts(healthy: string, neutral: string, risk: string, dominant: string) {
  return [
    { label: healthy, traitSignal: 1, sub: 'healthy_pattern' as const },
    { label: neutral, traitSignal: 3, sub: 'neutral_pattern' as const },
    { label: risk, traitSignal: 4, sub: 'risk_pattern' as const },
    { label: dominant, traitSignal: 5, sub: 'dominant_pattern' as const },
  ];
}

function scenario(
  id: string,
  traitId: TraitId,
  situation: string,
  healthy: string,
  neutral: string,
  risk: string,
  dominant: string
) {
  return {
    type: 'scenario' as const,
    id,
    traitId,
    prompt: `Think about the last time ${situation}. What did you do first?`,
    options: patternOpts(healthy, neutral, risk, dominant),
  };
}

export const TRAIT_QUESTION_POOL_RAW = [
  // ── Irrationality ──
  scenario(
    'irr_1',
    'irrationality',
    'you had to choose quickly while your mind was racing',
    'Paused and wrote down the minimum facts you needed',
    'Picked the option that felt easiest emotionally',
    'Went with your gut without checking anything',
    'Acted immediately so you would not lose the moment'
  ),
  scenario(
    'irr_2',
    'irrationality',
    'you felt cornered in an argument',
    'Named what you agreed on, then stated your difference calmly',
    'Went quiet until the heat dropped',
    'Raised your voice to make sure you were heard',
    'Kept proving you were right long after it helped'
  ),
  scenario(
    'irr_3',
    'irrationality',
    'you read something that flatly disagreed with what you believed',
    'Sought the strongest version of the other side before deciding',
    'Skimmed for lines you could dismiss',
    'Trusted sources you already liked and stopped reading',
    'Closed it—felt too annoying to engage fairly'
  ),
  scenario(
    'irr_4',
    'irrationality',
    'you realized you had been wrong about something you had argued for',
    'Said you changed your mind and what you learned',
    'Softened the topic and moved on without owning it',
    'Explained why you were still partly right',
    'Doubled down or blamed the messenger'
  ),

  // ── Narcissism ──
  scenario(
    'nar_1',
    'narcissism',
    'you accomplished something you were proud of',
    'Logged the win privately and planned the next step',
    'Mentioned it once when it fit the conversation',
    'Hinted so people would ask about it',
    'Steered talk back to your achievement until it landed'
  ),
  scenario(
    'nar_2',
    'narcissism',
    'a group moved on without acknowledging what you contributed',
    'Assumed timing was accidental and let it go',
    'Noticed it but stayed focused on the task',
    'Felt slighted and withdrew visibly',
    'Interrupted to make sure your part was named'
  ),
  scenario(
    'nar_3',
    'narcissism',
    'you got praise and critique in the same breath',
    'Integrated both into one takeaway',
    'Dwelled on the praise and skimmed the critique',
    'Argued that the critique missed context',
    'Treated the critique as unfair or personal'
  ),
  scenario(
    'nar_4',
    'narcissism',
    'someone else received credit you quietly wanted',
    'Congratulated them and refocused on your lane',
    'Felt a sting but said nothing',
    'Compared your effort to theirs in your head',
    'Corrected the record about your role in front of others'
  ),

  // ── Role-playing ──
  scenario(
    'rp_1',
    'role_playing',
    'you disagreed in a high-stakes meeting',
    'Said plainly where you differed and why',
    'Softened your view with heavy qualifiers',
    'Agreed outwardly and pushed your angle later in private',
    'Performed agreement you did not feel'
  ),
  scenario(
    'rp_2',
    'role_playing',
    'you joined a new group that did not know you yet',
    'Showed up as yourself and let them adjust',
    'Toned down a few habits until you read the room',
    'Mirrored their style until you knew what was safe',
    'Played a version of you that felt rehearsed'
  ),
  scenario(
    'rp_3',
    'role_playing',
    'an authority figure asked your honest opinion',
    'Gave the straight answer with respect',
    'Mixed truth with diplomacy',
    'Filtered hard to avoid sounding difficult',
    'Said what you thought they wanted to hear'
  ),
  scenario(
    'rp_4',
    'role_playing',
    'you posted or replied where strangers could judge',
    'Wrote what you meant and accepted the trade-offs',
    'Edited heavily for tone',
    'Curated a persona that felt safer',
    'Backed off or performed a hotter take for attention'
  ),

  // ── Compulsive behavior ──
  scenario(
    'cb_1',
    'compulsive_behavior',
    'you noticed the same mistake showing up again',
    'Changed one concrete variable in how you approach it',
    'Promised yourself you would fix it later',
    'Repeated the familiar move because it felt automatic',
    'Did the same thing harder hoping it would work this time'
  ),
  scenario(
    'cb_2',
    'compulsive_behavior',
    'stress hit and your usual coping move appeared',
    'Named the trigger and picked a different small action',
    'Let the habit run once then reset',
    'Followed the urge without pausing',
    'Spiraled—same loop for the rest of the day'
  ),
  scenario(
    'cb_3',
    'compulsive_behavior',
    'a habit you know is not helping surfaced again',
    'Replaced it with a planned substitute for ten minutes',
    'Negotiated “just this once”',
    'Ran the habit while feeling guilty',
    'Surrendered—told yourself you cannot change it anyway'
  ),
  scenario(
    'cb_4',
    'compulsive_behavior',
    'you caught yourself looping the same worry',
    'Wrote the worry once and chose one next step',
    'Waited for the feeling to pass',
    'Replayed the same scenes in your head',
    'Stayed stuck for hours without interrupting it'
  ),

  // ── Covetousness ──
  scenario(
    'cov_1',
    'covetousness',
    'someone had a lifestyle or title you deeply wanted',
    'Noted what you admired and set one intrinsic goal',
    'Felt a flash of want then moved on',
    'Tracked their moves and compared yours',
    'Felt their win diminished you'
  ),
  scenario(
    'cov_2',
    'covetousness',
    'you finally reached a goal you had chased hard',
    'Rested and chose the next goal from values',
    'Felt flat sooner than you expected',
    'Immediately scanned for the next bigger prize',
    'Needed applause to feel the win was real'
  ),
  scenario(
    'cov_3',
    'covetousness',
    'you picked what to chase next',
    'Chose meaning and a realistic timeline',
    'Balanced duty and what looked good on paper',
    'Leaned toward what would impress others',
    'Chased status symbols first'
  ),
  scenario(
    'cov_4',
    'covetousness',
    'a peer moved visibly ahead of you',
    'Asked what you could learn from their path',
    'Felt pressure but kept working',
    'Measured your worth against their progress',
    'Felt resentful or obsessed with catching up'
  ),

  // ── Shortsightedness ──
  scenario(
    'sh_1',
    'shortsightedness',
    'a tempting shortcut competed with a slower better path',
    'Chose the path with the better long-term payoff',
    'Split the difference',
    'Took the shortcut to relieve pressure now',
    'Grabbed the quick win and figured you would fix fallout later'
  ),
  scenario(
    'sh_2',
    'shortsightedness',
    'an offer looked big but the downside was unclear',
    'Slowed down to verify before committing',
    'Asked one friend then decided',
    'Jumped in while momentum felt high',
    'Said yes on the spot so you would not miss out'
  ),
  scenario(
    'sh_3',
    'shortsightedness',
    'you looked at how your next few weeks were actually booked',
    'Aligned blocks with a longer priority you care about',
    'Mixed urgent tasks and some planning',
    'Filled time reactively day to day',
    'Avoided thinking past this week'
  ),
  scenario(
    'sh_4',
    'shortsightedness',
    'waiting would have improved the outcome',
    'Waited because you had planned for that',
    'Sometimes waited, sometimes not',
    'Moved early because delay felt unbearable',
    'Took the hit now rather than sit with uncertainty'
  ),

  // ── Defensiveness ──
  scenario(
    'def_1',
    'defensiveness',
    'someone gave you direct critical feedback about your work',
    'Listened and asked what “good” would look like',
    'Took notes and replied later when calmer',
    'Explained why you did it that way right away',
    'Felt attacked and pushed back hard'
  ),
  scenario(
    'def_2',
    'defensiveness',
    'someone disagreed with your idea in front of others',
    'Asked a clarifying question about their concern',
    'Debated calmly on the merits',
    'Cut them off to protect your idea',
    'Treated it as a challenge to your competence'
  ),
  scenario(
    'def_3',
    'defensiveness',
    'a small error of yours was pointed out',
    'Said thanks and fixed it',
    'Explained context briefly',
    'Minimized or deflected',
    'Denied it or blamed someone else first'
  ),
  scenario(
    'def_4',
    'defensiveness',
    'a comment felt like a dig at who you are',
    'Asked what they meant in one sentence',
    'Sat with it privately before responding',
    'Returned a sharp remark',
    'Shut down or stewed for a long time'
  ),

  // ── Self-sabotage ──
  scenario(
    'ss_1',
    'self_sabotage',
    'an opportunity showed up that you wanted but scared you',
    'Took one small concrete step the same day',
    'Researched extensively without committing',
    'Waited to “feel ready”',
    'Avoided replying or let the window close'
  ),
  scenario(
    'ss_2',
    'self_sabotage',
    'an important deadline was approaching',
    'Started early with a rough draft',
    'Planned then started close to the date',
    'Procrastinated until pressure forced speed',
    'Missed or nearly missed it because you kept delaying'
  ),
  scenario(
    'ss_3',
    'self_sabotage',
    'a task you keep postponing still mattered',
    'Booked a short timer and did the opening slice',
    'Added it to a list again',
    'Distracted yourself with easier work',
    'Convinced yourself it was not the right time yet'
  ),
  scenario(
    'ss_4',
    'self_sabotage',
    'harsh self-talk showed up right before you acted',
    'Noticed the thought and acted anyway at reduced scope',
    'Paused to reframe once',
    'Believed the thought and slowed way down',
    'Stopped completely and blamed yourself'
  ),

  // ── Repression (Shadow) ──
  scenario(
    'rs_1',
    'repression_shadow',
    'anger rose but you had to stay composed',
    'Named the anger and planned a calm debrief later',
    'Swallowed it and stayed polite',
    'Smiled while tension stayed in your body',
    'Numbing—jokes, food, or scroll instead of feeling'
  ),
  scenario(
    'rs_2',
    'repression_shadow',
    'a strong feeling showed up that you did not want others to see',
    'Shared a slice of it with someone you trust',
    'Managed it alone in a healthy outlet',
    'Hid it completely',
    'Denied you felt it even to yourself'
  ),
  scenario(
    'rs_3',
    'repression_shadow',
    'your reaction afterward surprised you',
    'Traced what triggered it and what it might mean',
    'Shrugged it off as random',
    'Avoided thinking about it',
    'Same reaction repeated the next time'
  ),
  scenario(
    'rs_4',
    'repression_shadow',
    'ongoing tension with someone stayed unresolved',
    'Addressed it directly when calm',
    'Hoped time would fix it',
    'Acted pleasant while resentment built',
    'Cut contact or froze them out without naming why'
  ),

  // ── Envy ──
  scenario(
    'env_1',
    'envy',
    'a colleague advanced instead of you',
    'Asked what skills or moves you could borrow',
    'Accepted it and refocused on your work',
    'Compared your output to theirs on loop',
    'Felt bitter or fantasized about their setback'
  ),
  scenario(
    'env_2',
    'envy',
    'friends celebrated a win while you felt off inside',
    'Joined the celebration authentically',
    'Stayed kind but quieter than usual',
    'Felt smaller and compared your chapter to theirs',
    'Pulled back or picked the moment apart later'
  ),
  scenario(
    'env_3',
    'envy',
    'someone shared a success you quietly wanted',
    'Cheered them and clarified your own next goal',
    'Felt mixed and kept the chat short',
    'Measured whether you “deserved” it more',
    'Could not stop thinking about what you lacked'
  ),
  scenario(
    'env_4',
    'envy',
    'scrolling showed peers seemingly ahead of you',
    'Closed the app and touched grass or real life',
    'Limited time online',
    'Kept scrolling to compare',
    'Spiraled—self-criticism or envy for a long stretch'
  ),

  // ── Grandiosity ──
  scenario(
    'gra_1',
    'grandiosity',
    'you compared your ability to peers on something difficult',
    'Checked evidence and calibrated honestly',
    'Felt confident in areas you had trained',
    'Assumed you were ahead without much proof',
    'Assumed you were exceptional with little data'
  ),
  scenario(
    'gra_2',
    'grandiosity',
    'a bet had limited information but a flashy upside',
    'Sized risk and capped downside first',
    'Took a small position',
    'Leaned on intuition you trusted too much',
    'Went big—sure your edge would carry you'
  ),
  scenario(
    'gra_3',
    'grandiosity',
    'someone questioned your judgment',
    'Asked what they were seeing that you missed',
    'Weighed their view fairly',
    'Dismissed them quickly',
    'Treated disagreement as disrespect'
  ),
  scenario(
    'gra_4',
    'grandiosity',
    'the team succeeded and you played a real part',
    'Highlighted the team first, then your piece',
    'Shared credit evenly',
    'Emphasized your contribution first',
    'Made sure everyone knew you were the key'
  ),

  // ── Gender rigidity ──
  scenario(
    'grg_1',
    'gender_rigidity',
    'you were asked to step into a role that felt “wrong” for your gender',
    'Tried it and noticed what felt true or false for you',
    'Did it but felt tense the whole time',
    'Avoided or deflected the ask',
    'Refused strongly—could not imagine being seen that way'
  ),
  scenario(
    'grg_2',
    'gender_rigidity',
    'you were curious about a hobby often labeled for another gender',
    'Tried it without making it a big identity story',
    'Tried it only in private',
    'Decided it was not “for you” without testing',
    'Ruled it out to protect how you are read'
  ),
  scenario(
    'grg_3',
    'gender_rigidity',
    'norms around you clashed with how you wanted to show up',
    'Chose authenticity in small visible steps',
    'Compromised on style or tone',
    'Conformed strongly to avoid friction',
    'Hid parts of yourself long-term'
  ),
  scenario(
    'grg_4',
    'gender_rigidity',
    'people expected a certain way of carrying yourself',
    'Expanded your range little by little',
    'Played along when the cost felt low',
    'Felt boxed in most of the time',
    'Performed the expected part even when it drained you'
  ),

  // ── Aimlessness ──
  scenario(
    'aim_1',
    'aimlessness',
    'someone asked where you saw yourself in a few years',
    'Shared a direction tied to values and skills',
    'Gave a vague but honest answer',
    'Changed the subject',
    'Drew a blank or felt panic'
  ),
  scenario(
    'aim_2',
    'aimlessness',
    'a quiet evening opened with no obligations',
    'Did something aligned with a priority you chose',
    'Rested without guilt',
    'Filled it with busy distractions',
    'Felt restless or hollow without plans'
  ),
  scenario(
    'aim_3',
    'aimlessness',
    'your week felt busy but not aligned with what matters',
    'Cut or moved one block toward a stated priority',
    'Noticed the mismatch',
    'Kept speeding up tasks',
    'Avoided defining what “matters” would even mean'
  ),
  scenario(
    'aim_4',
    'aimlessness',
    'a goal got hard and motivation dipped',
    'Adjusted the plan but kept the aim',
    'Paused and revisited why you started',
    'Started chasing a different shiny goal',
    'Dropped it without closing the loop'
  ),

  // ── Conformity ──
  scenario(
    'conf_1',
    'conformity',
    'the room leaned toward an idea you privately doubted',
    'Named your doubt with one clear reason',
    'Raised it softly as a question',
    'Stayed quiet in the meeting',
    'Agreed publicly and complained later'
  ),
  scenario(
    'conf_2',
    'conformity',
    'you were about to post a view that might upset some followers',
    'Posted your real view with care for harm',
    'Edited heavily to soften edges',
    'Waited for safer consensus to emerge',
    'Deleted the draft or copied the crowd'
  ),
  scenario(
    'conf_3',
    'conformity',
    'your circle rushed toward a trend you were unsure about',
    'Sat it out or tried it lightly on your terms',
    'Observed without committing',
    'Joined to belong',
    'Performed enthusiasm you did not feel'
  ),
  scenario(
    'conf_4',
    'conformity',
    'your preference differed from everyone in the room',
    'Said your preference plainly',
    'Hinted indirectly',
    'Mirrored the majority',
    'Hid your preference entirely'
  ),

  // ── Fickleness ──
  scenario(
    'fic_1',
    'fickleness',
    'results on something important flipped from great to bad',
    'Updated the plan from facts without blaming people',
    'Felt thrown but steadied the next step',
    'Flipped blame or loyalty fast',
    'Pivoted wildly without finishing the last plan'
  ),
  scenario(
    'fic_2',
    'fickleness',
    'a favourite approach failed once',
    'Adjusted one variable and retested',
    'Took a short break then tried again',
    'Chased a totally new tactic immediately',
    'Declared the whole path doomed'
  ),
  scenario(
    'fic_3',
    'fickleness',
    'you had announced a commitment publicly',
    'Followed through or renegotiated early with transparency',
    'Mostly followed through',
    'Let it slide when it got inconvenient',
    'Dropped it quietly when mood shifted'
  ),
  scenario(
    'fic_4',
    'fickleness',
    'new facts showed you were wrong yesterday',
    'Updated your stance openly',
    'Integrated quietly',
    'Doubled down publicly',
    'Changed topic without owning the shift'
  ),

  // ── Aggression ──
  scenario(
    'agg_1',
    'aggression',
    'a stranger’s careless move affected you',
    'Named a boundary calmly and moved on',
    'Swore under your breath once',
    'Snapped or glared harder than the slip deserved',
    'Exploded or carried rage for hours'
  ),
  scenario(
    'agg_2',
    'aggression',
    'an argument ended and you were alone after',
    'Cooled down with breath or a walk then repaired if needed',
    'Replayed it a few times then let go',
    'Replayed it on loop with fresh insults',
    'Planned cold withdrawal or payback'
  ),
  scenario(
    'agg_3',
    'aggression',
    'a small tech glitch ruined your flow',
    'Reset the tool and took one breath',
    'Complained briefly',
    'Stayed irritable for a long stretch',
    'Lashed out at people or objects nearby'
  ),
  scenario(
    'agg_4',
    'aggression',
    'you were criticised in front of others',
    'Asked to continue privately and stayed steady',
    'Defended on the spot but kept volume controlled',
    'Hit back publicly to even the score',
    'Humiliated them or shut down hard'
  ),

  // ── Generational myopia ──
  scenario(
    'gm_1',
    'generational_myopia',
    'an older relative said “we already tried that path”',
    'Asked what happened then and what is different now',
    'Listened halfway',
    'Brushed it off—times have changed',
    'Tuned out—felt irrelevant'
  ),
  scenario(
    'gm_2',
    'generational_myopia',
    'an advisor suggested studying older case studies',
    'Skimmed summaries then dug into two primary sources',
    'Glanced at headlines only',
    'Skipped—preferred only current feeds',
    'Said history does not apply to your situation'
  ),
  scenario(
    'gm_3',
    'generational_myopia',
    'hype said “this time is different” about a familiar bubble pattern',
    'Looked for rhymes with past cycles',
    'Stayed open but skeptical',
    'Leaning into novelty without checking',
    'Went all-in on the new story'
  ),
  scenario(
    'gm_4',
    'generational_myopia',
    'a strategy had burned people years ago in your field',
    'Extracted lessons before copying anything',
    'Noted the warning lightly',
    'Assumed people forgot enough that it will work now',
    'Assumed the past is too old to matter'
  ),

  // ── Death denial ──
  scenario(
    'dd_1',
    'death_denial',
    'you imagined how life might look decades ahead',
    'Connected aging to values and relationships you want to build',
    'Thought in vague hopeful images',
    'Avoided the picture',
    'Jumped only to money, titles, or image'
  ),
  scenario(
    'dd_2',
    'death_denial',
    'a rare empty month opened on your calendar',
    'Scheduled depth—people, health, meaning',
    'Mixed rest and chores without a theme',
    'Filled it with noise and distraction',
    'Optimized only for productivity optics'
  ),
  scenario(
    'dd_3',
    'death_denial',
    'a conversation touched mortality or grief',
    'Stayed present and listened or shared honestly',
    'Acknowledged discomfort briefly',
    'Joked it away fast',
    'Changed the subject immediately'
  ),
  scenario(
    'dd_4',
    'death_denial',
    'you thought about what outlives a career',
    'Named one concrete non-career commitment',
    'Had a fleeting thought then moved on',
    'Avoided—felt morbid or pointless',
    'Defaulted to work metrics only'
  ),
];
