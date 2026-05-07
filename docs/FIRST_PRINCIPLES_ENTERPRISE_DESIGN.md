# First Principles Enterprise Design Spec

This document captures the UI style system implemented in `first-principles-enterprise.jsx` so it can be reused consistently.

## 1) Design Intent

- Tone: editorial, calm, and high-trust.
- Visual direction: soft paper background + academic serif for reading + technical sans/mono for interface metadata.
- UX pattern: guided single-task flow with strong progress visibility and low visual noise.

## 2) Color System

### Core Palette

- `--bg-page`: `#F7F6F3` (global background)
- `--bg-surface`: `#FFFFFF` (cards, inputs)
- `--bg-subtle`: `#EFEDE8` (guidance callout)
- `--ink-primary`: `#1A1814` (main headings)
- `--ink-default`: `#2C2A25` (body/high-importance text)
- `--ink-secondary`: `#5C5A52` (supporting text)
- `--ink-muted`: `#9B9890` (meta text)
- `--ink-disabled`: `#C5C3BC` (disabled text or low emphasis)
- `--border-default`: `#E5E3DE`
- `--border-soft`: `#D8D6D0`

### Brand/Interactive

- `--brand-primary`: `#1B2A4A` (primary actions, active progress, accents)
- `--brand-primary-hover`: `#243660`
- `--brand-on-primary`: `#FFFFFF`

### Semantic

- `--success`: `#2D6A4F`
- `--danger`: `#9B2335`
- `--reflection-bg`: `#1B2A4A`
- `--reflection-label`: `#6B8AB8`
- `--reflection-text`: `#E5EAF5`

## 3) Typography

### Font Families

- Reading serif: `"Libre Baskerville", Georgia, serif`
- UI sans: `"IBM Plex Sans", sans-serif`
- Meta/code mono: `"IBM Plex Mono", monospace`

### Type Scale (as implemented)

- Display/title: `clamp(24px, 4vw, 36px)`, weight `700`, line-height `1.25`
- Section question: `clamp(20px, 3.5vw, 28px)`, weight `700`, line-height `1.3`
- Heading medium: `26px`, weight `700`
- Body default: `15-16px`, line-height `1.6-1.75`
- UI label text: `12-14px`, weight `500-600`
- Micro/meta labels: `11-13px`, mono/sans, uppercase with letter spacing `0.06em-0.1em`

### Type Usage Rules

- Use serif for long-form writing and scenario content.
- Use sans for controls, helper text, and list labels.
- Use mono for step numbers, progress counters, and system labels.
- Reserve italics for reflective/contextual narrative.

## 4) Spacing and Layout

### Global Frame

- Full-height app (`min-height: 100vh`) with fixed top progress rail (`3px`).
- Header padding: `24px 40px`.
- Main area centers a content column with `max-width: 640px`.
- Main content padding: `40px 20px`.

### Rhythm

- Prefer vertical spacing in the `8/12/16/20/24/28/32/36/40px` range.
- Section separations often use `32px+`.
- Small metadata separations use `4-12px`.

### Borders/Dividers

- Default border: `1px solid #E5E3DE`
- Secondary border: `1px solid #D8D6D0`
- Accent left rule: `3px solid #1B2A4A` (for guidance/context blocks)

## 5) Component Styling

### Primary Button (`.btn-primary`)

- Background: `#1B2A4A`
- Text: white
- Border: none
- Padding: `12px 28px`
- Font: `14px`, weight `500`, letter spacing `0.02em`
- Hover: `#243660`
- Disabled: background `#C5C3BC`, cursor `not-allowed`

### Ghost Button (`.btn-ghost`)

- Background: transparent
- Text: `#6B6860`
- Border: `1px solid #D8D6D0`
- Padding: `11px 24px`
- Font: `14px`
- Hover: text + border move to `#1B2A4A`

### Textarea/Input Surface

- Background: white
- Border: `1px solid #D8D6D0`
- Padding: `18px 20px`
- Body font: serif, `15px`, line-height `1.7`
- Behavior: no resize handle, no default focus outline

### Progress Indicators

- Global progress rail: muted track (`#E5E3DE`) + brand fill (`#1B2A4A`)
- Word-count progress: brand fill until threshold, then success green (`#2D6A4F`)

### Cards and Lists

- Review cards use white surfaces with light borders.
- Hover interaction is border-color emphasis to brand blue.
- Keep dense data readable with mono micro-labels and sans summary text.

## 6) Interaction + Motion

- Transition style is subtle and quick (`0.15s-0.4s`).
- View transitions use fade + slight vertical movement:
  - enter/exit: opacity with `translateY(10px -> 0)`
  - timing: `0.22s ease`
- Progress bars animate width (`0.3s-0.4s ease`).

## 7) Information Architecture

- Intro -> 7 guided steps -> review -> feedback.
- One cognitive task per screen.
- Progressive disclosure via optional guidance toggle.
- Built-in quality guardrails (minimum word count gates).
- Reflective closure via score, strengths/gaps, and follow-up prompt.

## 8) UI/UX Recommendations for Reuse

- Keep the serif + sans + mono triad; it is central to the product personality.
- Preserve the restrained palette and avoid adding saturated colors outside semantic states.
- Maintain the single-column reading width (`~640px`) to support deep writing tasks.
- Reuse the same two-button hierarchy (`primary` + `ghost`) across all workflow screens.
- Keep microcopy labels uppercase and monospaced for orientation consistency.

## 9) Suggested Token Starter (CSS Variables)

```css
:root {
  --bg-page: #f7f6f3;
  --bg-surface: #ffffff;
  --bg-subtle: #efede8;
  --ink-primary: #1a1814;
  --ink-default: #2c2a25;
  --ink-secondary: #5c5a52;
  --ink-muted: #9b9890;
  --ink-disabled: #c5c3bc;
  --border-default: #e5e3de;
  --border-soft: #d8d6d0;
  --brand-primary: #1b2a4a;
  --brand-primary-hover: #243660;
  --success: #2d6a4f;
  --danger: #9b2335;
}
```
