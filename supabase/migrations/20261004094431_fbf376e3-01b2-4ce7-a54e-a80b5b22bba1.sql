CREATE TABLE public.ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  code text NOT NULL UNIQUE,
  source text NOT NULL DEFAULT 'imported',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ambassadors TO authenticated;
GRANT ALL ON public.ambassadors TO service_role;
ALTER TABLE public.ambassadors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage ambassadors" ON public.ambassadors FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER ambassadors_updated_at BEFORE UPDATE ON public.ambassadors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.cohorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  course text NOT NULL DEFAULT 'Digital Marketing Bootcamp',
  start_date text,
  end_date text,
  whatsapp_link text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cohorts TO authenticated;
GRANT ALL ON public.cohorts TO service_role;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage cohorts" ON public.cohorts FOR ALL TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));
CREATE TRIGGER cohorts_updated_at BEFORE UPDATE ON public.cohorts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE public.enrolments ADD COLUMN IF NOT EXISTS cohort_id uuid REFERENCES public.cohorts(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "Users see own roles, admins see all" ON public.user_roles;
CREATE POLICY "Users see own roles, super admin sees all, admins see admins" ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'super_admin') OR (is_admin(auth.uid()) AND role <> 'super_admin'));

INSERT INTO public.app_settings (key, value) VALUES
  ('commission_outright_pct', '10'),
  ('commission_instalment_pct', '10')
ON CONFLICT (key) DO NOTHING;