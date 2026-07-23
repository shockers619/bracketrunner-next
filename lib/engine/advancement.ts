import type { Match, AuditLogEntry } from './types'

export interface AnomalyBounds {
  maxSingleTeamScore?: number   // e.g. 120 for basketball
  maxDifferential?: number       // e.g. 60
}

export interface RecordResultOptions {
  userId: string
  anomalyBounds?: AnomalyBounds
  /** true when the director is re-submitting after seeing the anomaly prompt */
  confirmed?: boolean
}

export interface RecordResultOutcome {
  matches: Match[]
  auditLogs: AuditLogEntry[]
  requiresConfirmation: boolean
}

function findMatch(matches: Match[], id: string): Match {
  const m = matches.find(x => x.id === id)
  if (!m) throw new Error(`Match ${id} not found`)
  return m
}

function isAnomalous(homeScore: number, awayScore: number, bounds?: AnomalyBounds): boolean {
  if (!bounds) return false
  const { maxSingleTeamScore, maxDifferential } = bounds
  if (maxSingleTeamScore != null && (homeScore > maxSingleTeamScore || awayScore > maxSingleTeamScore)) return true
  if (maxDifferential != null && Math.abs(homeScore - awayScore) > maxDifferential) return true
  return false
}

/**
 * Records a match result. Does NOT mutate the input array — returns a new
 * array with the match (and, if the winner advances, the next match) updated.
 *
 * Anomaly flow: if the score trips the configured bounds and this call isn't
 * marked `confirmed`, the match is set to 'pending_confirmation' and nothing
 * advances yet — the caller re-submits with `confirmed: true` to commit.
 * This is deliberately NOT satisfied by a bare "yes I'm sure" re-click on the
 * same typo; the UI is expected to show the actual flagged numbers back to
 * the director before they confirm.
 */
export function recordResult(
  matches: Match[],
  matchId: string,
  homeScore: number,
  awayScore: number,
  opts: RecordResultOptions
): RecordResultOutcome {
  const match = findMatch(matches, matchId)
  if (homeScore === awayScore) {
    throw new Error('Single-elimination matches cannot end in a tie')
  }
  if (!match.homeTeamId || !match.awayTeamId) {
    throw new Error('Cannot record a result for a match that is not fully seeded yet')
  }

  const anomalous = isAnomalous(homeScore, awayScore, opts.anomalyBounds)
  const auditLogs: AuditLogEntry[] = []

  if (anomalous && !opts.confirmed) {
    const updated = matches.map(m =>
      m.id === matchId
        ? { ...m, homeScore, awayScore, status: 'pending_confirmation' as const }
        : m
    )
    return { matches: updated, auditLogs, requiresConfirmation: true }
  }

  const previousState = { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status }
  const winnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId
  const loserId = homeScore > awayScore ? match.awayTeamId : match.homeTeamId

  let updated = matches.map(m =>
    m.id === matchId ? { ...m, homeScore, awayScore, status: 'completed' as const } : m
  )

  // Winner advances (single-elim, round-robin-with-playoff, and the winners
  // side of a double-elim bracket all use this same nextMatchId mechanism).
  if (match.bracketMeta.nextMatchId && !match.bracketMeta.isGrandFinal) {
    updated = updated.map(m => {
      if (m.id !== match.bracketMeta.nextMatchId) return m
      const slot = match.bracketMeta.nextMatchSlot
      if (slot === 'home') return { ...m, homeTeamId: winnerId }
      if (slot === 'away') return { ...m, awayTeamId: winnerId }
      return m
    })
  }

  // Double-elimination: route the LOSER into the losers bracket.
  if (match.bracketMeta.loserNextMatchId) {
    updated = updated.map(m => {
      if (m.id !== match.bracketMeta.loserNextMatchId) return m
      const slot = match.bracketMeta.loserNextMatchSlot
      if (slot === 'home') return { ...m, homeTeamId: loserId }
      if (slot === 'away') return { ...m, awayTeamId: loserId }
      return m
    })
  }

  // Grand Final Game 1: if the winners-bracket team (home) loses, the
  // losers-bracket team has now beaten them once — both sides have exactly
  // one loss, so a second "bracket reset" game decides the real champion.
  // If the WB team wins outright, they were never actually beaten, so the
  // reset game never happens and stays cancelled.
  if (match.bracketMeta.isGrandFinal && match.bracketMeta.grandFinalGame === 1) {
    const wbTeamWon = winnerId === match.homeTeamId
    if (!wbTeamWon && match.bracketMeta.nextMatchId) {
      updated = updated.map(m =>
        m.id === match.bracketMeta.nextMatchId
          ? { ...m, homeTeamId: match.homeTeamId, awayTeamId: match.awayTeamId, status: 'scheduled' as const }
          : m
      )
    }
  }

  auditLogs.push({
    userId: opts.userId,
    matchId,
    action: anomalous ? 'anomaly_confirmed' : 'score_edit',
    previousState,
    newState: { homeScore, awayScore, status: 'completed' },
  })

  return { matches: updated, auditLogs, requiresConfirmation: false }
}

export interface ResetMatchOutcome {
  matches: Match[]
  auditLogs: AuditLogEntry[]
}

/**
 * God-Mode override: reverts a completed (or pending-confirmation) match
 * back to 'in_progress' or 'scheduled', so it can be re-entered — the
 * "scorekeeper hit FINAL on the wrong match" recovery path.
 *
 * Guard: if this match already advanced a winner (or routed a loser, in
 * double-elim) into a downstream match, and that downstream match has
 * itself been started or completed, resetting THIS match would leave a
 * team sitting in the downstream slot whose source match is no longer
 * decided — a genuinely corrupt bracket state. Rather than silently
 * clearing or ignoring that, this throws and requires the director to
 * reset the downstream match first. If the downstream match is still
 * untouched ('scheduled'), it's safe: this clears the slot it populated.
 *
 * NOTE: this mirrors the Phase 1 `bracketrunner` engine's approach but was
 * written directly against this app's copy of the engine — it should be
 * ported back to the source engine repo with its own property tests, the
 * same discipline the rest of lib/engine follows there.
 */
