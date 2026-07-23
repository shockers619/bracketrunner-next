'use client'
import { useState, useEffect, useCallback } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'
import { computeStandings, type TiebreakStep } from '@/lib/engine/standings'
import type { Team, Match } from '@/lib/engine/types'
import Select from '@/components/admin/Select'

type MatchStatus = 'scheduled' | 'in_progress' | 'pending_confirmation' | 'completed' | 'cancelled'

interface MatchRow {
  id: string
  divisionId: string
  divisionName: string
  homeTeamId: string | null
  awayTeamId: string | null
  homeScore: number
  awayScore: number
  status: MatchStatus
  bracketMeta: Match['bracketMeta']
}

interface AuditLogRow {
  id: string
  actor_id: string
  target_match_id: string | null
  action_type: string
  previous_state: Record<string, unknown> | null
  new_state: Record<string, unknown> | null
  reason_code: string
  created_at: string
}

const REASON_OPTIONS = [
  'Scorekeeper Data Entry Error',
  'Team Forfeit',
  'Injury / Medical',
  'Weather / Schedule Change',
  'Director Discretion',
  'Other',
]

// Pending action awaiting reason-code confirmation. Nothing is sent to the
// server until the modal's Confirm is pressed — this object IS the "are
// you sure" state.
type PendingAction =
  | { kind: 'score_correction'; matchId: string; homeScore: number; awayScore: number; label: string }
  | { kind: 'match_reset'; matchId: string; targetStatus: 'scheduled' | 'in_progress'; label: string }
  | { kind: 'force_advance'; matchId: string; slot: 'home' | 'away'; teamId: string | null; label: string }

