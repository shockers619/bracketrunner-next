import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { snakeSeedPools, buildAdvancementRules } from './poolAssignment'
import type { Team } from './types'

function makeTeams(n: number): Team[] {
  return Array.from({ length: n }, (_, i) => ({ id: `t${i + 1}`, name: `Team ${i + 1}`, seed: i + 1 }))
}

describe('snakeSeedPools', () => {
  it('throws on invalid pool counts', () => {
    expect(() => snakeSeedPools(makeTeams(4), 0)).toThrow()
    expect(() => snakeSeedPools(makeTeams(2), 3)).toThrow(/Cannot form/i)
  })

  it('snake-seeds 8 teams into 2 balanced pools', () => {
    const pools = snakeSeedPools(makeTeams(8), 2)
    expect(pools.map(p => p.poolName)).toEqual(['Pool A', 'Pool B'])
    expect(pools[0].teams.map(t => t.seed)).toEqual([1, 4, 5, 8])
    expect(pools[1].teams.map(t => t.seed)).toEqual([2, 3, 6, 7])
  })

  it('places unseeded teams last, after all seeded teams', () => {
    const teams: Team[] = [
      { id: 'a', name: 'a', seed: 2 },
      { id: 'b', name: 'b', seed: 1 },
      { id: 'c', name: 'c', seed: null as unknown as number },
    ]
    const pools = snakeSeedPools(teams, 1)
    expect(pools[0].teams.map(t => t.id)).toEqual(['b', 'a', 'c'])
  })

  it('property: every team lands in exactly one pool, pools balanced within 1', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 32 }),
        fc.integer({ min: 1, max: 8 }),
        (n, p) => {
          fc.pre(n >= p)
          const pools = snakeSeedPools(makeTeams(n), p)
          const allIds = pools.flatMap(pool => pool.teams.map(t => t.id))
          expect(new Set(allIds).size).toBe(n) // each team once
          expect(allIds).toHaveLength(n)
          const sizes = pools.map(pool => pool.teams.length)
          expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1)
        }
      )
    )
  })
})

describe('buildAdvancementRules', () => {
  it('interleaves rank across pools so winners get the top seeds', () => {
    const rules = buildAdvancementRules([4, 4], 2)
    expect(rules).toEqual([
      { poolIndex: 0, sourcePosition: 1, targetSeed: 1 },
      { poolIndex: 1, sourcePosition: 1, targetSeed: 2 },
      { poolIndex: 0, sourcePosition: 2, targetSeed: 3 },
      { poolIndex: 1, sourcePosition: 2, targetSeed: 4 },
    ])
  })

  it('gracefully drops ranks that a smaller pool cannot fill', () => {
    // Pool B has only 2 teams, so nobody finishes 3rd there.
    const rules = buildAdvancementRules([4, 2], 3)
    expect(rules.map(r => r.targetSeed)).toEqual([1, 2, 3, 4, 5]) // contiguous
    // the only rank-3 rule is for pool 0
    const rank3 = rules.filter(r => r.sourcePosition === 3)
    expect(rank3).toEqual([{ poolIndex: 0, sourcePosition: 3, targetSeed: 5 }])
  })

  it('property: seeds are always contiguous 1..k and count = sum of min(size, advancing)', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 10 }), { minLength: 1, maxLength: 6 }),
        fc.integer({ min: 1, max: 4 }),
        (poolSizes, advancing) => {
          const rules = buildAdvancementRules(poolSizes, advancing)
          const expectedCount = poolSizes.reduce((sum, s) => sum + Math.min(s, advancing), 0)
          expect(rules).toHaveLength(expectedCount)
          expect(rules.map(r => r.targetSeed)).toEqual(Array.from({ length: expectedCount }, (_, i) => i + 1))
        }
      )
    )
  })
})
