import { describe, it, expect } from 'vitest'
import {
  resolvePoolsToBracket,
  checkPoolsComplete,
  PoolsNotCompleteError,
  InvalidAdvancementRulesError,
  type Pool,
  type AdvancementRule,
} from './poolToBracketAdvancement'
import type { Match, Team } from './types'

function team(id: string): Team {
  return { id, name: id, seed: 1 }
}

let seq = 0
function poolGame(poolId: string, home: string, away: string, hs: number, as_: number, status: Match['status'] = 'completed'): Match {
  seq += 1
  return {
    id: `pg${seq}`,
    divisionId: 'd1',
    courtId: null,
    homeTeamId: home,
    awayTeamId: away,
    startTime: null,
    durationMinutes: 60,
    homeScore: hs,
    awayScore: as_,
    status,
    bracketMeta: { round: 1, position: 0, nextMatchId: null, nextMatchSlot: null, poolId },
  }
}

// Two pools of two; each pool plays one decisive game.
function twoPools(): { pools: Pool[]; matches: Match[] } {
  const pools: Pool[] = [
    { id: 'A', name: 'Pool A', teams: [team('A1'), team('A2')] },
    { id: 'B', name: 'Pool B', teams: [team('B1'), team('B2')] },
  ]
  const matches = [poolGame('A', 'A1', 'A2', 10, 0), poolGame('B', 'B1', 'B2', 10, 0)]
  return { pools, matches }
}

describe('checkPoolsComplete', () => {
  it('passes when every pool game is completed', () => {
    const { pools, matches } = twoPools()
    expect(() => checkPoolsComplete(pools, matches)).not.toThrow()
  })

  it('throws PoolsNotCompleteError naming the unfinished pool', () => {
    const { pools, matches } = twoPools()
    matches[1].status = 'in_progress'
    try {
      checkPoolsComplete(pools, matches)
      expect.unreachable('should have thrown')
    } catch (err) {
      expect(err).toBeInstanceOf(PoolsNotCompleteError)
      expect((err as PoolsNotCompleteError).incompletePoolIds).toContain('B')
    }
  })
})

describe('resolvePoolsToBracket', () => {
  it('seeds a bracket from final pool standings', () => {
    const { pools, matches } = twoPools()
    const rules: AdvancementRule[] = [
      { sourcePoolId: 'A', sourcePosition: 1, targetSeed: 1 },
      { sourcePoolId: 'B', sourcePosition: 1, targetSeed: 2 },
      { sourcePoolId: 'A', sourcePosition: 2, targetSeed: 3 },
      { sourcePoolId: 'B', sourcePosition: 2, targetSeed: 4 },
    ]
    const { matches: bracket } = resolvePoolsToBracket(pools, matches, rules, {
      divisionId: 'd1',
      format: 'single_elimination',
    })
    expect(bracket).toHaveLength(3) // 4-team single elim
    const r1 = bracket
      .filter(m => m.bracketMeta.round === 1)
      .sort((a, b) => a.bracketMeta.position - b.bracketMeta.position)
    // seedOrder(4) = [1,4,2,3]; pool winners A1 (seed1) vs B2 (seed4)
    expect(r1[0].homeTeamId).toBe('A1')
    expect(r1[0].awayTeamId).toBe('B2')
  })

  it('throws when pools are not complete', () => {
    const { pools, matches } = twoPools()
    matches[0].status = 'scheduled'
    expect(() =>
      resolvePoolsToBracket(pools, matches, [{ sourcePoolId: 'A', sourcePosition: 1, targetSeed: 1 }], {
        divisionId: 'd1',
        format: 'single_elimination',
      })
    ).toThrow(PoolsNotCompleteError)
  })

  it('rejects rules that reference an unknown pool', () => {
    const { pools, matches } = twoPools()
    expect(() =>
      resolvePoolsToBracket(pools, matches, [{ sourcePoolId: 'Z', sourcePosition: 1, targetSeed: 1 }], {
        divisionId: 'd1',
        format: 'single_elimination',
      })
    ).toThrow(InvalidAdvancementRulesError)
  })

  it('rejects a source position that does not exist in the pool', () => {
    const { pools, matches } = twoPools()
    expect(() =>
      resolvePoolsToBracket(pools, matches, [{ sourcePoolId: 'A', sourcePosition: 3, targetSeed: 1 }], {
        divisionId: 'd1',
        format: 'single_elimination',
      })
    ).toThrow(InvalidAdvancementRulesError)
  })

  it('rejects duplicate target seeds', () => {
    const { pools, matches } = twoPools()
    expect(() =>
      resolvePoolsToBracket(
        pools,
        matches,
        [
          { sourcePoolId: 'A', sourcePosition: 1, targetSeed: 1 },
          { sourcePoolId: 'B', sourcePosition: 1, targetSeed: 1 },
        ],
        { divisionId: 'd1', format: 'single_elimination' }
      )
    ).toThrow(InvalidAdvancementRulesError)
  })

  it('rejects non-contiguous target seeds', () => {
    const { pools, matches } = twoPools()
    expect(() =>
      resolvePoolsToBracket(
        pools,
        matches,
        [
          { sourcePoolId: 'A', sourcePosition: 1, targetSeed: 1 },
          { sourcePoolId: 'B', sourcePosition: 1, targetSeed: 3 },
        ],
        { divisionId: 'd1', format: 'single_elimination' }
      )
    ).toThrow(InvalidAdvancementRulesError)
  })
})
