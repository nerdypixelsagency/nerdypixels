-- Admin-managed discount coupons with auto paylinks for the bootcamp.
-- The charged amount is always decided server-side from this row; the browser
-- only ever sends the coupon CODE. Coupons apply to the outright (paid-in-full)
-- plan only. See src/lib/coupons.server.ts (validate) and payments.functions.ts.

CREATE TABLE IF NOT EXISTS public.coupons (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL,                          -- stored uppercase
  label       text NOT NULL DEFAULT '',               -- internal name, e.g. "Event launch"
  badge       text NOT NULL DEFAULT '',               -- shown to buyers, e.g. "80% OFF"
  kind        text NOT NULL DEFAULT 'fixed' CHECK (kind IN ('fixed','percent')),
  price_ngn   integer,                                -- fixed final charge (NGN)
  price_usd   numeric,                                -- fixed final charge (USD)
  percent     numeric CHECK (percent IS NULL OR (percent >= 0 AND percent <= 100)),
  plan        text NOT NULL DEFAULT 'early',          -- outright / paid-in-full
  active      boolean NOT NULL DEFAULT true,
  starts_at   timestamptz,
  expires_at  timestamptz,
  max_uses    integer,
  uses        integer NOT NULL DEFAULT 0,
  created_by  uuid,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS coupons_code_idx ON public.coupons (upper(code));

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.coupons TO authenticated;
GRANT ALL ON public.coupons TO service_role;    -- public validation + admin writes go through the service role
DROP POLICY IF EXISTS "Admins read coupons" ON public.coupons;
CREATE POLICY "Admins read coupons" ON public.coupons FOR SELECT USING (public.is_admin(auth.uid()));

-- Track which coupon a sale used (for reporting + usage counting).
ALTER TABLE public.enrolments ADD COLUMN IF NOT EXISTS coupon_code text;

-- Atomic usage increment, called after a coupon sale is verified paid (service role only).
CREATE OR REPLACE FUNCTION public.increment_coupon(p_code text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.coupons SET uses = uses + 1, updated_at = now() WHERE upper(code) = upper(p_code);
$$;
REVOKE ALL ON FUNCTION public.increment_coupon(text) FROM public, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_coupon(text) TO service_role;

-- Today's event coupon: 80% off, flat NGN 25,000 / USD 25, outright only,
-- expires 11:59pm WAT (UTC+1) tonight, 2026-10-31.
INSERT INTO public.coupons (code, label, badge, kind, price_ngn, price_usd, plan, active, expires_at)
VALUES ('NERDY80', 'Demo Day event', '80% OFF', 'fixed', 25000, 25, 'early', true, '2026-10-31 23:59:00+01')
ON CONFLICT (upper(code)) DO NOTHING;
