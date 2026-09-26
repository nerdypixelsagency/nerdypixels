CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  email text,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','admin'))
$$;

CREATE POLICY "Users see own roles, admins see all" ON public.user_roles
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

-- Grants super_admin to the owner email only when that email is verified
CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u record;
BEGIN
  SELECT id, email, email_confirmed_at INTO u FROM auth.users WHERE id = auth.uid();
  IF u.id IS NULL OR u.email_confirmed_at IS NULL OR lower(u.email) <> 'fegokendigital@gmail.com' THEN
    RETURN false;
  END IF;
  INSERT INTO public.user_roles (user_id, email, role) VALUES (u.id, u.email, 'super_admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_super_admin() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated;

CREATE TABLE public.enrolments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL DEFAULT 'enrolment',
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text,
  persona text,
  source text,
  referral_code text,
  plan text,
  instalment_month text,
  amount integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'NGN',
  status text NOT NULL DEFAULT 'pending',
  payment_method text,
  tx_ref text UNIQUE,
  flw_transaction_id text,
  paid_at timestamptz,
  email_sent_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX enrolments_created_idx ON public.enrolments (created_at DESC);
CREATE INDEX enrolments_referral_idx ON public.enrolments (lower(referral_code));
CREATE INDEX enrolments_email_idx ON public.enrolments (lower(email));

GRANT SELECT, UPDATE ON public.enrolments TO authenticated;
GRANT ALL ON public.enrolments TO service_role;
ALTER TABLE public.enrolments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view enrolments" ON public.enrolments
FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));
CREATE POLICY "Admins can update enrolments" ON public.enrolments
FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER enrolments_updated_at BEFORE UPDATE ON public.enrolments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();