'use client'
import { useEffect, useRef, useState } from 'react'
import type { MatchRecord, TeamRecord, CourtRecord, VenueRecord } from '@/lib/eventData'

function TeamRow({ team, score, isWinner, isLive }: { team: TeamRecord | null; score: number; isWinner: boolean; isLive: boolean }) {
  const initial = team?.name?.[0]?.toUpperCase() || '?'
  const prevScore = useRef(score)
  const [justChanged, setJustChanged] = useState(false)

  useEffect(() => {
    if (prevScore.current !== score) {
      setJustChanged(true)
      const t = setTimeout(() => setJustChanged(false), 500)
      prevScore.current = score
      return () => clearTimeout(t)
    }
  }, [score])

  return (
    <div className={`flex items-center justify-between gap-3 px-3 py-2 ${isWinner ? 'bg-white/[0.04]' : ''}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        {/* No club logo data source exists yet in the schema — initial-avatar placeholder until that's added */}
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-base-700 text-[11px] font-bold text-white/70">
          {initial}
        </div>
        {team?.seed != null && (
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/60">
            #{team.seed}
          </span>
        )}
        <span className={`truncate text-sm ${isWinner ? 'font-bold text-white' : 'font-medium text-white/80'}`}>
          {team?.name || 'TBD'}
        </span>
      </div>
      <span
        className={`font-mono text-base tabular-nums ${isWinner ? 'font-bold text-electric-400' : 'text-white/60'} ${isLive ? 'text-runner-400' : ''} ${justChanged ? 'animate-[scoreFlash_0.5s_ease-out]' : ''}`}
      >
        {score}
      </span>
    </div>
  )
}

export default function ScoreboardCard({
  match, homeTeam, awayTeam, court, venue,
}: {
  match: MatchRecord
  homeTeam: TeamRecord | null
  awayTeam: TeamRecord | null
  court: CourtRecord | null
  venue: VenueRecord | null
}) {
  const isLive = match.status === 'in_progress'
  const isCompleted = match.status === 'completed'
  const homeWins = isCompleted && match.home_score > match.away_score
  const awayWins = isCompleted && match.away_score > match.home_score

  // One-shot pulse the instant a match transitions INTO in_progress — not
  // the persistent "Live" dot (that stays on the whole time), this is a
  // single ring-pulse on the card itself so a parent glancing at the
  // schedule notices the exact moment a match starts.
  const prevStatus = useRef(match.status)
  const [justWentLive, setJustWentLive] = useState(false)
  useEffect(() => {
    if (prevStatus.current !== 'in_progress' && match.status === 'in_progress') {
      setJustWentLive(true)
      const t = setTimeout(() => setJustWentLive(false), 1000)
      prevStatus.current = match.status
      return () => clearTimeout(t)
    }
    prevStatus.current = match.status
  }, [match.status])

  const time = match.start_time
    ? new Date(match.start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
    : 'TBD'

  return (
    <div
      className={`w-full min-w-[240px] overflow-hidden rounded-xl border border-white/10 bg-base-800/80 backdrop-blur-md shadow-lg shadow-black/20 transition-shadow duration-300 ${justWentLive ? 'animate-[goLivePulse_1s_ease-out]' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-runner-500 animate-pulseLive" />}
          <span className={`font-mono text-[10px] uppercase tracking-wide ${isLive ? 'text-runner-400' : 'text-white/45'}`}>
            {isLive ? 'Live' : match.status === 'pending_confirmation' ? 'Confirming' : isCompleted ? 'Final' : time}
          </span>
        </div>
        <span className="truncate font-mono text-[10px] text-white/45">
          {court ? `${court.name}${venue ? ` · ${venue.name}` : ''}` : ''}
        </span>
      </div>
      <TeamRow team={homeTeam} score={match.home_score} isWinner={homeWins} isLive={isLive} />
      <div className="h-px bg-white/5" />
      <TeamRow team={awayTeam} score={match.away_score} isWinner={awayWins} isLive={isLive} />
    </div>
  )
}
