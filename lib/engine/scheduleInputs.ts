// Pure helpers that turn stored event data into scheduler inputs. Kept separate
// from scheduler.ts (which knows nothing about brackets or databases) and from
// the route (which does the I/O), so both halves stay testable.

import type { ScheduleWindow, SchedulableMatch } from './scheduler'

/**
 * TIME ZONES — deliberate simplification, documented because it's load-bearing.
 *
 * A tournament's times are inherently VENUE-local: a 9:00am game in Pennsylvania
 * is 9:00am on the schedule whether the viewer is in Philadelphia or Portland.
 * Events store a plain start_date and a daily_start_time with no zone attached.
 *
 * So we encode venue-local wall-clock time into the UTC slot of the timestamp
 * ("2026-08-01T09:00:00.000Z" means 9am AT THE VENUE) and render it back with
 * timeZone: 'UTC'. That round-trips exactly and keeps 9am reading as 9am for
 * everyone — which is what a schedule should do.
 *
 * The proper fix is an IANA timezone column on events; until an event needs to
 * span zones, this is correct behavior rather than a latent bug.
 */
function venueLocalIso(date: string, time: string): string {
  const hhmm = (time || '00:00').slice(0, 5)
  return `${date}T${hhmm}:00.000Z`
}

/** Every date from start to end inclusive, as YYYY-MM-DD. */
function datesBetween(startDate: string, endDate: string): string[] {
  const out: string[] = []
  const start = new Date(`${startDate}T00:00:00.000Z`)
  const end = new Date(`${endDate || startDate}T00:00:00.000Z`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return out
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/**
 * One operating window per day of the event. A match must fit entirely inside a
 * single window, so an event running 8am–8pm over two days yields two windows
 * rather than one continuous 36-hour block.
 */
export function buildWindows(
  startDate: string,
  endDate: string,
  dailyStartTime: string,
  dailyEndTime: string
): ScheduleWindow[] {
  if (!dailyStartTime || !dailyEndTime || dailyEndTime <= dailyStartTime) return []
  return datesBetween(startDate, endDate).map(date => ({
    start: venueLocalIso(date, dailyStartTime),
    end: venueLocalIso(date, dailyEndTime),
  }))
}

interface MetaLike {
  round?: number
  position?: number
  poolId?: string
  pool_id?: string
  nextMatchId?: string | null
  next_match_id?: string | null
  loserNextMatchId?: string | null
}

export interface MatchRowLike {
  id: string
  division_id: string
  home_team_id: string | null
  away_team_id: string | null
  duration_minutes: number | null
  status?: string
  bracket_meta: MetaLike | null
}

/**
 * Inverts the bracket's forward links into the dependency edges the scheduler
 * needs. `bracketMeta` records where a match's winner (and, in double
 * elimination, its loser) GOES; scheduling needs the opposite question — which
 * matches must finish before this one can start.
 */
export function deriveDependsOn(rows: MatchRowLike[]): Record<string, string[]> {
  const present = new Set(rows.map(r => r.id))
  const deps: Record<string, string[]> = {}
  for (const r of rows) deps[r.id] = []

  for (const r of rows) {
    const meta = r.bracket_meta || {}
    const targets = [
      meta.nextMatchId ?? meta.next_match_id ?? null,
      meta.loserNextMatchId ?? null,
    ].filter((t): t is string => !!t && present.has(t))

    for (const target of targets) {
      // Guard against a self-link in malformed data, which would deadlock the
      // topological sort.
      if (target === r.id) continue
      if (!deps[target].includes(r.id)) deps[target].push(r.id)
    }
  }
  return deps
}

/**
 * Maps database match rows into the engine's SchedulableMatch shape.
 * `completedAreFixed` callers should filter those out beforehand — a match
 * that's already been played shouldn't be moved.
 */
export function toSchedulableMatches(
  rows: MatchRowLike[],
  fallbackDurationMinutes = 60
): SchedulableMatch[] {
  const deps = deriveDependsOn(rows)
  return rows.map(r => {
    const meta = r.bracket_meta || {}
    const isPool = !!(meta.poolId ?? meta.pool_id)
    return {
      id: r.id,
      divisionId: r.division_id,
      homeTeamId: r.home_team_id,
      awayTeamId: r.away_team_id,
      durationMinutes: r.duration_minutes && r.duration_minutes > 0 ? r.duration_minutes : fallbackDurationMinutes,
      dependsOn: deps[r.id] || [],
      phase: isPool ? 'pool' : 'bracket',
      round: meta.round ?? 1,
      position: meta.position ?? 0,
    }
  })
}

/** Formats a scheduled timestamp back to venue-local wall-clock time. Must use
 *  UTC to undo the encoding in venueLocalIso — see the note above. */
export function formatVenueTime(iso: string | null): string {
  if (!iso) return 'TBD'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'TBD'
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })
}
