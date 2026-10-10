-- The live backend now runs on Vercel (bootcamp.npdacademy.com has the server keys), so the daily jobs
-- call it directly instead of the Lovable copy. Re-scheduling an existing job name updates it in place.
SELECT cron.schedule('npa-instalment-reminders', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://bootcamp.npdacademy.com/api/public/cron/instalment-reminders',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.private_settings WHERE key='cron_token')),
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('npa-daily-summary', '0 7 * * *', $$
  SELECT net.http_post(
    url := 'https://bootcamp.npdacademy.com/api/public/cron/daily-summary',
    headers := jsonb_build_object('Content-Type','application/json','x-cron-token',(SELECT value FROM public.private_settings WHERE key='cron_token')),
    body := '{}'::jsonb
  );
$$);
