import type { SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { generateRoundRobin } from './engine/roundRobin'
import type { Match } from './engine/types'

// Server-only helper (imports node 'crypto') shared by /api/intake and
// /api/pools/generate so pool creation lives in exactly one place.

export interface PoolInput {
  name: string
  teamIds: string[]
}
export interface AdvancementRuleInput {
  poolIndex: number
  sourcePosition: number
  targetSeed: number
}

// Engine ids are deterministic per generation run; swap them for real UUIDs
// before persisting so rows never collide across pools/divisions.
function remapMatchIds(matches: Match[]): Match[] {
  const idMap = new Map(matches.map(m => [m.id, randomUUID()]))
  return matches.map(m => ({
    ...m,
    id: idMap.get(m.id)!,
    bracketMeta: {
      ...m.bracketMeta,
      nextMatchId: m.bracketMeta.nextMatchId ? idMap.get(m.bracketMeta.nextMatchId) || null : null,
    },
  }))
}

/**
 * Persists a division's pools: inserts each pool + its pool_teams, generates
 * and inserts a round-robin schedule per pool (pools of <2 teams get no
 * matches), and records the advancement rules. Throws on the first DB error so
 * the caller can abort/clean up. Returns the created pool ids in input order
 * (advancementRules[].poolIndex indexes into that order).
 */
export async function createPoolsForDivision(
  supabase: SupabaseClient,
  args: {
    eventId: string
    divisionId: string
    pools: PoolInput[]
    advancementRules: AdvancementRuleInput[]
    teamNamesById: Record<string, string>
    /** Division's configured game length; overrides the generator's placeholder. */
    gameDurationMinutes?: number
  }
): Promise<{ poolIds: string[] }> {
  const { eventId, divisionId, pools, advancementRules, teamNamesById, gameDurationMinutes } = args
  const poolIds: string[] = []

  for (const pool of pools) {
    const { data: poolRow, error: poolErr } = await supabase
      .from('pools')
      .insert({ event_id: eventId, division_id: divisionId, name: pool.name })
      .select()
      .single()
    if (poolErr) throw new Error(`Creating pool "${pool.name}": ${poolErr.message}`)
    poolIds.push(poolRow.id)

    const { error: ptErr } = await supabase.from('pool_teams').insert(
      pool.teamIds.map((teamId, i) => ({ pool_id: poolRow.id, team_id: teamId, seed_in_pool: i + 1 }))
    )
    if (ptErr) throw new Error(`Assigning teams to "${pool.name}": ${ptErr.message}`)

    const teams = pool.teamIds.map((id, i) => ({ id, name: teamNamesById[id] || id, seed: i + 1 }))
    if (teams.length >= 2) {
      const generated = generateRoundRobin(teams, { divisionId, poolId: poolRow.id })
      const remapped = remapMatchIds(generated)
      const { error: matchErr } = await supabase.from('matches').insert(
        remapped.map(m => ({
          id: m.id,
          event_id: eventId,
          division_id: divisionId,
          court_id: null,
          home_team_id: m.homeTeamId,
          away_team_id: m.awayTeamId,
          start_time: null,
          duration_minutes: gameDurationMinutes ?? m.durationMinutes,
          home_score: m.homeScore,
          away_score: m.awayScore,
          status: m.status,
          bracket_meta: m.bracketMeta,
        }))
      )
      if (matchErr) throw new Error(`Generating schedule for "${pool.name}": ${matchErr.message}`)
    }
  }

  if (advancementRules.length) {
    const { error: rulesErr } = await supabase.from('advancement_rules').insert(
      advancementRules.map(r => ({
        event_id: eventId,
        division_id: divisionId,
        source_pool_id: poolIds[r.poolIndex],
        source_position: r.sourcePosition,
        target_seed: r.targetSeed,
      }))
    )
    if (rulesErr) throw new Error(`Saving advancement rules: ${rulesErr.message}`)
  }

  return { poolIds }
}
