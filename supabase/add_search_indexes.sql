-- add_search_indexes.sql
-- รัน SQL นี้ใน Supabase SQL Editor เพื่อแก้ปัญหาการค้นหา timeout
-- ============================================================

-- เปิดใช้งาน pg_trgm extension (สำหรับ ILIKE ที่มี wildcard %)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ============================================================
-- METERS — index สำหรับคอลัมน์ที่ค้นหา
-- ============================================================

-- peano (อาจเป็น bigint) — สำหรับค้นหาด้วยเลขมิเตอร์ exact match
CREATE INDEX IF NOT EXISTS idx_meters_peano
  ON public.meters (peano);

-- accountnum — สำหรับค้นหาด้วยเลข account
CREATE INDEX IF NOT EXISTS idx_meters_accountnum
  ON public.meters (accountnum);

-- tag — สำหรับ ILIKE partial match
CREATE INDEX IF NOT EXISTS idx_meters_tag_trgm
  ON public.meters USING gin (tag gin_trgm_ops);

-- feederid — สำหรับ ILIKE partial match
CREATE INDEX IF NOT EXISTS idx_meters_feederid_trgm
  ON public.meters USING gin (feederid gin_trgm_ops);

-- ============================================================
-- TRANSFORMERS — index สำหรับคอลัมน์ที่ค้นหา
-- ============================================================

-- peano_tr — exact match (B-tree)
CREATE INDEX IF NOT EXISTS idx_trs_peano_tr
  ON public.transformers (peano_tr);

-- peano_tr — ILIKE partial match เช่น 64-005882 (GIN trigram)
CREATE INDEX IF NOT EXISTS idx_trs_peano_tr_trgm
  ON public.transformers USING gin (peano_tr gin_trgm_ops);

-- tag — สำหรับ ILIKE partial match
CREATE INDEX IF NOT EXISTS idx_trs_tag_trgm
  ON public.transformers USING gin (tag gin_trgm_ops);

-- location — สำหรับ ILIKE partial match
CREATE INDEX IF NOT EXISTS idx_trs_location_trgm
  ON public.transformers USING gin (location gin_trgm_ops);

-- feeder1 — สำหรับ ILIKE partial match
CREATE INDEX IF NOT EXISTS idx_trs_feeder1_trgm
  ON public.transformers USING gin (feeder1 gin_trgm_ops);

-- ============================================================
-- ตรวจสอบ indexes ที่สร้าง
-- ============================================================
SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE tablename IN ('meters', 'transformers')
  AND schemaname = 'public'
ORDER BY tablename, indexname;
