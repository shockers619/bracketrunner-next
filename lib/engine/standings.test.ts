import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { computeStandings } from './standings'
import type { Match, Team } from './types'

let gameSeq = 0
function game(home: string, away: string, homeScore: number, awayScore: number): Match {
  gameSeq += 1
  return {
    id: `g${gameSeq}`,
    divisionId: 'd1',
    courtId: null,
    homeTeamId: home,
    awayTeamId: away,
    startTime: null,
    durationMinutes: 60,
    homeScore,
    awayScore,
    status: 'completed',
    bracketMeta: { round: 1, position: 0, nextMatchId: null, nextMatchSlot: null },
  }
}

function team(id: string): Team {
  return { id, name: id, seed: 1 }
}

describe('computeStandings', () => {
  it('orders by wins and logs no tiebreak when win counts are distinct', () => {
    const teams = [team('A'), team('B'), team('C')]
    const matches = [game('A', 'B', 10, 0), game('A', 'C', 10, 0), game('B', 'C', 10, 0)]
    const { standings, tiebreakLog } = computeStandings(teams, matches)
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B', 'C'])
    expect(tiebreakLog).toHaveLength(0)
  })

  it('breaks a two-way tie by head-to-head result', () => {
    // A,B both 2-1; C,D both 1-2. Head-to-head decides each pair.
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      game('A', 'B', 5, 0), // A beats B (head-to-head)
      game('A', 'C', 5, 0),
      game('D', 'A', 5, 0),
      game('B', 'C', 5, 0),
      game('B', 'D', 5, 0),
      game('C', 'D', 5, 0), // C beats D (head-to-head)
    ]
    const { standings, tiebreakLog } = computeStandings(teams, matches)
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B', 'C', 'D'])
    expect(tiebreakLog.some(s => s.method === 'head_to_head')).toBe(true)
  })

  it('falls through to point differential when there is no head-to-head separation', () => {
    // A,B both 2-0 but never played each other -> differential decides.
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      game('A', 'C', 40, 0),
      game('A', 'D', 2, 0),
      game('B', 'C', 16, 0),
      game('B', 'D', 16, 0),
    ]
    const { standings, tiebreakLog } = computeStandings(teams, matches)
    // Uncapped: A diff = 42 > B diff = 32
    expect(standings[0].teamId).toBe('A')
    expect(standings[1].teamId).toBe('B')
    expect(tiebreakLog.some(s => s.method === 'point_differential')).toBe(true)
  })

  it('point differential cap can flip the order, but pointsFor stays a real total', () => {
    const teams = [team('A'), team('B'), team('C'), team('D')]
    const matches = [
      game('A', 'C', 40, 0), // one big blowout
      game('A', 'D', 2, 0),
      game('B', 'C', 16, 0), // two capped-max wins
      game('B', 'D', 16, 0),
    ]
    const { standings } = computeStandings(teams, matches, { pointDifferentialCap: 15 })
    // Capped: A = 15 + 2 = 17, B = 15 + 15 = 30 -> B now ahead
    expect(standings[0].teamId).toBe('B')
    expect(standings[1].teamId).toBe('A')
    // pointsFor is the real, uncapped total
    expect(standings.find(s => s.teamId === 'A')!.pointsFor).toBe(42)
  })

  it('uses a director manual override for a genuine dead tie', () => {
    const teams = [team('A'), team('B')]
    const { standings, tiebreakLog } = computeStandings(teams, [], {
      manualOverrides: [{ teamIds: ['A', 'B'], orderedIds: ['B', 'A'] }],
    })
    expect(standings.map(s => s.teamId)).toEqual(['B', 'A'])
    expect(tiebreakLog.some(s => s.method === 'manual_override')).toBe(true)
  })

  it('falls back to a deterministic, reproducible order when everything ties', () => {
    const teams = [team('B'), team('A')]
    const { standings, tiebreakLog } = computeStandings(teams, [])
    expect(standings.map(s => s.teamId)).toEqual(['A', 'B']) // id sort
    expect(tiebreakLog.some(s => s.method === 'deterministic')).toBe(true)
  })

  it('property: always returns a strict total order over exactly the input teams', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 2, max: 8 }),
        fc.array(fc.tuple(fc.nat(20), fc.nat(20), fc.nat(50), fc.nat(50)), { maxLength: 30 }),
        (n, rawGames) => {
          const teams = Array.from({ length: n }, (_, i) => team(`T${i}`))
          const matches = rawGames
            .map(([h, a, hs, as_]) => {
              const home = `T${h % n}`
              const away = `T${a % n}`
              if (home === away) return null
              // ties aren't valid completed results; nudge to a decisive score
              const homeScore = hs === as_ ? hs + 1 : hs
              return game(home, away, homeScore, as_)
            })
            .filter((m): m is Match => m !== null)
          const { standings } = computeStandings(teams, matches)
          expect(standings).toHaveLength(n)
          expect(new Set(standings.map(s => s.teamId)).size).toBe(n)
        }
      )
    )
  })
})
