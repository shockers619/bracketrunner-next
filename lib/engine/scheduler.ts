// Assigns each match a resource (court / field / mat / diamond / sheet) and a
// start time. Deliberately sport-agnostic: nothing here knows what a "court" is
// beyond "a thing one match occupies at a time", so basketball courts, wrestling
// mats, and baseball diamonds are all just resources with a duration estimate.
//
// Strategy is greedy earliest-fit over a dependency-ordered match list, NOT a
// constraint solver. A solver packs marginally tighter but can't answer the
// question a director actually asks — "why is my team playing again at 9:15?" —
// and is far harder to test. Greedy is deterministic, fast, and explainable.

export interface ScheduleResource {
  id: string
  name: string
  /** Optional: when set, only matches whose division declares the same sport
   *  may use this resource. Lets one event mix e.g. courts and mats. */
  sportType?: string
}

/** One contiguous stretch of operating time, e.g. Saturday 8:00am–8:00pm. One
 *  window per day; a match must fit entirely inside a single window. */
export interface ScheduleWindow {
  start: string // ISO datetime
  end: string   // ISO datetime
}

export interface SchedulableMatch {
  id: string
  divisionId: string
  homeTeamId: string | null
  awayTeamId: string | null
  durationMinutes: number
  /** Match ids that must FINISH before this one may start (bracket feeders). */
  dependsOn: string[]
  /** Pool games are scheduled before bracket games at equal depth. */
  phase: 'pool' | 'bracket'
  round: number
  position: number
}

export interface DivisionRules {
  /** Minimum recovery time between one team's consecutive matches. */
  minRestMinutes: number
  /** Turnaround on the resource itself (clear the floor, warm-ups). */
  bufferMinutes?: number
  /** When set, restricts this division to resources of the same sportType. */
  sportType?: string
}

export interface ScheduleOptions {
  windows: ScheduleWindow[]
  resources: ScheduleResource[]
  divisionRules: Record<string, DivisionRules>
  /** Fallback turnaround when a division doesn't specify one. */
  defaultBufferMinutes?: number
  /** Slot search granularity in minutes. Smaller packs tighter but costs time. */
  granularityMinutes?: number
  /** Director-placed assignments. Honored exactly as given and never moved —
   *  this is what makes a re-run non-destructive after manual edits. */
  pinned?: Assignment[]
}

export interface Assignment {
  matchId: string
  resourceId: string
  startTime: string
  endTime: string
}

export interface UnscheduledMatch {
  matchId: string
  reason: string
}

export interface ScheduleDiagnostics {
  resourceCount: number
  /** Total playing time demanded, including per-match turnaround. */
  requiredMinutes: number
  /** Total resource time on offer across all windows. */
  availableMinutes: number
  /** Positive when demand exceeds capacity outright. */
  shortfallMinutes: number
  /** Plain-language fix, present only when something failed to schedule. */
  suggestion?: string
}

export interface ScheduleResult {
  assignments: Assignment[]
  unscheduled: UnscheduledMatch[]
  diagnostics: ScheduleDiagnostics
}

// ---------------------------------------------------------------------------
// time helpers — everything is epoch-minutes internally to keep the arithmetic
// trivial, converted back to ISO only at the boundary.
// ---------------------------------------------------------------------------

function toMinutes(iso: string): number {
  const ms = new Date(iso).getTime()
  if (Number.isNaN(ms)) throw new Error(`Invalid date: ${iso}`)
  return Math.floor(ms / 60000)
}

function toIso(minutes: number): string {
  return new Date(minutes * 60000).toISOString()
}

interface Interval { start: number; end: number }

function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

/**
 * Orders matches so every match appears after everything it depends on
 * (Kahn's algorithm). Ties broken deterministically by phase → round →
 * position → id, so the same input always yields the same schedule.
 */
