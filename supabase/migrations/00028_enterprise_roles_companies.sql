-- Enterprise Multi-Company & Multi-Admin Role Support
-- Adds companies table, profiles.role ('user' | 'admin'), profiles.company_id,
-- profiles.email sync, company admin RLS read policies across learning & assessment tables,
-- and safe SECURITY DEFINER RPCs for creating/joining workspaces and promoting additional admins.

-- 1. Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT,
  invite_code TEXT NOT NULL UNIQUE DEFAULT UPPER(SUBSTRING(REPLACE(gen_random_uuid()::TEXT, '-', ''), 1, 8)),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_invite_code ON public.companies (UPPER(invite_code));

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 2. Extend profiles with email, role, company_id
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_company_role ON public.profiles (company_id, role);

-- Backfill profile emails from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE u.id = p.id AND (p.email IS NULL OR p.email = '');

-- Keep profile email synced when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = COALESCE(EXCLUDED.email, public.profiles.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helper: true when caller is an admin of target_company_id (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.is_company_admin(target_company_id UUID)
RETURNS BOOLEAN AS $$
  SELECT
    target_company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE id = auth.uid()
        AND role = 'admin'
        AND company_id = target_company_id
    );
$$ LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public;

-- Guard direct role / company_id mutations on profiles unless executed by authorized RPC or SQL/service role
CREATE OR REPLACE FUNCTION public.guard_profile_role_change()
RETURNS TRIGGER AS $$
BEGIN
  IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.company_id IS DISTINCT FROM NEW.company_id) THEN
    IF auth.uid() IS NULL OR current_setting('app.bypass_profile_guard', true) = '1' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'Only an authorized company admin action may modify role or company membership.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_guard_profile_role_change ON public.profiles;
CREATE TRIGGER trg_guard_profile_role_change
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_role_change();

-- RPC: Create a company workspace and promote caller to company admin
CREATE OR REPLACE FUNCTION public.create_company_workspace(company_name TEXT)
RETURNS TABLE (company_id UUID, name TEXT, invite_code TEXT) AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_clean TEXT := TRIM(COALESCE(company_name, ''));
  v_existing UUID;
  v_new_id UUID;
  v_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF LENGTH(v_clean) < 2 THEN
    RAISE EXCEPTION 'Company name must be at least 2 characters';
  END IF;

  SELECT p.company_id INTO v_existing FROM public.profiles p WHERE p.id = v_uid;
  IF v_existing IS NOT NULL THEN
    RAISE EXCEPTION 'User is already associated with a company workspace';
  END IF;

  INSERT INTO public.companies (name, created_by)
  VALUES (v_clean, v_uid)
  RETURNING id, companies.invite_code INTO v_new_id, v_code;

  PERFORM set_config('app.bypass_profile_guard', '1', true);
  UPDATE public.profiles
  SET company_id = v_new_id, role = 'admin', updated_at = now()
  WHERE id = v_uid;

  RETURN QUERY SELECT v_new_id, v_clean, v_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Join an existing company workspace by invite code
CREATE OR REPLACE FUNCTION public.join_company_by_code(code TEXT)
RETURNS TABLE (company_id UUID, name TEXT, invite_code TEXT) AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_clean TEXT := UPPER(TRIM(COALESCE(code, '')));
  v_comp_id UUID;
  v_comp_name TEXT;
  v_comp_code TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF LENGTH(v_clean) < 4 THEN
    RAISE EXCEPTION 'Invalid invite code';
  END IF;

  SELECT c.id, c.name, c.invite_code
  INTO v_comp_id, v_comp_name, v_comp_code
  FROM public.companies c
  WHERE UPPER(c.invite_code) = v_clean
  LIMIT 1;

  IF v_comp_id IS NULL THEN
    RAISE EXCEPTION 'Company invite code not found';
  END IF;

  PERFORM set_config('app.bypass_profile_guard', '1', true);
  UPDATE public.profiles
  SET company_id = v_comp_id,
      role = CASE WHEN company_id = v_comp_id AND role = 'admin' THEN 'admin' ELSE 'user' END,
      updated_at = now()
  WHERE id = v_uid;

  RETURN QUERY SELECT v_comp_id, v_comp_name, v_comp_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- RPC: Allow a company admin to grant or revoke admin role for another member of the same company
