'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { emptyIntakeState } from '@/lib/intakeTypes'
import { supabase } from '@/lib/supabase'
import StepEvent from '@/components/StepEvent'
import StepDivisions from '@/components/StepDivisions'
import StepVenues from '@/components/StepVenues'
import StepTeams from '@/components/StepTeams'
import StepReview from '@/components/StepReview'

const STEPS = ['Event', 'Divisions', 'Venues & Courts', 'Teams', 'Review'] as const

export default function IntakePage() {
  const router = useRouter()
  const [authChecked, setAuthChecked] = useState(false)
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')

  const [step, setStep] = useState(0)
  const [state, setState] = useState(emptyIntakeState())
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [result, setResult] = useState<{ eventId: string; slug: string; warnings?: string[] } | null>(null)

  useEffect(() => {
    async function checkAuth() {
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
      setAuthChecked(true)
    }
    checkAuth()
  }, [router])

  function eventErrors(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (step > 0) {
      if (!state.event.title.trim()) errs.title = 'Event name is required'
      if (!state.event.slug.trim()) errs.slug = 'A URL slug is required'
      if (!state.event.sport.trim()) errs.sport = 'Sport is required'
      if (!state.event.startDate) errs.startDate = 'Start date is required'
      if (!state.event.endDate) errs.endDate = 'End date is required'
      if (state.event.startDate && state.event.endDate && state.event.endDate < state.event.startDate) {
        errs.endDate = 'End date must be on or after the start date'
      }
    }
    return errs
  }

  function canAdvanceFrom(stepIndex: number): boolean {
    if (stepIndex === 0) return Object.keys(eventErrors()).length === 0 || step === 0
    if (stepIndex === 1) return state.divisions.length > 0 && state.divisions.every(d => d.name.trim())
    if (stepIndex === 2) return state.venues.length > 0 && state.venues.every(v => v.name.trim() && v.courts.length > 0)
    return true
  }

  async function handleSubmit() {
    if (!tenantId) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session expired — please sign in again.')

      const res = await fetch('/api/intake', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ ...state, tenantId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      setResult(data)
    } catch (err) {
      setSubmitError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/signin')
  }

  if (!authChecked) {
    return (
      <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="helper-text">Loading…</p>
      </div>
    )
  }

  if (result) {
    return (
      <div style={{ maxWidth: '640px', margin: '80px auto', padding: '0 24px' }}>
        <div className="card">
          <h1 style={{ fontSize: '22px', marginBottom: '10px' }}>Event created</h1>
          <p className="helper-text" style={{ marginBottom: '16px' }}>
            Public page is live at <span className="mono">bracketrunner.com/{result.slug}</span>.
          </p>
          <p className="mono" style={{ color: 'var(--ink-muted)' }}>event id: {result.eventId}</p>
          {result.warnings && result.warnings.length > 0 && (
            <div className="error-banner" style={{ marginTop: '16px' }}>
              Schedule wasn&apos;t generated for some divisions:
              <ul>{result.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          <a href={`/events/${result.eventId}`} className="btn-primary" style={{ display: 'inline-block', marginTop: '20px', textDecoration: 'none' }}>
            Manage this event →
          </a>
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '48px 24px', display: 'grid', gridTemplateColumns: '200px 1fr', gap: '40px' }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
          <h1 style={{ fontSize: '18px' }}>New Event</h1>
        </div>
        <p className="helper-text" style={{ marginBottom: '20px' }}>{orgName}</p>
        <div className="step-rail">
          {STEPS.map((label, i) => (
            <div key={label} className={`step-item ${i === step ? 'active' : ''} ${i < step ? 'complete' : ''}`}>
              <span className="step-dot">{i < step ? '✓' : i + 1}</span>
              {label}
            </div>
          ))}
        </div>
        <button className="btn-ghost" type="button" onClick={handleSignOut} style={{ marginTop: '24px', padding: '0' }}>
          Sign out
        </button>
      </div>

      <div>
        {step === 0 && <StepEvent value={state.event} onChange={event => setState({ ...state, event })} errors={eventErrors()} />}
        {step === 1 && (
          <StepDivisions
            divisions={state.divisions}
            onChange={divisions => setState({ ...state, divisions })}
            error={state.divisions.length === 0 ? undefined : undefined}
          />
        )}
        {step === 2 && <StepVenues venues={state.venues} onChange={venues => setState({ ...state, venues })} />}
        {step === 3 && (
          <StepTeams
            divisions={state.divisions}
            teamsByDivision={state.teamsByDivision}
            onChange={teamsByDivision => setState({ ...state, teamsByDivision })}
          />
        )}
        {step === 4 && tenantId && (
          <StepReview state={{ ...state, tenantId }} submitting={submitting} submitError={submitError} onSubmit={handleSubmit} />
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
          <button className="btn-ghost" type="button" disabled={step === 0} onClick={() => setStep(s => Math.max(0, s - 1))}>
            ← Back
          </button>
          {step < STEPS.length - 1 && (
            <button
              className="btn-primary"
              type="button"
              disabled={!canAdvanceFrom(step)}
              onClick={() => setStep(s => Math.min(STEPS.length - 1, s + 1))}
            >
              Continue →
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
