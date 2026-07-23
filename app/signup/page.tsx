'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { createTenantForUser } from '@/lib/tenant'

export default function SignUpPage() {
  const router = useRouter()
  const [orgName, setOrgName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checkEmail, setCheckEmail] = useState(false)

  async function handleEmailSignUp(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (signUpErr) throw signUpErr

      if (!data.session) {
        // Email confirmation is required before a session exists — stash the
        // org name so it survives to first real sign-in, where the tenant
        // actually gets created (see lib/tenant.ts + signin page).
        if (orgName.trim()) sessionStorage.setItem('pending_org_name', orgName.trim())
        setCheckEmail(true)
        return
      }

      await createTenantForUser(data.user!.id, orgName)
      router.push('/intake')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSignUp() {
    setError(null)
    // orgName is stashed so the auth callback can create the tenant once
    // Google redirects back with a real session.
    if (orgName.trim()) sessionStorage.setItem('pending_org_name', orgName.trim())
    const { error: oauthErr } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (oauthErr) setError(oauthErr.message)
  }

  if (checkEmail) {
    return (
      <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px' }}>
        <div className="card">
          <h1 style={{ fontSize: '20px', marginBottom: '10px' }}>Check your email</h1>
          <p className="helper-text">We sent a confirmation link to {email}. Click it, then sign in.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '440px', margin: '80px auto', padding: '0 24px' }}>
      <div className="card">
        <h1 style={{ fontSize: '22px', marginBottom: '4px' }}>Create your organization</h1>
        <p className="helper-text" style={{ marginBottom: '24px' }}>Set up BracketRunner for your tournaments.</p>

        {error && <div className="error-banner">{error}</div>}

        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="btn-secondary"
          style={{ width: '100%', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          Continue with Google
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0', color: 'var(--ink-muted)', fontSize: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
          OR
          <div style={{ flex: 1, height: '1px', background: 'var(--line)' }} />
        </div>

        <form onSubmit={handleEmailSignUp}>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="orgName">Organization name</label>
            <input id="orgName" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Fall Classic Tournaments" required />
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div style={{ marginBottom: '20px' }}>
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={8} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="helper-text" style={{ marginTop: '20px', textAlign: 'center' }}>
          Already have an account? <a href="/signin" style={{ color: 'var(--accent)' }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
