import type { Team, Match } from './types'

export interface StandingsRow {
  teamId: string
  wins: number
  losses: number
  pointsFor: number
  pointsAgainst: number
  pointDifferential: number
}

export interface TiebreakStep {
  teamIds: string[]
  method: 'win_pct' | 'head_to_head' | 'point_differential' | 'points_allowed' | 'points_scored' | 'manual_override' | 'deterministic'
}

export interface StandingsResult {
  standings: StandingsRow[]
  /** Ordered log of which method broke each tie, for transparency/debugging —
   *  useful when a director or coach asks "why is X ranked above Y". */
  tiebreakLog: TiebreakStep[]
}

/** A director-specified resolution for a specific tied group, used as the
 *  last resort before falling back to a deterministic (but arbitrary)
 *  team-id sort. Deliberately NOT a random "coin flip" — a true random
 *  tiebreak would make results non-reproducible and untestable, so instead
 *  directors get an explicit manual-override mechanism (God-Mode territory,
 *  same audit-logged pattern as other manual overrides elsewhere). */
export interface ManualOverride {
  teamIds: string[]        // the tied group this override applies to (order-independent match)
  orderedIds: string[]     // director's chosen order, best to worst
}

export interface StandingsOptions {
  /** Caps the point differential contribution of any single game, e.g. 15
   *  means a 40-point win only contributes +15 toward differential — this
   *  discourages running up the score for tiebreaker advantage. Uncapped
   *  by default (undefined = no cap), matching prior behavior exactly. */
  pointDifferentialCap?: number
  manualOverrides?: ManualOverride[]
}

function gameDifferential(pointsFor: number, pointsAgainst: number, cap?: number): number {
  const diff = pointsFor - pointsAgainst
  if (cap == null) return diff
  return Math.max(-cap, Math.min(cap, diff))
}

function baseRecord(teamIds: string[], matches: Match[], cap?: number): Map<string, StandingsRow> {
  const rows = new Map<string, StandingsRow>()
  for (const id of teamIds) {
    rows.set(id, { teamId: id, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, pointDifferential: 0 })
  }
  for (const m of matches) {
    if (m.status !== 'completed' || !m.homeTeamId || !m.awayTeamId) continue
    const home = rows.get(m.homeTeamId)
    const away = rows.get(m.awayTeamId)
    if (!home || !away) continue // match involves a team outside this pool

    // pointsFor/pointsAgainst stay uncapped (real totals) — only the
    // DIFFERENTIAL used for tiebreaking is capped, per game, then summed.
    home.pointsFor += m.homeScore
    home.pointsAgainst += m.awayScore
    away.pointsFor += m.awayScore
    away.pointsAgainst += m.homeScore

    home.pointDifferential += gameDifferential(m.homeScore, m.awayScore, cap)
    away.pointDifferential += gameDifferential(m.awayScore, m.homeScore, cap)

    if (m.homeScore > m.awayScore) { home.wins++; away.losses++ }
    else { away.wins++; home.losses++ }
  }
  return rows
}

function findOverride(teamIds: string[], overrides?: ManualOverride[]): ManualOverride | undefined {
  if (!overrides) return undefined
  const sortedTarget = [...teamIds].sort()
  return overrides.find(o => {
    const sortedO = [...o.teamIds].sort()
    return sortedO.length === sortedTarget.length && sortedO.every((id, i) => id === sortedTarget[i])
  })
}

/**
 * Resolves a tied group recursively:
 *   1. Head-to-head record using ONLY games among the tied teams.
 *      This correctly does NOT resolve 3-way (or larger) cycles — e.g.
 *      A beat B, B beat C, C beat A all finish 1-1 in the mini-league, so
 *      head-to-head produces no separation and we fall through.
 *   2. Point differential (across ALL pool games, not just head-to-head games;
 *      subject to the configured per-game cap, if any).
 *   3. Points allowed (fewer is better).
 *   4. Points scored (more is better) — last statistical tiebreaker.
 *   5. Manual override, if the director has specified one for this exact group.
 *   6. Deterministic team-id sort — guarantees a strict total order even in
 *      a genuine dead-even tie, so results are always reproducible.
 */
