import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Live-scoring endpoint for the mobile scorekeeper view. Deliberately
// separate from /api/matches/record-result:
//
//   - This route: fired on every +1/+2/+3/-1 tap and on the
//     NOT_STARTED -> IN_PROGRESS toggle. Just writes the current score and
//     status. No advancement, no engine call, ties are fine (a live game
//     sits tied constantly).
//   - record-result: fired ONCE, when the director confirms FINAL. That's
//     the only place recordResult() — and therefore bracket advancement —
//     should ever run. It rejects ties by design, which is correct for a
//     completed single-elim match but would break every in-progress tick
//     if this route reused it.
//
// This route can never set status to 'completed' — that transition has to
// go through record-result so advancement actually happens.
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
    matchId: string
    homeScore: number
    awayScore: number
    status: 'scheduled' | 'in_progress'
  }
  if (!body.matchId || body.homeScore == null || body.awayScore == null || !body.status) {
    return NextResponse.json({ error: 'Missing matchId, homeScore, awayScore, or status' }, { status: 400 })
  }
  if (body.status !== 'scheduled' && body.status !== 'in_progress') {
    return NextResponse.json({ error: "status must be 'scheduled' or 'in_progress' — use /api/matches/record-result to mark a match completed" }, { status: 400 })
  }
  if (body.homeScore < 0 || body.awayScore < 0) {
    return NextResponse.json({ error: 'Scores cannot be negative' }, { status: 400 })
  }

  const { error } = await supabase
    .from('matches')
    .update({ home_score: body.homeScore, away_score: body.awayScore, status: body.status })
    .eq('id', body.matchId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
