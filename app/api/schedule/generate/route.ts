import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { scheduleMatches, type ScheduleResource, type DivisionRules, type Assignment } from '@/lib/engine/scheduler'
import { buildWindows, toSchedulableMatches, type MatchRowLike } from '@/lib/engine/scheduleInputs'
import { getSportScheduleDefaults } from '@/lib/engine/sportDefaults'

// Assigns a court/field/mat and a start time to every unplayed match in an
// event. Idempotent: re-running reschedules from scratch except for matches
// that are already completed or in progress, which are pinned where they are —
// you can't move a game that's already been played.
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

  const body = await req.json() as { eventId: string }
  if (!body.eventId) return NextResponse.json({ error: 'Missing eventId' }, { status: 400 })

  try {
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, sport, start_date, end_date, daily_start_time, daily_end_time')
      .eq('id', body.eventId)
      .single()
    if (eventErr) throw new Error(`Loading event: ${eventErr.message}`)

    const windows = buildWindows(
      event.start_date,
      event.end_date,
      event.daily_start_time || '08:00',
      event.daily_end_time || '20:00'
    )
    if (windows.length === 0) {
      return NextResponse.json(
        { error: 'This event has no usable playing hours. Check the event dates and daily start/end times.' },
        { status: 400 }
      )
    }

    // Courts reachable from the venues this event is played at.
    const { data: venueLinks, error: linkErr } = await supabase
      .from('event_venues')
      .select('venue_id')
      .eq('event_id', body.eventId)
    if (linkErr) throw new Error(`Loading event venues: ${linkErr.message}`)

    const venueIds = (venueLinks || []).map(v => v.venue_id)
    const { data: courtRows, error: courtErr } = venueIds.length
      ? await supabase.from('courts').select('id, name, sport_type').in('venue_id', venueIds)
      : { data: [] as { id: string; name: string; sport_type: string | null }[], error: null }
    if (courtErr) throw new Error(`Loading courts: ${courtErr.message}`)

    const resources: ScheduleResource[] = (courtRows || []).map(c => ({ id: c.id, name: c.name }))
    if (resources.length === 0) {
      return NextResponse.json(
        { error: 'No courts or fields are attached to this event, so there is nowhere to place games.' },
        { status: 400 }
      )
    }

    const { data: divisionRows, error: divErr } = await supabase
      .from('divisions')
      .select('id, min_rest_minutes, game_duration_minutes, buffer_minutes')
      .eq('event_id', body.eventId)
    if (divErr) throw new Error(`Loading divisions: ${divErr.message}`)

    const sportDefaults = getSportScheduleDefaults(event.sport)
    const divisionRules: Record<string, DivisionRules> = {}
    for (const d of divisionRows || []) {
      divisionRules[d.id] = {
        minRestMinutes: d.min_rest_minutes ?? sportDefaults.minRestMinutes,
        bufferMinutes: d.buffer_minutes ?? sportDefaults.bufferMinutes,
      }
    }

    const { data: matchRows, error: matchErr } = await supabase
      .from('matches')
      .select('id, division_id, home_team_id, away_team_id, duration_minutes, status, court_id, start_time, bracket_meta')
      .eq('event_id', body.eventId)
    if (matchErr) throw new Error(`Loading matches: ${matchErr.message}`)

    // A cancelled match (e.g. an unused double-elim reset game) never needs a slot.
    const live = (matchRows || []).filter(m => m.status !== 'cancelled')

    // Anything already under way or finished keeps its existing slot — the
    // scheduler treats these as immovable and works around them.
    const pinned: Assignment[] = live
      .filter(m => (m.status === 'completed' || m.status === 'in_progress' || m.status === 'pending_confirmation')
        && m.start_time && m.court_id)
      .map(m => {
        const start = new Date(m.start_time as string)
        const mins = (m.duration_minutes && m.duration_minutes > 0 ? m.duration_minutes : sportDefaults.durationMinutes)
        return {
          matchId: m.id,
          resourceId: m.court_id as string,
          startTime: start.toISOString(),
          endTime: new Date(start.getTime() + mins * 60000).toISOString(),
        }
      })

    const schedulable = toSchedulableMatches(live as MatchRowLike[], sportDefaults.durationMinutes)
    const result = scheduleMatches(schedulable, {
      windows,
      resources,
      divisionRules,
      defaultBufferMinutes: sportDefaults.bufferMinutes,
      granularityMinutes: 5,
      pinned,
    })

    // Persist only the newly-placed matches; pinned ones already hold these values.
    const pinnedIds = new Set(pinned.map(p => p.matchId))
    const toWrite = result.assignments.filter(a => !pinnedIds.has(a.matchId))
    for (const a of toWrite) {
      const { error: updateErr } = await supabase
        .from('matches')
        .update({ start_time: a.startTime, court_id: a.resourceId })
        .eq('id', a.matchId)
      if (updateErr) throw new Error(`Saving schedule for match ${a.matchId}: ${updateErr.message}`)
    }

    return NextResponse.json({
      scheduledCount: toWrite.length,
      pinnedCount: pinned.length,
      unscheduled: result.unscheduled,
      diagnostics: result.diagnostics,
      estimatedOnly: !!sportDefaults.estimatedOnly,
    })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
