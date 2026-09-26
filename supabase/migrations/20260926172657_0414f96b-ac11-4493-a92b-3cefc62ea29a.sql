CREATE TABLE public.app_settings (key text PRIMARY KEY, value text NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, UPDATE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view settings" ON public.app_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Super admin updates settings" ON public.app_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE TRIGGER app_settings_updated_at BEFORE UPDATE ON public.app_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
INSERT INTO public.app_settings (key, value) VALUES ('payment_mode','live');
ALTER TABLE public.enrolments ADD COLUMN mode text NOT NULL DEFAULT 'live';