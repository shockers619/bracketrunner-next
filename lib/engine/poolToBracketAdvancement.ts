import type { Team, Match } from './types'
import { computeStandings, type StandingsOptions } from './standings'
import { generateSingleEliminationBracket } from './bracket'
import { generateDoubleEliminationBracket } from './doubleElimination'

export interface Pool {
  id: string
  name: string
  teams: Team[]
}

export interface AdvancementRule {
  sourcePoolId: string
  sourcePosition: number  // 1 = pool winner, 2 = runner-up, etc.
  targetSeed: number
}

export interface ResolveOptions {
  divisionId: string
  format: 'single_elimination' | 'double_elimination'
  standingsOptions?: StandingsOptions
}

export class PoolsNotCompleteError extends Error {
  constructor(public incompletePoolIds: string[]) {
    super(`Cannot resolve to bracket — pool(s) still have unplayed matches: ${incompletePoolIds.join(', ')}`)
  }
}

export class InvalidAdvancementRulesError extends Error {}

/**
 * Validates that every match in every pool is completed. Call this before
 * resolvePoolsToBracket — the brief's "when all games in a pool reach
 * STATUS_COMPLETED" trigger condition is checked here explicitly rather than
 * assumed, so a partially-finished pool can't silently produce a bracket
 * seeded from incomplete standings.
 */
export function checkPoolsComplete(pools: Pool[], poolMatches: Match[]): void {
  const incomplete = pools.filter(pool => {
    const matches = poolMatches.filter(m => m.bracketMeta.poolId === pool.id)
    return matches.length === 0 || matches.some(m => m.status !== 'completed')
  })
  if (incomplete.length > 0) {
    throw new PoolsNotCompleteError(incomplete.map(p => p.id))
  }
}

/**
 * Resolves completed pool play into a seeded elimination bracket. For each
 * advancement rule, looks up the team that finished at `sourcePosition` in
 * `sourcePool`'s final standings, assigns it `targetSeed`, then generates
 * the bracket using the SAME tested generateSingleEliminationBracket /
 * generateDoubleEliminationBracket functions used everywhere else — this
 * deliberately does not reimplement bracket generation for the pool-play
 * case, it just builds the seeded team list differently.
 *
 * Throws PoolsNotCompleteError if any pool has unplayed matches, and
 * InvalidAdvancementRulesError if the rules reference a pool/position that
 * doesn't exist, are missing, or produce duplicate/invalid seed numbers.
 */
export function resolvePoolsToBracket(
  pools: Pool[],
  poolMatches: Match[],
  rules: AdvancementRule[],
  opts: ResolveOptions
): { matches: Match[]; standingsByPool: Map<string, ReturnType<typeof computeStandings>> } {
  checkPoolsComplete(pools, poolMatches)

  const standingsByPool = new Map<string, ReturnType<typeof computeStandings>>()
  for (const pool of pools) {
    const matches = poolMatches.filter(m => m.bracketMeta.poolId === pool.id)
    standingsByPool.set(pool.id, computeStandings(pool.teams, matches, opts.standingsOptions))
  }

  const seededTeams: Team[] = []
  const seenSeeds = new Set<number>()

  for (const rule of rules) {
    const pool = pools.find(p => p.id === rule.sourcePoolId)
    if (!pool) {
      throw new InvalidAdvancementRulesError(`Advancement rule references unknown pool "${rule.sourcePoolId}"`)
    }
    const standings = standingsByPool.get(pool.id)!
    const row = standings.standings[rule.sourcePosition - 1]
    if (!row) {
      throw new InvalidAdvancementRulesError(
        `Pool "${pool.name}" has no team at position ${rule.sourcePosition} (only ${standings.standings.length} teams)`
      )
    }
    if (seenSeeds.has(rule.targetSeed)) {
      throw new InvalidAdvancementRulesError(`Target seed ${rule.targetSeed} is assigned by more than one advancement rule`)
    }
    seenSeeds.add(rule.targetSeed)

    const team = pool.teams.find(t => t.id === row.teamId)!
    seededTeams.push({ id: team.id, name: team.name, seed: rule.targetSeed })
  }

  const sortedSeeds = [...seenSeeds].sort((a, b) => a - b)
  for (let i = 0; i < sortedSeeds.length; i++) {
    if (sortedSeeds[i] !== i + 1) {
      throw new InvalidAdvancementRulesError(
        `Target seeds must be contiguous starting at 1 — got [${sortedSeeds.join(', ')}]`
      )
    }
  }

  seededTeams.sort((a, b) => a.seed - b.seed)

  const matches = opts.format === 'double_elimination'
    ? generateDoubleEliminationBracket(seededTeams, { divisionId: opts.divisionId })
    : generateSingleEliminationBracket(seededTeams, { divisionId: opts.divisionId })

  return { matches, standingsByPool }
}
