-- Add privacy_accepted_at to profiles
-- Tracks when each user last accepted the Privacy Policy
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS privacy_accepted_at TIMESTAMPTZ;

-- Index for querying users who haven't accepted yet
CREATE INDEX IF NOT EXISTS idx_profiles_privacy_accepted_at
  ON public.profiles (privacy_accepted_at)
  WHERE privacy_accepted_at IS NULL;
