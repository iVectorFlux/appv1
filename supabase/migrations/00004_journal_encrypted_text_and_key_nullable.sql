-- Store encrypted journal body as base64 TEXT to avoid BYTEA serialization issues in JS.
-- App sends base64 string directly; no hex/BYTEA conversion needed.

-- Add temporary TEXT column for base64
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS journal_text_encrypted_text TEXT;

-- Backfill from BYTEA if any rows exist
UPDATE public.journal_entries
SET journal_text_encrypted_text = encode(journal_text_encrypted, 'base64')
WHERE journal_text_encrypted IS NOT NULL AND length(journal_text_encrypted) > 0;

UPDATE public.journal_entries
SET journal_text_encrypted_text = ''
WHERE journal_text_encrypted_text IS NULL;

-- Replace BYTEA column with TEXT
ALTER TABLE public.journal_entries DROP COLUMN IF EXISTS journal_text_encrypted;
ALTER TABLE public.journal_entries RENAME COLUMN journal_text_encrypted_text TO journal_text_encrypted;

ALTER TABLE public.journal_entries
  ALTER COLUMN journal_text_encrypted SET NOT NULL,
  ALTER COLUMN journal_text_encrypted SET DEFAULT '';
