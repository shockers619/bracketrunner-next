'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createTenantForUser } from '@/lib/tenant'

export default function OnboardingPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push('/signin')
      else setUserId(data.user.id)
    })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return
    setError(null)
    setLoading(true)
    try {
      await createTenantForUser(userId, orgName)
      router.push('/intake')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ maxWidth: '440px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card">
        <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Name your organization</h1>
        <p className="helper-text" style={{ marginBottom: '24px' }}>One last step before you can start building events.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="orgName">Organization name</label>
            <input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Fall Classic Tournaments" required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !userId} style={{ width: '100%' }}>
            {loading ? 'Setting up…' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
