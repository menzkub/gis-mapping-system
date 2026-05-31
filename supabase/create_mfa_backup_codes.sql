-- ============================================================
-- create_mfa_backup_codes.sql — ตาราง Backup Codes สำหรับ 2FA
-- รันใน Supabase SQL Editor
-- ============================================================

create table if not exists public.mfa_backup_codes (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  code_hash  text not null,
  used_at    timestamptz default null,
  created_at timestamptz default now()
);

create index if not exists mfa_backup_codes_user_idx on public.mfa_backup_codes(user_id);

alter table public.mfa_backup_codes enable row level security;

-- ผู้ใช้จัดการ backup codes ของตัวเองเท่านั้น
create policy "bc_select" on public.mfa_backup_codes
  for select to authenticated using (user_id = auth.uid());

create policy "bc_insert" on public.mfa_backup_codes
  for insert to authenticated with check (user_id = auth.uid());

create policy "bc_update" on public.mfa_backup_codes
  for update to authenticated using (user_id = auth.uid());

create policy "bc_delete" on public.mfa_backup_codes
  for delete to authenticated using (user_id = auth.uid());

-- ตรวจสอบ
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public' and tablename = 'mfa_backup_codes'
order by policyname;
