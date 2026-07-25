import { describe, it, expect, beforeEach } from 'vitest'
import {
  recordResult,
  resetMatch,
  correctScore,
  forceSlotOverride,
} from './advancement'
import { generateSingleEliminationBracket, _resetIdCounterForTests } from './bracket'
import { generateDoubleEliminationBracket, _resetDoubleElimIdCounterForTests } from './doubleElimination'
import type { Match, Team } from './types'

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, seed: i + 1 }))
}

function round1(matches: Match[]): Match[] {
  return matches
    .filter(m => m.bracketMeta.round === 1 && m.bracketMeta.bracketSide !== 'losers')
    .sort((a, b) => a.bracketMeta.position - b.bracketMeta.position)
}

beforeEach(() => {
  _resetIdCounterForTests()
  _resetDoubleElimIdCounterForTests()
})

describe('recordResult', () => {
  it('rejects a tie', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const m = round1(matches)[0]
    expect(() => recordResult(matches, m.id, 5, 5, { userId: 'u1' })).toThrow(/tie/i)
  })

  it('rejects a match that is not fully seeded', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const final = matches.find(m => m.bracketMeta.nextMatchId === null)!
    expect(final.homeTeamId).toBeNull()
    expect(() => recordResult(matches, final.id, 10, 0, { userId: 'u1' })).toThrow(/not fully seeded/i)
  })

  it('advances the winner into the next match and does not mutate the input', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const semi = round1(matches)[0]
    const winnerId = semi.homeTeamId!
    const originalStatus = semi.status

    const { matches: after, auditLogs } = recordResult(matches, semi.id, 10, 0, { userId: 'u1' })

    const finalId = semi.bracketMeta.nextMatchId!
    const finalAfter = after.find(m => m.id === finalId)!
    const slot = semi.bracketMeta.nextMatchSlot
    expect(slot === 'home' ? finalAfter.homeTeamId : finalAfter.awayTeamId).toBe(winnerId)

    // input untouched (immutability)
    expect(semi.status).toBe(originalStatus)
    expect(auditLogs[0]).toMatchObject({ matchId: semi.id, action: 'score_edit' })
  })

  it('routes the loser into the losers bracket in double-elimination', () => {
    const matches = generateDoubleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const wbR1 = round1(matches)[0]
    const loserId = wbR1.awayTeamId! // home wins below, so away is the loser

    const { matches: after } = recordResult(matches, wbR1.id, 10, 0, { userId: 'u1' })

    const lbTargetId = wbR1.bracketMeta.loserNextMatchId!
    const lbTarget = after.find(m => m.id === lbTargetId)!
    const slot = wbR1.bracketMeta.loserNextMatchSlot
    expect(slot === 'home' ? lbTarget.homeTeamId : lbTarget.awayTeamId).toBe(loserId)
  })

  it('holds an anomalous score for confirmation, then commits on re-submit', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const semi = round1(matches)[0]
    const finalId = semi.bracketMeta.nextMatchId!

    const pending = recordResult(matches, semi.id, 50, 0, {
      userId: 'u1',
      anomalyBounds: { maxDifferential: 5 },
    })
    expect(pending.requiresConfirmation).toBe(true)
    expect(pending.matches.find(m => m.id === semi.id)!.status).toBe('pending_confirmation')
    expect(pending.auditLogs).toHaveLength(0)
    // nothing advanced yet
    expect(pending.matches.find(m => m.id === finalId)!.homeTeamId).toBeNull()

    const committed = recordResult(matches, semi.id, 50, 0, {
      userId: 'u1',
      anomalyBounds: { maxDifferential: 5 },
      confirmed: true,
    })
    expect(committed.requiresConfirmation).toBe(false)
    expect(committed.matches.find(m => m.id === semi.id)!.status).toBe('completed')
    expect(committed.auditLogs[0].action).toBe('anomaly_confirmed')
  })

  it('grand-final game 1: activates the reset game only when the winners-bracket team loses', () => {
    const gf2: Match = {
      id: 'gf2', divisionId: 'd1', courtId: null, homeTeamId: null, awayTeamId: null,
      startTime: null, durationMinutes: 60, homeScore: 0, awayScore: 0, status: 'cancelled',
      bracketMeta: { round: 9, position: 0, nextMatchId: null, nextMatchSlot: null, isGrandFinal: true, grandFinalGame: 2 },
    }
    const gf1: Match = {
      id: 'gf1', divisionId: 'd1', courtId: null, homeTeamId: 'wb', awayTeamId: 'lb',
      startTime: null, durationMinutes: 60, homeScore: 0, awayScore: 0, status: 'scheduled',
      bracketMeta: { round: 8, position: 0, nextMatchId: 'gf2', nextMatchSlot: null, isGrandFinal: true, grandFinalGame: 1 },
    }

    // WB team (home) wins -> no reset, gf2 stays cancelled
    const wbWins = recordResult([gf1, gf2], 'gf1', 10, 0, { userId: 'u1' })
    expect(wbWins.matches.find(m => m.id === 'gf2')!.status).toBe('cancelled')

    // LB team (away) wins -> reset game activated with both finalists
    const lbWins = recordResult([gf1, gf2], 'gf1', 0, 10, { userId: 'u1' })
    const resetGame = lbWins.matches.find(m => m.id === 'gf2')!
    expect(resetGame.status).toBe('scheduled')
    expect(resetGame.homeTeamId).toBe('wb')
    expect(resetGame.awayTeamId).toBe('lb')
  })
})

