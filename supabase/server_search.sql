-- ============================================================
-- Server-side search migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- Trigram extension for fast ILIKE on text columns
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Meters: trigram indexes for fast partial-match search
CREATE INDEX IF NOT EXISTS meters_tag_trgm      ON public.meters USING GIN(tag        gin_trgm_ops);
CREATE INDEX IF NOT EXISTS meters_peano_trgm    ON public.meters USING GIN(peano      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS meters_acct_trgm     ON public.meters USING GIN(accountnum gin_trgm_ops);
CREATE INDEX IF NOT EXISTS meters_feeder_trgm   ON public.meters USING GIN(feederid   gin_trgm_ops);
CREATE INDEX IF NOT EXISTS meters_feeder_btree  ON public.meters (feederid);
CREATE INDEX IF NOT EXISTS meters_owner_btree   ON public.meters (owner);
CREATE INDEX IF NOT EXISTS meters_code_btree    ON public.meters (code);

-- Transformers: trigram indexes
CREATE INDEX IF NOT EXISTS trs_tag_trgm         ON public.transformers USING GIN(tag      gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trs_peano_trgm       ON public.transformers USING GIN(peano_tr gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trs_loc_trgm         ON public.transformers USING GIN(location gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trs_feeder_trgm      ON public.transformers USING GIN(feeder1  gin_trgm_ops);
CREATE INDEX IF NOT EXISTS trs_feeder1_btree    ON public.transformers (feeder1);
CREATE INDEX IF NOT EXISTS trs_owner_btree      ON public.transformers (owner_tr);
CREATE INDEX IF NOT EXISTS trs_phase_btree      ON public.transformers (phase);
CREATE INDEX IF NOT EXISTS trs_voltage_btree    ON public.transformers (voltage);

-- ── get_feeders() ─────────────────────────────────────────────────────────
-- Returns distinct feeder IDs from both tables (fast, small result set)
CREATE OR REPLACE FUNCTION public.get_feeders()
RETURNS TABLE(feeder TEXT) LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT DISTINCT feederid AS feeder FROM public.meters
    WHERE feederid IS NOT NULL AND feederid <> ''
  UNION
  SELECT DISTINCT feeder1 FROM public.transformers
    WHERE feeder1 IS NOT NULL AND feeder1 <> ''
  ORDER BY feeder;
$$;
GRANT EXECUTE ON FUNCTION public.get_feeders() TO authenticated;

-- ── get_dashboard_stats() ─────────────────────────────────────────────────
-- Returns all dashboard aggregates in a single round-trip
CREATE OR REPLACE FUNCTION public.get_dashboard_stats()
RETURNS JSON LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT json_build_object(
    'meter_count',  (SELECT count(*)          FROM public.meters),
    'tr_count',     (SELECT count(*)          FROM public.transformers),
    'total_kva',    (SELECT COALESCE(sum(kva), 0) FROM public.transformers),
    'pea_kva',      (SELECT COALESCE(sum(kva), 0) FROM public.transformers WHERE owner_tr = 'PEA'),
    'cust_kva',     (SELECT COALESCE(sum(kva), 0) FROM public.transformers WHERE owner_tr = 'Customer'),
    'pea_meters',   (SELECT count(*) FROM public.meters      WHERE owner    = 'PEA'),
    'cust_meters',  (SELECT count(*) FROM public.meters      WHERE owner    = 'Customer'),
    'pea_tr',       (SELECT count(*) FROM public.transformers WHERE owner_tr = 'PEA'),
    'cust_tr',      (SELECT count(*) FROM public.transformers WHERE owner_tr = 'Customer'),
    'top_feeders',  (
      SELECT json_agg(row_to_json(t))
      FROM (
        SELECT feederid AS feeder, count(*) AS n
        FROM public.meters
        WHERE feederid IS NOT NULL AND feederid <> ''
        GROUP BY feederid
        ORDER BY n DESC
        LIMIT 8
      ) t
    )
  );
$$;
GRANT EXECUTE ON FUNCTION public.get_dashboard_stats() TO authenticated;
