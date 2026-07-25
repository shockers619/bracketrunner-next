// Sport-specific scheduling defaults. Same philosophy as anomalyDefaults.ts:
// sensible starting values a director can override, never a silent guess for a
// sport we don't know.
//
// `durationMinutes` is wall-clock time the surface is occupied — running clock,
// stoppages, and warm-up included — not regulation playing time. A 32-minute
// basketball game does not free the court after 32 minutes.

export interface SportScheduleDefaults {
  /** Wall-clock minutes the resource is occupied per match. */
  durationMinutes: number
  /** Turnaround on the surface between matches. */
  bufferMinutes: number
  /** Recovery time before a team's next match. */
  minRestMinutes: number
  /** What the playing surface is called, for UI copy. */
  resourceNoun: string
  /** True when the sport has no game clock, so times can only ever be an
   *  estimate. The UI should label these schedules "approximate" rather than
   *  implying a baseball game will end at 2:15. */
  estimatedOnly?: boolean
}

const DEFAULTS_BY_SPORT: Record<string, SportScheduleDefaults> = {
  basketball: { durationMinutes: 60, bufferMinutes: 10, minRestMinutes: 45, resourceNoun: 'court' },
  volleyball: { durationMinutes: 60, bufferMinutes: 10, minRestMinutes: 30, resourceNoun: 'court' },
  futsal:     { durationMinutes: 50, bufferMinutes: 10, minRestMinutes: 45, resourceNoun: 'court' },
  soccer:     { durationMinutes: 90, bufferMinutes: 15, minRestMinutes: 90, resourceNoun: 'field' },
  lacrosse:   { durationMinutes: 75, bufferMinutes: 15, minRestMinutes: 75, resourceNoun: 'field' },
  'field hockey': { durationMinutes: 70, bufferMinutes: 15, minRestMinutes: 75, resourceNoun: 'field' },
  'flag football': { durationMinutes: 50, bufferMinutes: 10, minRestMinutes: 45, resourceNoun: 'field' },
  football:   { durationMinutes: 120, bufferMinutes: 20, minRestMinutes: 240, resourceNoun: 'field' },
  hockey:     { durationMinutes: 75, bufferMinutes: 15, minRestMinutes: 90, resourceNoun: 'sheet' },
  // Combat sports run many short bouts on a mat, but athletes need real recovery.
  wrestling:  { durationMinutes: 15, bufferMinutes: 5, minRestMinutes: 45, resourceNoun: 'mat' },
  judo:       { durationMinutes: 12, bufferMinutes: 5, minRestMinutes: 45, resourceNoun: 'mat' },
  // Racquet sports: long tail on match length, so these skew generous.
  tennis:     { durationMinutes: 90, bufferMinutes: 10, minRestMinutes: 60, resourceNoun: 'court' },
  pickleball: { durationMinutes: 40, bufferMinutes: 10, minRestMinutes: 30, resourceNoun: 'court' },
  badminton:  { durationMinutes: 45, bufferMinutes: 10, minRestMinutes: 30, resourceNoun: 'court' },
  // No game clock — innings can run long, so every time is an estimate.
  baseball:   { durationMinutes: 120, bufferMinutes: 20, minRestMinutes: 60, resourceNoun: 'diamond', estimatedOnly: true },
  softball:   { durationMinutes: 105, bufferMinutes: 20, minRestMinutes: 60, resourceNoun: 'diamond', estimatedOnly: true },
}

/** Generic fallback for a sport we don't have tuned values for. Deliberately
 *  conservative — better to over-reserve the surface than to stack games on top
 *  of each other. */
export const GENERIC_SCHEDULE_DEFAULTS: SportScheduleDefaults = {
  durationMinutes: 60,
  bufferMinutes: 10,
  minRestMinutes: 45,
  resourceNoun: 'court',
}

export function getSportScheduleDefaults(sport: string | null | undefined): SportScheduleDefaults {
  if (!sport) return GENERIC_SCHEDULE_DEFAULTS
  return DEFAULTS_BY_SPORT[sport.toLowerCase().trim()] ?? GENERIC_SCHEDULE_DEFAULTS
}

/** True when we have tuned values for this sport, as opposed to falling back to
 *  the generic profile. Lets the UI say "we've set defaults for wrestling" vs
 *  "please confirm these times." */
export function hasSportScheduleDefaults(sport: string | null | undefined): boolean {
  return !!sport && sport.toLowerCase().trim() in DEFAULTS_BY_SPORT
}

/** "court" / "field" / "mat" — for UI copy that shouldn't say "court" at a
 *  wrestling tournament. */
export function resourceNounFor(sport: string | null | undefined): string {
  return getSportScheduleDefaults(sport).resourceNoun
}
