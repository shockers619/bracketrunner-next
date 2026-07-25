import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import { generateRoundRobin, _resetRoundRobinIdCounterForTests } from './roundRobin'
import type { Team } from './types'

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, seed: i + 1 }))
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

beforeEach(() => _resetRoundRobinIdCounterForTests())

describe('generateRoundRobin', () => {
  it('throws with fewer than 2 teams', () => {
    expect(() => generateRoundRobin(makeTeams(1), { divisionId: 'd1', poolId: 'p1' })).toThrow()
  })

  it('tags every match with the pool id', () => {
    const matches = generateRoundRobin(makeTeams(4), { divisionId: 'd1', poolId: 'poolA' })
    expect(matches.every(m => m.bracketMeta.poolId === 'poolA')).toBe(true)
  })

  it('property: every unordered pair plays exactly once', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), n => {
        _resetRoundRobinIdCounterForTests()
        const matches = generateRoundRobin(makeTeams(n), { divisionId: 'd1', poolId: 'p1' })

        // total games = n choose 2
        expect(matches).toHaveLength((n * (n - 1)) / 2)

        // no pair appears twice, no team plays itself
        const seen = new Set<string>()
        for (const m of matches) {
          expect(m.homeTeamId).not.toBe(m.awayTeamId)
          const key = pairKey(m.homeTeamId!, m.awayTeamId!)
          expect(seen.has(key)).toBe(false)
          seen.add(key)
        }
        expect(seen.size).toBe((n * (n - 1)) / 2)
      })
    )
  })

  it('property: every team plays exactly n-1 games', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), n => {
        _resetRoundRobinIdCounterForTests()
        const matches = generateRoundRobin(makeTeams(n), { divisionId: 'd1', poolId: 'p1' })
        const counts = new Map<string, number>()
        for (const m of matches) {
          counts.set(m.homeTeamId!, (counts.get(m.homeTeamId!) ?? 0) + 1)
          counts.set(m.awayTeamId!, (counts.get(m.awayTeamId!) ?? 0) + 1)
        }
        expect(counts.size).toBe(n)
        for (const c of counts.values()) expect(c).toBe(n - 1)
      })
    )
  })

  it('property: round count is n-1 for even n and n for odd n', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 20 }), n => {
        _resetRoundRobinIdCounterForTests()
        const matches = generateRoundRobin(makeTeams(n), { divisionId: 'd1', poolId: 'p1' })
        const rounds = new Set(matches.map(m => m.bracketMeta.round))
        expect(rounds.size).toBe(n % 2 === 0 ? n - 1 : n)
      })
    )
  })
})
