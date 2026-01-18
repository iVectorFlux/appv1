# EQ Assessment System - Design & Rationale

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Why This Design](#why-this-design)
3. [The 5 EQ Dimensions](#the-5-eq-dimensions)
4. [Question Types & Rationale](#question-types--rationale)
5. [Scoring System](#scoring-system)
6. [Two Assessment Modes](#two-assessment-modes)
7. [Psychometric Safeguards](#psychometric-safeguards)
8. [Technical Implementation](#technical-implementation)

---

## Executive Summary

This EQ assessment system is designed from **first principles** to measure emotional intelligence accurately while avoiding common pitfalls of self-report assessments. Unlike simple questionnaires that can be easily gamed, this system uses **7 distinct question types** with sophisticated scoring that:

- Removes social desirability bias through forced tradeoffs
- Detects inconsistent or careless responding
- Measures both **capacity** (what you know) and **behavior** (what you do)
- Provides calibrated self-awareness scores
- Works across cultures and neurodivergent populations

---

## Why This Design

### The Problem with Traditional EQ Tests

Most EQ assessments suffer from critical flaws:

| Problem | Why It Matters |
|---------|---------------|
| **Social Desirability Bias** | People answer how they want to appear, not how they are |
| **Acquiescence Bias** | People tend to agree with positive statements |
| **Mood Contamination** | Current mood affects self-perception |
| **No Validity Checks** | Random or dishonest responding goes undetected |
| **Single Method** | One question type can't capture all aspects of EQ |

### Our Solution: Multi-Modal Assessment

We use **7 different question types**, each designed to capture different aspects of emotional intelligence while neutralizing specific biases:

```
┌─────────────────────────────────────────────────────────────┐
│                    EQ ASSESSMENT SYSTEM                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ FORCED       │  │ LIKERT       │  │ EMOTION      │       │
│  │ CHOICE       │  │ SCALES       │  │ VOCABULARY   │       │
│  │ (15 items)   │  │ (20 items)   │  │ (15 items)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │ META-EQ      │  │ PHYSIOLOGICAL│  │ CONSISTENCY  │       │
│  │ SELF/OTHER   │  │ PROXY        │  │ PROBES       │       │
│  │ (12 items)   │  │ (10 items)   │  │ (12 items)   │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
│                                                              │
│  ┌──────────────┐                                           │
│  │ RANKING      │                                           │
│  │ ALLOCATION   │                                           │
│  │ (6 items)    │                                           │
│  └──────────────┘                                           │
│                                                              │
│  Total: 90 questions across 7 types                         │
└─────────────────────────────────────────────────────────────┘
```

---

## The 5 EQ Dimensions

Based on established EQ frameworks (Goleman, Bar-On, Mayer-Salovey), we measure:

### 1. Self-Awareness (25% of score)
> Recognizing and understanding your own emotions, triggers, and patterns

**Sub-facets measured:**
- Emotional Recognition (identifying what you feel)
- Emotional Granularity (distinguishing similar emotions)
- Trigger Awareness (knowing what sets you off)
- Self-Accuracy (how well you know yourself)
- Interoceptive Awareness (body-emotion connection)

**Why it's weighted highest:** Self-awareness is the foundation. You cannot regulate what you don't recognize.

### 2. Self-Regulation (20% of score)
> Managing emotions, controlling impulses, and adapting to situations

**Sub-facets measured:**
- Impulse Control (pausing before reacting)
- Emotional Recovery (bouncing back from setbacks)
- Adaptability (flexibility in response)
- Stress Management (handling pressure)

**Why it matters:** The ability to respond rather than react is central to effective functioning.

### 3. Empathy (20% of score)
> Understanding others' emotions and perspectives with compassion

**Sub-facets measured:**
- Emotional Reading (detecting others' emotions)
- Perspective Taking (seeing from others' view)
- Compassionate Concern (caring about others' wellbeing)

**Why it matters:** Social and professional success depends on understanding others.

### 4. Social Skills (20% of score)
> Communicating effectively, resolving conflicts, and influencing positively

**Sub-facets measured:**
- Communication Clarity (expressing emotions effectively)
- Conflict Navigation (handling disagreements)
- Influence (positive impact on others)

**Why it matters:** EQ must translate into effective interpersonal behavior.

### 5. Motivation (15% of score)
> Maintaining drive, resilience, and optimism toward goals

**Sub-facets measured:**
- Intrinsic Drive (internal motivation)
- Optimism (positive outlook)
- Resilience (recovery from setbacks)

**Why weighted lower:** While important, motivation is more situational than trait-based.

---

## Question Types & Rationale

### 1. Forced-Choice Trait Tradeoffs (15 questions)

**Structure:**
```
Which is more like you?

A. I notice subtle emotional shifts in others
B. I stay calm when situations become tense
```

**Why it works:**
- **Removes social desirability inflation** - Both options are positive
- **Forces implicit prioritization** - Reveals actual value hierarchy
- **Used in enterprise-grade tools** - Gold standard for personality/EQ

**Scoring approach:**
- Ipsative scoring: Choosing A adds to "empathy", not choosing B is neutral
- Some questions include "most AND least like you" for richer data
- Converted to normative scores for cross-person comparison

**Limitations addressed:**
- Requires sophisticated scoring logic (we implement ipsative → normative conversion)

---

### 2. Likert Trait Statements (20 questions)

**Structure:**
```
"I can accurately name what I'm feeling in difficult moments."

1 ──────────────────────────────────── 7
Strongly Disagree              Strongly Agree
```

**Why we still use it:**
- Simple and well-understood
- Scales well
- Easy to explain to institutions

**Mandatory safeguards we implement:**

| Safeguard | Implementation |
|-----------|----------------|
| Reverse-keyed items | 6 of 20 items are reverse-scored |
| Social desirability flagging | High-risk items tracked |
| Consistency traps | Paired with consistency probes |

**Example reverse-keyed item:**
```
"I rarely understand what triggers my emotional reactions."
```
Here, *disagreeing* indicates high self-awareness.

---

### 3. Emotion Vocabulary & Differentiation (15 questions)

**Structure:**
```
Which emotion best fits:
"Feeling tense while anticipating an evaluation"

A. Fear
B. Anxiety ✓ (correct)
C. Stress
D. Excitement
```

**Why it matters:**
High emotional differentiation (granularity) correlates with:
- Better regulation
- Lower reactivity
- Higher mental health outcomes

**Scoring approach:**
- Correct answer: 100%
- Close answers: Partial credit (30-70%)
- Wrong answers: 0%

**What it measures:**
- Emotional vocabulary breadth
- Ability to distinguish similar affective states
- Cognitive EQ (knowledge, not just behavior)

**Limitation acknowledged:**
- Measures *capacity*, not *behavior*
- Someone might know the difference but not apply it

---

### 4. Meta-EQ: Self vs Other Ratings (12 questions)

**Structure:**
```
Rate yourself:
"I stay composed under pressure"
1 ──────────────────────────────────── 7

How would others rate you:
"People who know me well would say I stay composed under pressure"
1 ──────────────────────────────────── 7
```

**Why this is powerful:**

The **delta** between self-rating and predicted-other rating reveals:

| Delta | Interpretation |
|-------|---------------|
| Self > Other (positive) | **Blind spot** - You think you're better than others perceive |
| Self ≈ Other (near zero) | **Calibrated** - Good self-awareness |
| Self < Other (negative) | **Hidden strength** - You underestimate yourself |

**Scoring:**
```
calibrationScore = 100 - (averageDelta × 100)
```

**Why it's hard to fake:**
- Requires consistent lying across paired questions
- People often reveal blind spots unconsciously

**Best for:** Leadership development, coaching contexts

---

### 5. Physiological Proxy Questions (10 questions)

**Structure:**
```
When I'm stressed, I usually notice it first in:

A. My breathing (shallow, fast, or held)
B. My muscles (tense shoulders, clenched jaw)
C. My thoughts (racing, negative, scattered)
D. I don't usually notice until later
```

**Why this works:**
- **Bypasses emotional language defenses** - Asks about body, not emotions
- **Captures interoceptive awareness** - Body-emotion connection
- **Neurodivergent-friendly** - Some people relate better to physical than emotional vocabulary
- **Cross-cultural** - Body sensations are more universal than emotion words

**Scoring:**
```
"High awareness" response → 100 points
"Medium awareness" response → 60 points  
"Low awareness" response → 20 points
```

**What it reveals:**
- People who notice body signals early can intervene before emotions escalate
- "I don't notice until later" consistently indicates lower self-awareness

---

### 6. Consistency Probes (12 questions / 6 pairs)

**Structure:**
Pair 1:
```
"I pause before reacting emotionally." (Item A)
"I often react before thinking." (Item B - reverse)
```

**Why this is non-negotiable:**

Consistency probes detect:
- **Random responding** (clicking through)
- **Impression management** (inconsistent self-presentation)
- **Low self-insight** (genuinely don't know themselves)

**Scoring:**
```
For negative correlation pairs:
expectedSum = maxScale + 1 (e.g., 8 for 7-point scale)
actualSum = itemA + itemB
consistencyScore = 1 - (|actualSum - expectedSum| / maxScale)
```

**Example:**
- If someone rates "I pause before reacting" as 6
- They should rate "I often react before thinking" as ~2
- Rating both as 5 → Inconsistency flag

**Penalty applied:**
```
overallScore = rawScore - (inconsistencyPenalty × 10)
```

---

### 7. Ranking & Allocation (6 questions)

**Structure:**
```
Distribute 100 points based on how well each describes you:

□ I understand my own emotions deeply     [__35__]
□ I control my emotional reactions well  [__25__]
□ I understand others' emotions easily   [__20__]
□ I handle social situations smoothly    [__20__]
                                   Total: [_100__]
```

**Why it works:**
- **Zero inflation possible** - Points are finite
- **Forces tradeoffs** - Can't rate everything high
- **Reveals relative priorities** - Shows internal value hierarchy

**Scoring:**
```
For each option:
normalizedScore = (allocation / totalPoints) × 100
```

**Limitation:**
- Cognitively heavier than other question types
- Requires careful UX (we provide +/- 10 buttons)

---

## Scoring System

### Overall Score Calculation

```
┌─────────────────────────────────────────────────────────────┐
│                    SCORING PIPELINE                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Step 1: Score each question type independently              │
│  ────────────────────────────────────────────────────────    │
│  • Forced-choice → Ipsative → Normative conversion           │
│  • Likert → Reverse-key handling → Normalize to 0-100        │
│  • Emotion vocab → Partial credit → Percentage correct       │
│  • Meta-EQ → Calculate deltas → Calibration score            │
│  • Physiological → Awareness level mapping                   │
│  • Consistency → Pair correlation → Consistency index        │
│  • Allocation → Normalize distributions                      │
│                                                              │
│  Step 2: Aggregate by dimension                              │
│  ────────────────────────────────────────────────────────    │
│  dimensionScore[d] = mean(allScoresForDimension[d])          │
│                                                              │
│  Step 3: Calculate weighted overall score                    │
│  ────────────────────────────────────────────────────────    │
│  overallScore = Σ(dimensionScore[d] × weight[d])             │
│                                                              │
│  Step 4: Apply quality penalties                             │
│  ────────────────────────────────────────────────────────    │
│  • Consistency penalty: (1 - consistencyIndex) × 10          │
│  • Social desirability flags noted (no penalty, flagged)     │
│  • Fast response flags noted (no penalty, flagged)           │
│                                                              │
│  Final Score: 0-100 scale                                    │
└─────────────────────────────────────────────────────────────┘
```

### Dimension Weights

```javascript
const DIMENSION_WEIGHTS = {
  self_awareness: 0.25,   // Foundation of all EQ
  self_regulation: 0.20,  // Response vs reaction
  empathy: 0.20,          // Understanding others
  social_skills: 0.20,    // Behavioral outcomes
  motivation: 0.15,       // More situational
};
```

### Quality Indicators

Every assessment result includes quality metrics:

| Indicator | Range | Interpretation |
|-----------|-------|----------------|
| Consistency Index | 0-1 | >0.7 = reliable, <0.5 = suspect |
| Social Desirability Bias | 0-1 | >0.3 = inflation likely |
| Response Time Flags | Count | >5 fast responses = careless |
| Completion Rate | 0-1 | <0.8 = incomplete assessment |
| Self-Awareness Calibration | 0-1 | From Meta-EQ deltas |

---

## Two Assessment Modes

### Mode 1: Quick Check-In (Daily)

**Purpose:** Low-friction daily tracking without survey fatigue

| Aspect | Value |
|--------|-------|
| Duration | ~2 minutes |
| Questions | 5 |
| Frequency | Daily (optional) |
| Question Types | 1 forced-choice, 2 likert, 1 emotion vocab, 1 physiological |

**Why these types:**
- Forced-choice: Core measurement, forces thinking
- Likert: Quick, familiar format
- Emotion vocab: Tests active capacity
- Physiological: Bypasses overthinking

**Scoring:**
- Simplified dimension scores
- Trends tracked over time
- No consistency probes (too few questions)

---

### Mode 2: Full Test (Profile)

**Purpose:** Comprehensive baseline and periodic deep assessment

| Aspect | Value |
|--------|-------|
| Duration | ~25 minutes |
| Questions | 60+ |
| Frequency | Monthly or quarterly |
| Question Types | All 7 types |

**Why all types:**
- Multiple methods triangulate truth
- Consistency probes validate reliability
- Meta-EQ reveals blind spots
- Full dimension coverage

**Results include:**
- Overall score (0-100)
- 5 dimension scores
- 7 question-type contributions
- Top 2 strengths
- Top 2 growth areas
- Personalized insights
- Quality indicators

---

## Psychometric Safeguards

### 1. Reverse Keying
- 30% of Likert items are reverse-keyed
- Prevents acquiescence bias
- Detects random responding

### 2. Consistency Pairs
- 6 pairs of semantically opposite items
- Separated in test to prevent gaming
- Inconsistency triggers penalty

### 3. Social Desirability Tracking
- Items flagged as high/medium/low risk
- High scores on high-risk items flagged
- Doesn't penalize, but flags for interpretation

### 4. Response Time Analysis
- Tracks milliseconds per question
- <500ms flagged as suspiciously fast
- Used for quality assessment, not penalty

### 5. Partial Credit Scoring
- Emotion vocabulary uses partial credit
- "Close" answers get 30-70% credit
- Prevents binary all-or-nothing scoring

### 6. Ipsative → Normative Conversion
- Forced-choice is inherently ipsative (relative)
- Converted to normative (absolute) for comparison
- Uses z-score standardization

---

## Technical Implementation

### File Structure

```
src/
├── types/
│   └── eq-assessment.ts     # Type definitions for all question/response types
├── data/
│   └── eq-questions.ts      # Question bank (90 questions)
├── services/
│   └── eq-scoring.ts        # Scoring algorithms
app/
├── (tabs)/
│   └── eq.tsx               # Check-in screen
└── full-eq-test.tsx         # Full assessment screen
```

### Key Types

```typescript
// Question types
type QuestionType = 
  | 'forced_choice'
  | 'likert'
  | 'emotion_vocabulary'
  | 'meta_eq'
  | 'physiological_proxy'
  | 'consistency_probe'
  | 'ranking_allocation';

// EQ Dimensions
type EQDimension = 
  | 'self_awareness'
  | 'self_regulation'
  | 'empathy'
  | 'social_skills'
  | 'motivation';

// Assessment Result
interface EQAssessmentResult {
  overallScore: number;           // 0-100
  dimensionScores: DimensionScores;
  typeScores: TypeScores;
  qualityIndicators: QualityIndicators;
  strengths: EQDimension[];
  growthAreas: EQDimension[];
  insights: string[];
}
```

### Scoring Functions

```typescript
// Main scoring entry point
calculateEQScore(questions, responses, userId, type) → EQAssessmentResult

// Individual type scorers
scoreForcedChoice(questions, responses) → dimensionPoints
scoreLikert(questions, responses) → { scores, socialDesirabilityFlags }
scoreEmotionVocabulary(questions, responses) → { score, correctCount }
scoreMetaEQ(questions, responses) → { calibrationScore, blindSpots, hiddenStrengths }
scorePhysiologicalProxy(questions, responses) → awarenessScore
scoreConsistencyProbes(questions, responses) → { consistencyIndex, inconsistentPairs }
scoreRankingAllocation(questions, responses) → dimensionScores
```

---

## Summary

This EQ assessment system represents a **psychometrically sound, multi-modal approach** to measuring emotional intelligence. Key differentiators:

1. **7 question types** that triangulate truth from multiple angles
2. **Built-in validity checks** that detect gaming, randomness, and bias
3. **Sophisticated scoring** that handles ipsative data, reverse-keying, and partial credit
4. **Two modes** that balance depth with daily usability
5. **Quality indicators** that contextualize every score

The design follows principles from enterprise-grade personality and EQ assessments while remaining accessible for a consumer app context.

---

**Version:** 1.0  
**Last Updated:** January 2026  
**Questions:** 90 total across 7 types  
**Dimensions:** 5 (self-awareness, self-regulation, empathy, social-skills, motivation)
