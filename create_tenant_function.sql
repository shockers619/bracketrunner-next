-- Clean up the temporary debug policy
DROP POLICY IF EXISTS "temp debug allow all inserts" ON tenants;
DROP POLICY IF EXISTS "authenticated users can create a tenant" ON tenants;

-- Atomic tenant + membership creation. SECURITY DEFINER means this function
-- runs with elevated privileges internally (bypassing RLS for its own
-- operations) — but it explicitly checks auth.uid() itself first, so it's
-- not a backdoor: only a genuinely signed-in user can call it, and it only
-- ever creates a tenant owned by THEM. This sidesteps the chicken-and-egg
-- problem entirely instead of trying to patch around it with more policies.
CREATE OR REPLACE FUNCTION create_tenant_with_membership(tenant_name TEXT, tenant_slug TEXT)
RETURNS tenants
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  new_tenant tenants;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO tenants (name, slug) VALUES (tenant_name, tenant_slug) RETURNING * INTO new_tenant;
  INSERT INTO tenant_members (tenant_id, user_id, role) VALUES (new_tenant.id, auth.uid(), 'director');

  RETURN new_tenant;
END;
$$;

GRANT EXECUTE ON FUNCTION create_tenant_with_membership(TEXT, TEXT) TO authenticated;
