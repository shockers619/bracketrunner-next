export interface Team {
  id: string
  name: string
  seed: number   // 1 = best seed
}

export type MatchStatus = 'scheduled' | 'in_progress' | 'pending_confirmation' | 'completed' | 'cancelled'

export interface BracketMeta {
  round: number
  position: number
  nextMatchId: string | null
  nextMatchSlot: 'home' | 'away' | null
  isBye?: boolean
  poolId?: string   // set for round-robin / pool-play matches; absent for elimination brackets
  bracketSide?: 'winners' | 'losers'   // only set in double-elimination
  loserNextMatchId?: string | null      // where the LOSER of this match goes (winners-bracket matches only)
  loserNextMatchSlot?: 'home' | 'away' | null
  isGrandFinal?: boolean
  grandFinalGame?: 1 | 2                // 2 = the conditional "bracket reset" match
}

export interface Match {
  id: string
  divisionId: string
  courtId: string | null
  homeTeamId: string | null
  awayTeamId: string | null
  startTime: string | null   // ISO string
  durationMinutes: number
  homeScore: number
  awayScore: number
  status: MatchStatus
  bracketMeta: BracketMeta
}

export interface AuditLogEntry {
  userId: string
  matchId: string
  action: 'score_edit' | 'force_slot' | 'manual_override' | 'anomaly_confirmed' | 'match_reset'
  previousState: unknown
  newState: unknown
  reason?: string
}
