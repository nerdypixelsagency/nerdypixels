-- Deposit plans, seat limit, free class, multi-currency pricing, homepage media and syllabus.
-- Additive only: existing columns, plans and rows keep working.

-- 1. Cohort: deposit, balance date, early-bird seat limit, free class
ALTER TABLE public.cohorts
  ADD COLUMN IF NOT EXISTS deposit_amount integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_due_date date,
  ADD COLUMN IF NOT EXISTS seat_limit integer,
  ADD COLUMN IF NOT EXISTS free_class_title text,
  ADD COLUMN IF NOT EXISTS free_class_at timestamptz;

-- 2. Enrolments: what was actually charged (currency already exists) and where the visitor was
--    `amount` stays the naira value so revenue, commissions and reminders keep adding up in naira.
ALTER TABLE public.enrolments
  ADD COLUMN IF NOT EXISTS charge_amount numeric(12,2),
  ADD COLUMN IF NOT EXISTS geo_country text;

-- 3. Fixed prices per currency (naira prices come from the cohort)
CREATE TABLE IF NOT EXISTS public.currencies (
  code text PRIMARY KEY CHECK (code ~ '^[A-Z]{3}$' AND code <> 'NGN'),
  label text NOT NULL,
  symbol text NOT NULL,
  deposit numeric(12,2) NOT NULL CHECK (deposit >= 0),
  early_total numeric(12,2) NOT NULL CHECK (early_total >= 0),
  monthly numeric(12,2) NOT NULL CHECK (monthly >= 0),
  chargeable boolean NOT NULL DEFAULT false,
  active boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 100,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.currencies TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.currencies TO authenticated;
GRANT ALL ON public.currencies TO service_role;
ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active currencies are public" ON public.currencies;
CREATE POLICY "Active currencies are public" ON public.currencies FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "Admins manage currencies" ON public.currencies;
CREATE POLICY "Admins manage currencies" ON public.currencies FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS currencies_updated_at ON public.currencies;
CREATE TRIGGER currencies_updated_at BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Placeholder prices (edit in Admin > Currencies). Only USD is charged until more are enabled in Flutterwave.
INSERT INTO public.currencies (code, label, symbol, deposit, early_total, monthly, chargeable, sort) VALUES
  ('USD', 'US dollars', '$', 10, 45, 30, true, 10),
  ('GBP', 'British pounds', '£', 8, 35, 24, false, 20),
  ('EUR', 'Euros', '€', 9, 40, 27, false, 30),
  ('CAD', 'Canadian dollars', 'CA$', 14, 60, 40, false, 40),
  ('GHS', 'Ghana cedis', 'GH₵', 120, 600, 400, false, 50),
  ('KES', 'Kenyan shillings', 'KSh ', 1300, 5800, 3900, false, 60),
  ('ZAR', 'South African rand', 'R', 180, 800, 540, false, 70)
ON CONFLICT (code) DO NOTHING;

-- 4. Homepage media: testimonial videos, the class recording and alumni logos
CREATE TABLE IF NOT EXISTS public.site_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('testimonial', 'class_recording', 'logo')),
  title text NOT NULL,
  subtitle text,
  quote text,
  video_url text,
  image_url text,
  storage_path text,
  sort integer NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.site_media TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_media TO authenticated;