export default function OverridesPage({ params }: { params: { eventId: string } }) {
  const { ready, tenantId } = useAuthTenant()
  const [isDirector, setIsDirector] = useState<boolean | null>(null)
  const [eventTitle, setEventTitle] = useState('')
  const [matches, setMatches] = useState<MatchRow[]>([])
  const [teamsById, setTeamsById] = useState<Record<string, string>>({})
  const [teamsByDivision, setTeamsByDivision] = useState<Record<string, { id: string; name: string }[]>>({})
  const [divisions, setDivisions] = useState<{ id: string; name: string }[]>([])
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [pending, setPending] = useState<PendingAction | null>(null)

  const [tiebreakDivisionId, setTiebreakDivisionId] = useState<string>('')

  const load = useCallback(async () => {
    const { data: event } = await supabase.from('events').select('id, title').eq('id', params.eventId).single()
    setEventTitle(event?.title || '')

    const { data: divisionRows } = await supabase.from('divisions').select('id, name').eq('event_id', params.eventId)
    setDivisions(divisionRows || [])

    const divisionIds = (divisionRows || []).map(d => d.id)
    const { data: teamRows } = divisionIds.length
      ? await supabase.from('teams').select('id, name, division_id').in('division_id', divisionIds)
      : { data: [] as { id: string; name: string; division_id: string }[] }
    setTeamsById(Object.fromEntries((teamRows || []).map(t => [t.id, t.name])))
    const byDivision: Record<string, { id: string; name: string }[]> = {}
    for (const t of teamRows || []) {
      ;(byDivision[t.division_id] ||= []).push({ id: t.id, name: t.name })
    }
    setTeamsByDivision(byDivision)

    const divisionNameById = Object.fromEntries((divisionRows || []).map(d => [d.id, d.name]))
    const { data: matchRows } = await supabase
      .from('matches')
      .select('id, division_id, home_team_id, away_team_id, home_score, away_score, status, bracket_meta')
      .eq('event_id', params.eventId)
    setMatches(
      (matchRows || [])
        .filter(m => !m.bracket_meta?.poolId) // overrides target bracket matches, not raw pool games
        .map(m => ({
          id: m.id,
          divisionId: m.division_id,
          divisionName: divisionNameById[m.division_id] || '',
          homeTeamId: m.home_team_id,
          awayTeamId: m.away_team_id,
          homeScore: m.home_score,
          awayScore: m.away_score,
          status: m.status,
          bracketMeta: m.bracket_meta,
        }))
    )

    const { data: logRows } = await supabase
      .from('audit_logs')
      .select('id, actor_id, target_match_id, action_type, previous_state, new_state, reason_code, created_at')
      .eq('event_id', params.eventId)
      .order('created_at', { ascending: false })
      .limit(100)
    setAuditLogs(logRows || [])

    setLoading(false)
  }, [params.eventId])

  // Separate effect for picking a default tiebreak division, so setting it
  // doesn't change load()'s identity and re-trigger the effect that calls
  // load() — that coupling caused load() to be invoked a second time,
  // overlapping with the first still-in-flight call, every single page
  // visit. Two concurrent fetches racing each other against the same
  // tables is exactly the kind of thing that produces inconsistent,
  // hard-to-reproduce results.
  useEffect(() => {
    if (divisions.length && !tiebreakDivisionId) setTiebreakDivisionId(divisions[0].id)
  }, [divisions, tiebreakDivisionId])

  useEffect(() => {
    if (!ready || !tenantId) return
    async function checkRole() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: membership } = await supabase
        .from('tenant_members')
        .select('role')
        .eq('tenant_id', tenantId)
        .eq('user_id', user.id)
        .maybeSingle()
      setIsDirector(membership?.role === 'director')
    }
    checkRole()
    load()
  }, [ready, tenantId, load])

  // Live audit feed — same postgres_changes pattern as the public bracket
  // page's realtime hook, scoped to this event's audit_logs rows.
  useEffect(() => {
    const channel = supabase
      .channel(`event-${params.eventId}-audit`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'audit_logs', filter: `event_id=eq.${params.eventId}` },
        payload => setAuditLogs(prev => {
          const row = payload.new as AuditLogRow
          // load() (called after every successful override) can win the
          // race against this websocket event and already include the
          // same row — without this check, both paths add it and the
          // same override shows up twice in the feed.
          if (prev.some(l => l.id === row.id)) return prev
          return [row, ...prev]
        })
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [params.eventId])

  // Reason-code state lives here (not inside the modal component) so
  // submitPending can read it without prop-drilling a setter chain.
  //
  // Kept as two SEPARATE pieces of state on purpose — reasonChoice (the
  // select's own value: one of the fixed options, 'Other', or '') and
  // reasonOtherText (the free-text box, only meaningful when reasonChoice
  // is 'Other'). The final string sent to the server is derived from both.
  // A previous version tried to collapse these into one variable and it
  // broke "Other" entirely: picking "Other" set the single variable to an
  // empty string, which made the controlled <select> immediately snap back
  // to "Select a reason…" and the text box never appeared — a real bug,
  // not a UI fluke.
  const [reasonChoice, setReasonChoice] = useState('')
  const [reasonOtherText, setReasonOtherText] = useState('')
  const isOther = reasonChoice === 'Other'
  const finalReason = isOther ? reasonOtherText.trim() : reasonChoice

  function resetReasonState() {
    setReasonChoice('')
    setReasonOtherText('')
  }

  async function submitPending() {
    if (!pending) return
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('No session')

      const body =
        pending.kind === 'score_correction'
          ? { type: 'score_correction', matchId: pending.matchId, homeScore: pending.homeScore, awayScore: pending.awayScore, reasonCode: finalReason }
          : pending.kind === 'match_reset'
            ? { type: 'match_reset', matchId: pending.matchId, targetStatus: pending.targetStatus, reasonCode: finalReason }
            : { type: 'force_advance', matchId: pending.matchId, slot: pending.slot, teamId: pending.teamId, reasonCode: finalReason }

      const res = await fetch('/api/admin/overrides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`)

      setPending(null)
      resetReasonState()
      await load()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (!ready || loading) {
    return <div style={{ maxWidth: '720px', margin: '80px auto', padding: '0 24px' }}><p className="helper-text">Loading…</p></div>
  }

  if (isDirector === false) {
    return (
      <div style={{ maxWidth: '520px', margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="error-banner">Only a tournament director can access overrides for this event.</p>
      </div>
    )
  }

  const selectedMatch = matches.find(m => m.id === selectedMatchId) || null

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '32px 20px 80px' }}>
      <p style={{ fontSize: '11px', color: 'var(--ink-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Director Overrides</p>
      <h1 style={{ fontSize: '22px', marginBottom: '24px' }}>{eventTitle}</h1>

      {error && <div className="error-banner" style={{ marginBottom: '20px' }}>{error}</div>}

      {/* --- Match picker + override tools --- */}
      <section className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Score &amp; match override tools</h2>
        <Select
          value={selectedMatchId}
          onChange={setSelectedMatchId}
          placeholder="Select a bracket match…"
          options={matches.map(m => ({
            value: m.id,
            label: `${m.divisionName}: ${m.homeTeamId ? teamsById[m.homeTeamId] : 'TBD'} vs ${m.awayTeamId ? teamsById[m.awayTeamId] : 'TBD'} (${m.status})`,
          }))}
        />
        <div style={{ marginBottom: '16px' }} />

        {selectedMatch && (
          <OverrideTools
            match={selectedMatch}
            teamsById={teamsById}
            divisionTeams={teamsByDivision[selectedMatch.divisionId] || []}
            onRequestAction={setPending}
          />
        )}
      </section>

      {/* --- Tiebreak explanation drawer --- */}
      <section className="card" style={{ padding: '20px', marginBottom: '24px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Why is this team seeded here?</h2>
        <Select
          value={tiebreakDivisionId}
          onChange={setTiebreakDivisionId}
          options={divisions.map(d => ({ value: d.id, label: d.name }))}
        />
        <div style={{ marginBottom: '16px' }} />
        {tiebreakDivisionId && <TiebreakDrawer divisionId={tiebreakDivisionId} teamsById={teamsById} />}
      </section>

      {/* --- Audit trail --- */}
      <section className="card" style={{ padding: '20px' }}>
        <h2 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '12px' }}>Audit trail</h2>
        {auditLogs.length === 0 && <p className="helper-text">No overrides recorded for this event yet.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {auditLogs.map(log => <AuditLogItem key={log.id} log={log} matches={matches} teamsById={teamsById} />)}
        </div>
      </section>

      {/* --- Reason-code confirmation modal --- */}
      {pending && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, animation: 'fadeInUp 0.15s ease-out' }}>
          <div className="card" style={{ padding: '24px', maxWidth: '420px', width: '90%', animation: 'modalIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>Confirm override</h3>
            <p className="helper-text" style={{ marginBottom: '16px' }}>{pending.label}</p>

            <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Reason (required)</label>
            <Select
              value={reasonChoice}
              onChange={setReasonChoice}
              placeholder="Select a reason…"
              options={REASON_OPTIONS.map(r => ({ value: r, label: r }))}
            />
            <div style={{ marginBottom: '10px' }} />
            {isOther && (
              <input
                type="text"
                placeholder="Describe the reason…"
                value={reasonOtherText}
                onChange={e => setReasonOtherText(e.target.value)}
                style={{ width: '100%', padding: '10px', fontSize: '13px', marginBottom: '10px' }}
                autoFocus
              />
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              <button className="btn-secondary" type="button" style={{ flex: 1 }} onClick={() => { setPending(null); resetReasonState() }} disabled={busy}>
                Cancel
              </button>
              <button
                className="btn-primary"
                type="button"
                style={{ flex: 1 }}
                disabled={busy || !finalReason.trim()}
                onClick={submitPending}
              >
                {busy ? 'Submitting…' : 'Confirm override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function OverrideTools({ match, teamsById, divisionTeams, onRequestAction }: {
  match: MatchRow
  teamsById: Record<string, string>
  divisionTeams: { id: string; name: string }[]
  onRequestAction: (action: PendingAction) => void
}) {
  const [homeScore, setHomeScore] = useState(String(match.homeScore))
  const [awayScore, setAwayScore] = useState(String(match.awayScore))
  const [slot, setSlot] = useState<'home' | 'away'>('home')
  const [forceTeamId, setForceTeamId] = useState('')

  useEffect(() => { setHomeScore(String(match.homeScore)); setAwayScore(String(match.awayScore)) }, [match.id, match.homeScore, match.awayScore])

  const homeName = match.homeTeamId ? teamsById[match.homeTeamId] : 'TBD'
  const awayName = match.awayTeamId ? teamsById[match.awayTeamId] : 'TBD'

  return (
    <div style={{ borderTop: '1px solid var(--line)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <p className="helper-text" style={{ marginBottom: '10px' }}>
          Current: {homeName} {match.homeScore} — {match.awayScore} {awayName} · status: {match.status}
        </p>
      </div>

      {/* Score correction */}
      <div>
        <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>Correct score</p>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <input type="number" value={homeScore} onChange={e => setHomeScore(e.target.value)} style={{ width: '70px', padding: '8px' }} />
          <span className="helper-text">vs</span>
          <input type="number" value={awayScore} onChange={e => setAwayScore(e.target.value)} style={{ width: '70px', padding: '8px' }} />
          <button
            className="btn-secondary"
            type="button"
            disabled={match.status !== 'in_progress' && match.status !== 'completed' && match.status !== 'pending_confirmation'}
            onClick={() => onRequestAction({
              kind: 'score_correction',
              matchId: match.id,
              homeScore: Number(homeScore),
              awayScore: Number(awayScore),
              label: `Change ${homeName} vs ${awayName} from ${match.homeScore}-${match.awayScore} to ${homeScore}-${awayScore}.`,
            })}
          >
            Submit correction
          </button>
        </div>
      </div>

      {/* Match reset */}
      {(match.status === 'completed' || match.status === 'pending_confirmation') && (
        <div>
          <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>Reset match</p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onRequestAction({
                kind: 'match_reset', matchId: match.id, targetStatus: 'in_progress',
                label: `Revert ${homeName} vs ${awayName} to In Progress, keeping the current score for correction.`,
              })}
            >
              Revert to In Progress
            </button>
            <button
              className="btn-secondary"
              type="button"
              onClick={() => onRequestAction({
                kind: 'match_reset', matchId: match.id, targetStatus: 'scheduled',
                label: `Revert ${homeName} vs ${awayName} to Not Started and clear its score.`,
              })}
            >
              Revert to Not Started
            </button>
          </div>
        </div>
      )}

      {/* Force-advance */}
      <div>
        <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '4px' }}>Force-advance a team into this match</p>
        <p className="helper-text" style={{ marginBottom: '8px' }}>For forfeits, injuries, or other operational overrides — bypasses normal advancement.</p>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <div style={{ width: '140px' }}>
            <Select
              value={slot}
              onChange={v => setSlot(v as 'home' | 'away')}
              options={[{ value: 'home', label: 'Home slot' }, { value: 'away', label: 'Away slot' }]}
            />
          </div>
          <div style={{ flex: 1, minWidth: '160px' }}>
            <Select
              value={forceTeamId}
              onChange={setForceTeamId}
              placeholder="Select team…"
              options={divisionTeams.map(t => ({ value: t.id, label: t.name }))}
            />
          </div>
          <button
            className="btn-secondary"
            type="button"
            disabled={!forceTeamId}
            onClick={() => onRequestAction({
              kind: 'force_advance',
              matchId: match.id,
              slot,
              teamId: forceTeamId,
              label: `Force ${teamsById[forceTeamId]} into the ${slot} slot of ${homeName} vs ${awayName}.`,
            })}
          >
            Force-advance
          </button>
        </div>
      </div>
    </div>
  )
}

function AuditLogItem({ log, matches, teamsById }: {
  log: AuditLogRow
  matches: MatchRow[]
  teamsById: Record<string, string>
}) {
  const match = matches.find(m => m.id === log.target_match_id)
  const matchLabel = match
    ? `${match.homeTeamId ? teamsById[match.homeTeamId] : 'TBD'} vs ${match.awayTeamId ? teamsById[match.awayTeamId] : 'TBD'}`
    : 'a match'
  const time = new Date(log.created_at).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' })

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginBottom: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--accent)' }}>{log.action_type.replace(/_/g, ' ')}</span>
        <span className="helper-text" style={{ fontSize: '11px' }}>{time}</span>
      </div>
      <p style={{ fontSize: '13px', marginBottom: '4px' }}>{matchLabel}</p>
      <DiffLine previous={log.previous_state} next={log.new_state} />
      <p className="helper-text" style={{ fontSize: '12px', marginTop: '4px' }}>Reason: {log.reason_code}</p>
      {/* Actor is shown as a short ID, not an email/name — this app has no
         profiles table mirroring auth.users yet, so there's no RLS-safe
         way to resolve actor_id to a display name from the client. A real
         `profiles(id, email, display_name)` table synced via a trigger on
         auth.users is the fix; noting it rather than faking a name here. */}
      <p className="helper-text" style={{ fontSize: '11px' }}>Actor: {log.actor_id.slice(0, 8)}…</p>
    </div>
  )
}

function DiffLine({ previous, next }: { previous: Record<string, unknown> | null; next: Record<string, unknown> | null }) {
  if (!previous && !next) return null
  const format = (s: Record<string, unknown> | null) => {
    if (!s) return '—'
    if ('homeScore' in s || 'awayScore' in s) return `${s.homeScore ?? '?'}-${s.awayScore ?? '?'} (${s.status ?? '?'})`
    if ('homeTeamId' in s) return s.homeTeamId ? String(s.homeTeamId).slice(0, 8) : 'empty'
    if ('awayTeamId' in s) return s.awayTeamId ? String(s.awayTeamId).slice(0, 8) : 'empty'
    return JSON.stringify(s)
  }
  return <p className="helper-text" style={{ fontSize: '12px' }}>{format(previous)} → {format(next)}</p>
}

function TiebreakDrawer({ divisionId, teamsById }: { divisionId: string; teamsById: Record<string, string> }) {
  const [pools, setPools] = useState<{ id: string; name: string }[]>([])
  const [results, setResults] = useState<Record<string, { standings: ReturnType<typeof computeStandings>['standings']; tiebreakLog: TiebreakStep[] }>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data: poolRows } = await supabase.from('pools').select('id, name').eq('division_id', divisionId)
      const { data: poolTeamRows } = poolRows?.length
        ? await supabase.from('pool_teams').select('pool_id, team_id, teams(id, name, seed)').in('pool_id', poolRows.map(p => p.id))
        : { data: [] as { pool_id: string; team_id: string; teams: unknown }[] }
      const { data: matchRows } = await supabase
        .from('matches')
        .select('id, division_id, court_id, home_team_id, away_team_id, start_time, duration_minutes, home_score, away_score, status, bracket_meta')
        .eq('division_id', divisionId)
        .not('bracket_meta->>poolId', 'is', null)

      const poolMatches: Match[] = (matchRows || []).map(m => ({
        id: m.id, divisionId: m.division_id, courtId: m.court_id, homeTeamId: m.home_team_id, awayTeamId: m.away_team_id,
        startTime: m.start_time, durationMinutes: m.duration_minutes, homeScore: m.home_score, awayScore: m.away_score,
        status: m.status, bracketMeta: m.bracket_meta,
      }))

      const next: Record<string, { standings: ReturnType<typeof computeStandings>['standings']; tiebreakLog: TiebreakStep[] }> = {}
      for (const pool of poolRows || []) {
        const poolTeams: Team[] = (poolTeamRows || [])
          .filter(pt => pt.pool_id === pool.id)
          .map(pt => {
            const t = pt.teams as unknown as { id: string; name: string; seed: number | null }
            return { id: t.id, name: t.name, seed: t.seed ?? 1 }
          })
        const poolOnlyMatches = poolMatches.filter(m => m.bracketMeta.poolId === pool.id)
        const result = computeStandings(poolTeams, poolOnlyMatches)
        next[pool.id] = result
      }
      if (!cancelled) { setPools(poolRows || []); setResults(next); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [divisionId])

  if (loading) return <p className="helper-text">Loading standings…</p>
  if (pools.length === 0) return <p className="helper-text">This division has no pools.</p>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {pools.map(pool => {
        const result = results[pool.id]
        if (!result) return null
        return (
          <div key={pool.id}>
            <p style={{ fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>{pool.name}</p>
            <ol style={{ fontSize: '13px', marginBottom: '8px', paddingLeft: '20px' }}>
              {result.standings.map(row => (
                <li key={row.teamId}>
                  {teamsById[row.teamId] || row.teamId} — {row.wins}-{row.losses}, diff {row.pointDifferential > 0 ? '+' : ''}{row.pointDifferential}
                </li>
              ))}
            </ol>
            {result.tiebreakLog.length > 0 ? (
              <ul style={{ fontSize: '12px', color: 'var(--ink-muted)', paddingLeft: '20px' }}>
                {result.tiebreakLog.map((step, i) => (
                  <li key={i}>
                    {step.teamIds.map(id => teamsById[id] || id).join(' vs ')} separated by {step.method.replace(/_/g, ' ')}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="helper-text" style={{ fontSize: '12px' }}>No ties needed breaking — win/loss record alone determined seeding.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
