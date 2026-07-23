import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { generateRoundRobin } from '@/lib/engine/roundRobin'
import type { Match } from '@/lib/engine/types'

interface PoolInput {
  name: string
  teamIds: string[]
}
interface AdvancementRuleInput {
  poolIndex: number       // index into the pools array below
  sourcePosition: number
  targetSeed: number
}

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

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const body = await req.json() as {
    eventId: string
    divisionId: string
    pools: PoolInput[]
    advancementRules: AdvancementRuleInput[]
    teamNamesById: Record<string, string>
  }

  if (!body.eventId || !body.divisionId || !body.pools?.length) {
    return NextResponse.json({ error: 'Missing eventId, divisionId, or pools' }, { status: 400 })
  }

  try {
    const poolIds: string[] = []

    for (const pool of body.pools) {
      const { data: poolRow, error: poolErr } = await supabase
        .from('pools')
        .insert({ event_id: body.eventId, division_id: body.divisionId, name: pool.name })
        .select()
        .single()
      if (poolErr) throw new Error(`Creating pool "${pool.name}": ${poolErr.message}`)
      poolIds.push(poolRow.id)

      const { error: ptErr } = await supabase.from('pool_teams').insert(
        pool.teamIds.map((teamId, i) => ({ pool_id: poolRow.id, team_id: teamId, seed_in_pool: i + 1 }))
      )
      if (ptErr) throw new Error(`Assigning teams to "${pool.name}": ${ptErr.message}`)

      // Generate round-robin schedule for this pool and insert as matches
      const teams = pool.teamIds.map((id, i) => ({ id, name: body.teamNamesById[id] || id, seed: i + 1 }))
      if (teams.length >= 2) {
        const generated = generateRoundRobin(teams, { divisionId: body.divisionId, poolId: poolRow.id })
        const remapped = remapMatchIds(generated)
        const { error: matchErr } = await supabase.from('matches').insert(
          remapped.map(m => ({
            id: m.id,
            event_id: body.eventId,
            division_id: body.divisionId,
            court_id: null,
            home_team_id: m.homeTeamId,
            away_team_id: m.awayTeamId,
            start_time: null,
            duration_minutes: m.durationMinutes,
            home_score: m.homeScore,
            away_score: m.awayScore,
            status: m.status,
            bracket_meta: m.bracketMeta,
          }))
        )
        if (matchErr) throw new Error(`Generating schedule for "${pool.name}": ${matchErr.message}`)
      }
    }

    if (body.advancementRules?.length) {
      const { error: rulesErr } = await supabase.from('advancement_rules').insert(
        body.advancementRules.map(r => ({
          event_id: body.eventId,
          division_id: body.divisionId,
          source_pool_id: poolIds[r.poolIndex],
          source_position: r.sourcePosition,
          target_seed: r.targetSeed,
        }))
      )
      if (rulesErr) throw new Error(`Saving advancement rules: ${rulesErr.message}`)
    }

    return NextResponse.json({ poolIds })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
