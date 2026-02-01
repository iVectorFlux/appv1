# File Naming Standards

This project follows consistent naming conventions for all files.

## Standards

### Route Files (app/)
- **Format**: kebab-case (multi-word); single-word names allowed (e.g. `home.tsx`)
- **Examples**: 
  - `full-eq-test.tsx`
  - `learning-detail.tsx`
  - `sign-in.tsx`, `sign-up.tsx`, `confirm-email.tsx`
  - `home.tsx`, `profile.tsx`, `insights.tsx`

### Layout Files (app/)
- **Format**: `_layout.tsx` (Expo Router convention)
- **Examples**:
  - `app/_layout.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(auth)/_layout.tsx`

### Component Files (src/components/)
- **Format**: kebab-case (same as app and rest of src)
- **Examples**:
  - `button.tsx`
  - `input.tsx`
  - `slider.tsx`
  - `feature-card.tsx`
  - `hero-card.tsx`
  - `audio-row-card.tsx`

### Utility/Data/Service Files (src/)
- **Format**: kebab-case
- **Examples**:
  - `eq-questions.ts`
  - `learning-content.ts`
  - `auth-store.ts`
  - `eq-scoring.ts`
  - `design-tokens.ts`

### Type Files (src/types/)
- **Format**: kebab-case
- **Examples**:
  - `eq-assessment.ts`
  - `index.ts`

### Documentation Files
- **Format**: kebab-case
- **Examples**:
  - `eq-assessment-readme.md`
  - `README.md`

## Rules

1. ✅ Use kebab-case for all files (app routes, src components, src services/utils)
2. ✅ Use `_layout.tsx` for Expo Router layout files
3. ❌ Never use underscores (except in `_layout.tsx`)
4. ❌ Never use UPPER_CASE
5. ❌ Never use camelCase or PascalCase for file names
