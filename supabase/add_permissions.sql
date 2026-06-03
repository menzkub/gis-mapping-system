-- Add permissions column to profiles table
-- Run this in Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS permissions text[] NOT NULL DEFAULT '{}';

-- Grant access via RLS (admins can update any user's permissions)
-- No extra policy needed — existing admin policies already cover UPDATE on profiles
