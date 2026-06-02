-- ============================================================
--  MASTER MIGRATION — รันไฟล์นี้ใน Supabase SQL Editor
--  รวมทุก migration ไว้ในที่เดียว ปลอดภัย (IF NOT EXISTS / OR REPLACE)
-- ============================================================

-- ── 1. profiles: เพิ่ม role 'team_leader' ──────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'user', 'team_leader'));

-- ── 2. profiles: เพิ่มคอลัมน์ team_leader_id ───────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_leader_id uuid
  REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── 3. profiles: เพิ่ม status 'suspended' ──────────────────
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'banned', 'suspended'));

-- ── 4. payment_slips table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payment_slips (
  id              bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_leader_id  uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_month   text          NOT NULL,
  amount_baht     numeric,
  ref_number      text,
  slip_url        text,
  ocr_data        jsonb,
  status          text          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           text,
  reviewed_by     uuid          REFERENCES public.profiles(id),
  submitted_at    timestamptz   NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  UNIQUE (team_leader_id, payment_month)
);
ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "payment_slips: own select"
  ON public.payment_slips FOR SELECT
  USING (auth.uid() = team_leader_id);

CREATE POLICY IF NOT EXISTS "payment_slips: own insert"
  ON public.payment_slips FOR INSERT
  WITH CHECK (
    auth.uid() = team_leader_id AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'team_leader')
  );

CREATE POLICY IF NOT EXISTS "payment_slips: own update pending"
  ON public.payment_slips FOR UPDATE
  USING (auth.uid() = team_leader_id AND status = 'pending');

CREATE POLICY IF NOT EXISTS "payment_slips: admin select"
  ON public.payment_slips FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

CREATE POLICY IF NOT EXISTS "payment_slips: admin update"
  ON public.payment_slips FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));

-- ── 5. Storage bucket: payment-slips ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips', 'payment-slips', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'payment-slips: own upload'
  ) THEN
    CREATE POLICY "payment-slips: own upload" ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'payment-slips' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'payment-slips: own read'
  ) THEN
    CREATE POLICY "payment-slips: own read" ON storage.objects FOR SELECT
    USING (bucket_id = 'payment-slips' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'payment-slips: admin read'
  ) THEN
    CREATE POLICY "payment-slips: admin read" ON storage.objects FOR SELECT
    USING (bucket_id = 'payment-slips' AND EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage' AND policyname = 'payment-slips: own update'
  ) THEN
    CREATE POLICY "payment-slips: own update" ON storage.objects FOR UPDATE
    USING (bucket_id = 'payment-slips' AND auth.uid()::text = (string_to_array(name, '/'))[1]);
  END IF;
END $$;

-- ── 6. notifications table ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id            bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  recipient_id  uuid         NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type          text         NOT NULL DEFAULT 'payment_due'
                               CHECK (type IN ('payment_due','payment_overdue','payment_suspended','payment_restored','custom')),
  title         text         NOT NULL,
  message       text         NOT NULL,
  due_month     text,
  is_read       boolean      NOT NULL DEFAULT false,
  created_at    timestamptz  NOT NULL DEFAULT now(),
  sent_by       uuid         REFERENCES public.profiles(id)
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "users_read_own_notif" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "users_update_own_notif" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "admin_manage_notif" ON public.notifications
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx
  ON public.notifications (recipient_id, is_read);

-- ── 7. get_email_by_username (username login) ───────────────
CREATE OR REPLACE FUNCTION public.get_email_by_username(p_username text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.email
  FROM auth.users u
  INNER JOIN public.profiles p ON p.id = u.id
  WHERE p.username = lower(trim(p_username))
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;

-- ── Done ────────────────────────────────────────────────────
SELECT 'Migration complete ✓' AS result;
