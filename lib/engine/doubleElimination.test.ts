import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { generateDoubleEliminationBracket, _resetDoubleElimIdCounterForTests } from './doubleElimination'
import { recordResult } from './advancement'
import type { Match, Team } from './types'

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, seed: i + 1 }))
}

/**
 * Plays a whole bracket to completion: repeatedly finds a scheduled match with
 * both teams present and records a result (the lower seed — the favorite —
 * wins), routing through the real engine. Returns the final match set.
 */
function playOut(initial: Match[], seedById: Map<string, number>): Match[] {
  let matches = initial
  // generous upper bound on iterations to avoid an infinite loop on a routing bug
  for (let guard = 0; guard < 10_000; guard++) {
    const m = matches.find(x => x.status === 'scheduled' && x.homeTeamId && x.awayTeamId)
    if (!m) break
    const homeWins = seedById.get(m.homeTeamId!)! < seedById.get(m.awayTeamId!)!
    matches = recordResult(matches, m.id, homeWins ? 1 : 0, homeWins ? 0 : 1, { userId: 'sim' }).matches
  }
  return matches
}

function seedMap(teams: Team[]): Map<string, number> {
  return new Map(teams.map(t => [t.id, t.seed]))
}

beforeEach(() => _resetDoubleElimIdCounterForTests())

describe('generateDoubleEliminationBracket', () => {
  it('throws with fewer than 2 teams', () => {
    expect(() => generateDoubleEliminationBracket(makeTeams(1), { divisionId: 'd1' })).toThrow()
  })

  it('creates a grand final plus a cancelled reset game', () => {
    const matches = generateDoubleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const gf1 = matches.filter(m => m.bracketMeta.isGrandFinal && m.bracketMeta.grandFinalGame === 1)
    const gf2 = matches.filter(m => m.bracketMeta.isGrandFinal && m.bracketMeta.grandFinalGame === 2)
    expect(gf1).toHaveLength(1)
    expect(gf2).toHaveLength(1)
    expect(gf2[0].status).toBe('cancelled')
    expect(gf1[0].bracketMeta.nextMatchId).toBe(gf2[0].id) // reset-game wiring
  })

  it('seeds the winners bracket top seed against the lowest', () => {
    const matches = generateDoubleEliminationBracket(makeTeams(4), { divisionId: 'd1' })
    const wbR1 = matches
      .filter(m => m.bracketMeta.bracketSide === 'winners' && m.bracketMeta.round === 1)
      .sort((a, b) => a.bracketMeta.position - b.bracketMeta.position)
    expect(wbR1[0].homeTeamId).toBe('t1')
    expect(wbR1[0].awayTeamId).toBe('t4')
  })

  it('property (power-of-2): total = 2n-1 matches, referential integrity, unique ids', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 6 }), pow => {
        _resetDoubleElimIdCounterForTests()
        const n = 2 ** pow
        const matches = generateDoubleEliminationBracket(makeTeams(n), { divisionId: 'd1' })
        expect(matches).toHaveLength(2 * n - 1) // WB (n-1) + LB (n-2) + 2 grand finals
        const ids = matches.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)
        expect(matches.filter(m => m.bracketMeta.bracketSide === 'winners' && m.bracketMeta.round === 1)).toHaveLength(n / 2)
      })
    )
  })

  describe('byes (non-power-of-2 team counts)', () => {
    it('no longer throws and gives the top seeds visible round-1 byes', () => {
      const teams = makeTeams(5) // bracket size 8 -> 3 byes to seeds 1,2,3
      const matches = generateDoubleEliminationBracket(teams, { divisionId: 'd1' })
      const wbByes = matches.filter(m => m.bracketMeta.bracketSide === 'winners' && m.bracketMeta.isBye)
      expect(wbByes).toHaveLength(3)
      for (const b of wbByes) {
        expect(b.status).toBe('completed')
        expect([b.homeTeamId, b.awayTeamId].filter(Boolean)).toHaveLength(1) // exactly one real team
        expect(b.bracketMeta.loserNextMatchId).toBeNull() // a bye has no loser to route
      }
    })

    it('property: every internal link resolves to a real match for any n (2..40)', () => {
      fc.assert(
        fc.property(fc.integer({ min: 2, max: 40 }), n => {
          _resetDoubleElimIdCounterForTests()
          const matches = generateDoubleEliminationBracket(makeTeams(n), { divisionId: 'd1' })
          const ids = new Set(matches.map(m => m.id))
          expect(ids.size).toBe(matches.length) // unique
          for (const m of matches) {
            for (const link of [m.bracketMeta.nextMatchId, m.bracketMeta.loserNextMatchId]) {
              if (link) expect(ids.has(link)).toBe(true)
            }
          }
        })
      )
    })

    // Exhaustive (every n, not sampled): the defining property of a correct
    // double-elimination bracket is that the tournament resolves and every
    // team except the champion is eliminated with exactly two losses.
    it.each(Array.from({ length: 39 }, (_, i) => i + 2))(
      'a full favorites-win playthrough resolves cleanly for n=%i',
      n => {
        _resetDoubleElimIdCounterForTests()
        const teams = makeTeams(n)
        const bracket = generateDoubleEliminationBracket(teams, { divisionId: 'd1' })
        const played = playOut(bracket, seedMap(teams))

        // The tournament actually finished.
        const gf1 = played.find(m => m.bracketMeta.isGrandFinal && m.bracketMeta.grandFinalGame === 1)!
        expect(gf1.status).toBe('completed')

        // Tally losses across every decided, non-bye match.
        const losses = new Map(teams.map(t => [t.id, 0]))
        for (const m of played) {
          if (m.status !== 'completed' || m.bracketMeta.isBye || !m.homeTeamId || !m.awayTeamId) continue
          const loserId = m.homeScore > m.awayScore ? m.awayTeamId : m.homeTeamId
          losses.set(loserId, (losses.get(loserId) ?? 0) + 1)
        }

        // Exactly one champion (0 losses, since favorites always win); every
        // other team is eliminated with exactly two losses.
        const champions = [...losses.entries()].filter(([, l]) => l < 2)
        expect(champions).toHaveLength(1)
        expect(champions[0][0]).toBe('t1') // top seed wins it all
        for (const [id, l] of losses) {
          if (id !== 't1') expect(l).toBe(2)
        }
      }
    )
  })
})
