-- Ensure journal_entries.chat_message_id exists (Inner Ally auto-journal → ai_chat_messages).
-- Idempotent: safe if 00009 already ran.
-- Apply via: supabase db push   or   Dashboard → SQL Editor → run this file.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS chat_message_id UUID REFERENCES public.ai_chat_messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_journal_chat_message
  ON public.journal_entries(chat_message_id)
  WHERE chat_message_id IS NOT NULL;

COMMENT ON COLUMN public.journal_entries.chat_message_id IS
  'Optional FK to the assistant ai_chat_messages row when this entry was auto-saved from Inner Ally.';
