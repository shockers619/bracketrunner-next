import type { SupabaseClient } from '@supabase/supabase-js'
import type { Match } from './engine/types'

/** Loads every match in a division, converted to the engine's camelCase
 *  Match shape. The advancement engine needs the FULL division match set
 *  (not just one row) because winners get written into a SIBLING row. */
export async function loadDivisionMatches(supabase: SupabaseClient, divisionId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('id, division_id, court_id, home_team_id, away_team_id, start_time, duration_minutes, home_score, away_score, status, bracket_meta')
    .eq('division_id', divisionId)
  if (error) throw new Error(`Loading division matches: ${error.message}`)

  return (data || []).map(m => ({
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
}

/** Writes back only the rows that actually changed vs. `before`, and
 *  returns those changed rows (both for the caller's response and for
 *  building accurate audit-log entries). */
export async function writeChangedMatches(supabase: SupabaseClient, before: Match[], after: Match[]): Promise<Match[]> {
  const beforeById = new Map(before.map(m => [m.id, m]))
  const changed = after.filter(m => JSON.stringify(m) !== JSON.stringify(beforeById.get(m.id)))

  for (const m of changed) {
    const { error } = await supabase
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
    if (error) throw new Error(`Saving match ${m.id}: ${error.message}`)
  }

  return changed
}
