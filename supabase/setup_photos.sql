-- setup_photos.sql
-- สร้าง Storage bucket + ตาราง photos สำหรับเก็บภาพมิเตอร์และหม้อแปลงบน Supabase Cloud
-- รันใน Supabase SQL Editor → Run
-- ⚠️  รันครั้งเดียว — ถ้ารันซ้ำก็ไม่มีผลเสีย (IF NOT EXISTS / ON CONFLICT)

-- ══════════════════════════════════════════════════════
-- 1. สร้าง Storage bucket "pea-photos" (public read)
-- ══════════════════════════════════════════════════════
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pea-photos', 'pea-photos', true,
  5242880,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
ON CONFLICT (id) DO UPDATE SET
  public           = true,
  file_size_limit  = 5242880;

-- ══════════════════════════════════════════════════════
-- 2. Storage policies
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "pea_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "pea_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "pea_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "pea_photos_update" ON storage.objects;

-- ทุกคนอ่านได้ (public bucket — ภาพถ่ายอุปกรณ์ PEA ไม่เป็นความลับ)
CREATE POLICY "pea_photos_select" ON storage.objects
  FOR SELECT TO public USING (bucket_id = 'pea-photos');

-- เฉพาะ authenticated user อัพโหลดได้
CREATE POLICY "pea_photos_insert" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'pea-photos');

-- เฉพาะ authenticated user ลบได้ (app logic จำกัดเฉพาะ admin)
CREATE POLICY "pea_photos_delete" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'pea-photos');

-- ══════════════════════════════════════════════════════
-- 3. สร้างตาราง photos (metadata)
-- ══════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.photos (
  id           UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  kind         TEXT        NOT NULL CHECK (kind IN ('meter','tr')),
  objectid     BIGINT      NOT NULL,
  storage_path TEXT        NOT NULL UNIQUE,
  uploaded_by  TEXT        NOT NULL DEFAULT 'user',
  file_size    INTEGER,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.photos ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS photos_kind_objectid_idx ON public.photos (kind, objectid);

-- ══════════════════════════════════════════════════════
-- 4. RLS policies บน photos table
-- ══════════════════════════════════════════════════════
DROP POLICY IF EXISTS "photos_select" ON public.photos;
DROP POLICY IF EXISTS "photos_insert" ON public.photos;
DROP POLICY IF EXISTS "photos_delete" ON public.photos;

CREATE POLICY "photos_select" ON public.photos
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "photos_insert" ON public.photos
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "photos_delete" ON public.photos
  FOR DELETE TO authenticated USING (true);

-- ══════════════════════════════════════════════════════
-- ตรวจสอบ
-- ══════════════════════════════════════════════════════
SELECT id, name, public FROM storage.buckets WHERE id = 'pea-photos';
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'photos';
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'photos' ORDER BY policyname;
