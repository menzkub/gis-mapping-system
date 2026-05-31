-- ============================================================
-- fix_rls_v3.sql — Simplify RLS for performance
-- รันใน Supabase SQL Editor
-- ============================================================

-- ---- ลบ policy เก่าทั้งหมด ----
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

-- ---- คง helper functions ไว้ (ใช้กับ admin operations) ----
create or replace function public.my_role()
returns text language sql security definer stable
set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

grant execute on function public.my_role() to anon, authenticated;

-- ---- profiles ----
alter table public.profiles enable row level security;

create policy "profiles_select_all" on public.profiles
  for select to authenticated using (true);

create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id);

create policy "profiles_update_admin" on public.profiles
  for update to authenticated using (public.my_role() = 'admin');

create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

-- ---- meters — เร็วสุด: authenticated อ่านได้, admin เขียนได้ ----
alter table public.meters enable row level security;

create policy "meters_select_auth" on public.meters
  for select to authenticated using (true);

create policy "meters_insert_admin" on public.meters
  for insert to authenticated with check (public.my_role() = 'admin');

create policy "meters_update_admin" on public.meters
  for update to authenticated using (public.my_role() = 'admin');

create policy "meters_delete_admin" on public.meters
  for delete to authenticated using (public.my_role() = 'admin');

-- ---- transformers ----
alter table public.transformers enable row level security;

create policy "transformers_select_auth" on public.transformers
  for select to authenticated using (true);

create policy "transformers_insert_admin" on public.transformers
  for insert to authenticated with check (public.my_role() = 'admin');

create policy "transformers_update_admin" on public.transformers
  for update to authenticated using (public.my_role() = 'admin');

create policy "transformers_delete_admin" on public.transformers
  for delete to authenticated using (public.my_role() = 'admin');

-- ---- audit_log ----
alter table public.audit_log enable row level security;

-- Admin อ่านได้เท่านั้น — ไม่ให้ user ทั่วไปเห็น log ของคนอื่น
create policy "audit_select_admin" on public.audit_log
  for select to authenticated using (public.my_role() = 'admin');

-- ทุกคนเขียน log ของตัวเองได้ (system จัดการผ่าน server-side)
create policy "audit_insert_auth" on public.audit_log
  for insert to authenticated with check (true);

-- ---- ตรวจสอบ ----
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
order by tablename, policyname;
