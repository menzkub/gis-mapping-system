-- ============================================================
--  Payment Notifications + Team Suspension
--  Run in Supabase SQL Editor
-- ============================================================

-- 1. Add 'suspended' to profiles status constraint
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('pending', 'active', 'banned', 'suspended'));

-- 2. In-app notifications table
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

CREATE POLICY "users_read_own_notif" ON public.notifications
  FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY "users_update_own_notif" ON public.notifications
  FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "admin_manage_notif" ON public.notifications
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE INDEX IF NOT EXISTS notifications_recipient_read_idx
  ON public.notifications (recipient_id, is_read);
