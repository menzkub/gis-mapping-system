-- ============================================================
-- Payment Schema — Team Leader role + payment slips
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. Add 'team_leader' to profiles role check + team_leader_id foreign key
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'user', 'team_leader'));

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS team_leader_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Allow admins and users to update team_leader_id (via admin panel)
-- (existing admin update policy already covers all columns)

-- 2. Payment slips table
CREATE TABLE IF NOT EXISTS public.payment_slips (
  id              bigint        GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  team_leader_id  uuid          NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  payment_month   text          NOT NULL,             -- YYYY-MM
  amount_baht     numeric,
  ref_number      text,
  slip_url        text,
  ocr_data        jsonb,
  status          text          NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'approved', 'rejected')),
  notes           text,                               -- admin review notes
  reviewed_by     uuid          REFERENCES public.profiles(id),
  submitted_at    timestamptz   NOT NULL DEFAULT now(),
  reviewed_at     timestamptz,
  UNIQUE (team_leader_id, payment_month)
);

ALTER TABLE public.payment_slips ENABLE ROW LEVEL SECURITY;

-- Team leaders: see + insert their own
CREATE POLICY "payment_slips: own select"
  ON public.payment_slips FOR SELECT
  USING (auth.uid() = team_leader_id);

CREATE POLICY "payment_slips: own insert"
  ON public.payment_slips FOR INSERT
  WITH CHECK (
    auth.uid() = team_leader_id AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'team_leader')
  );

CREATE POLICY "payment_slips: own update pending"
  ON public.payment_slips FOR UPDATE
  USING (auth.uid() = team_leader_id AND status = 'pending');

-- Admins: see and update all
CREATE POLICY "payment_slips: admin select"
  ON public.payment_slips FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

CREATE POLICY "payment_slips: admin update"
  ON public.payment_slips FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- 3. Storage bucket
-- Run in Supabase Dashboard → Storage → New bucket: "payment-slips" (private)
-- Or via SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-slips', 'payment-slips', false, 10485760,
  ARRAY['image/jpeg','image/png','image/webp','image/gif']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: team leaders can upload/read their own
CREATE POLICY "payment-slips: own upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'payment-slips' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "payment-slips: own read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-slips' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "payment-slips: admin read"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'payment-slips' AND
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
  );

-- Allow updates (for upsert)
CREATE POLICY "payment-slips: own update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'payment-slips' AND
    auth.uid()::text = (string_to_array(name, '/'))[1]
  );
