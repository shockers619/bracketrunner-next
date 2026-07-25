import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { IntakeState, DivisionDraft, TeamDraft } from '@/lib/intakeTypes'
import { orderedForSeeding, DEFAULT_POOL_CONFIG } from '@/lib/intakeTypes'
import { generateSingleEliminationBracket } from '@/lib/engine/bracket'
import { generateRoundRobin } from '@/lib/engine/roundRobin'
import { generateDoubleEliminationBracket } from '@/lib/engine/doubleElimination'
import { snakeSeedPools, buildAdvancementRules } from '@/lib/engine/poolAssignment'
import { createPoolsForDivision } from '@/lib/poolSetup'
import type { Match, Team } from '@/lib/engine/types'

function assignSeeds(teams: TeamDraft[]): { engineTeams: Team[]; clubNameById: Map<string, string | undefined> } {
  const clubNameById = new Map<string, string | undefined>()
  const engineTeams = orderedForSeeding(teams).map((t, i) => {
    const id = randomUUID()
    clubNameById.set(id, t.clubName)
    return { id, name: t.name, seed: i + 1 }
  })
  return { engineTeams, clubNameById }
}

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

function generateMatchesForDivision(division: DivisionDraft, teams: Team[]): { matches: Match[]; warning?: string } {
  if (teams.length < 2) {
    return { matches: [], warning: `"${division.name}": needs at least 2 teams to generate a schedule — skipped.` }
  }
  try {
    if (division.format === 'round_robin') {
      return { matches: generateRoundRobin(teams, { divisionId: division.localId, poolId: 'main' }) }
    }
    if (division.format === 'single_elimination') {
      return { matches: generateSingleEliminationBracket(teams, { divisionId: division.localId }) }
    }
    if (division.format === 'double_elimination') {
      // Non-power-of-2 counts are handled by the engine via round-1 byes to the
      // top seeds (see generateDoubleEliminationBracket) — no guard needed.
      return { matches: generateDoubleEliminationBracket(teams, { divisionId: division.localId }) }
    }
    return {
      matches: [],
      warning: `"${division.name}": pool play → bracket requires assigning teams to pools, which isn't in the intake form yet — schedule not generated.`,
    }
  } catch (err) {
    return { matches: [], warning: `"${division.name}": ${(err as Error).message}` }
  }
}

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return NextResponse.json(
      { error: 'Supabase is not configured yet. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.' },
      { status: 503 }
    )
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const accessToken = authHeader.slice('Bearer '.length)

  // Uses the ANON key plus the director's own access token — NOT the
  // service-role key. Every insert below goes through real RLS policies as
  // this specific user, not as an all-access service account. If they try
  // to submit under a tenant they don't belong to, RLS rejects it.
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
  const body = (await req.json()) as IntakeState

  if (!body.tenantId) return NextResponse.json({ error: 'Missing tenantId' }, { status: 400 })
  if (!body.event.title || !body.event.slug || !body.event.sport || !body.event.startDate || !body.event.endDate) {
    return NextResponse.json({ error: 'Event details are incomplete' }, { status: 400 })
  }
  if (body.divisions.length === 0) {
    return NextResponse.json({ error: 'At least one division is required' }, { status: 400 })
  }

  const warnings: string[] = []

  // Declared outside the try block so the catch handler below can clean up
  // a partially-created event if a LATER step fails — without this, a
  // failed intake attempt (e.g. the no_self_match bug) leaves an orphaned
  // event behind, and retrying with the same name/slug fails with a
  // confusing duplicate-key error instead of just working.
  let eventRow: { id: string; slug: string } | null = null

  try {
    const { data: insertedEvent, error: eventErr } = await supabase
      .from('events')
      .insert({
        tenant_id: body.tenantId,
        title: body.event.title,
        slug: body.event.slug,
        sport: body.event.sport,
        start_date: body.event.startDate,
        end_date: body.event.endDate,
        daily_start_time: body.event.dailyStartTime || '08:00',
        daily_end_time: body.event.dailyEndTime || '20:00',
      })
      .select()
      .single()
    if (eventErr) throw new Error(`Creating event: ${eventErr.message}`)
    eventRow = insertedEvent

    for (const v of body.venues) {
      const { data: venueRow, error: venueErr } = await supabase
        .from('venues')
        .insert({ name: v.name, address: v.address, city: v.city, state: v.state })
        .select()
        .single()
      if (venueErr) throw new Error(`Creating venue "${v.name}": ${venueErr.message}`)

      // Record that THIS event is played here. Venues are shared network-wide,
      // so the association has to live in a join table — without it the
      // scheduler has no way to know which surfaces the event may use.
      const { error: linkErr } = await supabase
        .from('event_venues')
        .insert({ event_id: eventRow!.id, venue_id: venueRow.id })
      if (linkErr) throw new Error(`Linking venue "${v.name}" to the event: ${linkErr.message}`)

      for (const c of v.courts) {
        const { error: courtErr } = await supabase
          .from('courts')
          .insert({ venue_id: venueRow.id, name: c.name, sport_type: body.event.sport })
        if (courtErr) throw new Error(`Creating court "${c.name}": ${courtErr.message}`)
      }
    }

    for (const d of body.divisions) {
      const { data: divisionRow, error: divErr } = await supabase
        .from('divisions')
        .insert({
          event_id: eventRow!.id,
          name: d.name,
          format: d.format,
          min_rest_minutes: d.minRestMinutes,
          game_duration_minutes: d.gameDurationMinutes,
          buffer_minutes: d.bufferMinutes,
        })
        .select()
        .single()
      if (divErr) throw new Error(`Creating division "${d.name}": ${divErr.message}`)

      const teamDrafts = body.teamsByDivision[d.localId] || []
      const { engineTeams: seededTeams, clubNameById } = assignSeeds(teamDrafts)

      if (seededTeams.length > 0) {
        const { error: teamsErr } = await supabase.from('teams').insert(
          seededTeams.map(t => ({
            id: t.id,
            division_id: divisionRow.id,
            name: t.name,
            club_name: clubNameById.get(t.id) || null,
            seed: t.seed,
          }))
        )
        if (teamsErr) throw new Error(`Adding teams to "${d.name}": ${teamsErr.message}`)
      }

      if (d.format === 'pool_to_bracket') {
        // Pool play: snake-seed the teams into pools and generate a round-robin
        // schedule per pool right here at intake, using the config the director
        // set in the wizard. Resolution to the elimination bracket happens later
        // (once pool games are played) from the event page.
        const cfg = body.poolConfigByDivision?.[d.localId]
        const poolCount = cfg?.poolCount ?? DEFAULT_POOL_CONFIG.poolCount
        const advancingPerPool = cfg?.advancingPerPool ?? DEFAULT_POOL_CONFIG.advancingPerPool

        if (seededTeams.length < 2) {
          warnings.push(`"${d.name}": needs at least 2 teams for pool play — pools not generated.`)
        } else if (poolCount < 1 || poolCount > seededTeams.length) {
          warnings.push(`"${d.name}": ${poolCount} pool(s) can't be formed from ${seededTeams.length} teams — pools not generated.`)
        } else {
          const assignment = snakeSeedPools(seededTeams, poolCount)
          await createPoolsForDivision(supabase, {
            eventId: eventRow!.id,
            divisionId: divisionRow.id,
            pools: assignment.map(a => ({ name: a.poolName, teamIds: a.teams.map(t => t.id) })),
            advancementRules: buildAdvancementRules(assignment.map(a => a.teams.length), advancingPerPool),
            teamNamesById: Object.fromEntries(seededTeams.map(t => [t.id, t.name])),
            gameDurationMinutes: d.gameDurationMinutes,
          })
        }
      } else {
        const { matches, warning } = generateMatchesForDivision(d, seededTeams)
        if (warning) warnings.push(warning)

        if (matches.length > 0) {
          const remapped = remapMatchIds(matches)
          const { error: matchesErr } = await supabase.from('matches').insert(
            remapped.map(m => ({
              id: m.id,
              event_id: eventRow!.id,
              division_id: divisionRow.id,
              court_id: null,
              home_team_id: m.homeTeamId,
              away_team_id: m.awayTeamId,
              start_time: null,
              // The generators emit a placeholder 60; the division's configured
              // game length is the real value the scheduler will work from.
              duration_minutes: d.gameDurationMinutes,
              home_score: m.homeScore,
              away_score: m.awayScore,
              status: m.status,
              bracket_meta: m.bracketMeta,
            }))
          )
          if (matchesErr) throw new Error(`Generating schedule for "${d.name}": ${matchesErr.message}`)
        }
      }
    }

    return NextResponse.json({ eventId: eventRow!.id, slug: eventRow!.slug, warnings })
  } catch (err) {
    // If the event itself was already created before something downstream
    // failed, delete it so the slug/title are free again on retry — divisions,
    // teams, and matches all cascade-delete via their event_id foreign key.
    // Venues/courts are intentionally NOT deleted here: they're shared
    // network-wide infrastructure, not owned by any single event.
    if (eventRow) {
      await supabase.from('events').delete().eq('id', eventRow.id)
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
