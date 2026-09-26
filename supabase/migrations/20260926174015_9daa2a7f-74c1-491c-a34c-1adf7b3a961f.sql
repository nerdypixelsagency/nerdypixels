CREATE OR REPLACE FUNCTION public.claim_super_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  owner_user auth.users%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'A signed-in user is required to claim admin access';
  END IF;

  SELECT *
  INTO owner_user
  FROM auth.users
  WHERE id = auth.uid();

  IF owner_user.id IS NULL
     OR owner_user.email_confirmed_at IS NULL
     OR lower(owner_user.email) <> 'fegokendigital@gmail.com' THEN
    RETURN false;
  END IF;

  INSERT INTO public.user_roles (user_id, email, role)
  VALUES (owner_user.id, lower(owner_user.email), 'super_admin')
  ON CONFLICT (user_id, role)
  DO UPDATE SET email = EXCLUDED.email;

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_super_admin() TO authenticated, service_role;