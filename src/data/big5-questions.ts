/**
 * Big Five — IPIP 50-item structure (Goldberg, 1992), plain-language wording.
 * Sentences are written for broad readability (simple words, few idioms, inclusive tone).
 * Scoring keys (+/−) and order match the standard IPIP marker set.
 *
 * Scale: 1 = Very inaccurate … 5 = Very accurate (how well the statement describes you).
 * (−) items: contribution = (6 − rating) before averaging that factor.
 * Emotional Stability mean → Neuroticism for display: neuroticism = 6 − mean(ES).
 */

/** Internal scoring facets; ES = Emotional Stability (then mapped to Neuroticism). */
export type Big5QuestionTrait = 'E' | 'A' | 'C' | 'ES' | 'O';

/** Display order for results (OCEAN with N = Neuroticism). */
export type Big5Trait = 'O' | 'C' | 'E' | 'A' | 'N';

export interface Big5QuestionItem {
  id: string;
  text: string;
  trait: Big5QuestionTrait;
  /** IPIP (−) keyed: contribution = (6 − Likert). */
  reverse: boolean;
}

/**
 * 50 items: 10 per domain. Wording is simplified; keys unchanged.
 */
export const BIG5_QUESTIONS: Big5QuestionItem[] = [
  { id: 'big5_01', text: 'When I am with others, I am lively and easy to talk to.', trait: 'E', reverse: false },
  { id: 'big5_02', text: "I don't worry much about what other people are going through.", trait: 'A', reverse: true },
  { id: 'big5_03', text: 'I plan ahead and show up ready.', trait: 'C', reverse: false },
  { id: 'big5_04', text: 'I get stressed easily.', trait: 'ES', reverse: true },
  { id: 'big5_05', text: 'I know and use many different words when I speak or write.', trait: 'O', reverse: false },
  { id: 'big5_06', text: 'In a group, I am usually one of the quieter ones.', trait: 'E', reverse: true },
  { id: 'big5_07', text: 'I take a real interest in other people.', trait: 'A', reverse: false },
  { id: 'big5_08', text: 'I leave my things messy or not put away.', trait: 'C', reverse: true },
  { id: 'big5_09', text: 'Most of the time I feel calm.', trait: 'ES', reverse: false },
  { id: 'big5_10', text: 'Ideas that are not concrete or practical are hard for me to follow.', trait: 'O', reverse: true },
  { id: 'big5_11', text: 'I feel at ease when I am with other people.', trait: 'E', reverse: false },
  { id: 'big5_12', text: 'I say rude or hurtful things to people.', trait: 'A', reverse: true },
  { id: 'big5_13', text: 'I notice small details.', trait: 'C', reverse: false },
  { id: 'big5_14', text: 'I worry a lot.', trait: 'ES', reverse: true },
  { id: 'big5_15', text: 'I picture things clearly in my mind.', trait: 'O', reverse: false },
  { id: 'big5_16', text: 'I stay in the background and let others take the lead.', trait: 'E', reverse: true },
  { id: 'big5_17', text: 'When someone is upset, I feel it with them.', trait: 'A', reverse: false },
  { id: 'big5_18', text: 'I often handle things in a careless or messy way.', trait: 'C', reverse: true },
  { id: 'big5_19', text: 'I rarely feel sad or low.', trait: 'ES', reverse: false },
  { id: 'big5_20', text: 'I am not interested in ideas that are theoretical or abstract.', trait: 'O', reverse: true },
  { id: 'big5_21', text: 'I often speak first or start a chat with someone.', trait: 'E', reverse: false },
  { id: 'big5_22', text: "Other people's problems are not my concern.", trait: 'A', reverse: true },
  { id: 'big5_23', text: 'When there is work to do, I do it soon.', trait: 'C', reverse: false },
  { id: 'big5_24', text: 'Small things throw me off or bother me a lot.', trait: 'ES', reverse: true },
  { id: 'big5_25', text: 'I come up with strong or clever ideas.', trait: 'O', reverse: false },
  { id: 'big5_26', text: 'In a group, I do not say much.', trait: 'E', reverse: true },
  { id: 'big5_27', text: 'I am kind and gentle toward people.', trait: 'A', reverse: false },
  { id: 'big5_28', text: 'I forget to put things back where they belong.', trait: 'C', reverse: true },
  { id: 'big5_29', text: 'I get upset quickly.', trait: 'ES', reverse: true },
  { id: 'big5_30', text: 'It is hard for me to picture things in my mind.', trait: 'O', reverse: true },
  { id: 'big5_31', text: 'At social gatherings, I talk with many different people.', trait: 'E', reverse: false },
  { id: 'big5_32', text: 'I do not take much interest in other people.', trait: 'A', reverse: true },
  { id: 'big5_33', text: 'I like things tidy and in order.', trait: 'C', reverse: false },
  { id: 'big5_34', text: 'My mood changes a lot from one moment to the next.', trait: 'ES', reverse: true },
  { id: 'big5_35', text: 'I pick up new ideas quickly.', trait: 'O', reverse: false },
  { id: 'big5_36', text: 'I prefer that people do not focus attention on me.', trait: 'E', reverse: true },
  { id: 'big5_37', text: 'I make time to help someone who needs it.', trait: 'A', reverse: false },
  { id: 'big5_38', text: 'I put off work I should do.', trait: 'C', reverse: true },
  { id: 'big5_39', text: 'My feelings swing up and down strongly.', trait: 'ES', reverse: true },
  { id: 'big5_40', text: 'I use words that some people do not know.', trait: 'O', reverse: false },
  { id: 'big5_41', text: 'I am fine being the person others look at in a group.', trait: 'E', reverse: false },
  { id: 'big5_42', text: 'I can tell how other people are feeling.', trait: 'A', reverse: false },
  { id: 'big5_43', text: 'I follow a plan or routine when I have one.', trait: 'C', reverse: false },
  { id: 'big5_44', text: 'I get annoyed easily.', trait: 'ES', reverse: true },
  { id: 'big5_45', text: 'I take time to think things over on my own.', trait: 'O', reverse: false },
  { id: 'big5_46', text: 'Around people I do not know well, I stay quiet.', trait: 'E', reverse: true },
  { id: 'big5_47', text: 'I help people feel comfortable around me.', trait: 'A', reverse: false },
  { id: 'big5_48', text: 'I do my work carefully and completely.', trait: 'C', reverse: false },
  { id: 'big5_49', text: 'I often feel sad or low.', trait: 'ES', reverse: true },
  { id: 'big5_50', text: 'New ideas come to me often.', trait: 'O', reverse: false },
];

/**
 * Plain-language wording revision (same keys as ipip_big5_50_v1).
 * Stored on each result row for analytics and retakes.
 */
export const BIG5_INSTRUMENT_VERSION = 'ipip_big5_50_plain_v1';

export const BIG5_TRAIT_LABELS: Record<Big5Trait, string> = {
  O: 'Openness',
  C: 'Conscientiousness',
  E: 'Extraversion',
  A: 'Agreeableness',
  N: 'Neuroticism',
};

/** Short labels so the scale is easy to read on a phone. */
export const BIG5_LIKERT_LABELS: Record<number, string> = {
  1: 'Not like me at all',
  2: 'Mostly not like me',
  3: 'In the middle',
  4: 'Mostly like me',
  5: 'Very much like me',
};
