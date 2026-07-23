'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export function useAuthTenant() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/signin')
        return
      }
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('tenant_id, tenants(name)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (!membership) {
        router.push('/onboarding')
        return
      }
      setTenantId(membership.tenant_id)
      setOrgName((membership.tenants as any)?.name || '')
      setReady(true)
    }
    check()
  }, [router])

  return { ready, tenantId, orgName }
}
