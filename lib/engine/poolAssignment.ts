import type { Team } from './types'

export interface PoolAssignment {
  poolName: string
  teams: Team[]
}

/**
 * Snake-seeds teams across `poolCount` pools based on their seed ranking.
 * Standard tournament snake pattern: pool order goes 1,2,3...N then reverses
 * N,N-1...1 for the next row, alternating — this is what keeps pools
 * balanced instead of just dumping the top N teams into Pool A. Teams
 * without an explicit seed are treated as lowest-ranked, in array order,
 * after all seeded teams.
 *
 * Example with 8 teams, 2 pools (seeds 1-8):
 *   Row 1: Pool A <- seed 1, Pool B <- seed 2
 *   Row 2 (reversed): Pool B <- seed 3, Pool A <- seed 4
 *   Row 3: Pool A <- seed 5, Pool B <- seed 6
 *   Row 4 (reversed): Pool B <- seed 7, Pool A <- seed 8
 *   => Pool A: 1,4,5,8   Pool B: 2,3,6,7
 */
export function snakeSeedPools(teams: Team[], poolCount: number): PoolAssignment[] {
  if (poolCount < 1) throw new Error('poolCount must be at least 1')
  if (teams.length < poolCount) {
    throw new Error(`Cannot form ${poolCount} pools from only ${teams.length} teams`)
  }

  const seeded = teams.filter(t => t.seed != null).sort((a, b) => a.seed! - b.seed!)
  const unseeded = teams.filter(t => t.seed == null)
  const ordered = [...seeded, ...unseeded]

  const pools: Team[][] = Array.from({ length: poolCount }, () => [])

  ordered.forEach((team, i) => {
    const row = Math.floor(i / poolCount)
    const posInRow = i % poolCount
    const poolIndex = row % 2 === 0 ? posInRow : poolCount - 1 - posInRow
    pools[poolIndex].push(team)
  })

  return pools.map((poolTeams, i) => ({
    poolName: `Pool ${String.fromCharCode(65 + i)}`, // Pool A, Pool B, ...
    teams: poolTeams,
  }))
}
