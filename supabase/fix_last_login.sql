-- fix_last_login.sql
-- แก้ปัญหา last_login และ privacy_accepted_at ไม่ถูกบันทึก
-- เนื่องจาก RLS policy ไม่อนุญาตให้ user อัปเดต profile ของตัวเอง
-- รันใน Supabase SQL Editor → Run

-- ลบ policy เก่าที่อาจขัดแย้ง
DROP POLICY IF EXISTS "profiles_update_own"       ON public.profiles;
DROP POLICY IF EXISTS "users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

-- สร้าง policy ใหม่: user อัปเดต row ของตัวเองได้ (รวมถึง last_login, privacy_accepted_at)
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id);

-- ตรวจสอบ: ดู policy ที่มีอยู่ทั้งหมดบน profiles
SELECT policyname, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles'
ORDER BY policyname;
