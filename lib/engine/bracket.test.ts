import { describe, it, expect, beforeEach } from 'vitest'
import fc from 'fast-check'
import {
  seedOrder,
  nextPowerOfTwo,
  generateSingleEliminationBracket,
  _resetIdCounterForTests,
} from './bracket'
import type { Team } from './types'

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, seed: i + 1 }))
}

beforeEach(() => _resetIdCounterForTests())

describe('nextPowerOfTwo', () => {
  it('returns the value itself for exact powers of two', () => {
    expect(nextPowerOfTwo(1)).toBe(1)
    expect(nextPowerOfTwo(2)).toBe(2)
    expect(nextPowerOfTwo(8)).toBe(8)
    expect(nextPowerOfTwo(16)).toBe(16)
  })
  it('rounds non-powers up to the next power of two', () => {
    expect(nextPowerOfTwo(3)).toBe(4)
    expect(nextPowerOfTwo(5)).toBe(8)
    expect(nextPowerOfTwo(13)).toBe(16)
  })
  it('property: result is >= n, a power of two, and less than 2n', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 100000 }), n => {
        const p = nextPowerOfTwo(n)
        expect(p).toBeGreaterThanOrEqual(n)
        expect(p & (p - 1)).toBe(0) // power of two
        expect(p).toBeLessThan(n * 2)
      })
    )
  })
})

describe('seedOrder', () => {
  it('produces the classic bracket order for size 8', () => {
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6])
  })
  it('throws on non-power-of-2 or sizes below 2', () => {
    expect(() => seedOrder(1)).toThrow()
    expect(() => seedOrder(6)).toThrow()
    expect(() => seedOrder(0)).toThrow()
  })
  it('property: output is a permutation of 1..size', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), pow => {
        const size = 2 ** pow
        const order = seedOrder(size)
        expect(order).toHaveLength(size)
        expect([...order].sort((a, b) => a - b)).toEqual(Array.from({ length: size }, (_, i) => i + 1))
      })
    )
  })
  it('property: every first-round pairing sums to size + 1 (top seeds meet lowest)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), pow => {
        const size = 2 ** pow
        const order = seedOrder(size)
        for (let i = 0; i < size; i += 2) {
          expect(order[i] + order[i + 1]).toBe(size + 1)
        }
      })
    )
  })
  it('property: seeds 1 and 2 land in opposite halves (cannot meet before the final)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 12 }), pow => {
        const size = 2 ** pow
        const order = seedOrder(size)
        const idx1 = order.indexOf(1)
        const idx2 = order.indexOf(2)
        expect(idx1 < size / 2).toBe(true)
        expect(idx2 >= size / 2).toBe(true)
      })
    )
  })
})

describe('generateSingleEliminationBracket', () => {
  it('throws with fewer than 2 teams', () => {
    expect(() => generateSingleEliminationBracket(makeTeams(1), { divisionId: 'd1' })).toThrow()
  })

  it('builds 7 matches for 8 teams with the top seed facing the lowest', () => {
    const matches = generateSingleEliminationBracket(makeTeams(8), { divisionId: 'd1' })
    expect(matches).toHaveLength(7)
    const round1 = matches.filter(m => m.bracketMeta.round === 1)
    expect(round1).toHaveLength(4)
    // First round-1 match pairs seed 1 (t1) vs seed 8 (t8)
    expect(round1[0].homeTeamId).toBe('t1')
    expect(round1[0].awayTeamId).toBe('t8')
  })

  it('advances the present team on a bye and marks the match completed', () => {
    // 5 teams -> bracket size 8 -> 3 byes go to the top seeds
    const matches = generateSingleEliminationBracket(makeTeams(5), { divisionId: 'd1' })
    const byes = matches.filter(m => m.bracketMeta.isBye)
    expect(byes.length).toBe(3) // 8 - 5
    for (const bye of byes) {
      expect(bye.status).toBe('completed')
      // exactly one real team in a bye match
      const present = [bye.homeTeamId, bye.awayTeamId].filter(Boolean)
      expect(present).toHaveLength(1)
    }
  })

  it('property: structural invariants hold for any team count 2..64', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 64 }), n => {
        _resetIdCounterForTests()
        const matches = generateSingleEliminationBracket(makeTeams(n), { divisionId: 'd1' })
        const size = nextPowerOfTwo(n)

        // total matches in a single-elim bracket = bracketSize - 1
        expect(matches).toHaveLength(size - 1)

        // round 1 holds exactly bracketSize/2 matches
        expect(matches.filter(m => m.bracketMeta.round === 1)).toHaveLength(size / 2)

        // ids are unique
        const ids = matches.map(m => m.id)
        expect(new Set(ids).size).toBe(ids.length)

        // exactly one final (the only match with no next match)
        const finals = matches.filter(m => m.bracketMeta.nextMatchId === null)
        expect(finals).toHaveLength(1)

        // every nextMatchId points at a real match
        const idSet = new Set(ids)
        for (const m of matches) {
          if (m.bracketMeta.nextMatchId !== null) {
            expect(idSet.has(m.bracketMeta.nextMatchId)).toBe(true)
          }
        }

        // byes count = bracketSize - n, and no round-1 match is a double-bye
        expect(matches.filter(m => m.bracketMeta.isBye).length).toBe(size - n)
        for (const m of matches.filter(x => x.bracketMeta.round === 1)) {
          const present = [m.homeTeamId, m.awayTeamId].filter(Boolean)
          expect(present.length).toBeGreaterThanOrEqual(1)
        }
      })
    )
  })
})
