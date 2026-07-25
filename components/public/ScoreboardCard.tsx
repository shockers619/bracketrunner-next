'use client'
import { useEffect, useRef, useState } from 'react'
import type { MatchRecord, TeamRecord, CourtRecord, VenueRecord } from '@/lib/eventData'
import { formatVenueTime } from '@/lib/engine/scheduleInputs'

function TeamRow({
  team, score, emphasize, isLive, showScore,
}: {
  team: TeamRecord | null
  score: number
  emphasize: boolean
  isLive: boolean
  showScore: boolean
}) {
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

  // Live games color the score orange (leader brighter); completed games use
  // the electric accent on the winner; not-yet-played games show a muted dash.
  const scoreColor = !showScore
    ? 'text-white/25'
    : isLive
      ? emphasize ? 'text-runner-400' : 'text-white/65'
      : emphasize ? 'text-electric-400' : 'text-white/45'

  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${emphasize ? 'bg-white/[0.045]' : ''}`}>
      <div className="flex min-w-0 items-center gap-2.5">
        {/* No club-logo source in the schema yet — initial-avatar placeholder */}
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-base-700 text-xs font-bold text-white/75">
          {initial}
        </div>
        {team?.seed != null && (
          <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-white/55">
            #{team.seed}
          </span>
        )}
        <span className={`truncate text-[15px] ${emphasize ? 'font-bold text-white' : 'font-medium text-white/85'}`}>
          {team?.name || 'TBD'}
        </span>
      </div>
      <span
        className={`font-mono text-2xl font-bold tabular-nums tracking-tight ${scoreColor} ${justChanged ? 'animate-[scoreFlash_0.5s_ease-out]' : ''}`}
      >
        {showScore ? score : '–'}
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
  const isPending = match.status === 'pending_confirmation'
  // A scheduled game has no meaningful score yet — show a dash, not "0", so the
  // calm/pre-event state reads as intentional rather than empty.
  const showScore = isLive || isCompleted || isPending

  const homeTop = (isCompleted || isLive) && match.home_score > match.away_score
  const awayTop = (isCompleted || isLive) && match.away_score > match.home_score

  // One-shot ring-pulse the instant a match transitions INTO in_progress, so a
  // parent glancing at the feed catches the exact moment a game tips off.
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

  // Venue-local wall clock, NOT the viewer's timezone — a 9am game in
  // Pennsylvania reads as 9am to a grandparent watching from Portland.
  const time = formatVenueTime(match.start_time)
  const statusLabel = isLive ? 'Live' : isPending ? 'Confirming' : isCompleted ? 'Final' : time
  const statusColor = isLive ? 'text-runner-400' : isCompleted ? 'text-electric-400/90' : 'text-white/45'

  // The live card is the hero: an orange accent ring, a soft glow, and a faint
  // tint lift it above the calmer scheduled/final cards around it.
  const wrapCls = isLive
    ? 'border-runner-500/30 bg-gradient-to-b from-runner-500/[0.07] to-base-800/80 shadow-[0_18px_44px_-24px_rgba(249,115,22,0.5)] ring-1 ring-runner-500/10'
    : 'border-white/10 bg-base-800/75 shadow-lg shadow-black/20'

  return (
    <div
      className={`w-full min-w-[240px] overflow-hidden rounded-2xl border backdrop-blur-md transition-all duration-300 ${wrapCls} ${justWentLive ? 'animate-[goLivePulse_1s_ease-out]' : ''}`}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-3.5 py-2">
        <span className={`flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] ${statusColor}`}>
          {isLive && <span className="h-1.5 w-1.5 rounded-full bg-runner-500 animate-pulseLive" />}
          {statusLabel}
        </span>
        <span className="truncate font-mono text-[10px] uppercase tracking-wide text-white/40">
          {court ? `${court.name}${venue ? ` · ${venue.name}` : ''}` : ''}
        </span>
      </div>
      <TeamRow team={homeTeam} score={match.home_score} emphasize={homeTop} isLive={isLive} showScore={showScore} />
      <div className="h-px bg-white/5" />
      <TeamRow team={awayTeam} score={match.away_score} emphasize={awayTop} isLive={isLive} showScore={showScore} />
    </div>
  )
}
