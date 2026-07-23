'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'
import { enqueue, flushQueue, listQueued, type QueuedAction } from '@/lib/offlineQueue'

type MatchStatus = 'scheduled' | 'in_progress' | 'pending_confirmation' | 'completed' | 'cancelled'

interface MatchRow {
  id: string
  divisionId: string
  courtId: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  status: MatchStatus
}

interface TeamRow { id: string; name: string }
interface DivisionRow { id: string; name: string }
interface CourtRow { id: string; name: string }

export default function ScorekeeperPage({ params }: { params: { eventId: string } }) {
  const { ready } = useAuthTenant()
  const [eventTitle, setEventTitle] = useState('')
  const [divisions, setDivisions] = useState<DivisionRow[]>([])
  const [courts, setCourts] = useState<CourtRow[]>([])
  const [teamsById, setTeamsById] = useState<Record<string, string>>({})
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [divisionFilter, setDivisionFilter] = useState<string>('all')
  const [courtFilter, setCourtFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isOnline, setIsOnline] = useState(true)
  const [queuedCount, setQueuedCount] = useState(0)
  const [syncing, setSyncing] = useState(false)

  const [confirmingMatchId, setConfirmingMatchId] = useState<string | null>(null)
  // Set when the server flags a just-submitted score as unusual (e.g. a
  // likely typo or a lopsided blowout past the sport's normal range) and
  // is holding the match at 'pending_confirmation' until the director
  // explicitly re-confirms the exact numbers shown.
  const [anomalyMatchId, setAnomalyMatchId] = useState<string | null>(null)

  const sessionRef = useRef<string | null>(null)

  // ---- Initial load ----
  useEffect(() => {
    if (!ready) return
    async function load() {
      const { data: event } = await supabase.from('events').select('id, title').eq('id', params.eventId).single()
      setEventTitle(event?.title || '')

      const { data: divisionRows } = await supabase.from('divisions').select('id, name').eq('event_id', params.eventId)
      setDivisions(divisionRows || [])

      const divisionIds = (divisionRows || []).map(d => d.id)
      const { data: teamRows } = divisionIds.length
        ? await supabase.from('teams').select('id, name').in('division_id', divisionIds)
        : { data: [] as { id: string; name: string }[] }
      setTeamsById(Object.fromEntries((teamRows || []).map(t => [t.id, t.name])))

      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, division_id, court_id, home_team_id, away_team_id, home_score, away_score, status')
        .eq('event_id', params.eventId)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
      const mapped: MatchRow[] = (matchRows || []).map(m => ({
        id: m.id,
        divisionId: m.division_id,
        courtId: m.court_id,
        homeTeamId: m.home_team_id,
        awayTeamId: m.away_team_id,
        homeScore: m.home_score,
        awayScore: m.away_score,
        status: m.status,
      }))
      setMatches(mapped)

      const courtIds = Array.from(new Set(mapped.map(m => m.courtId).filter(Boolean))) as string[]
      const { data: courtRows } = courtIds.length
        ? await supabase.from('courts').select('id, name').in('id', courtIds)
        : { data: [] as { id: string; name: string }[] }
      setCourts(courtRows || [])

      const { data: { session } } = await supabase.auth.getSession()
      sessionRef.current = session?.access_token || null

      setLoading(false)
    }
    load()
  }, [ready, params.eventId])

  // ---- Connection status + queue count ----
  const refreshQueuedCount = useCallback(async () => {
    const q = await listQueued()
    setQueuedCount(q.length)
  }, [])

  // Throwing here means flushQueue keeps the action queued and stops (see
  // offlineQueue's FIFO stop-on-failure behavior). That's deliberate for
  // the anomaly case too: an unusual score (e.g. 105-38) should never get
  // silently committed by an automatic queue replay while the director
  // wasn't looking at the screen — it stays queued until they're back
  // online and can actually see the flagged numbers on this card.
  const sendAction = useCallback(async (action: QueuedAction) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No session')
    const endpoint = action.type === 'record_result' ? '/api/matches/record-result' : '/api/matches/update-score'
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(action.payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw new Error(data.error || `Request failed (${res.status})`)
    }
    if (action.type === 'record_result' && data.requiresConfirmation && !action.payload.confirmed) {
      throw new Error('ANOMALY_NEEDS_REVIEW')
    }
    return data
  }, [])

  const runFlush = useCallback(async () => {
    setSyncing(true)
    try {
      await flushQueue(sendAction)
    } finally {
      await refreshQueuedCount()
      setSyncing(false)
    }
  }, [sendAction, refreshQueuedCount])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    refreshQueuedCount()

    function handleOnline() {
      setIsOnline(true)
      runFlush()
    }
    function handleOffline() {
      setIsOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [runFlush, refreshQueuedCount])

  // ---- Score actions ----
  // Optimistic: local state updates immediately regardless of network.
  // The write attempt (or queueing) happens after, and never blocks the UI.
  //
  // Shared by the direct score field (typing a final or in-progress score
  // in) — one write path regardless of how the value was arrived at.
  async function pushScore(match: MatchRow, nextHome: number, nextAway: number) {
    const nextStatus: MatchStatus = match.status === 'scheduled' ? 'in_progress' : match.status
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, homeScore: nextHome, awayScore: nextAway, status: nextStatus } : m))

    const payload = { matchId: match.id, homeScore: nextHome, awayScore: nextAway, status: nextStatus === 'in_progress' ? 'in_progress' as const : 'scheduled' as const }

    if (navigator.onLine) {
      try {
        await sendAction({ type: 'update_score', id: '', createdAt: '', payload })
        return
      } catch {
        // fall through to queue
      }
    }
    await enqueue({ type: 'update_score', payload })
    await refreshQueuedCount()
  }

  async function applyScoreSet(match: MatchRow, side: 'home' | 'away', value: number) {
    const clamped = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0))
    const nextHome = side === 'home' ? clamped : match.homeScore
    const nextAway = side === 'away' ? clamped : match.awayScore
    await pushScore(match, nextHome, nextAway)
  }

  async function toggleStarted(match: MatchRow) {
    if (match.status !== 'scheduled') return
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: 'in_progress' } : m))
    const payload = { matchId: match.id, homeScore: match.homeScore, awayScore: match.awayScore, status: 'in_progress' as const }
    if (navigator.onLine) {
      try {
        await sendAction({ type: 'update_score', id: '', createdAt: '', payload })
        return
      } catch {
        // fall through to queue
      }
    }
    await enqueue({ type: 'update_score', payload })
    await refreshQueuedCount()
  }

  // First tap after "Confirm final score?" — submits WITHOUT confirmed:true,
  // so the server's anomaly guard gets a chance to flag it. Only marks the
  // match completed in local state if the server actually accepted it.
  async function confirmFinal(match: MatchRow) {
    setConfirmingMatchId(null)
    const payload = { matchId: match.id, homeScore: match.homeScore, awayScore: match.awayScore }

    if (navigator.onLine) {
      try {
        const data = await sendAction({ type: 'record_result', id: '', createdAt: '', payload })
        if (data.requiresConfirmation) {
          setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: 'pending_confirmation' } : m))
          setAnomalyMatchId(match.id)
        } else {
          setMatches(prev => prev.filter(m => m.id !== match.id))
        }
        return
      } catch (err) {
        const msg = (err as Error).message
        if (msg === 'ANOMALY_NEEDS_REVIEW') {
          setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: 'pending_confirmation' } : m))
          setAnomalyMatchId(match.id)
        } else {
          setError(msg)
        }
        return
      }
    }
    await enqueue({ type: 'record_result', payload })
    await refreshQueuedCount()
  }

  // Second tap — director has now seen the flagged numbers on the card and
  // explicitly confirmed they're correct. Resubmits with confirmed:true,
  // which the engine treats as final regardless of the anomaly bounds.
  async function confirmAnomaly(match: MatchRow) {
    setAnomalyMatchId(null)
    const payload = { matchId: match.id, homeScore: match.homeScore, awayScore: match.awayScore, confirmed: true }

    if (navigator.onLine) {
      try {
        await sendAction({ type: 'record_result', id: '', createdAt: '', payload })
        setMatches(prev => prev.filter(m => m.id !== match.id))
        return
      } catch (err) {
        setError((err as Error).message)
        return
      }
    }
    await enqueue({ type: 'record_result', payload })
    await refreshQueuedCount()
  }

  function editAnomalyScore(match: MatchRow) {
    // Director says the flagged number is wrong, not just unusual — drop
    // back to live editing instead of blindly re-confirming a typo.
    setAnomalyMatchId(null)
    setMatches(prev => prev.map(m => m.id === match.id ? { ...m, status: 'in_progress' } : m))
  }

  const visible = matches.filter(m =>
    (divisionFilter === 'all' || m.divisionId === divisionFilter) &&
    (courtFilter === 'all' || m.courtId === courtFilter)
  )

  if (!ready || loading) {
    return (
      <div style={{ maxWidth: '480px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="helper-text">Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '520px', margin: '0 auto', padding: '0 0 40px' }}>
      {/* Sticky header with connection status */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10, 11, 13, 0.92)', backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--line)', padding: '14px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Scorekeeper</p>
            <h1 style={{ fontSize: '17px', lineHeight: 1.2 }}>{eventTitle}</h1>
          </div>
          <ConnectionBadge isOnline={isOnline} queuedCount={queuedCount} syncing={syncing} onRetry={runFlush} />
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          <select value={divisionFilter} onChange={e => setDivisionFilter(e.target.value)} style={{ flex: 1, fontSize: '13px', padding: '8px' }}>
            <option value="all">All divisions</option>
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={courtFilter} onChange={e => setCourtFilter(e.target.value)} style={{ flex: 1, fontSize: '13px', padding: '8px' }}>
            <option value="all">All courts</option>
            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="error-banner" style={{ margin: '16px' }}>{error}</div>}

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {visible.length === 0 && (
          <p className="helper-text" style={{ textAlign: 'center', padding: '40px 0' }}>
            No live matches for this filter.
          </p>
        )}

        {visible.map(match => (
          <MatchCard
            key={match.id}
            match={match}
            homeTeamName={match.homeTeamId ? (teamsById[match.homeTeamId] || 'TBD') : 'TBD'}
            awayTeamName={match.awayTeamId ? (teamsById[match.awayTeamId] || 'TBD') : 'TBD'}
            onSet={applyScoreSet}
            onToggleStarted={toggleStarted}
            onRequestFinal={() => setConfirmingMatchId(match.id)}
            confirming={confirmingMatchId === match.id}
            onCancelConfirm={() => setConfirmingMatchId(null)}
            onConfirmFinal={() => confirmFinal(match)}
            onConfirmAnomaly={() => confirmAnomaly(match)}
            onEditAnomalyScore={() => editAnomalyScore(match)}
          />
        ))}
      </div>
    </div>
  )
}

function ConnectionBadge({ isOnline, queuedCount, syncing, onRetry }: {
  isOnline: boolean; queuedCount: number; syncing: boolean; onRetry: () => void
}) {
  if (isOnline && queuedCount === 0) {
    return (
      <span style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '12px', fontWeight: 700, color: '#4ADE80',
        background: 'rgba(74, 222, 128, 0.1)', border: '1px solid rgba(74, 222, 128, 0.3)',
        borderRadius: '999px', padding: '5px 10px',
      }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#4ADE80' }} />
        Live
      </span>
    )
  }
  const label = !isOnline
    ? `Offline${queuedCount > 0 ? ` · ${queuedCount} queued` : ''}`
    : syncing
      ? `Syncing (${queuedCount})`
      : `Sync pending (${queuedCount})`
  return (
    <button
      type="button"
      onClick={onRetry}
      style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        fontSize: '12px', fontWeight: 700, color: 'var(--warn)',
        background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.35)',
        borderRadius: '999px', padding: '5px 10px',
      }}
    >
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: 'var(--warn)' }} />
      {label}
    </button>
  )
}

