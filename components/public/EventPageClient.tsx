'use client'
import { useMemo, useState } from 'react'
import type { EventPageData } from '@/lib/eventData'
import { useLiveMatches } from '@/lib/useLiveMatches'
import ScoreboardCard from './ScoreboardCard'
import BracketTree from './BracketTree'
import EmptyState from './EmptyState'

// Always renders at the same size regardless of connection state — the
// earlier version returned null while "connecting", which meant the pill
// popped into existence a moment after page load and pushed every filter
// control to its right. Reserving the same footprint in all three states
// is what actually delivers "zero layout shift," not just fewer pixels.
function LiveIndicator({ status }: { status: 'connecting' | 'live' | 'disconnected' }) {
  const config = {
    connecting: { label: 'Connecting', dot: 'bg-white/30', text: 'text-white/40', ring: 'border-white/10 bg-white/5' },
    live: { label: 'Live', dot: 'bg-runner-500 animate-pulseLive', text: 'text-runner-400', ring: 'border-runner-500/30 bg-runner-500/10' },
    disconnected: { label: 'Reconnecting', dot: 'bg-white/30', text: 'text-white/40', ring: 'border-white/10 bg-white/5' },
  }[status]

  return (
    <span className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide ${config.ring} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}

export default function EventPageClient({ data }: { data: EventPageData }) {
  const { divisions, teams, courts, venues } = data
  const { matches, status: liveStatus } = useLiveMatches(data.event.id, data.matches)

  const [divisionId, setDivisionId] = useState<string>(divisions[0]?.id || '')
  const [courtId, setCourtId] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [view, setView] = useState<'schedule' | 'bracket'>('schedule')

  const teamById = useMemo(() => new Map(teams.map(t => [t.id, t])), [teams])
  const courtById = useMemo(() => new Map(courts.map(c => [c.id, c])), [courts])
  const venueById = useMemo(() => new Map(venues.map(v => [v.id, v])), [venues])

  const activeDivision = divisions.find(d => d.id === divisionId)
  const hasBracketPhase = activeDivision && activeDivision.format !== 'round_robin'

  const filteredMatches = useMemo(() => {
    return matches.filter(m => {
      if (m.division_id !== divisionId) return false
      if (courtId !== 'all' && m.court_id !== courtId) return false
      if (search.trim()) {
        const home = teamById.get(m.home_team_id || '')?.name?.toLowerCase() || ''
        const away = teamById.get(m.away_team_id || '')?.name?.toLowerCase() || ''
        if (!home.includes(search.toLowerCase()) && !away.includes(search.toLowerCase())) return false
      }
      return true
    })
  }, [matches, divisionId, courtId, search, teamById])

  const scheduleMatches = useMemo(
    () => [...filteredMatches].sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
    [filteredMatches]
  )

  const bracketMatches = useMemo(
    () => filteredMatches.filter(m => !m.bracket_meta?.poolId && !m.bracket_meta?.pool_id),
    [filteredMatches]
  )

  return (
    <div className="min-h-screen bg-base-950 text-white">
      {/* sticky filter bar — wraps on narrow viewports instead of forcing a
         horizontal scroll-to-discover row, which is the "clunky" pattern
         we're deliberately avoiding here */}
      <div className="sticky top-0 z-20 border-b border-white/10 bg-base-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-5 py-3 sm:px-8">
          <LiveIndicator status={liveStatus} />
          <select
            value={divisionId}
            onChange={e => setDivisionId(e.target.value)}
            className="rounded-lg border border-white/10 bg-base-800 px-3 py-1.5 text-sm text-white transition-colors focus:border-electric-500 focus:outline-none"
          >
            {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>

          <select
            value={courtId}
            onChange={e => setCourtId(e.target.value)}
            className="rounded-lg border border-white/10 bg-base-800 px-3 py-1.5 text-sm text-white transition-colors focus:border-electric-500 focus:outline-none"
          >
            <option value="all">All Courts</option>
            {courts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search team..."
            className="order-last min-w-[140px] flex-1 basis-full rounded-lg border border-white/10 bg-base-800 px-3 py-1.5 text-sm text-white placeholder:text-white/30 transition-colors focus:border-electric-500 focus:outline-none sm:order-none sm:basis-auto"
          />

          {hasBracketPhase && (
            <div className="flex shrink-0 rounded-lg border border-white/10 bg-base-800 p-0.5">
              {(['schedule', 'bracket'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold capitalize transition-all duration-150 active:scale-95 ${
                    view === v ? 'bg-electric-500 text-base-950' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-8">
        {divisions.length === 0 && (
          <EmptyState icon="🏆" title="No divisions yet" body="Once the director sets up divisions for this event, they'll show up here." />
        )}

        {divisions.length > 0 && (view === 'schedule' || !hasBracketPhase) && (
          <div className="flex flex-col gap-3">
            {scheduleMatches.length === 0 && (
              <EmptyState
                icon="🔍"
                title="No matches match these filters"
                body={search.trim() ? `Nothing found for "${search}" — try a different team name or court.` : 'Try a different court, or check back once matches are scheduled.'}
              />
            )}
            {scheduleMatches.map(m => (
              <ScoreboardCard
                key={m.id}
                match={m}
                homeTeam={teamById.get(m.home_team_id || '') || null}
                awayTeam={teamById.get(m.away_team_id || '') || null}
                court={courtById.get(m.court_id || '') || null}
                venue={(() => {
                  const c = courtById.get(m.court_id || '')
                  return c ? venueById.get(c.venue_id) || null : null
                })()}
              />
            ))}
          </div>
        )}

        {divisions.length > 0 && view === 'bracket' && hasBracketPhase && (
          <BracketTree
            matches={bracketMatches}
            teamById={teamById}
            courtById={courtById}
            venueById={venueById}
          />
        )}
      </div>
    </div>
  )
}
