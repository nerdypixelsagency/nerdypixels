-- NerdX SEO landing: a dedicated waitlist table and the entry-gate setting.
-- The public landing collects signups (email required; the rest optional);
-- admins view the list and toggle whether visitors must join before viewing.

CREATE TABLE IF NOT EXISTS public.nerdx_waitlist (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text NOT NULL,
  name       text,
  role       text,              -- "I'm a…" (business owner, marketer, agency, …)
  use_case   text,              -- "I'd use it for…" (comma-joined selections)
  website    text,
  challenge  text,              -- biggest SEO challenge right now
  timeline   text,              -- when they need it
  beta       boolean NOT NULL DEFAULT false,  -- wants early/beta access
  source     text NOT NULL DEFAULT 'nerdx-landing',
  mode       text NOT NULL DEFAULT 'live',    -- test | live
  created_at timestamptz NOT NULL DEFAULT now()
);
-- One signup per email per mode.
CREATE UNIQUE INDEX IF NOT EXISTS nerdx_waitlist_email_mode_idx ON public.nerdx_waitlist (lower(email), mode);

ALTER TABLE public.nerdx_waitlist ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.nerdx_waitlist TO authenticated;
GRANT ALL ON public.nerdx_waitlist TO service_role;   -- public inserts go through the service role
DROP POLICY IF EXISTS "Admins view nerdx waitlist" ON public.nerdx_waitlist;
CREATE POLICY "Admins view nerdx waitlist" ON public.nerdx_waitlist FOR SELECT USING (public.is_admin(auth.uid()));

-- Entry gate: 'false' = dismissible pop-up (default), 'true' = must join before viewing.
INSERT INTO public.app_settings(key, value) VALUES ('nerdx_gate', 'false') ON CONFLICT (key) DO NOTHING;
