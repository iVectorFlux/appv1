# EQ App - Features, Functions & UX Analysis

## Table of Contents
1. [Executive Summary](#executive-summary)
2. [Architecture Overview](#architecture-overview)
3. [Core Features](#core-features)
4. [User Experience Breakdown](#user-experience-breakdown)
5. [Privacy & Security](#privacy--security)
6. [Technical Implementation](#technical-implementation)
7. [User Journeys](#user-journeys)

---

## Executive Summary

The EQ App is a production-grade, privacy-first Emotional Intelligence application designed for iOS, Android, and Web. The app focuses on helping users develop emotional awareness, regulation, and recovery skills through structured check-ins, private journaling, and guided recovery practices.

### Key Principles
- **Privacy-First**: Journal text is encrypted locally and never analyzed or synced
- **EQ-First Positioning**: Emphasis on emotional skill development, not scores
- **Offline-First**: Core functionality works without internet connection
- **B2C-Friendly UX**: Simple, intuitive interface despite enterprise-grade architecture

---

## Architecture Overview

### System Separation (Critical)

The app enforces **hard boundaries** between three distinct systems:

#### 1. Journal System (PRIVATE)
- **Purpose**: Personal emotional expression and reflection
- **Data**: Emotion tags, energy levels, reason/context, encrypted journal text
- **Storage**: Local SQLite database with encryption
- **Privacy Rules**:
  - Journal text is encrypted before persistence
  - Never synced to cloud
  - Never analyzed by AI/NLP
  - Never accessible to EQ logic
  - Explicit privacy comments in code

#### 2. EQ System (MEASUREMENT)
- **Purpose**: Structured emotional intelligence assessment
- **Data**: EQ check-in responses (trait/slider/binary questions)
- **Storage**: Local SQLite (syncable structured data only)
- **Rules**:
  - One question per day
  - No free text input
  - No scores shown to users
  - Scoring exists internally but never rendered

#### 3. Insights System (DERIVED)
- **Purpose**: Pattern recognition and gentle guidance
- **Data Sources**: 
  - EQ check-in patterns
  - Emotion + energy + reason correlations
  - **NEVER from journal text**
- **Output**: Text-only, descriptive, non-judgmental insights

---

## Core Features

### 1. Authentication & Onboarding

#### Features
- **Demo Mode Support**: Quick access without account creation
- **Secure Authentication**: Expo SecureStore for native, AsyncStorage fallback for web
- **User State Management**: Zustand store for global auth state

#### Functions
- `login(username, password)`: Authenticate user
- `logout()`: Clear session and redirect to login
- `initialize()`: Check for existing session on app start
- `isDemoMode`: Flag for demo account

#### UX Flow
1. User opens app → Check for existing session
2. If no session → Redirect to login screen
3. Login screen → Enter credentials (demo/demo123 for testing)
4. On success → Initialize database → Navigate to home
5. On failure → Show error message

#### Design Decisions
- Minimal onboarding to reduce friction
- Clear privacy messaging during first use
- Demo mode for immediate exploration

---

### 2. Home Screen

#### Features
- **EQ-First Positioning**: Primary focus on emotional skill development
- **Primary CTA**: Reflect (Journal) - Most prominent card
- **Secondary CTAs**: EQ Check-in and Recover
- **No Scores**: No numeric EQ scores or streak pressure
- **Descriptive Language**: Uses emotional state language, not metrics

#### Card Hierarchy
1. **Reflect Card** (Primary)
   - Large, prominent card with primary button
   - "Start Reflecting" CTA
   - Description: "Name emotions and journal privately"

2. **EQ Check-In Card** (Secondary)
   - Smaller, secondary card
   - "Start Check-In" CTA
   - Description: "Quick self-assessment of your emotional skills"

3. **Recover Card** (Secondary)
   - Smaller, secondary card
   - "Recover" CTA
   - Description: "Calm your nervous system and reset"

#### Functions
- Navigation to Reflect, EQ, and Recover screens
- User greeting and context setting
- No data fetching (offline-first)

#### UX Principles
- **No Pressure**: No streaks, no scores, no competition
- **Clear Hierarchy**: Visual weight indicates importance
- **Action-Oriented**: Every card has a clear CTA
- **Minimal Clutter**: Only essential actions visible

---

### 3. Reflect (Journal) Screen

#### Features
- **Emotion Selection**: Choose 1-3 emotions from predefined list
- **Extended Emotions**: "More emotions" toggle for additional options
- **Energy Level**: 5-point scale (1 = Low, 5 = High)
- **Reason/Context Tags**: Optional categorization (Work, Family, Relationships, etc.)
- **Private Journal Input**: Free-form text entry
- **Auto-Save**: Local encryption and persistence
- **Privacy Notice**: Clear messaging about encryption and privacy

#### Emotion Categories

**Default Emotions:**
- Calm, Happy, Tense, Stressed, Sad, Frustrated, Neutral, Anxious, Excited

**Extended Emotions:**
- Angry, Peaceful, Overwhelmed, Hopeful, Lonely, Grateful, Content, Worried, Energized, Disappointed, Relaxed, Restless, Proud, Tired, Confident, Uncertain

**Reason Tags:**
- Work / School, Family, Relationships, Health & Body, Self, Money, Environment, Life changes, World, Other

#### Functions
- `toggleEmotion(emotion)`: Select/deselect emotions (max 3)
- `toggleReason(reason)`: Select/deselect reason tags
- `setEnergyLevel(level)`: Set energy on 1-5 scale
- `handleSave()`: Encrypt and save journal entry (TODO: database integration)

#### UX Flow
1. User selects emotions (required, 1-3 max)
2. Optional: Add reason/context tags
3. Optional: Set energy level
4. Optional: Write journal text
5. Tap "Save Entry" → Encrypt and store locally
6. Privacy notice always visible

#### Design Decisions
- **Emotion naming required**: Encourages emotional awareness
- **Journal text optional**: Reduces pressure, allows quick check-ins
- **Visual feedback**: Selected emotions shown as chips
- **Progressive disclosure**: Extended emotions hidden by default
- **Privacy-first**: Encryption notice always visible

#### Privacy Guarantees
- Journal text encrypted before storage
- No analysis of journal content
- No cloud sync of journal text
- Clear in-code comments explaining privacy boundaries

---

### 4. EQ Check-In Screen

#### Features
- **Daily Questions**: One question per day
- **Question Types**: 
  - Slider (0-100 scale)
  - Binary/Choice (Often/Sometimes/Rarely)
- **Progress Indicator**: Visual progress bar
- **Skip Functionality**: Can skip anytime
- **No Scores**: Responses stored but scores never shown
- **Completion Screen**: Gentle completion message

#### Question Domains
- Self-awareness
- Self-regulation
- Emotional understanding
- Empathy
- Expression
- Resilience

#### Sample Questions
1. "I usually notice my emotions before they affect my actions." (Slider)
2. "When emotions rise, I pause before reacting." (Choice)
3. "I recover emotionally faster than I used to." (Slider)
4. "I notice emotional changes in others." (Choice)
5. "I can name my emotions clearly when they arise." (Slider)

#### Functions
- `handleChoice(choice)`: Record binary/choice response
- `handleSliderSubmit()`: Record slider value
- `handleSkip()`: Skip current question
- `handleComplete()`: Save check-in and return to home

#### UX Flow
1. Show progress bar (Question X of Y)
2. Display question with appropriate input type
3. User responds or skips
4. Animate to next question
5. After all questions → Show completion screen
6. "Done" button returns to home

#### Design Decisions
- **No Right/Wrong**: Framing is neutral, exploratory
- **Quick**: Designed for 2-3 minute completion
- **Non-Pressuring**: Skip option always available
- **No Scores**: Internal scoring exists but never displayed
- **Progress Feedback**: Visual progress bar for orientation

---

### 5. Recover Screen

#### Features
- **Quick Calm Section**: Breathing exercises and grounding practices
- **Release & Let Go Flow**: Temporary text release with animation
- **Breathing Exercise**: Guided 6-breath cycle with visual animation
- **Body Reset**: Placeholder for physical tension release
- **Grounding**: Placeholder for present-moment practices

#### Quick Calm Options

1. **Slow Breathing** (3 minutes)
   - Animated circle that expands/contracts
   - "Breathe in... Breathe out..." instructions
   - 6 complete breath cycles
   - Visual and text guidance

2. **Body Reset** (5 minutes)
   - Placeholder for future implementation
   - Description: "Release physical tension"

3. **Grounding** (2 minutes)
   - Placeholder for future implementation
   - Description: "Return to the present"

#### Release & Let Go Flow

**Enhanced Experience:**
1. User writes text about what's weighing on them
2. Tap "Release" button
3. **Phase 1 (1s)**: Text fades in and scales up
4. **Phase 2 (4s)**: Display text with affirmation
   - Shows user's text prominently
   - Random affirmation appears (e.g., "You are releasing what no longer serves you.")
   - Guidance text: "Take a deep breath. Watch these words fade away."
5. **Phase 3 (3s)**: Everything fades out gracefully
   - Text opacity → 0
   - Scale down animation
   - Smooth fade transition
6. **Phase 4**: Completion message
   - "You don't have to carry this right now"
   - "Take a breath. You're doing okay."
   - Option to release something else

**Affirmations (Random Selection):**
- "You are releasing what no longer serves you."
- "This weight is not yours to carry."
- "You are safe to let this go."
- "Peace is available to you right now."
- "You are stronger than this moment."
- "Let it dissolve like mist in the morning sun."

#### Functions
- `startBreathing()`: Begin breathing exercise with animation
- `handleRelease()`: Initiate release flow with animations
- `playReleaseSound()`: Optional sound feedback (placeholder)

#### UX Flow - Breathing
1. User taps "Slow Breathing"
2. Instructions screen → "Begin" button
3. Animated circle appears, scales with breath rhythm
4. Text instructions: "Breathe in..." / "Breathe out..."
5. Breath counter: "Breath X of 6"
6. After 6 breaths → Return to main screen

#### UX Flow - Release & Let Go
1. User taps "Let Go of Heavy Thoughts"
2. Text input screen appears
3. User writes what's weighing on them
4. "Release" button appears when text entered
5. Tap "Release" → Animation sequence begins
6. Text displayed with affirmation (4 seconds to read)
7. Fade out animation (3 seconds)
8. Completion message with option to release again

#### Design Decisions
- **Temporary Only**: Release text never saved
- **Visual Ritual**: Animation creates sense of release
- **Affirmations**: Positive, non-clinical language
- **No Pressure**: Can skip or exit anytime
- **Sound Optional**: Framework ready but not required

---

### 6. Learn Screen

#### Features
- **Lesson Library**: Collection of EQ skill lessons
- **Category Filtering**: Filter by EQ domain
- **Short Lessons**: 2-4 minute educational content
- **No Quizzes**: Educational, not evaluative
- **No Tests**: Learning-focused, not assessment-focused

#### Lesson Categories
- All
- Self-Awareness
- Self-Regulation
- Empathy
- Resilience
- Communication

#### Sample Lessons
1. "Understanding Emotional Triggers" (3 min, Self-awareness)
2. "The Pause Practice" (2 min, Self-regulation)
3. "Reading Emotional Cues" (4 min, Empathy)
4. "Naming Emotions Accurately" (3 min, Self-awareness)
5. "Emotional Recovery Patterns" (4 min, Resilience)
6. "Expressing Needs Clearly" (3 min, Communication)
7. "The Role of Body in Emotion" (3 min, Self-awareness)
8. "Reframing Difficult Emotions" (4 min, Self-regulation)

#### Functions
- `handleLessonPress(lessonId)`: Navigate to lesson detail (TODO)
- `setSelectedCategory(category)`: Filter lessons by category

#### UX Flow
1. View all lessons or filter by category
2. Tap lesson card → Navigate to lesson detail (TODO)
3. Read/watch lesson content
4. Return to lesson list

#### Design Decisions
- **Educational Focus**: No quizzes or tests
- **Short Format**: 2-4 minutes for accessibility
- **Category Organization**: Easy to find relevant content
- **Visual Cards**: Clear lesson preview with time estimate

---

### 7. Insights Screen

#### Features
- **EQ Skills Insights**: Patterns from EQ check-ins
- **Wellbeing Patterns**: Emotion + energy + reason correlations
- **Support Prompt**: Conditional prompt for extended patterns (21+ days)
- **Text-Only Insights**: Descriptive, non-judgmental language
- **Privacy Note**: Clear explanation that journal text is never analyzed

#### Insight Types

**EQ Skills Insights:**
- "You tend to notice emotions early"
- "Regulation feels steadier lately"
- Based on recent EQ check-in patterns

**Wellbeing Patterns:**
- "Energy dips during busy weeks"
- "You reflect most in the evening"
- "Calm emotions increase after recovery practices"
- Based on emotion + energy + reason correlations

#### Support Prompt (Conditional)
- **Trigger**: Same low-valence emotion ≥ 21 days + Low energy ≥ 60% of those days
- **Language**: 
  - "This feeling has been showing up for a while. Many people find it helpful to talk to someone."
  - **Never says**: "depressed", "disorder", "diagnosis"
- **Actions**: 
  - "View support options" button
  - "Not right now" dismiss button

#### Functions
- `setShowSupportPrompt(show)`: Show/hide support prompt
- Pattern detection logic (TODO: backend integration)

#### UX Flow
1. View insights list
2. Read EQ skills insights
3. Read wellbeing patterns
4. If pattern detected → Support prompt appears
5. Dismiss or view support options

#### Design Decisions
- **Non-Judgmental**: Descriptive language only
- **No Charts**: Avoids competitive framing
- **No Percentiles**: No comparison to others
- **Privacy Clear**: Explicit note about journal text privacy
- **Supportive**: Gentle guidance, not clinical diagnosis

---

### 8. Profile Screen

#### Features
- **User Information**: Avatar, username, demo mode badge
- **Settings Options**: Notifications, Privacy & Security, Help & Support, About
- **Privacy Notice**: Clear explanation of privacy protections
- **Logout**: Sign out functionality

#### Settings Sections
1. **Notifications**: Manage notification preferences (TODO)
2. **Privacy & Security**: Privacy settings and security options (TODO)
3. **Help & Support**: Access help resources (TODO)
4. **About**: App information and version (TODO)

#### Functions
- `handleLogout()`: Clear session and redirect to login
- Navigation to settings screens (TODO)

#### UX Flow
1. View profile information
2. Tap settings option → Navigate to settings screen
3. Adjust preferences
4. Return to profile
5. Logout → Clear session → Login screen

#### Design Decisions
- **Privacy Prominent**: Privacy notice visible on profile
- **Clear Logout**: Easy to find and use
- **Settings Access**: Quick access to app preferences

---

## User Experience Breakdown

### Design System

#### Color Palette
- **Background**: `#F7F9F8` (Neutral, calming)
- **Primary**: `#5FA8A3` (EQ accent, teal)
- **Secondary**: `#6B7AA1` (Learning accent, muted blue)
- **Text Primary**: `#1F2A2E` (Dark, readable)
- **Text Secondary**: `#6B7280` (Muted, supportive)
- **Surface**: `#EEF1F0` (Light, elevated)
- **Floating**: `#FFFFFF` (Cards, elevated surfaces)

#### Typography
- **Heading Font**: Poppins (semibold, 600)
- **Body Font**: System default (regular, 400)
- **Sizes**: xs (12px), sm (14px), base (16px), lg (18px), xl (20px), 2xl (24px), 3xl (28px)
- **Line Heights**: Tight (1.2), Normal (1.5), Relaxed (1.7)

#### Spacing
- **Scale**: xs (4px), sm (8px), md (12px), lg (16px), xl (20px), 2xl (24px), 3xl (32px), 5xl (48px)
- **Consistent**: All spacing uses token system

#### Radius
- **Small**: 4px (buttons, chips)
- **Medium**: 8px (cards)
- **Large**: 12px (large cards)
- **XL**: 16px (modals)
- **Full**: 999px (pills, avatars)

#### Shadows
- **Small**: Subtle elevation for cards
- **Medium**: Moderate elevation for primary cards
- **Large**: Strong elevation for modals

### Interaction Patterns

#### Navigation
- **Bottom Tabs**: Primary navigation (Home, Reflect, EQ, Recover, Learn, Insights, Profile)
- **Stack Navigation**: Screen-to-screen flows
- **Back Buttons**: Consistent placement and styling
- **No Deep Nesting**: Maximum 2-3 levels deep

#### Feedback
- **Visual**: Button states, loading indicators, animations
- **Haptic**: Optional vibration feedback (framework ready)
- **Audio**: Optional sound feedback (framework ready, not implemented)

#### Animations
- **Transitions**: Smooth screen transitions
- **Micro-interactions**: Button presses, card taps
- **Release Flow**: Multi-phase fade animations
- **Breathing**: Scale animations for breathing exercise

### Accessibility

#### Text
- **Readable Sizes**: Minimum 12px for body text
- **Contrast**: WCAG AA compliant color contrasts
- **Line Height**: Comfortable reading spacing

#### Touch Targets
- **Minimum Size**: 44x44px for all interactive elements
- **Spacing**: Adequate spacing between touch targets

#### Screen Reader
- **Labels**: All interactive elements have accessible labels
- **Semantic HTML**: Proper use of native components

---

## Privacy & Security

### Data Storage Rules

#### Journal Data (PRIVATE)
- **Storage**: Encrypted SQLite database (local only)
- **Encryption**: AES-256 encryption before persistence
- **Key Management**: Expo SecureStore (native) or AsyncStorage (web fallback)
- **Sync**: Never synced to cloud
- **Analysis**: Never analyzed by AI/NLP
- **Access**: Never accessible to EQ or Insights systems

#### Structured Data (SYNCABLE)
- **Storage**: SQLite database (local)
- **Data Types**: 
  - Emotion tags
  - Energy levels
  - Reason/context
  - EQ check-in responses
- **Sync**: Can be synced (future implementation)
- **Analysis**: Used for pattern detection in Insights

### Security Measures

#### Authentication
- **Token Storage**: SecureStore (native) or AsyncStorage (web)
- **Session Management**: Zustand store with persistence
- **Logout**: Complete session clearing

#### Encryption
- **Algorithm**: AES-256
- **Key Derivation**: Platform-specific secure key storage
- **Implementation**: Cross-platform encryption service

#### Privacy Guarantees
- **No Analytics on Journal Text**: Explicit code comments
- **No Console Logs**: Sensitive data never logged
- **Fail Closed**: Privacy violations prevent feature implementation
- **Clear Boundaries**: In-code comments explain privacy rules

---

## Technical Implementation

### Tech Stack

#### Core
- **React Native**: 0.76.5
- **Expo**: ~52.0.0
- **TypeScript**: 5.3.3 (strict mode)
- **Expo Router**: ~4.0.0 (file-based navigation)

#### State Management
- **Zustand**: 4.5.5 (global state)

#### Storage
- **SQLite**: expo-sqlite ~14.0.0 (structured data)
- **SecureStore**: expo-secure-store ~13.0.0 (secrets/keys)
- **AsyncStorage**: @react-native-async-storage/async-storage ~2.1.0 (flags)

#### Media
- **Audio**: expo-av ~14.0.0 (meditation, sounds)

#### UI
- **Icons**: @expo/vector-icons ^14.1.0
- **Animations**: react-native-reanimated ~3.16.1
- **Gestures**: react-native-gesture-handler ~2.20.2

### Architecture Patterns

#### Separation of Concerns
- **Services**: Database, encryption, API (future)
- **Stores**: Global state management (Zustand)
- **Components**: Reusable UI components
- **Screens**: Feature screens with business logic
- **Types**: TypeScript interfaces for type safety

#### File Structure
```
app/
  (auth)/          # Authentication screens
  (tabs)/          # Main app screens
src/
  components/      # Reusable components
  constants/       # Design tokens, constants
  services/       # Business logic services
  stores/          # Zustand stores
  types/           # TypeScript types
```

#### Code Quality
- **TypeScript Strict Mode**: Full type safety
- **Path Aliases**: `@/` for `src/` directory
- **Design Tokens**: No magic numbers, all values from tokens
- **Comments**: Architectural decisions documented

---

## User Journeys

### Journey 1: First-Time User

1. **Open App** → Login screen
2. **Login** (demo/demo123) → Home screen
3. **View Home** → See Reflect, EQ Check-in, Recover cards
4. **Tap Reflect** → Journal screen
5. **Select Emotion** → "Stressed"
6. **Set Energy** → Level 2 (Low)
7. **Add Reason** → "Work / School"
8. **Write Journal** → "Had a tough meeting today..."
9. **Save Entry** → Encrypted and stored locally
10. **Return Home** → See completion

**Time**: ~3-5 minutes
**Friction Points**: None (demo mode allows immediate access)

### Journey 2: Daily EQ Check-In

1. **Open App** → Home screen
2. **Tap EQ Check-In** → Question screen
3. **Answer Question 1** → Slider: 75
4. **Answer Question 2** → Choice: "Often"
5. **Answer Question 3** → Slider: 60
6. **Skip Question 4** → Not feeling it today
7. **Answer Question 5** → Slider: 80
8. **Complete** → Completion screen
9. **Done** → Return to home

**Time**: ~2-3 minutes
**Friction Points**: Skip option reduces pressure

### Journey 3: Emotional Recovery

1. **Open App** → Home screen
2. **Tap Recover** → Recovery options
3. **Tap Slow Breathing** → Breathing screen
4. **Begin** → Animated breathing circle
5. **Follow Rhythm** → 6 complete breaths
6. **Complete** → Return to recovery screen
7. **Tap Release & Let Go** → Release screen
8. **Write Text** → "Feeling overwhelmed..."
9. **Release** → Animation sequence
10. **Watch Fade** → Text disappears
11. **Completion** → "You don't have to carry this right now"

**Time**: ~5-7 minutes
**Friction Points**: None (guided experience)

### Journey 4: Pattern Recognition

1. **Use App Daily** → 21+ days of check-ins
2. **Open Insights** → Insights screen
3. **View EQ Skills** → "You tend to notice emotions early"
4. **View Patterns** → "Energy dips during busy weeks"
5. **Support Prompt** → "This feeling has been showing up..."
6. **View Support Options** → (Future: support resources)
7. **Dismiss** → Continue using app

**Time**: ~2 minutes
**Friction Points**: Support prompt is optional, dismissible

---

## Future Enhancements

### Planned Features
1. **Meditation**: Audio-based 2-10 minute sessions
2. **Wellbeing Signaling**: Enhanced pattern detection
3. **Cloud Sync**: Structured data sync (journal text stays local)
4. **Support Resources**: Integration with support services
5. **Lesson Content**: Full lesson detail screens
6. **Settings Screens**: Complete settings implementation

### Technical Debt
1. **Database Integration**: Complete journal entry saving
2. **EQ Check-in Storage**: Save responses to database
3. **Pattern Detection**: Backend logic for insights
4. **Sound Files**: Add release sound and meditation audio
5. **Haptic Feedback**: Add expo-haptics for better feedback

---

## Conclusion

The EQ App provides a comprehensive, privacy-first approach to emotional intelligence development. The clear separation between Journal (private), EQ (measurement), and Insights (derived) systems ensures user trust while providing valuable emotional skill development tools.

The UX is designed to be non-pressuring, supportive, and accessible, with clear visual hierarchy and intuitive navigation. All features prioritize user privacy and emotional wellbeing over engagement metrics or competitive elements.

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Maintained By**: Development Team
