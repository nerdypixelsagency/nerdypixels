CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  status text NOT NULL DEFAULT 'active',
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.courses TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT ALL ON public.courses TO service_role;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published courses are public" ON public.courses FOR SELECT TO anon USING (is_published = true AND status = 'active');
CREATE POLICY "Admins manage courses" ON public.courses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
CREATE TRIGGER courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.courses (title, slug, description, status, is_published)
VALUES ('Digital Marketing Bootcamp', 'digital-marketing', 'Professional Digital Marketing Bootcamp with live classes, practical projects and industry certifications.', 'active', true);

ALTER TABLE public.cohorts
  ADD COLUMN course_id uuid REFERENCES public.courses(id),
  ADD COLUMN headline text,
  ADD COLUMN offer_label text,
  ADD COLUMN early_bird_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN early_bird_price integer NOT NULL DEFAULT 60000,
  ADD COLUMN early_bird_deadline timestamptz DEFAULT '2026-10-10T22:59:59Z',
  ADD COLUMN outright_price integer NOT NULL DEFAULT 90000,
  ADD COLUMN instalment_amount integer NOT NULL DEFAULT 40000,
  ADD COLUMN instalment_count integer NOT NULL DEFAULT 3,
  ADD COLUMN outright_copy text,
  ADD COLUMN instalment_copy text,
  ADD COLUMN is_published boolean NOT NULL DEFAULT true;

UPDATE public.cohorts
SET course_id = (SELECT id FROM public.courses WHERE slug = 'digital-marketing'),
    headline = COALESCE(headline, 'Build a digital marketing career that gets results.'),
    offer_label = COALESCE(offer_label, 'Early bird'),
    outright_copy = COALESCE(outright_copy, 'Pay once and secure your seat.'),
    instalment_copy = COALESCE(instalment_copy, 'Pay monthly in equal instalments.')
WHERE course_id IS NULL;

ALTER TABLE public.cohorts ALTER COLUMN course_id SET NOT NULL;
GRANT SELECT ON public.cohorts TO anon;
CREATE POLICY "Published open cohorts are public" ON public.cohorts FOR SELECT TO anon USING (is_published = true AND status = 'open');

CREATE TABLE public.admin_preview_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL,
  enrolment_id uuid REFERENCES public.enrolments(id) ON DELETE SET NULL,
  preview_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.admin_preview_audit TO authenticated;
GRANT ALL ON public.admin_preview_audit TO service_role;
ALTER TABLE public.admin_preview_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view preview audit" ON public.admin_preview_audit FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins record preview audit" ON public.admin_preview_audit FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()) AND admin_user_id = auth.uid());