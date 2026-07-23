'use client'
import { useMemo } from 'react'
import type { MatchRecord, TeamRecord, CourtRecord, VenueRecord } from '@/lib/eventData'
import ScoreboardCard from './ScoreboardCard'
import EmptyState from './EmptyState'

const CARD_WIDTH = 260
const CARD_HEIGHT = 92
const COLUMN_GAP = 72
const UNIT_HEIGHT = 116 // vertical spacing between adjacent round-1 matches

interface PositionedMatch {
  match: MatchRecord
  round: number
  position: number
  x: number
  y: number // top of card
  centerY: number
}

export default function BracketTree({
  matches, teamById, courtById, venueById,
}: {
  matches: MatchRecord[]
  teamById: Map<string, TeamRecord>
  courtById: Map<string, CourtRecord>
  venueById: Map<string, VenueRecord>
}) {
  const { positioned, width, height, duplicateWarning } = useMemo(() => {
    const rounds = [...new Set(matches.map(m => m.bracket_meta.round))].sort((a, b) => a - b)
    const minRound = rounds[0] ?? 1

    // Keyed by match.id (not round:position) so if the database ever has
    // two matches sharing the same round+position — which should never
    // happen, but silently did once due to a duplicate-generation bug —
    // this surfaces it instead of quietly dropping one of them.
    const byId = new Map<string, PositionedMatch>()
    const seenRoundPos = new Set<string>()
    let duplicateWarning = false
    let maxY = 0

    for (const m of matches) {
      const r = m.bracket_meta.round
      const p = m.bracket_meta.position
      const roundPosKey = `${r}:${p}`
      if (seenRoundPos.has(roundPosKey)) duplicateWarning = true
      seenRoundPos.add(roundPosKey)

      const roundIndexFromLeaf = r - minRound
      const spanUnits = Math.pow(2, roundIndexFromLeaf)
      const centerY = (p + 0.5) * spanUnits * UNIT_HEIGHT
      const y = centerY - CARD_HEIGHT / 2
      const x = roundIndexFromLeaf * (CARD_WIDTH + COLUMN_GAP)
      byId.set(m.id, { match: m, round: r, position: p, x, y, centerY })
      maxY = Math.max(maxY, y + CARD_HEIGHT)
    }

    const maxRoundIndex = rounds.length - 1
    const width = (maxRoundIndex + 1) * CARD_WIDTH + maxRoundIndex * COLUMN_GAP
    return { positioned: [...byId.values()], width, height: maxY + 24, duplicateWarning }
  }, [matches])

  const connectors = useMemo(() => {
    const byId = new Map(positioned.map(p => [p.match.id, p]))
    const paths: { d: string; live: boolean }[] = []
    for (const p of positioned) {
      const nextId = p.match.bracket_meta.nextMatchId || p.match.bracket_meta.next_match_id
      if (!nextId) continue
      const target = byId.get(nextId)
      if (!target) continue

      const x1 = p.x + CARD_WIDTH
      const y1 = p.centerY
      const x2 = target.x
      const y2 = target.centerY
      const midX = (x1 + x2) / 2
      const d = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`
      paths.push({ d, live: p.match.status === 'completed' })
    }
    return paths
  }, [positioned])

  const rounds = [...new Set(matches.map(m => m.bracket_meta.round))].sort((a, b) => a - b)

  if (positioned.length === 0) {
    return <EmptyState icon="🗓️" title="No bracket matches yet" body="The bracket will appear here once pool play wraps and the director resolves standings." />
  }

  return (
    <div className="animate-[fadeInUp_0.3s_ease-out] overflow-x-auto pb-6">
      {duplicateWarning && (
        <div className="mb-4 rounded-lg border border-runner-500/40 bg-runner-500/10 px-4 py-2 text-sm text-runner-400">
          ⚠️ This bracket has more than one match at the same round/position — likely duplicate data from resolving twice. Cards below may overlap incorrectly.
        </div>
      )}
      <div className="relative" style={{ width, height }}>
        <svg width={width} height={height} className="absolute left-0 top-0 pointer-events-none" style={{ overflow: 'visible' }}>
          {connectors.map((c, i) => (
            <path
              key={i}
              d={c.d}
              fill="none"
              stroke={c.live ? 'rgba(14,165,233,0.55)' : 'rgba(255,255,255,0.12)'}
              strokeWidth={c.live ? 2 : 1.5}
            />
          ))}
        </svg>

        {rounds.map((r, i) => (
          <div
            key={r}
            className="absolute font-mono text-[11px] uppercase tracking-wide text-white/40"
            style={{ left: i * (CARD_WIDTH + COLUMN_GAP), top: -28, width: CARD_WIDTH }}
          >
            {i === rounds.length - 1 ? 'Final' : i === rounds.length - 2 ? 'Semifinal' : `Round ${i + 1}`}
          </div>
        ))}

        {positioned.map(p => {
          const isFinalRound = p.round === rounds[rounds.length - 1]
          const isChampionMatch = isFinalRound && p.match.status === 'completed' && p.match.home_score !== p.match.away_score
          const championId = isChampionMatch
            ? (p.match.home_score > p.match.away_score ? p.match.home_team_id : p.match.away_team_id)
            : null

          return (
            <div key={p.match.id} className="absolute" style={{ left: p.x, top: p.y, width: CARD_WIDTH }}>
              <ScoreboardCard
                match={p.match}
                homeTeam={teamById.get(p.match.home_team_id || '') || null}
                awayTeam={teamById.get(p.match.away_team_id || '') || null}
                court={courtById.get(p.match.court_id || '') || null}
                venue={(() => {
                  const c = courtById.get(p.match.court_id || '')
                  return c ? venueById.get(c.venue_id) || null : null
                })()}
              />
              {championId && (
                <div className="mt-2 flex items-center justify-center gap-1.5 rounded-lg border border-runner-500/30 bg-runner-500/10 py-1.5">
                  <span className="text-xs">🏆</span>
                  <span className="font-mono text-[10px] uppercase tracking-wide text-runner-400">Champion</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
