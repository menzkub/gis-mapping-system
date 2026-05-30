-- ============================================================
-- fix_rls_v2.sql — Reset RLS ทั้งหมดให้ใช้งานได้แน่นอน
-- รันใน Supabase SQL Editor
-- ============================================================

-- ---- 1) ลบ policy เก่าทั้งหมดที่อาจมีปัญหา ----
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles','meters','transformers','audit_log')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- ---- 2) สร้าง helper functions แบบ SECURITY DEFINER (bypass RLS) ----
create or replace function public.my_role()
returns text language sql security definer stable
set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.my_status()
returns text language sql security definer stable
set search_path = public as $$
  select status from public.profiles where id = auth.uid();
$$;

grant execute on function public.my_role()   to anon, authenticated;
grant execute on function public.my_status() to anon, authenticated;

-- ---- 3) profiles — ทุกคนที่ login อ่านได้ + admin แก้ไขได้ ----
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.my_role() = 'admin');

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ---- 4) meters ----
alter table public.meters enable row level security;

create policy "meters_select_active" on public.meters
  for select to authenticated using (public.my_status() = 'active');

create policy "meters_insert_admin" on public.meters
  for insert to authenticated with check (public.my_role() = 'admin');

create policy "meters_update_admin" on public.meters
  for update to authenticated using (public.my_role() = 'admin');

create policy "meters_delete_admin" on public.meters
  for delete to authenticated using (public.my_role() = 'admin');

-- ---- 5) transformers ----
alter table public.transformers enable row level security;

create policy "transformers_select_active" on public.transformers
  for select to authenticated using (public.my_status() = 'active');

create policy "transformers_insert_admin" on public.transformers
  for insert to authenticated with check (public.my_role() = 'admin');

create policy "transformers_update_admin" on public.transformers
  for update to authenticated using (public.my_role() = 'admin');

create policy "transformers_delete_admin" on public.transformers
  for delete to authenticated using (public.my_role() = 'admin');

-- ---- 6) audit_log ----
alter table public.audit_log enable row level security;

create policy "audit_select_auth" on public.audit_log
  for select to authenticated using (true);

create policy "audit_insert_auth" on public.audit_log
  for insert to authenticated with check (true);

-- ---- 7) ตรวจสอบว่า policies สร้างครบ ----
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