function resolveTiedGroup(
  teamIds: string[],
  allMatches: Match[],
  fullRows: Map<string, StandingsRow>,
  log: TiebreakStep[],
  options: StandingsOptions
): string[] {
  if (teamIds.length <= 1) return teamIds

  // Step 1: head-to-head mini-league among just these teams
  const h2hMatches = allMatches.filter(
    m => m.homeTeamId && m.awayTeamId && teamIds.includes(m.homeTeamId) && teamIds.includes(m.awayTeamId)
  )
  const h2hRows = baseRecord(teamIds, h2hMatches, options.pointDifferentialCap)
  const byH2HWins = groupBy(teamIds, id => h2hRows.get(id)!.wins)
  const h2hGroups = [...byH2HWins.entries()].sort((a, b) => b[0] - a[0])

  if (h2hGroups.length > 1) {
    log.push({ teamIds, method: 'head_to_head' })
    return h2hGroups.flatMap(([, ids]) => resolveTiedGroup(ids, allMatches, fullRows, log, options))
  }

  // Step 2: point differential across all pool games (capped, if configured)
  const byDiff = groupBy(teamIds, id => fullRows.get(id)!.pointDifferential)
  const diffGroups = [...byDiff.entries()].sort((a, b) => b[0] - a[0])
  if (diffGroups.length > 1) {
    log.push({ teamIds, method: 'point_differential' })
    return diffGroups.flatMap(([, ids]) => resolveTiedGroup(ids, allMatches, fullRows, log, options))
  }

  // Step 3: points allowed (lower is better)
  const byAllowed = groupBy(teamIds, id => fullRows.get(id)!.pointsAgainst)
  const allowedGroups = [...byAllowed.entries()].sort((a, b) => a[0] - b[0])
  if (allowedGroups.length > 1) {
    log.push({ teamIds, method: 'points_allowed' })
    return allowedGroups.flatMap(([, ids]) => resolveTiedGroup(ids, allMatches, fullRows, log, options))
  }

  // Step 4: points scored (higher is better)
  const byScored = groupBy(teamIds, id => fullRows.get(id)!.pointsFor)
  const scoredGroups = [...byScored.entries()].sort((a, b) => b[0] - a[0])
  if (scoredGroups.length > 1) {
    log.push({ teamIds, method: 'points_scored' })
    return scoredGroups.flatMap(([, ids]) => resolveTiedGroup(ids, allMatches, fullRows, log, options))
  }

  // Step 5: director-specified manual override for this exact tied group
  const override = findOverride(teamIds, options.manualOverrides)
  if (override) {
    log.push({ teamIds, method: 'manual_override' })
    return override.orderedIds
  }

  // Step 6: still genuinely tied on everything — deterministic fallback
  log.push({ teamIds, method: 'deterministic' })
  return [...teamIds].sort()
}

function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>()
  for (const item of items) {
    const key = keyFn(item)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(item)
  }
  return map
}

export function computeStandings(teams: Team[], matches: Match[], options: StandingsOptions = {}): StandingsResult {
  const teamIds = teams.map(t => t.id)
  const rows = baseRecord(teamIds, matches, options.pointDifferentialCap)
  const log: TiebreakStep[] = []

  const byWins = groupBy(teamIds, id => rows.get(id)!.wins)
  const winGroups = [...byWins.entries()].sort((a, b) => b[0] - a[0])

  const orderedIds = winGroups.flatMap(([, ids]) => resolveTiedGroup(ids, matches, rows, log, options))

  return {
    standings: orderedIds.map(id => rows.get(id)!),
    tiebreakLog: log,
  }
}
