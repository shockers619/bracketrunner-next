import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { resolvePoolsToBracket, type Pool, type AdvancementRule } from '@/lib/engine/poolToBracketAdvancement'
import type { Match, Team } from '@/lib/engine/types'

function remapMatchIds(matches: Match[]): Match[] {
  const idMap = new Map(matches.map(m => [m.id, randomUUID()]))
  return matches.map(m => ({
    ...m,
    id: idMap.get(m.id)!,
    bracketMeta: {
      ...m.bracketMeta,
      nextMatchId: m.bracketMeta.nextMatchId ? idMap.get(m.bracketMeta.nextMatchId) || null : null,
      loserNextMatchId: m.bracketMeta.loserNextMatchId
        ? idMap.get(m.bracketMeta.loserNextMatchId) || null
        : m.bracketMeta.loserNextMatchId,
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
  const supabase = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } })

  const body = await req.json() as {
    eventId: string
    divisionId: string
    format: 'single_elimination' | 'double_elimination'
    pointDifferentialCap?: number
  }

  try {
    // Guard against running this twice — without this, a second resolve
    // silently inserts a SECOND set of bracket matches with round/position
    // numbering that collides with the first, and downstream rendering
    // can't tell them apart. Reject clearly instead.
    const { data: existingBracketMatches, error: existingErr } = await supabase
      .from('matches')
      .select('id')
      .eq('division_id', body.divisionId)
      .is('bracket_meta->>poolId', null)
      .limit(1)
    if (existingErr) throw new Error(`Checking for existing bracket: ${existingErr.message}`)
    if (existingBracketMatches && existingBracketMatches.length > 0) {
      throw new Error(
        'A bracket has already been generated for this division. Delete the existing bracket matches first if you need to regenerate it.'
      )
    }

    const { data: poolRows, error: poolErr } = await supabase
      .from('pools')
      .select('id, name')
      .eq('division_id', body.divisionId)
    if (poolErr) throw new Error(`Loading pools: ${poolErr.message}`)
    if (!poolRows?.length) throw new Error('No pools found for this division')

    const { data: poolTeamRows, error: ptErr } = await supabase
      .from('pool_teams')
      .select('pool_id, team_id, teams(id, name, seed)')
      .in('pool_id', poolRows.map(p => p.id))
    if (ptErr) throw new Error(`Loading pool teams: ${ptErr.message}`)

    const pools: Pool[] = poolRows.map(p => ({
      id: p.id,
      name: p.name,
      teams: (poolTeamRows || [])
        .filter(pt => pt.pool_id === p.id)
        .map(pt => {
          const t = pt.teams as unknown as { id: string; name: string; seed: number | null }
          return { id: t.id, name: t.name, seed: t.seed ?? 1 } as Team
        }),
    }))

    const { data: matchRows, error: matchErr } = await supabase
      .from('matches')
      .select('id, division_id, court_id, home_team_id, away_team_id, start_time, duration_minutes, home_score, away_score, status, bracket_meta')
      .eq('division_id', body.divisionId)
      .not('bracket_meta->>poolId', 'is', null)
    if (matchErr) throw new Error(`Loading pool matches: ${matchErr.message}`)

    const poolMatches: Match[] = (matchRows || []).map(m => ({
      id: m.id,
      divisionId: m.division_id,
      courtId: m.court_id,
      homeTeamId: m.home_team_id,
      awayTeamId: m.away_team_id,
      startTime: m.start_time,
      durationMinutes: m.duration_minutes,
      homeScore: m.home_score,
      awayScore: m.away_score,
      status: m.status,
      bracketMeta: m.bracket_meta,
    }))

    const { data: ruleRows, error: rulesErr } = await supabase
      .from('advancement_rules')
      .select('source_pool_id, source_position, target_seed')
      .eq('division_id', body.divisionId)
    if (rulesErr) throw new Error(`Loading advancement rules: ${rulesErr.message}`)
    if (!ruleRows?.length) throw new Error('No advancement rules configured for this division')

    const rules: AdvancementRule[] = ruleRows.map(r => ({
      sourcePoolId: r.source_pool_id,
      sourcePosition: r.source_position,
      targetSeed: r.target_seed,
    }))

    const { matches: bracketMatches, standingsByPool } = resolvePoolsToBracket(pools, poolMatches, rules, {
      divisionId: body.divisionId,
      format: body.format,
      standingsOptions: body.pointDifferentialCap ? { pointDifferentialCap: body.pointDifferentialCap } : undefined,
    })

    const remapped = remapMatchIds(bracketMatches)
    const { error: insertErr } = await supabase.from('matches').insert(
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
    if (insertErr) throw new Error(`Inserting bracket matches: ${insertErr.message}`)

    const standingsSummary = Object.fromEntries(
      [...standingsByPool.entries()].map(([poolId, result]) => [poolId, result.standings])
    )

    return NextResponse.json({ bracketMatchCount: remapped.length, standingsSummary })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
