'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureTenantForUser, NeedsOrgNameError } from '@/lib/tenant'

export default function AuthCallbackPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function run() {
      try {
        const code = new URLSearchParams(window.location.search).get('code')
        if (code) {
          const { error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code)
          if (exchangeErr) throw exchangeErr
        }

        const { data } = await supabase.auth.getUser()
        if (!data.user) throw new Error('Sign-in did not complete — no user session found.')

        await ensureTenantForUser(data.user.id)
        router.push('/intake')
      } catch (err) {
        if (err instanceof NeedsOrgNameError) {
          router.push('/onboarding')
          return
        }
        setError((err as Error).message)
      }
    }
    run()
  }, [router])

  return (
    <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
      {error ? (
        <div className="card">
          <p className="field-error">{error}</p>
          <a href="/signin" style={{ color: 'var(--accent)' }}>Back to sign in</a>
        </div>
      ) : (
        <p className="helper-text">Signing you in…</p>
      )}
    </div>
  )
}
