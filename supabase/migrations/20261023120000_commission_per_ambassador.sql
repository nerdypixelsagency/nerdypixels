-- Per-ambassador commission rates + snapshot-at-sale-time (future-only, correct).
--
-- Today the commission rate is a single global pair in app_settings
-- (commission_outright_pct / commission_instalment_pct) and earnings are
-- recomputed live from the current rate, so changing a rate rewrites the
-- earnings of past sales. This migration:
--   1. lets each ambassador have an optional rate override, and
--   2. snapshots the applicable rate onto each enrolment when it is paid,
--      so later rate changes only affect future sales.

-- 1. Optional per-ambassador override rates. NULL = fall back to the global default.
ALTER TABLE public.ambassadors
  ADD COLUMN IF NOT EXISTS outright_pct   numeric CHECK (outright_pct   IS NULL OR (outright_pct   >= 0 AND outright_pct   <= 100)),
  ADD COLUMN IF NOT EXISTS instalment_pct numeric CHECK (instalment_pct IS NULL OR (instalment_pct >= 0 AND instalment_pct <= 100));

-- 2. Per-enrolment snapshot, written when the sale is confirmed paid.
ALTER TABLE public.enrolments
  ADD COLUMN IF NOT EXISTS commission_pct    numeric,
  ADD COLUMN IF NOT EXISTS commission_amount integer;

-- 3. Backfill existing paid, referred rows from the current global rate so their
--    earnings stay exactly as displayed today once the read path switches to the
--    snapshot. (Outright plans use the outright rate; everything else instalment.)
WITH g AS (
  SELECT
    COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'commission_outright_pct'), 10)   AS outright,
    COALESCE((SELECT value::numeric FROM public.app_settings WHERE key = 'commission_instalment_pct'), 10) AS instalment
)
UPDATE public.enrolments e
SET commission_pct = CASE WHEN e.plan IN ('early', 'deposit_early') THEN g.outright ELSE g.instalment END,
    commission_amount = round(e.amount * (CASE WHEN e.plan IN ('early', 'deposit_early') THEN g.outright ELSE g.instalment END) / 100.0)
FROM g
WHERE e.status = 'paid'
  AND e.referral_code IS NOT NULL
  AND e.commission_pct IS NULL;
