-- Site content builder, per-admin access, and super-admin control of automated emails.

-- 1. Site content: a draft that admins edit and preview, and the published copy the site reads.
CREATE TABLE IF NOT EXISTS public.site_content (
  key text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid,
  published_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
-- Visitors may read only the published copy, never the draft.
GRANT SELECT (key, published, published_at) ON public.site_content TO anon;
GRANT SELECT, INSERT, UPDATE ON public.site_content TO authenticated;
GRANT ALL ON public.site_content TO service_role;
ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Published content is public" ON public.site_content;
CREATE POLICY "Published content is public" ON public.site_content FOR SELECT TO anon USING (true);
DROP POLICY IF EXISTS "Admins manage content" ON public.site_content;
CREATE POLICY "Admins manage content" ON public.site_content FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS site_content_updated_at ON public.site_content;
CREATE TRIGGER site_content_updated_at BEFORE UPDATE ON public.site_content FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.site_content (key) VALUES ('home') ON CONFLICT (key) DO NOTHING;

-- 2. Per-admin page access. NULL = full admin access (today's behaviour for existing admins).
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS permissions text[];
ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS preset text;

CREATE OR REPLACE FUNCTION public.has_perm(_user_id uuid, _perms text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'super_admin' OR (role = 'admin' AND (permissions IS NULL OR permissions && _perms)))
  )
$$;
REVOKE ALL ON FUNCTION public.has_perm(uuid, text[]) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_perm(uuid, text[]) TO authenticated, service_role;

-- Restrictive policies narrow every existing "admins can ..." policy to the admin's allowed pages.
DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT * FROM (VALUES
    ('enrolments', ARRAY['dashboard','enrolments','instalments','commissions','referrals','preview']),
    ('leads', ARRAY['leads','emails']),
    ('email_log', ARRAY['emails','referrals']),
    ('ambassadors', ARRAY['referrals','commissions','emails']),
    ('commission_payouts', ARRAY['commissions']),
    ('instalment_reminders', ARRAY['instalments','enrolments']),
    ('cohorts', ARRAY['cohorts','content','dashboard','enrolments']),
    ('courses', ARRAY['cohorts','content']),
    ('site_content', ARRAY['content']),
    ('site_media', ARRAY['content','media']),
    ('syllabi', ARRAY['media','content']),
    ('currencies', ARRAY['currencies','cohorts']),
    ('admin_preview_audit', ARRAY['preview'])
  ) AS v(tbl, perms)
  LOOP
    IF to_regclass('public.' || t.tbl) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Page access" ON public.%I', t.tbl);
      EXECUTE format('CREATE POLICY "Page access" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (public.has_perm(auth.uid(), %L::text[])) WITH CHECK (public.has_perm(auth.uid(), %L::text[]))', t.tbl, t.perms, t.perms);
    END IF;
  END LOOP;
END $$;

-- 3. Automated emails, controlled by the super admin in Settings.
INSERT INTO public.app_settings (key, value) VALUES
  ('auto_emails', '{"reminders":true,"daily_summary":true,"form_confirmations":true,"ambassador_emails":true,"payment_receipts":true}'),
  ('summary_recipients', 'fegokendigital@gmail.com,hayjay.okunolaa@gmail.com')
ON CONFLICT (key) DO NOTHING;
-- Make sure the second admin gets the daily statistics even if the setting already existed.
UPDATE public.app_settings SET value = value || ',hayjay.okunolaa@gmail.com'
WHERE key = 'summary_recipients' AND position('hayjay.okunolaa@gmail.com' in value) = 0;
