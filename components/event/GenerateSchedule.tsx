'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface ScheduleResponse {
  scheduledCount: number
  pinnedCount: number
  unscheduled: { matchId: string; reason: string }[]
  diagnostics: { suggestion?: string; resourceCount: number }
  estimatedOnly: boolean
}

export default function GenerateSchedule({ eventId, onDone }: { eventId: string; onDone?: () => void }) {
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<ScheduleResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Your session expired — please sign in again.')
      const res = await fetch('/api/schedule/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ eventId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not build the schedule.')
      setResult(data)
      onDone?.()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const failed = result ? result.unscheduled.length : 0

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '10px' }}>
        Schedule
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
        <p className="helper-text" style={{ marginTop: 0, flex: '1 1 240px', minWidth: 0 }}>
          Assign every game a court and a start time, respecting rest requirements and bracket order.
        </p>
        <button className="btn-primary" type="button" onClick={run} disabled={busy} style={{ flexShrink: 0 }}>
          {busy ? 'Building…' : 'Build schedule'}
        </button>
      </div>

      {error && <div className="error-banner" style={{ marginTop: '14px', marginBottom: 0 }}>{error}</div>}

      {result && (
        <div style={{ marginTop: '14px' }}>
          <p style={{ fontSize: '14px', fontWeight: 700 }}>
            {result.scheduledCount} game{result.scheduledCount === 1 ? '' : 's'} scheduled
            {result.pinnedCount > 0 && ` · ${result.pinnedCount} left in place`}
          </p>

          {result.estimatedOnly && (
            <p className="helper-text">
              This sport has no game clock, so these times are estimates — expect the day to drift.
            </p>
          )}

          {failed > 0 && (
            // A partial schedule is worse than no schedule if it's presented as
            // complete, so the shortfall is stated plainly with the fix.
            <div className="error-banner" style={{ marginTop: '12px', marginBottom: 0 }}>
              <strong>{failed} game{failed === 1 ? '' : 's'} couldn&apos;t be placed.</strong>
              {result.diagnostics.suggestion && <div style={{ marginTop: '6px' }}>{result.diagnostics.suggestion}</div>}
            </div>
          )}

          {failed === 0 && (
            <p className="helper-text">Every game fits inside your playing hours.</p>
          )}
        </div>
      )}
    </div>
  )
}
