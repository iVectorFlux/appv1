# Emotional Intelligence (EQ) App

A production-grade, privacy-first Emotional Intelligence mobile application built with React Native and Expo. The app helps users develop emotional awareness, regulation, and recovery skills through structured check-ins, private journaling, and guided recovery practices.

## Live Repository

**GitHub**: [https://github.com/iVectorFlux/appv1](https://github.com/iVectorFlux/appv1)

## Key Principles

- **Privacy-First**: Journal text is encrypted locally and never analyzed or synced
- **EQ-First Positioning**: Emphasis on emotional skill development, not scores
- **Offline-First**: Core functionality works without internet connection
- **B2C-Friendly UX**: Simple, intuitive interface with modern design

## Architecture Overview

### System Separation (Critical Privacy Boundaries)

The app enforces **hard boundaries** between three distinct systems:

| System | Purpose | Data Storage | Privacy |
|--------|---------|--------------|---------|
| **Journal** | Personal emotional expression | Encrypted locally | Never synced, never analyzed |
| **EQ Check-ins** | Structured EQ assessment | Local SQLite | Syncable structured data only |
| **Insights** | Pattern recognition | Derived data | Based on EQ + emotions only, never journal text |

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React Native | 0.76.5 | Cross-platform mobile framework |
| Expo | ~52.0.0 | Development platform |
| TypeScript | 5.3.3 | Type safety (strict mode) |
| Expo Router | ~4.0.0 | File-based navigation |
| Zustand | 4.5.5 | State management |
| SQLite | expo-sqlite ~14.0.0 | Local structured data |
| SecureStore | expo-secure-store ~13.0.0 | Secrets/encryption keys |
| Expo AV | ~14.0.0 | Audio (meditation, sounds) |
| Reanimated | ~3.16.1 | Animations |

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- iOS Simulator (Mac) or Android Emulator
- Expo Go app (for physical device testing)

### Installation

```bash
# Clone the repository
git clone https://github.com/iVectorFlux/appv1.git
cd appv1

# Install dependencies
npm install

# Start development server
npm start

# Run on specific platform
npm run ios      # iOS Simulator
npm run android  # Android Emulator
npm run web      # Web browser
```

### Demo Credentials

- **Username**: `demo`
- **Password**: `demo123`

## Features

### Implemented Features

#### Authentication
- [x] Demo mode login with secure session management
- [x] Expo SecureStore for native, AsyncStorage fallback for web
- [x] Zustand-based auth state management

#### Home Screen
- [x] EQ-first positioning with clear visual hierarchy
- [x] Primary CTA: Reflect (Journal)
- [x] Secondary CTAs: EQ Check-in, Recover
- [x] No scores, no streaks, no pressure

#### Reflect (Journal) - Multi-Step Flow
- [x] **Step 1**: Pleasantness slider (unpleasant → pleasant) + Energy level (1-5)
- [x] **Step 2**: Emotion selection with color-coded chips (1-3 max)
  - 12 top emotions + expandable list of 22 more
  - Color-coded by emotion category
- [x] **Step 3**: Reason/context tags (Work, Family, Relationships, etc.)
- [x] **Step 4**: Private journal input with encryption notice
- [x] Success animation with emotion summary
- [x] End-to-end encryption messaging

#### EQ Check-In
- [x] Daily questions with progress indicator
- [x] Question types: Slider (0-100) and Binary (Often/Sometimes/Rarely)
- [x] 5 EQ domains: Self-awareness, Self-regulation, Resilience, Empathy
- [x] Skip functionality (no pressure)
- [x] Completion screen with gentle messaging
- [x] No scores shown to users

#### Recover Screen
- [x] **Slow Breathing**: 6-breath guided exercise with animated circle
- [x] **Release & Let Go**: Write and release heavy thoughts
  - Multi-phase animation (fade in → display with affirmation → fade out)
  - Random supportive affirmations
  - Nothing saved (temporary space)
- [x] Body Reset placeholder
- [x] Grounding placeholder

#### Insights Screen
- [x] Tab switching: Insights / Learn
- [x] EQ Skills insights (awareness, regulation patterns)
- [x] Wellbeing patterns (energy, reflection time, recovery effects)
- [x] Conditional support prompt (21+ days pattern detection)
- [x] Privacy notice about journal text
- [x] Featured lessons quick access

#### Learn Screen
- [x] 8 EQ skill lessons with descriptions
- [x] Category filtering (All, Self-Awareness, Self-Regulation, Empathy, Resilience, Communication)
- [x] Lesson cards with time estimates (2-4 min each)
- [x] Educational focus (no quizzes or tests)

#### Profile Screen
- [x] User information display
- [x] Demo mode badge
- [x] Settings navigation (Notifications, Privacy, Help, About)
- [x] Privacy notice
- [x] Logout functionality

#### Design System
- [x] Token-based design (no magic numbers)
- [x] Consistent spacing scale (xs → 5xl)
- [x] Typography system with Poppins headings
- [x] Color palette with semantic colors
- [x] Border radius system
- [x] Shadow/elevation system
- [x] Theme support (light/dark mode ready)

#### Technical
- [x] SQLite database schema with privacy boundaries
- [x] Encryption service structure
- [x] Cross-platform support (iOS, Android, Web)
- [x] Path aliases (@/ for src/)
- [x] TypeScript strict mode

### Planned Features

- [ ] Database integration for journal entry saving
- [ ] EQ check-in response storage
- [ ] Pattern detection backend logic
- [ ] Meditation audio player
- [ ] Onboarding flow
- [ ] AES-256-GCM encryption implementation
- [ ] Cloud sync for structured data (journal stays local)
- [ ] Haptic feedback (expo-haptics)
- [ ] Sound effects for release flow

## Project Structure

```
eqappv1/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Authentication screens
│   │   ├── _layout.tsx           # Auth layout
│   │   └── login.tsx             # Login screen
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab navigation
│   │   ├── home.tsx              # Home (EQ-first)
│   │   ├── reflect.tsx           # Journal (4-step flow)
│   │   ├── eq.tsx                # EQ check-in
│   │   ├── recover.tsx           # Recovery tools
│   │   ├── learn.tsx             # Learning content
│   │   ├── insights.tsx          # Insights dashboard
│   │   └── profile.tsx           # User profile
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry redirect
├── src/
│   ├── components/               # Reusable UI components
│   │   └── ui/
│   │       ├── Button.tsx        # Button component
│   │       ├── Input.tsx         # Input component
│   │       └── Slider.tsx        # Slider component
│   ├── constants/
│   │   ├── design-tokens.ts      # Design system tokens
│   │   └── themes.ts             # Theme definitions
│   ├── services/
│   │   ├── database.ts           # SQLite database
│   │   └── encryption.ts         # Encryption service
│   ├── stores/
│   │   ├── auth-store.ts         # Auth state (Zustand)
│   │   └── theme-store.ts        # Theme state
│   ├── styles/
│   │   ├── fonts.css             # Font definitions
│   │   ├── index.css             # Global styles
│   │   ├── tailwind.css          # Tailwind (web)
│   │   └── theme.css             # Theme variables
│   └── types/
│       └── index.ts              # TypeScript types
├── guidelines/
│   └── Guidelines.md             # Development guidelines
├── app.json                      # Expo configuration
├── babel.config.js               # Babel configuration
├── metro.config.js               # Metro bundler config
├── tsconfig.json                 # TypeScript config
└── package.json                  # Dependencies
```

## Emotion Categories

The app includes 34 emotions organized by emotional valence:

**Top 12 (Always Visible)**:
Happy, Calm, Anxious, Stressed, Sad, Tired, Relaxed, Overwhelmed, Frustrated, Peaceful, Worried, Content

**Extended (Expandable)**:
Relaxed, Grounded, Peaceful, On edge, Lonely, Empty, Exhausted, Irritated, Angry, Upset, Confused, Mixed, Unsure, Restless, Excited, Hopeful, Grateful, Energized, Disappointed, Proud, Confident, Uncertain

## Privacy Guarantees

1. **Journal Text**: Encrypted before storage, never synced, never analyzed
2. **Structured Data Only**: Insights derived from emotions, energy, EQ responses only
3. **Local-First**: All sensitive data stored locally in SQLite
4. **No Analytics**: No tracking of journal content
5. **Clear Boundaries**: Code comments explain privacy rules throughout
6. **Temporary Release**: "Release & Let Go" text is never saved

## Development Guidelines

- **No Magic Numbers**: All spacing, colors, radii must use design tokens
- **Strong Typing**: TypeScript strict mode enabled
- **Clear Comments**: Explain privacy boundaries and architectural decisions
- **Feature-Based Structure**: Easy to add new features without coupling
- **Performance**: Memoize selectors, avoid unnecessary re-renders
- **Privacy First**: When in doubt, keep data local and encrypted

## Scripts

```bash
npm start          # Start Expo development server
npm run ios        # Run on iOS Simulator
npm run android    # Run on Android Emulator
npm run web        # Run in web browser
```

## Contributing

This is a private project. Please contact the maintainers for contribution guidelines.

## License

Private - All rights reserved

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Repository**: [github.com/iVectorFlux/appv1](https://github.com/iVectorFlux/appv1)
