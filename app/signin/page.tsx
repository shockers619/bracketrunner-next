'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { ensureTenantForUser, NeedsOrgNameError } from '@/lib/tenant'

export default function SignInPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
      if (signInErr) throw signInErr

      await ensureTenantForUser(data.user.id)
      router.push('/intake')
    } catch (err) {
      if (err instanceof NeedsOrgNameError) {
        router.push('/onboarding')
        return
      }
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignIn() {
    setError(null)
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthErr) setError(oauthErr.message)
  }

  return (
    <div style={{ maxWidth: '440px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card">
        <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Sign in</h1>
        <p className="helper-text" style={{ marginBottom: '24px' }}>Welcome back to BracketRunner.</p>

        {error && <div className="error-banner">{error}</div>}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          className="btn-secondary"
          style={{ width: '100%', marginBottom: '16px' }}
        >
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0', color: 'var(--ink-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          OR
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        <form onSubmit={handleSignIn}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="helper-text" style={{ marginTop: '20px', textAlign: 'center' }}>
          Don&apos;t have an account? <a href="/signup" style={{ color: 'var(--accent)' }}>Create one</a>
        </p>
      </div>
    </div>
  )
}
