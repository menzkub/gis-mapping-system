-- ============================================================
-- fix_rls.sql — แก้ infinite recursion ใน RLS policies
-- รันใน Supabase SQL Editor
-- ============================================================

-- ลบ policies เก่าที่มีปัญหา
drop policy if exists "profiles: admin select"         on public.profiles;
drop policy if exists "profiles: admin update"         on public.profiles;
drop policy if exists "meters: active user select"     on public.meters;
drop policy if exists "meters: admin write"            on public.meters;
drop policy if exists "transformers: active user select" on public.transformers;
drop policy if exists "transformers: admin write"      on public.transformers;
drop policy if exists "audit_log: admin select"        on public.audit_log;
drop policy if exists "audit_log: authenticated insert" on public.audit_log;

-- สร้าง helper functions แบบ SECURITY DEFINER (ไม่ติด RLS)
create or replace function public.my_role()
returns text language sql security definer stable as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_status()
returns text language sql security definer stable as $$
  select status from public.profiles where id = auth.uid();
$$;

-- profiles: อ่านได้ทุกคนที่ login แล้ว (ไม่ recursion แล้ว)
create policy "profiles: select authenticated"
  on public.profiles for select
  using (auth.uid() is not null);

-- profiles: admin แก้ไขได้
create policy "profiles: admin update"
  on public.profiles for update
  using (public.my_role() = 'admin');

-- meters: active user อ่านได้
create policy "meters: active user select"
  on public.meters for select
  using (public.my_status() = 'active');

-- meters: admin เขียนได้
create policy "meters: admin write"
  on public.meters for all
  using (public.my_role() = 'admin');

-- transformers: active user อ่านได้
create policy "transformers: active user select"
  on public.transformers for select
  using (public.my_status() = 'active');

-- transformers: admin เขียนได้
create policy "transformers: admin write"
  on public.transformers for all
  using (public.my_role() = 'admin');

-- audit_log: admin อ่านได้
create policy "audit_log: admin select"
  on public.audit_log for select
  using (public.my_role() = 'admin');

-- audit_log: ทุกคนที่ login แล้ว insert ได้
create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  with check (auth.uid() is not null);