CREATE OR REPLACE FUNCTION public.set_company_member_role(member_id UUID, new_role TEXT)
RETURNS VOID AS $$
DECLARE
  v_uid UUID := auth.uid();
  v_caller_company UUID;
  v_caller_role TEXT;
  v_target_company UUID;
  v_admin_count INT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF new_role NOT IN ('user', 'admin') THEN
    RAISE EXCEPTION 'Invalid role: must be user or admin';
  END IF;

  SELECT company_id, role INTO v_caller_company, v_caller_role
  FROM public.profiles WHERE id = v_uid;

  IF v_caller_role <> 'admin' OR v_caller_company IS NULL THEN
    RAISE EXCEPTION 'Only a company admin can manage team roles';
  END IF;

  SELECT company_id INTO v_target_company FROM public.profiles WHERE id = member_id;
  IF v_target_company IS DISTINCT FROM v_caller_company THEN
    RAISE EXCEPTION 'Target user does not belong to your company';
  END IF;

  IF member_id = v_uid AND new_role = 'user' THEN
    SELECT COUNT(*) INTO v_admin_count
    FROM public.profiles
    WHERE company_id = v_caller_company AND role = 'admin';
    IF v_admin_count <= 1 THEN
      RAISE EXCEPTION 'Cannot demote the only admin in the company';
    END IF;
  END IF;

  PERFORM set_config('app.bypass_profile_guard', '1', true);
  UPDATE public.profiles
  SET role = new_role, updated_at = now()
  WHERE id = member_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.create_company_workspace(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_company_by_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_company_member_role(UUID, TEXT) TO authenticated;

-- 3. RLS Policies for companies and company admins
DROP POLICY IF EXISTS "companies_select_member" ON public.companies;
CREATE POLICY "companies_select_member"
  ON public.companies FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.company_id = companies.id
    )
  );

DROP POLICY IF EXISTS "companies_update_admin" ON public.companies;
CREATE POLICY "companies_update_admin"
  ON public.companies FOR UPDATE TO authenticated
  USING (public.is_company_admin(id))
  WITH CHECK (public.is_company_admin(id));

DROP POLICY IF EXISTS "profiles_select_company_admin" ON public.profiles;
CREATE POLICY "profiles_select_company_admin"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.is_company_admin(company_id));

DROP POLICY IF EXISTS "learning_content_progress_select_company_admin" ON public.learning_content_progress;
CREATE POLICY "learning_content_progress_select_company_admin"
  ON public.learning_content_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = learning_content_progress.user_id
        AND public.is_company_admin(p.company_id)
    )
  );

DROP POLICY IF EXISTS "learning_progress_select_company_admin" ON public.learning_progress;
CREATE POLICY "learning_progress_select_company_admin"
  ON public.learning_progress FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = learning_progress.user_id
        AND public.is_company_admin(p.company_id)
    )
  );

DROP POLICY IF EXISTS "eq_scores_select_company_admin" ON public.eq_scores;
CREATE POLICY "eq_scores_select_company_admin"
  ON public.eq_scores FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = eq_scores.user_id
        AND public.is_company_admin(p.company_id)
    )
  );

DROP POLICY IF EXISTS "big5_assessments_select_company_admin" ON public.big5_assessments;
CREATE POLICY "big5_assessments_select_company_admin"
  ON public.big5_assessments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = big5_assessments.user_id
        AND public.is_company_admin(p.company_id)
    )
  );

DROP POLICY IF EXISTS "user_sessions_select_company_admin" ON public.user_sessions;
CREATE POLICY "user_sessions_select_company_admin"
  ON public.user_sessions FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = user_sessions.user_id
        AND public.is_company_admin(p.company_id)
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON public.companies;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

