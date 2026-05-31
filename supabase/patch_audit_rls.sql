-- ============================================================
-- patch_audit_rls.sql — แก้ไข audit_log RLS: จำกัดการอ่านเฉพาะ Admin
-- รันใน Supabase SQL Editor
-- ============================================================

-- ลบ policy เก่าที่เปิดให้ทุกคนอ่านได้
drop policy if exists "audit_select_auth" on public.audit_log;

-- สร้าง policy ใหม่: Admin เท่านั้นที่อ่าน log ได้
create policy "audit_select_admin" on public.audit_log
  for select to authenticated using (public.my_role() = 'admin');

-- ตรวจสอบผลลัพธ์
select policyname, cmd, qual
from pg_policies
where schemaname = 'public' and tablename = 'audit_log'
order by policyname;
