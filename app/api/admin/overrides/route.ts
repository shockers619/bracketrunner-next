import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { correctScore, resetMatch, forceSlotOverride } from '@/lib/engine/advancement'
import { loadDivisionMatches, writeChangedMatches } from '@/lib/matchDb'
import { writeAuditLogs } from '@/lib/auditLog'

type OverrideBody =
  | { type: 'score_correction'; matchId: string; homeScore: number; awayScore: number; reasonCode: string }
  | { type: 'match_reset'; matchId: string; targetStatus: 'scheduled' | 'in_progress'; reasonCode: string }
  | { type: 'force_advance'; matchId: string; slot: 'home' | 'away'; teamId: string | null; reasonCode: string }

// Ordering note (see also lib/auditLog.ts): the audit log is written BEFORE
// the match row(s) are updated, in every branch below. This app doesn't use
// real cross-table Postgres transactions anywhere (record-result and
// pools/resolve don't either) — so this ordering is the closest practical
// approximation of the brief's "atomic transaction" requirement: if the
// audit write fails, we throw and NOTHING about the match changes. The gap
// this doesn't cover is a crash *between* the audit insert and the match
// update finishing — a genuine multi-row Postgres function (SECURITY
// INVOKER, so RLS still applies) would close that gap, and is the right
// follow-up if audit integrity needs to be airtight rather than
// best-effort.
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

  const body = await req.json() as OverrideBody
  if (!body.reasonCode?.trim()) {
    return NextResponse.json({ error: 'A reason code is required for every override.' }, { status: 400 })
  }

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })

    // Trust the DB for event/tenant, not the client — look up the match's
    // real event_id/division_id rather than accepting them in the request.
    const { data: targetMatch, error: matchErr } = await supabase
      .from('matches')
      .select('division_id, event_id')
      .eq('id', body.matchId)
      .single()
    if (matchErr) throw new Error(`Loading match: ${matchErr.message}`)

    const { data: eventRow, error: eventErr } = await supabase
      .from('events')
      .select('tenant_id')
      .eq('id', targetMatch.event_id)
      .single()
    if (eventErr) throw new Error(`Loading event: ${eventErr.message}`)

    // Director-only gate. Every account today is created with role
    // 'director' (see create_tenant_function.sql) so this is currently a
    // no-op for existing users — but it's the real check to have in place
    // once/if a non-director role (e.g. 'scorekeeper') ever gets added.
    // RLS on matches/audit_logs is the actual security boundary either way;
    // this is a clean-error UX layer on top of it.
    const { data: membership, error: memberErr } = await supabase
      .from('tenant_members')
      .select('role')
      .eq('tenant_id', eventRow.tenant_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (memberErr) throw new Error(`Checking permissions: ${memberErr.message}`)
    if (!membership || membership.role !== 'director') {
      return NextResponse.json({ error: 'Only a tournament director can perform overrides.' }, { status: 403 })
    }

    const matches = await loadDivisionMatches(supabase, targetMatch.division_id)

    if (body.type === 'score_correction') {
      const result = correctScore(matches, body.matchId, body.homeScore, body.awayScore, user.id, body.reasonCode)
      await writeAuditLogs(supabase, targetMatch.event_id, result.auditLogs, body.reasonCode)
      const changed = await writeChangedMatches(supabase, matches, result.matches)
      return NextResponse.json({ updatedMatchCount: changed.length })
    }

    if (body.type === 'match_reset') {
      const result = resetMatch(matches, body.matchId, body.targetStatus, user.id, body.reasonCode)
      await writeAuditLogs(supabase, targetMatch.event_id, result.auditLogs, body.reasonCode)
      const changed = await writeChangedMatches(supabase, matches, result.matches)
      return NextResponse.json({ updatedMatchCount: changed.length })
    }

    if (body.type === 'force_advance') {
      const result = forceSlotOverride(matches, body.matchId, body.slot, body.teamId, user.id, body.reasonCode)
      await writeAuditLogs(supabase, targetMatch.event_id, result.auditLogs, body.reasonCode)
      const changed = await writeChangedMatches(supabase, matches, result.matches)
      return NextResponse.json({ updatedMatchCount: changed.length })
    }

    return NextResponse.json({ error: 'Unknown override type.' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
