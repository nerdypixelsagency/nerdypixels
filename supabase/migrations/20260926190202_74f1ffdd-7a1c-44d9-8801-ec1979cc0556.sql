ALTER TABLE public.enrolments ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'online';
ALTER TABLE public.enrolments ADD COLUMN IF NOT EXISTS admin_notes text;

CREATE TABLE public.commission_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  amount integer NOT NULL,
  mode text NOT NULL DEFAULT 'live',
  note text,
  paid_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.commission_payouts TO authenticated;
GRANT ALL ON public.commission_payouts TO service_role;
ALTER TABLE public.commission_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view payouts" ON public.commission_payouts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins record payouts" ON public.commission_payouts FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

INSERT INTO public.app_settings(key, value) VALUES ('commission_rate', '10') ON CONFLICT (key) DO NOTHING;

SELECT cron.schedule('npa-daily-summary', '0 7 * * *', $$
  SELECT net.http_post(
    url := 'https://nerdypixels.lovable.app/api/public/cron/daily-summary',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.private_settings WHERE key='cron_token')),
    body := '{}'::jsonb
  );
$$);