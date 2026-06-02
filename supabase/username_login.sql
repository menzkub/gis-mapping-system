-- ============================================================
--  Username → Email resolver (for username-based login)
--  Run this in Supabase SQL Editor.
-- ============================================================

-- Secure function: runs as owner, bypasses RLS, anon role can call it
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

-- Allow unauthenticated (anon) callers to invoke this function
GRANT EXECUTE ON FUNCTION public.get_email_by_username(text) TO anon;
