AI Chat on the Platform — Plan
1. What it does
Chat-first flow: User types (or speaks) how they feel or what’s going on. The AI helps them explore it and can turn that into a Reflect-style check-in (emotions, energy, pleasantness, reasons) and/or a journal entry.
Guidance: AI suggests next steps (e.g. “Try a quick breath reset”, “Name what you’re feeling”, “Want to save this as a reflection?”), points to Recover techniques when relevant, and stays within wellbeing/EQ framing (no therapy/clinical claims).
Voice: Optional “speak and converse” so users can talk instead of type; responses can be read aloud (TTS).
2. User flows (high level)
Write / speak → User describes their state in free text or voice.
AI responds with reflection, validation, and optional:
“Save as check-in” – AI proposes emotions (from your EmotionTag set), energy 1–5, pleasantness 0–100, reasons; user confirms or edits; we create one Reflect entry (same shape as current Reflect: entrySource: 'reflect', optional journal text).
“Save to journal” – Same as above but clearly stored as a journal moment (and optionally attach the same structured check-in so it feeds Insights).
Guidance in thread – e.g. “Sounds like stress. Want to try a 1‑minute breathing reset?” → deep link to Recover/grounding; or “Naming the emotion can help” → suggest saving as check-in with suggested emotions.
Voice – User taps mic, speaks; we send transcript to AI; reply can be text and/or TTS.
No MD file; this is the plan in chat form.
3. Auto “emotion check-ins” and journal from chat
Extraction: After each user message (or at “Save” moment), call an LLM with:
The user’s message (and optionally last few turns).
Your schema: allowed emotions (EmotionTag list), energy 1–5, pleasantness 0–100, reasons (fixed list if you have one).
Prompt: “From this message, suggest 1–3 emotions, energy level, pleasantness, and reasons; if the user clearly wants to save to journal, mark that.”
Don’t auto-save without consent. Always show a “Save as reflection” / “Add to journal” card with the AI’s suggested emotions/energy/pleasantness/reasons and optional “journal snippet” (user’s words or a short summary). User taps Confirm (maybe with quick edits) → then you create:
One Reflect-style entry (or journal entry with same metadata) via your existing createJournalEntry (or equivalent), so Insights and history stay consistent.
Journal text: Either store the user’s original message (encrypted, like current journal) or an AI-summary sentence; same encryption as today.
So: suggest from chat, add only when user explicitly confirms; that gives “automatically add emotion check-ins and journal from it” in a safe way.
4. Guidance and suggestions
In-reply suggestions: Model is instructed to occasionally offer:
Reflect: “Want to save this as a quick check-in?”
Recover: “If you’d like to calm your body first, try the Physiological sigh” (link to Recover/grounding).
Learn: “There’s a short lesson on naming emotions” (link to Learn).
Prompt library: Optional “suggested prompts” for users who don’t know what to write, e.g. “I’m overwhelmed”, “I had a hard conversation”, “I want to notice what I’m feeling”.
Tone: Supportive, normalizing, short; avoid clinical/diagnostic language; escalate to crisis resources if risk language detected.
5. Voice (speaking and converse)
Input: Mic → speech-to-text (e.g. Expo Audio + Whisper, or device STT). Send text to the same chat API so one backend handles text and voice.
Output: Optional “Read reply aloud” (TTS). Use device TTS or a cloud TTS API; same reply text, no extra AI call.
UX: One chat thread; toggle or hold-to-talk for voice input; optional speaker icon to play the last reply. No separate “voice app”—just another input/output mode for the same chat.
6. Technical shape (without building yet)
Chat API: Backend (e.g. Supabase Edge Function or your API) that:
Accepts userId, messages[], optional voiceTranscript.
Calls an LLM (e.g. OpenAI, Claude) with a system prompt that includes: your EmotionTag list, energy/pleasantness/reasons schema, rules (no diagnosis, suggest Reflect/Recover/Learn, crisis handling).
Returns: assistant message + optional structured suggestion { emotions?, energyLevel?, pleasantness?, reasons?, suggestSaveAsCheckIn?: boolean, suggestRecover?: string } for the app to show a “Save as check-in” / “Try this Recover technique” card.
Storage:
Chat: Store turns in a chat_turns (or ai_chat_messages) table: user_id, role (user/assistant), content, suggested_checkin (JSONB), created_at. No journal text in this table if you want strict separation.
Check-ins / journal: Only create rows in your existing journal/reflect tables when the user confirms “Save”; use the same fields you already have (emotions, energy, pleasantness, reasons, journal text encrypted).
Voice:
Input: Record → upload or stream to Whisper (or device STT) → text → same chat API.
Output: Reply text → TTS (Expo Speech or cloud) → play. No new “voice model”; same chat, different I/O.
7. Privacy and safety
Journal text: If we save the user’s words to journal, treat them like current journal entries (encrypted, not used for training, only for that user).
Chat history: Decide if you keep it for context (better suggestions) or minimal (last N turns). Either way, same privacy policy and access control as the rest of the app.
Crisis: If the model or a keyword layer detects self-harm or crisis language, respond with empathy + show crisis hotline/chat and encourage reaching out; do not promise the AI can fix the situation.
8. Phasing
Phase 1 – Text chat only: Chat UI, backend calls LLM, replies + optional “suggested check-in” (emotions/energy/pleasantness/reasons). User confirms → one Reflect entry (and optional journal) via existing APIs. No voice.
Phase 2 – Guidance: Stronger prompts and structured suggestions for Recover/Learn links; optional suggested prompts on empty state.
Phase 3 – Voice: STT for input, TTS for “read reply aloud,” reusing the same chat API and data model.
You can later add a “Conversation” or “Chat” tab, or an entry point from Home/Reflect (“Talk it through instead”), and keep this plan as the single source of how AI chat, emotion check-ins, journal, and voice fit together—all in chat, no MD file.
