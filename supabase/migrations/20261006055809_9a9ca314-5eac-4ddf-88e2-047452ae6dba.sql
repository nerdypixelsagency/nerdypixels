CREATE TABLE public.email_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  type text NOT NULL DEFAULT 'custom',
  html text NOT NULL,
  related_id text,
  status text NOT NULL DEFAULT 'sent',
  error text,
  mode text NOT NULL DEFAULT 'live',
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.email_log TO authenticated;
GRANT ALL ON public.email_log TO service_role;
ALTER TABLE public.email_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view email log" ON public.email_log FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE INDEX email_log_created_idx ON public.email_log (created_at DESC);
CREATE INDEX email_log_to_idx ON public.email_log (lower(to_email));

ALTER TABLE public.leads
  ADD COLUMN category text NOT NULL DEFAULT 'hero_lead',
  ADD COLUMN followup_count integer NOT NULL DEFAULT 0,
  ADD COLUMN last_followup_at timestamptz;