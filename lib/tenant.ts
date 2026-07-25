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
  const base = slugify(name) || `org-${userId.slice(0, 8)}`

  // Two different organizations can legitimately produce the same slug (e.g.
  // both named "Elite Hoops"). Rather than hard-fail on the tenants_slug_key
  // unique constraint with a raw Postgres error, try the clean slug first and,
  // only on a genuine slug collision, retry with a short suffix.
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`
    const { data: tenant, error } = await supabase
      .rpc('create_tenant_with_membership', { tenant_name: name, tenant_slug: slug })
      .single()

    if (!error) return tenant as { id: string; name: string; slug: string }

    // Postgres 23505 = unique_violation. Only a slug collision is retryable;
    // anything else is a real failure and should surface immediately.
    const isSlugCollision = /tenants_slug_key/i.test(error.message) || /duplicate key/i.test(error.message)
    if (!isSlugCollision) throw new Error(`Creating organization: ${error.message}`)
  }

  throw new Error('Creating organization: couldn’t generate a unique URL for that name — please try a slightly different name.')
}
