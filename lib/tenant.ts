import { supabase } from '@/lib/supabase'

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export class NeedsOrgNameError extends Error {
  constructor() {
    super('NEEDS_ORG_NAME')
  }
}

/**
 * Returns the current user's tenant_id, creating a tenant for them if this
 * is their first time completing sign-in (e.g. after email confirmation, or
 * a fresh Google OAuth signup). Looks for a pending org name stashed in
 * sessionStorage by the sign-up form; if none exists, throws NeedsOrgNameError
 * so the caller can redirect to a short "name your organization" step.
 */
export async function ensureTenantForUser(userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from('tenant_members')
    .select('tenant_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle()

  if (existing) return existing.tenant_id

  const pendingName = typeof window !== 'undefined' ? sessionStorage.getItem('pending_org_name') : null
  if (!pendingName) throw new NeedsOrgNameError()

  const tenant = await createTenantForUser(userId, pendingName)
  sessionStorage.removeItem('pending_org_name')
  return tenant.id
}

export async function createTenantForUser(userId: string, name: string) {
  const slug = slugify(name) || `org-${userId.slice(0, 8)}`
  const { data: tenant, error: tenantErr } = await supabase
    .rpc('create_tenant_with_membership', { tenant_name: name, tenant_slug: slug })
    .single()
  if (tenantErr) throw new Error(`Creating organization: ${tenantErr.message}`)
  return tenant as { id: string; name: string; slug: string }
}
