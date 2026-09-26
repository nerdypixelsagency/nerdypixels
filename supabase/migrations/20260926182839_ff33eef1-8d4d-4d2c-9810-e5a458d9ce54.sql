CREATE TABLE public.instalment_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  month text NOT NULL,
  stage text NOT NULL,
  mode text NOT NULL DEFAULT 'live',
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX instalment_reminders_auto_uniq ON public.instalment_reminders (email, month, stage, mode) WHERE stage <> 'manual';
GRANT SELECT ON public.instalment_reminders TO authenticated;
GRANT ALL ON public.instalment_reminders TO service_role;
ALTER TABLE public.instalment_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view reminders" ON public.instalment_reminders FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

CREATE TABLE public.private_settings (key text PRIMARY KEY, value text NOT NULL);
GRANT ALL ON public.private_settings TO service_role;
ALTER TABLE public.private_settings ENABLE ROW LEVEL SECURITY;
INSERT INTO public.private_settings (key, value) VALUES ('cron_token', encode(gen_random_bytes(32), 'hex')) ON CONFLICT DO NOTHING;

CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.schedule('npa-instalment-reminders', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://nerdypixels.lovable.app/api/public/cron/instalment-reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.private_settings WHERE key='cron_token')),
    body := '{}'::jsonb
  );
$$);