function MatchCard({
  match, homeTeamName, awayTeamName, onSet, onToggleStarted,
  onRequestFinal, confirming, onCancelConfirm, onConfirmFinal,
  onConfirmAnomaly, onEditAnomalyScore,
}: {
  match: MatchRow
  homeTeamName: string
  awayTeamName: string
  onSet: (match: MatchRow, side: 'home' | 'away', value: number) => void
  onToggleStarted: (match: MatchRow) => void
  onRequestFinal: () => void
  confirming: boolean
  onCancelConfirm: () => void
  onConfirmFinal: () => void
  onConfirmAnomaly: () => void
  onEditAnomalyScore: () => void
}) {
  const canFinal = match.status === 'in_progress' && match.homeScore !== match.awayScore
    && !!match.homeTeamId && !!match.awayTeamId
  // Scores are editable from Not Started too — a director logging a result
  // after the fact shouldn't have to tap "Start match" first just to type
  // a final score in. Typing from Not Started auto-flips the match to In
  // Progress via pushScore.
  const scoreEditable = match.status === 'scheduled' || match.status === 'in_progress'

  return (
    <div className="card" style={{ padding: '18px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <StatusPill status={match.status} />
        {match.status === 'scheduled' && (
          <button className="btn-secondary" type="button" onClick={() => onToggleStarted(match)} style={{ fontSize: '12px', padding: '6px 12px' }}>
            Start match
          </button>
        )}
      </div>

      <ScoreRow teamName={homeTeamName} score={match.homeScore} onSet={v => onSet(match, 'home', v)} disabled={!scoreEditable} />
      <div style={{ height: '10px' }} />
      <ScoreRow teamName={awayTeamName} score={match.awayScore} onSet={v => onSet(match, 'away', v)} disabled={!scoreEditable} />

      {match.status === 'pending_confirmation' && (
        <div style={{ marginTop: '16px', border: '1px solid rgba(251, 191, 36, 0.4)', borderRadius: '10px', padding: '14px', background: 'rgba(251, 191, 36, 0.06)' }}>
          <p style={{ fontWeight: 700, marginBottom: '4px', color: 'var(--warn)' }}>⚠ Unusual score — double check</p>
          <p className="helper-text" style={{ marginBottom: '12px' }}>
            {homeTeamName} {match.homeScore} — {match.awayScore} {awayTeamName}. This is outside the normal range for this sport — could be a typo. Confirm it's correct, or fix it.
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-secondary" type="button" onClick={onEditAnomalyScore} style={{ flex: 1 }}>Fix score</button>
            <button className="btn-primary" type="button" onClick={onConfirmAnomaly} style={{ flex: 1 }}>Yes, that's correct</button>
          </div>
        </div>
      )}

      {match.status === 'in_progress' && (
        <div style={{ marginTop: '16px' }}>
          {!confirming ? (
            <button
              className="btn-primary"
              type="button"
              onClick={onRequestFinal}
              disabled={!canFinal}
              style={{ width: '100%', padding: '14px', fontSize: '15px' }}
            >
              Mark FINAL
            </button>
          ) : (
            <div style={{ border: '1px solid var(--line-strong)', borderRadius: '10px', padding: '14px' }}>
              <p style={{ fontWeight: 700, marginBottom: '4px' }}>Confirm final score?</p>
              <p className="helper-text" style={{ marginBottom: '12px' }}>
                {homeTeamName} {match.homeScore} — {match.awayScore} {awayTeamName}. This locks the score and advances the winner. It cannot be undone here.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn-secondary" type="button" onClick={onCancelConfirm} style={{ flex: 1 }}>Cancel</button>
                <button className="btn-primary" type="button" onClick={onConfirmFinal} style={{ flex: 1 }}>Confirm FINAL</button>
              </div>
            </div>
          )}
          {!canFinal && (
            <p className="helper-text" style={{ marginTop: '8px', textAlign: 'center' }}>
              {match.homeScore === match.awayScore ? 'Scores are tied — break the tie before marking final.' : 'Waiting on both teams to be set.'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function StatusPill({ status }: { status: MatchStatus }) {
  const map: Record<string, { label: string; color: string }> = {
    scheduled: { label: 'Not started', color: 'var(--ink-muted)' },
    in_progress: { label: 'In progress', color: 'var(--accent)' },
    pending_confirmation: { label: 'Needs review', color: 'var(--warn)' },
  }
  const cfg = map[status] || map.scheduled
  return (
    <span style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: cfg.color }}>
      {status === 'in_progress' && (
        <span style={{
          display: 'inline-block', width: '7px', height: '7px', borderRadius: '50%',
          background: 'var(--accent)', marginRight: '6px', animation: 'pulse 1.4s ease-in-out infinite',
        }} />
      )}
      {cfg.label}
    </span>
  )
}

function ScoreRow({ teamName, score, onSet, disabled }: {
  teamName: string; score: number; onSet: (value: number) => void; disabled: boolean
}) {
  // Local draft string so the field doesn't fight the user mid-keystroke
  // (e.g. clearing it to type "40" shouldn't snap back to "0" between
  // keypresses). Committed on blur or Enter, not on every keystroke.
  const [draft, setDraft] = useState<string | null>(null)
  const displayValue = draft !== null ? draft : String(score)

  function commit() {
    if (draft !== null && draft !== '') {
      onSet(Number(draft))
    }
    setDraft(null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 700, fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{teamName}</p>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          value={displayValue}
          disabled={disabled}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
          className="mono"
          style={{
            width: '110px', fontSize: '30px', fontWeight: 700, lineHeight: 1,
            padding: '2px 6px', border: '1px solid var(--line)', borderRadius: '8px', background: 'transparent',
            opacity: disabled ? 0.5 : 1,
          }}
        />
      </div>
    </div>
  )
}
