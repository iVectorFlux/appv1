-- Persist exact playback timestamps (in seconds) for video and audio lessons
-- so learners can resume right where they left off across sessions/devices
-- or explicitly choose "Restart from 0:00".

ALTER TABLE public.learning_content_progress
  ADD COLUMN IF NOT EXISTS video_position_seconds INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS audio_position_seconds INT NOT NULL DEFAULT 0;

