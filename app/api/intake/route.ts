import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { IntakeState, DivisionDraft, TeamDraft } from '@/lib/intakeTypes'
import { generateSingleEliminationBracket } from '@/lib/engine/bracket'
import { generateRoundRobin } from '@/lib/engine/roundRobin'
import { generateDoubleEliminationBracket } from '@/lib/engine/doubleElimination'
import type { Match, Team } from '@/lib/engine/types'

function assignSeeds(teams: TeamDraft[]): { engineTeams: Team[]; clubNameById: Map<string, string | undefined> } {
  const seeded = teams.filter(t => t.seed != null).sort((a, b) => (a.seed! - b.seed!))
  const unseeded = teams.filter(t => t.seed == null)
  const clubNameById = new Map<string, string | undefined>()
  const engineTeams = [...seeded, ...unseeded].map((t, i) => {
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
      const n = teams.length
      if ((n & (n - 1)) !== 0) {
        return {
          matches: [],
          warning: `"${division.name}": double elimination currently requires a power-of-2 team count (got ${n}) — schedule not generated. Add/remove teams to reach 2, 4, 8, 16, etc.`,
        }
      }
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
        .insert({ event_id: eventRow!.id, name: d.name, format: d.format, min_rest_minutes: d.minRestMinutes })
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
            duration_minutes: m.durationMinutes,
            home_score: m.homeScore,
            away_score: m.awayScore,
            status: m.status,
            bracket_meta: m.bracketMeta,
          }))
        )
        if (matchesErr) throw new Error(`Generating schedule for "${d.name}": ${matchesErr.message}`)
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
