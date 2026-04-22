-- Allow authenticated inserts into recovery_sessions (WITH CHECK).
-- Some Postgres versions treat FOR ALL USING alone as insufficient for INSERT RLS.
DROP POLICY IF EXISTS "recovery_sessions_insert_own" ON public.recovery_sessions;
CREATE POLICY "recovery_sessions_insert_own" ON public.recovery_sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