function dependencyOrder(matches: SchedulableMatch[]): SchedulableMatch[] {
  const byId = new Map(matches.map(m => [m.id, m]))
  const indegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const m of matches) {
    // Only count dependencies that are actually part of this scheduling run.
    const deps = m.dependsOn.filter(d => byId.has(d))
    indegree.set(m.id, deps.length)
    for (const d of deps) {
      const list = dependents.get(d) || []
      list.push(m.id)
      dependents.set(d, list)
    }
  }

  const rank = (m: SchedulableMatch) =>
    `${m.phase === 'pool' ? 0 : 1}:${String(m.round).padStart(4, '0')}:${String(m.position).padStart(4, '0')}:${m.id}`

  const ready = matches.filter(m => (indegree.get(m.id) || 0) === 0).sort((a, b) => rank(a).localeCompare(rank(b)))
  const ordered: SchedulableMatch[] = []

  while (ready.length > 0) {
    const next = ready.shift()!
    ordered.push(next)
    for (const depId of dependents.get(next.id) || []) {
      const remaining = (indegree.get(depId) || 0) - 1
      indegree.set(depId, remaining)
      if (remaining === 0) {
        const m = byId.get(depId)!
        // insert in sorted position so ordering stays deterministic
        const idx = ready.findIndex(r => rank(r).localeCompare(rank(m)) > 0)
        if (idx === -1) ready.push(m)
        else ready.splice(idx, 0, m)
      }
    }
  }

  // A cycle would leave matches unprocessed. Bracket data should never produce
  // one, but appending them keeps the function total rather than silently
  // dropping matches — they'll simply fail to place and be reported.
  if (ordered.length < matches.length) {
    const seen = new Set(ordered.map(m => m.id))
    for (const m of matches) if (!seen.has(m.id)) ordered.push(m)
  }
  return ordered
}

/**
 * Greedy earliest-fit scheduler.
 *
 * For each match, in dependency order, it finds the earliest moment at which a
 * compatible resource is free AND both teams are rested, then books it. A match
 * that cannot be placed anywhere inside the operating windows is returned in
 * `unscheduled` with the reason — the schedule is never quietly extended past
 * the end of the day to make something fit.
 */
