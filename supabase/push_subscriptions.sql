-- Push subscription storage for Web Push (PWA Notifications)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id      uuid        REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription jsonb       NOT NULL,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users manage only their own subscription
CREATE POLICY "users_manage_own" ON push_subscriptions
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