GRANT ALL ON public.site_media TO service_role;
ALTER TABLE public.site_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Active media is public" ON public.site_media;
CREATE POLICY "Active media is public" ON public.site_media FOR SELECT TO anon USING (active = true);
DROP POLICY IF EXISTS "Admins manage media" ON public.site_media;
CREATE POLICY "Admins manage media" ON public.site_media FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS site_media_updated_at ON public.site_media;
CREATE TRIGGER site_media_updated_at BEFORE UPDATE ON public.site_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.site_media (kind, title, image_url, sort)
SELECT 'logo', v.title, v.url, v.sort FROM (VALUES
  ('Jumia', '/brand/alumni/jumia.webp', 10), ('FirstBank', '/brand/alumni/firstbank.webp', 20),
  ('Sterling', '/brand/alumni/sterling.webp', 30), ('Pulse', '/brand/alumni/pulse.webp', 40),
  ('Ubuntu', '/brand/alumni/ubuntu.webp', 50), ('Britam', '/brand/alumni/britam.webp', 60),
  ('Mikano', '/brand/alumni/mikano.webp', 70), ('InEvent', '/brand/alumni/inevent.webp', 80),
  ('emPLE', '/brand/alumni/emple.webp', 90), ('Café One', '/brand/alumni/cafe-one.webp', 100)
) AS v(title, url, sort)
WHERE NOT EXISTS (SELECT 1 FROM public.site_media WHERE kind = 'logo');

-- Shown with a photo; the play button appears once a video link is added in Admin > Media & syllabus.
INSERT INTO public.site_media (kind, title, subtitle, sort, active)
SELECT v.kind, v.title, v.subtitle, v.sort, true FROM (VALUES
  ('testimonial', 'Judy', 'Graduate, last cohort', 10),
  ('testimonial', 'Inemesit', 'Graduate, last cohort', 20),
  ('testimonial', 'Akinleye', 'Graduate, last cohort', 30),
  ('class_recording', 'SEO Fundamentals, live class', 'Last cohort', 10)
) AS v(kind, title, subtitle, sort)
WHERE NOT EXISTS (SELECT 1 FROM public.site_media WHERE kind IN ('testimonial', 'class_recording'));

-- 5. Syllabus files (admin only; the link is only ever emailed)
CREATE TABLE IF NOT EXISTS public.syllabi (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  storage_path text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.syllabi TO authenticated;
GRANT ALL ON public.syllabi TO service_role;
ALTER TABLE public.syllabi ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage syllabi" ON public.syllabi;
CREATE POLICY "Admins manage syllabi" ON public.syllabi FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));
DROP TRIGGER IF EXISTS syllabi_updated_at ON public.syllabi;
CREATE TRIGGER syllabi_updated_at BEFORE UPDATE ON public.syllabi FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Public numbers for the homepage, without exposing any enrolment rows
CREATE OR REPLACE FUNCTION public.public_site_stats(_cohort uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'early_seats_taken', (
      SELECT count(DISTINCT lower(email)) FROM public.enrolments
      WHERE cohort_id = _cohort AND kind = 'enrolment' AND status = 'paid' AND mode = 'live' AND plan IN ('early', 'deposit_early')
    ),
    'has_syllabus', EXISTS (SELECT 1 FROM public.syllabi WHERE active)
  );
$$;
REVOKE ALL ON FUNCTION public.public_site_stats(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.public_site_stats(uuid) TO anon, authenticated, service_role;

-- 7. Public storage for uploaded media and syllabus files (admins upload, everyone can read)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('media', 'media', true, 52428800, ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'video/mp4', 'video/webm', 'application/pdf'])
ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "Media files are public" ON storage.objects;
CREATE POLICY "Media files are public" ON storage.objects FOR SELECT USING (bucket_id = 'media');
DROP POLICY IF EXISTS "Admins upload media files" ON storage.objects;
CREATE POLICY "Admins upload media files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins update media files" ON storage.objects;
CREATE POLICY "Admins update media files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));
DROP POLICY IF EXISTS "Admins delete media files" ON storage.objects;
CREATE POLICY "Admins delete media files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.is_admin(auth.uid()));

-- 8. The November 2026 cohort: new dates, deposit and seats (from the approved prototype)
UPDATE public.cohorts SET
  start_date = 'Saturday 14 November 2026',
  early_bird_deadline = '2026-10-31T22:59:59Z',
  deposit_amount = 10000,
  balance_due_date = '2026-11-07',
  seat_limit = 40,
  free_class_title = 'Build your first marketing strategy',
  free_class_at = '2026-10-17T10:00:00Z'
WHERE status = 'open';