export function scheduleMatches(matches: SchedulableMatch[], opts: ScheduleOptions): ScheduleResult {
  const granularity = Math.max(1, opts.granularityMinutes ?? 5)
  const defaultBuffer = opts.defaultBufferMinutes ?? 0

  const windows = opts.windows
    .map(w => ({ start: toMinutes(w.start), end: toMinutes(w.end) }))
    .filter(w => w.end > w.start)
    .sort((a, b) => a.start - b.start)

  const rulesFor = (divisionId: string): DivisionRules =>
    opts.divisionRules[divisionId] ?? { minRestMinutes: 0 }

  // Occupancy ledgers.
  const resourceBookings = new Map<string, Interval[]>()
  const teamBookings = new Map<string, Interval[]>()
  const matchEnd = new Map<string, number>()
  for (const r of opts.resources) resourceBookings.set(r.id, [])

  const assignments: Assignment[] = []
  const unscheduled: UnscheduledMatch[] = []

  function book(matchId: string, resourceId: string, start: number, end: number, buffer: number, teams: string[]) {
    // The resource is held for the match PLUS its turnaround, so the next game
    // on that surface can't start until the floor is actually clear.
    resourceBookings.get(resourceId)!.push({ start, end: end + buffer })
    for (const t of teams) {
      const list = teamBookings.get(t) || []
      list.push({ start, end })
      teamBookings.set(t, list)
    }
    matchEnd.set(matchId, end)
    assignments.push({ matchId, resourceId, startTime: toIso(start), endTime: toIso(end) })
  }

  // ---- 1. Honor pinned assignments verbatim -------------------------------
  const pinnedIds = new Set<string>()
  for (const p of opts.pinned ?? []) {
    const m = matches.find(x => x.id === p.matchId)
    if (!m) continue
    pinnedIds.add(p.matchId)
    const rules = rulesFor(m.divisionId)
    const buffer = rules.bufferMinutes ?? defaultBuffer
    const teams = [m.homeTeamId, m.awayTeamId].filter((t): t is string => !!t)
    if (!resourceBookings.has(p.resourceId)) resourceBookings.set(p.resourceId, [])
    book(p.matchId, p.resourceId, toMinutes(p.startTime), toMinutes(p.endTime), buffer, teams)
  }

  // ---- 2. Place the rest, earliest-fit in dependency order ----------------
  const ordered = dependencyOrder(matches).filter(m => !pinnedIds.has(m.id))

  for (const match of ordered) {
    const rules = rulesFor(match.divisionId)
    const buffer = rules.bufferMinutes ?? defaultBuffer
    const teams = [match.homeTeamId, match.awayTeamId].filter((t): t is string => !!t)
    const duration = Math.max(1, match.durationMinutes)

    // Earliest legal start: after every feeder finishes, plus the winner's rest
    // (we can't know who advances, so the rest requirement must be assumed), and
    // after each already-known team has recovered from its last game.
    let earliest = windows.length ? windows[0].start : 0
    let blockedByDependency = false
    for (const depId of match.dependsOn) {
      const end = matchEnd.get(depId)
      if (end === undefined) {
        if (matches.some(m => m.id === depId)) blockedByDependency = true
        continue
      }
      earliest = Math.max(earliest, end + rules.minRestMinutes)
    }
    for (const t of teams) {
      for (const b of teamBookings.get(t) || []) {
        earliest = Math.max(earliest, b.end + rules.minRestMinutes)
      }
    }

    if (blockedByDependency) {
      unscheduled.push({
        matchId: match.id,
        reason: 'A match it depends on could not be scheduled.',
      })
      continue
    }

    const eligible = opts.resources.filter(r =>
      !r.sportType || !rules.sportType || r.sportType === rules.sportType
    )
    if (eligible.length === 0) {
      unscheduled.push({
        matchId: match.id,
        reason: rules.sportType
          ? `No ${rules.sportType} resource is available for this division.`
          : 'No resources were provided.',
      })
      continue
    }

    let placed = false
    for (const win of windows) {
      if (placed) break
      // Align the search to the granularity grid relative to the window start.
      let t = Math.max(win.start, earliest)
      if (t > win.start) {
        const offset = (t - win.start) % granularity
        if (offset !== 0) t += granularity - offset
      }

      for (; t + duration <= win.end; t += granularity) {
        const slot: Interval = { start: t, end: t + duration }

        const teamsFree = teams.every(team =>
          (teamBookings.get(team) || []).every(b => !overlaps(slot, b))
        )
        if (!teamsFree) continue

        const resource = eligible.find(r =>
          (resourceBookings.get(r.id) || []).every(b => !overlaps(slot, b))
        )
        if (!resource) continue

        book(match.id, resource.id, slot.start, slot.end, buffer, teams)
        placed = true
        break
      }
    }

    if (!placed) {
      unscheduled.push({
        matchId: match.id,
        reason: 'No open slot inside the event’s operating hours.',
      })
    }
  }

  // ---- 3. Diagnostics -----------------------------------------------------
  const requiredMinutes = matches.reduce((sum, m) => {
    const rules = rulesFor(m.divisionId)
    return sum + Math.max(1, m.durationMinutes) + (rules.bufferMinutes ?? defaultBuffer)
  }, 0)
  const windowMinutes = windows.reduce((sum, w) => sum + (w.end - w.start), 0)
  const availableMinutes = windowMinutes * opts.resources.length
  const shortfallMinutes = Math.max(0, requiredMinutes - availableMinutes)

  const diagnostics: ScheduleDiagnostics = {
    resourceCount: opts.resources.length,
    requiredMinutes,
    availableMinutes,
    shortfallMinutes,
  }

  if (unscheduled.length > 0) {
    diagnostics.suggestion = buildSuggestion(shortfallMinutes, windowMinutes, opts.resources.length)
  }

  return { assignments, unscheduled, diagnostics }
}

/** Turns a capacity shortfall into the concrete choice a director can act on:
 *  add courts, or add hours. When capacity is technically sufficient, the
 *  blocker is scheduling constraints (rest windows, dependency chains) instead. */
function buildSuggestion(shortfall: number, windowMinutes: number, resourceCount: number): string {
  if (shortfall <= 0) {
    return 'There is enough total court time, but rest requirements and bracket dependencies leave no legal slot. Add a court, extend hours, or reduce the minimum rest.'
  }
  const extraResources = windowMinutes > 0 ? Math.ceil(shortfall / windowMinutes) : 0
  const extraHours = resourceCount > 0 ? Math.ceil(shortfall / resourceCount / 60) : 0
  const parts: string[] = []
  if (extraResources > 0) parts.push(`${extraResources} more court${extraResources === 1 ? '' : 's'}`)
  if (extraHours > 0) parts.push(`about ${extraHours} more hour${extraHours === 1 ? '' : 's'} of playing time`)
  return parts.length
    ? `Not enough capacity — you need roughly ${parts.join(' or ')}.`
    : 'Not enough capacity for this many matches.'
}