export function resetMatch(
  matches: Match[],
  matchId: string,
  targetStatus: 'scheduled' | 'in_progress',
  userId: string,
  reason: string
): ResetMatchOutcome {
  const match = findMatch(matches, matchId)
  if (match.status !== 'completed' && match.status !== 'pending_confirmation') {
    throw new Error('Only a completed match can be reset')
  }

  const downstreamIds = [match.bracketMeta.nextMatchId, match.bracketMeta.loserNextMatchId].filter(
    (id): id is string => !!id
  )
  for (const id of downstreamIds) {
    const downstream = matches.find(m => m.id === id)
    if (downstream && downstream.status !== 'scheduled') {
      throw new Error(
        `Cannot reset this match — the downstream match it feeds into is already ${downstream.status}. Reset that match first.`
      )
    }
  }

  const previousState = { homeScore: match.homeScore, awayScore: match.awayScore, status: match.status }
  const resetScores = targetStatus === 'scheduled'
  const newHomeScore = resetScores ? 0 : match.homeScore
  const newAwayScore = resetScores ? 0 : match.awayScore

  let updated = matches.map(m =>
    m.id === matchId ? { ...m, homeScore: newHomeScore, awayScore: newAwayScore, status: targetStatus } : m
  )

  // Clear whichever downstream slot(s) this match had populated, since the
  // match that populated them is no longer decided.
  if (match.bracketMeta.nextMatchId) {
    updated = updated.map(m => {
      if (m.id !== match.bracketMeta.nextMatchId) return m
      const slot = match.bracketMeta.nextMatchSlot
      if (slot === 'home') return { ...m, homeTeamId: null }
      if (slot === 'away') return { ...m, awayTeamId: null }
      return m
    })
  }
  if (match.bracketMeta.loserNextMatchId) {
    updated = updated.map(m => {
      if (m.id !== match.bracketMeta.loserNextMatchId) return m
      const slot = match.bracketMeta.loserNextMatchSlot
      if (slot === 'home') return { ...m, homeTeamId: null }
      if (slot === 'away') return { ...m, awayTeamId: null }
      return m
    })
  }

  const auditLogs: AuditLogEntry[] = [{
    userId,
    matchId,
    action: 'match_reset',
    previousState,
    newState: { homeScore: newHomeScore, awayScore: newAwayScore, status: targetStatus },
    reason,
  }]

  return { matches: updated, auditLogs }
}

/**
 * God-Mode override: corrects the score of a match that's already
 * in_progress OR completed, re-running advancement so downstream bracket
 * nodes stay correct.
 *
 * Guard: if the match is already 'completed' and the correction would flip
 * the winner, and the downstream match it feeds into has already been
 * started or completed, this throws instead of silently rewriting a bracket
 * node that's already been played on top of the old (wrong) result. The
 * director has to reset the downstream match first — same reasoning as
 * resetMatch's guard, just triggered from the other direction (editing a
 * score vs. reverting a match's status).
 *
 * Deliberately calls recordResult with confirmed: true regardless of
 * anomaly bounds — this is already an explicit, reason-coded director
 * action, not a live scorekeeper entry, so the anomaly prompt would just
 * be redundant friction here.
 */
export function correctScore(
  matches: Match[],
  matchId: string,
  homeScore: number,
  awayScore: number,
  userId: string,
  reason: string
): RecordResultOutcome {
  const match = findMatch(matches, matchId)

  if (match.status === 'completed') {
    const oldWinnerId = match.homeScore > match.awayScore ? match.homeTeamId : match.awayTeamId
    const newWinnerId = homeScore > awayScore ? match.homeTeamId : match.awayTeamId
    if (oldWinnerId !== newWinnerId && match.bracketMeta.nextMatchId) {
      const downstream = matches.find(m => m.id === match.bracketMeta.nextMatchId)
      if (downstream && downstream.status !== 'scheduled') {
        throw new Error(
          `Changing the winner conflicts with the downstream match, which is already ${downstream.status}. Reset that match first.`
        )
      }
    }
  }

  const result = recordResult(matches, matchId, homeScore, awayScore, { userId, confirmed: true })
  const auditLogs = result.auditLogs.map(e => ({ ...e, reason }))
  return { ...result, auditLogs }
}

/**
 * God-Mode override: directly force a team into a match slot regardless of
 * normal bracket flow (double forfeit, dispute resolution, etc). Always
 * writes an immutable audit log entry — this is the paper trail a director
 * needs when a coach disputes a result days later.
 */
export function forceSlotOverride(
  matches: Match[],
  matchId: string,
  slot: 'home' | 'away',
  teamId: string | null,
  userId: string,
  reason: string
): { matches: Match[]; auditLogs: AuditLogEntry[] } {
  const match = findMatch(matches, matchId)
  const previousState = slot === 'home' ? { homeTeamId: match.homeTeamId } : { awayTeamId: match.awayTeamId }
  const newState = slot === 'home' ? { homeTeamId: teamId } : { awayTeamId: teamId }

  const updated = matches.map(m =>
    m.id === matchId ? { ...m, ...(slot === 'home' ? { homeTeamId: teamId } : { awayTeamId: teamId }) } : m
  )

  const auditLogs: AuditLogEntry[] = [{
    userId,
    matchId,
    action: 'force_slot',
    previousState,
    newState,
    reason,
  }]

  return { matches: updated, auditLogs }
}
