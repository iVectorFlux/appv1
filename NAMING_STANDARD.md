# File Naming Standards

This project follows consistent naming conventions for all files.

## Standards

### Route Files (app/)
- **Format**: kebab-case
- **Examples**: 
  - `full-eq-test.tsx`
  - `learning-detail.tsx`
  - `home.tsx`, `profile.tsx`, `insights.tsx`

### Layout Files (app/)
- **Format**: `_layout.tsx` (Expo Router convention)
- **Examples**:
  - `app/_layout.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(auth)/_layout.tsx`

### Component Files (src/components/)
- **Format**: PascalCase
- **Examples**:
  - `Button.tsx`
  - `Input.tsx`
  - `Slider.tsx`

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

1. ✅ Use kebab-case for all route files
2. ✅ Use kebab-case for all utility/data/service files
3. ✅ Use PascalCase for React component files
4. ✅ Use `_layout.tsx` for Expo Router layout files
5. ❌ Never use underscores (except in `_layout.tsx`)
6. ❌ Never use UPPER_CASE
7. ❌ Never use camelCase for file names