describe('resetMatch', () => {
  it('reverts a completed match and clears the slot it populated downstream', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const semi = round1(matches)[0]
    const finalId = semi.bracketMeta.nextMatchId!
    const played = recordResult(matches, semi.id, 10, 0, { userId: 'u1' }).matches

    const { matches: after, auditLogs } = resetMatch(played, semi.id, 'scheduled', 'u1', 'wrong match')
    const semiAfter = after.find(m => m.id === semi.id)!
    expect(semiAfter.status).toBe('scheduled')
    expect(semiAfter.homeScore).toBe(0)
    const slot = semi.bracketMeta.nextMatchSlot
    const finalAfter = after.find(m => m.id === finalId)!
    expect(slot === 'home' ? finalAfter.homeTeamId : finalAfter.awayTeamId).toBeNull()
    expect(auditLogs[0]).toMatchObject({ action: 'match_reset', reason: 'wrong match' })
  })

  it('refuses to reset when the downstream match has already been played', () => {
    let matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const [semiA, semiB] = round1(matches)
    matches = recordResult(matches, semiA.id, 10, 0, { userId: 'u1' }).matches
    matches = recordResult(matches, semiB.id, 10, 0, { userId: 'u1' }).matches
    const finalId = semiA.bracketMeta.nextMatchId!
    const final = matches.find(m => m.id === finalId)!
    matches = recordResult(matches, final.id, 10, 0, { userId: 'u1' }).matches // final now completed

    expect(() => resetMatch(matches, semiA.id, 'scheduled', 'u1', 'oops')).toThrow(/downstream/i)
  })

  it('only resets a completed or pending match', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const semi = round1(matches)[0] // still 'scheduled'
    expect(() => resetMatch(matches, semi.id, 'scheduled', 'u1', 'nope')).toThrow(/completed/i)
  })
})

describe('correctScore', () => {
  it('re-runs advancement when a correction flips the winner (downstream still open)', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const semi = round1(matches)[0]
    const homeId = semi.homeTeamId!
    const awayId = semi.awayTeamId!
    const finalId = semi.bracketMeta.nextMatchId!
    const slot = semi.bracketMeta.nextMatchSlot!

    const played = recordResult(matches, semi.id, 10, 0, { userId: 'u1' }).matches // home wins
    const corrected = correctScore(played, semi.id, 0, 10, 'u1', 'scoresheet error').matches

    const finalAfter = corrected.find(m => m.id === finalId)!
    expect(slot === 'home' ? finalAfter.homeTeamId : finalAfter.awayTeamId).toBe(awayId)
    expect(homeId).not.toBe(awayId)
  })

  it('refuses to flip the winner when the downstream match is already played', () => {
    let matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const [semiA, semiB] = round1(matches)
    matches = recordResult(matches, semiA.id, 10, 0, { userId: 'u1' }).matches
    matches = recordResult(matches, semiB.id, 10, 0, { userId: 'u1' }).matches
    const finalId = semiA.bracketMeta.nextMatchId!
    const final = matches.find(m => m.id === finalId)!
    matches = recordResult(matches, final.id, 10, 0, { userId: 'u1' }).matches

    expect(() => correctScore(matches, semiA.id, 0, 10, 'u1', 'flip')).toThrow(/downstream/i)
  })
})

describe('forceSlotOverride', () => {
  it('forces a team into a slot and records an audit entry with the reason', () => {
    const matches = generateSingleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const final = matches.find(m => m.bracketMeta.nextMatchId === null)!

    const { matches: after, auditLogs } = forceSlotOverride(matches, final.id, 'home', 'tX', 'u1', 'double forfeit')
    expect(after.find(m => m.id === final.id)!.homeTeamId).toBe('tX')
    expect(auditLogs[0]).toMatchObject({
      action: 'force_slot',
      matchId: final.id,
      reason: 'double forfeit',
    })
  })
})
