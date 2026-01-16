# Emotional Intelligence (EQ) Mobile App

A production-grade, privacy-first Emotional Intelligence application built with React Native and Expo.

## Architecture Principles

### Privacy-First Design

- **Journal System (Private)**: Journal text is encrypted locally and NEVER synced, analyzed, or accessible to EQ/Insights systems
- **EQ System (Measurement)**: Structured check-ins only - no free text, can be synced with user consent
- **Insights System**: Derived ONLY from structured metadata (emotions, energy, EQ responses), NEVER from journal text

### Clear Separation of Concerns

The codebase enforces hard boundaries between:
- Journal entries (encrypted, local-only)
- EQ check-ins (structured, can sync)
- Insights (derived from structured data only)

## Tech Stack

- **React Native** + **Expo** (latest stable)
- **TypeScript** (strict mode)
- **Expo Router** (file-based navigation)
- **Zustand** (state management)
- **SQLite** (expo-sqlite) for local structured data
- **Expo SecureStore** for secrets/encryption keys
- **Expo AV** for audio (meditation + calming sounds)

## Setup

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Expo CLI: `npm install -g expo-cli`
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Demo Credentials

- **Username**: `demo`
- **Password**: `demo123`

## Project Structure

```
eqappv1/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   └── login.tsx      # Login screen
│   ├── (tabs)/            # Main app tabs
│   │   ├── home.tsx       # Home screen (EQ-first)
│   │   ├── reflect.tsx    # Journal screen
│   │   ├── eq.tsx         # EQ check-in screen
│   │   ├── recover.tsx    # Recovery tools
│   │   ├── learn.tsx      # Learning content
│   │   └── insights.tsx   # Insights dashboard
│   └── _layout.tsx        # Root layout
├── src/
│   ├── components/        # Reusable UI components
│   │   └── ui/           # Design system components
│   ├── constants/        # Design tokens, constants
│   ├── services/         # Business logic services
│   │   ├── database.ts   # SQLite database
│   │   └── encryption.ts # Journal encryption
│   ├── stores/           # Zustand state stores
│   │   └── auth-store.ts # Authentication state
│   └── types/            # TypeScript type definitions
└── package.json
```

## Design System

All styling uses token-based design system (no magic numbers):

- **Colors**: Defined in `src/constants/design-tokens.ts`
- **Spacing**: Consistent spacing scale (xs, sm, md, lg, xl, etc.)
- **Typography**: Font sizes, weights, line heights
- **Radius**: Border radius values
- **Shadows**: Elevation system

## Key Features

### ✅ Implemented

- [x] Authentication with dummy credentials
- [x] Design system tokens
- [x] SQLite database schema with privacy boundaries
- [x] Encryption service structure (placeholder)
- [x] Zustand state management
- [x] Expo Router navigation
- [x] Home screen with EQ-first positioning
- [x] Basic UI components (Button, Input)

### 🚧 To Be Implemented

- [ ] Reflect (Journal) screen with emotion selection
- [ ] EQ Check-in screen with daily questions
- [ ] Insights screen with pattern detection
- [ ] Recover screen with breathing/grounding exercises
- [ ] Learn screen with EQ skill lessons
- [ ] Wellbeing pattern detection (21+ days low valence)
- [ ] Meditation audio player
- [ ] Onboarding flow
- [ ] Proper encryption implementation (AES-256-GCM)

## Privacy Guarantees

1. **Journal Text**: Encrypted before storage, never synced, never analyzed
2. **Structured Data Only**: Insights derived from emotions, energy, EQ responses only
3. **Local-First**: All sensitive data stored locally in SQLite
4. **No Analytics**: No tracking of journal content
5. **Clear Boundaries**: Code comments explain privacy rules throughout

## Development Guidelines

- **No Magic Numbers**: All spacing, colors, radii must use design tokens
- **Strong Typing**: TypeScript strict mode enabled
- **Clear Comments**: Explain privacy boundaries and architectural decisions
- **Feature-Based Structure**: Easy to add new features without coupling
- **Performance**: Memoize selectors, avoid unnecessary re-renders

## License

Private - All rights reserved
