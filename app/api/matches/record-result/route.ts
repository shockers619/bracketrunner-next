import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordResult } from '@/lib/engine/advancement'
import { getDefaultAnomalyBounds } from '@/lib/engine/anomalyDefaults'
import type { Match } from '@/lib/engine/types'

// Temporary test-only endpoint: calls the REAL tested recordResult() engine
// function (score entry + winner advancement into the next bracket slot),
// so a bracket can be completed correctly without waiting for the full
// Module 2 score-entry UI. This is legitimate first-slice infrastructure
// for that UI, not a hack — the advancement logic itself is unchanged.
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

  const body = await req.json() as { matchId: string; homeScore: number; awayScore: number; confirmed?: boolean }
  if (!body.matchId || body.homeScore == null || body.awayScore == null) {
    return NextResponse.json({ error: 'Missing matchId, homeScore, or awayScore' }, { status: 400 })
  }

  try {
    const { data: targetMatch, error: fetchErr } = await supabase
      .from('matches')
      .select('division_id, event_id')
      .eq('id', body.matchId)
      .single()
    if (fetchErr) throw new Error(`Loading match: ${fetchErr.message}`)

    // Anomaly bounds depend on the event's sport (a 105-38 hoops score
    // reads as a typo; the same numbers mean nothing for volleyball).
    const { data: eventRow } = await supabase
      .from('events')
      .select('sport')
      .eq('id', targetMatch.event_id)
      .single()
    const anomalyBounds = getDefaultAnomalyBounds(eventRow?.sport)

    // recordResult needs the FULL match set for this division, since it
    // writes the winner into a SIBLING row (the next bracket match).
    const { data: divisionMatchRows, error: divErr } = await supabase
      .from('matches')
      .select('id, division_id, court_id, home_team_id, away_team_id, start_time, duration_minutes, home_score, away_score, status, bracket_meta')
      .eq('division_id', targetMatch.division_id)
    if (divErr) throw new Error(`Loading division matches: ${divErr.message}`)

    const matches: Match[] = (divisionMatchRows || []).map(m => ({
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

    const { data: { user } } = await supabase.auth.getUser()
    const result = recordResult(matches, body.matchId, body.homeScore, body.awayScore, {
      userId: user?.id || 'unknown',
      anomalyBounds,
      confirmed: body.confirmed,
    })

    // Only write back rows that actually changed (the completed match, plus
    // whichever next-round match just got a winner written into a slot).
    const before = new Map(matches.map(m => [m.id, m]))
    const changed = result.matches.filter(m => JSON.stringify(m) !== JSON.stringify(before.get(m.id)))

    for (const m of changed) {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({
          home_team_id: m.homeTeamId,
          away_team_id: m.awayTeamId,
          home_score: m.homeScore,
          away_score: m.awayScore,
          status: m.status,
          bracket_meta: m.bracketMeta,
        })
        .eq('id', m.id)
      if (updateErr) throw new Error(`Saving match ${m.id}: ${updateErr.message}`)
    }

    return NextResponse.json({ updatedMatchCount: changed.length, requiresConfirmation: result.requiresConfirmation })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
