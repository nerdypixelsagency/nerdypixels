CREATE TABLE public.leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  country text,
  source text,
  mode text NOT NULL DEFAULT 'live',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view leads" ON public.leads FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX leads_email_created_idx ON public.leads (email, created_at DESC);