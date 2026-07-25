import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { scheduleMatches, type SchedulableMatch, type ScheduleOptions, type Assignment } from './scheduler'

const DAY1 = { start: '2026-08-01T08:00:00.000Z', end: '2026-08-01T20:00:00.000Z' } // 12h
const DAY2 = { start: '2026-08-02T08:00:00.000Z', end: '2026-08-02T20:00:00.000Z' }

function m(
  id: string,
  home: string | null,
  away: string | null,
  extra: Partial<SchedulableMatch> = {}
): SchedulableMatch {
  return {
    id,
    divisionId: 'd1',
    homeTeamId: home,
    awayTeamId: away,
    durationMinutes: 60,
    dependsOn: [],
    phase: 'pool',
    round: 1,
    position: 0,
    ...extra,
  }
}

function opts(over: Partial<ScheduleOptions> = {}): ScheduleOptions {
  return {
    windows: [DAY1],
    resources: [{ id: 'c1', name: 'Court 1' }, { id: 'c2', name: 'Court 2' }],
    divisionRules: { d1: { minRestMinutes: 30 } },
    defaultBufferMinutes: 0,
    granularityMinutes: 5,
    ...over,
  }
}

const min = (iso: string) => Math.floor(new Date(iso).getTime() / 60000)
const overlap = (a: Assignment, b: Assignment) =>
  min(a.startTime) < min(b.endTime) && min(b.startTime) < min(a.endTime)

describe('scheduleMatches — basics', () => {
  it('assigns every match a resource and a start time', () => {
    const res = scheduleMatches([m('m1', 'A', 'B'), m('m2', 'C', 'D')], opts())
    expect(res.unscheduled).toEqual([])
    expect(res.assignments).toHaveLength(2)
    for (const a of res.assignments) {
      expect(a.resourceId).toBeTruthy()
      expect(new Date(a.startTime).toString()).not.toBe('Invalid Date')
    }
  })

  it('starts at the beginning of the operating window', () => {
    const res = scheduleMatches([m('m1', 'A', 'B')], opts())
    expect(res.assignments[0].startTime).toBe(DAY1.start)
  })

  it('runs independent matches in parallel across resources', () => {
    // Two matches, two courts, no shared teams — both should start immediately.
    const res = scheduleMatches([m('m1', 'A', 'B'), m('m2', 'C', 'D')], opts())
    const starts = res.assignments.map(a => a.startTime)
    expect(new Set(starts).size).toBe(1)
    expect(new Set(res.assignments.map(a => a.resourceId)).size).toBe(2)
  })
})

describe('scheduleMatches — hard constraints', () => {
  it('never double-books a resource', () => {
    const res = scheduleMatches(
      [m('m1', 'A', 'B'), m('m2', 'C', 'D'), m('m3', 'E', 'F'), m('m4', 'G', 'H')],
      opts({ resources: [{ id: 'c1', name: 'Court 1' }] })
    )
    const sorted = [...res.assignments].sort((a, b) => min(a.startTime) - min(b.startTime))
    for (let i = 1; i < sorted.length; i++) {
      expect(overlap(sorted[i - 1], sorted[i])).toBe(false)
    }
  })

  it('never puts one team in two places at once', () => {
    // Team A appears in both matches, so they cannot be simultaneous.
    const res = scheduleMatches([m('m1', 'A', 'B'), m('m2', 'A', 'C')], opts())
    const [a1, a2] = res.assignments
    expect(overlap(a1, a2)).toBe(false)
  })

  it('enforces minimum rest between a team’s games', () => {
    const res = scheduleMatches(
      [m('m1', 'A', 'B'), m('m2', 'A', 'C')],
      opts({ divisionRules: { d1: { minRestMinutes: 45 } } })
    )
    const sorted = [...res.assignments].sort((a, b) => min(a.startTime) - min(b.startTime))
    const gap = min(sorted[1].startTime) - min(sorted[0].endTime)
    expect(gap).toBeGreaterThanOrEqual(45)
  })

  it('applies the resource turnaround buffer between games on the same court', () => {
    const res = scheduleMatches(
      [m('m1', 'A', 'B'), m('m2', 'C', 'D')],
      opts({
        resources: [{ id: 'c1', name: 'Court 1' }],
        divisionRules: { d1: { minRestMinutes: 0, bufferMinutes: 20 } },
      })
    )
    const sorted = [...res.assignments].sort((a, b) => min(a.startTime) - min(b.startTime))
    expect(min(sorted[1].startTime) - min(sorted[0].endTime)).toBeGreaterThanOrEqual(20)
  })

  it('keeps every match inside the operating window', () => {
    const res = scheduleMatches(
      Array.from({ length: 6 }, (_, i) => m(`m${i}`, `H${i}`, `A${i}`)),
      opts()
    )
    for (const a of res.assignments) {
      expect(min(a.startTime)).toBeGreaterThanOrEqual(min(DAY1.start))
      expect(min(a.endTime)).toBeLessThanOrEqual(min(DAY1.end))
    }
  })
})

describe('scheduleMatches — bracket dependencies', () => {
  it('schedules a dependent match only after its feeders finish, plus rest', () => {
    const matches = [
      m('sf1', 'A', 'B', { phase: 'bracket', round: 1, position: 0 }),
      m('sf2', 'C', 'D', { phase: 'bracket', round: 1, position: 1 }),
      m('final', null, null, { phase: 'bracket', round: 2, dependsOn: ['sf1', 'sf2'] }),
    ]
    const res = scheduleMatches(matches, opts({ divisionRules: { d1: { minRestMinutes: 30 } } }))
    expect(res.unscheduled).toEqual([])

    const by = Object.fromEntries(res.assignments.map(a => [a.matchId, a]))
    const feederEnd = Math.max(min(by.sf1.endTime), min(by.sf2.endTime))
    // The winner still needs rest before the final, even though we can't know
    // yet which team advances.
    expect(min(by.final.startTime)).toBeGreaterThanOrEqual(feederEnd + 30)
  })

  it('reports a dependent match as unschedulable when its feeder fails', () => {
    // Window fits only one 60-minute game, so the feeder consumes it.
    const tiny = { start: '2026-08-01T08:00:00.000Z', end: '2026-08-01T09:00:00.000Z' }
    const matches = [
      m('r1a', 'A', 'B', { phase: 'bracket' }),
      m('r1b', 'C', 'D', { phase: 'bracket', position: 1 }),
      m('final', null, null, { phase: 'bracket', round: 2, dependsOn: ['r1a', 'r1b'] }),
    ]
    const res = scheduleMatches(matches, opts({ windows: [tiny], resources: [{ id: 'c1', name: 'C1' }] }))
    expect(res.unscheduled.some(u => u.matchId === 'final')).toBe(true)
  })

  it('schedules pool games before bracket games', () => {
    const matches = [
      m('b1', null, null, { phase: 'bracket', round: 1 }),
      m('p1', 'A', 'B', { phase: 'pool', round: 1 }),
    ]
    const res = scheduleMatches(matches, opts({ resources: [{ id: 'c1', name: 'C1' }] }))
    const by = Object.fromEntries(res.assignments.map(a => [a.matchId, a]))
    expect(min(by.p1.startTime)).toBeLessThanOrEqual(min(by.b1.startTime))
  })
})

describe('scheduleMatches — capacity failures are reported, never hidden', () => {
  it('refuses to run past the end of the day and explains the shortfall', () => {
    // 10 hour-long games, one court, a 4-hour window: physically impossible.
    const short = { start: '2026-08-01T08:00:00.000Z', end: '2026-08-01T12:00:00.000Z' }
    const matches = Array.from({ length: 10 }, (_, i) => m(`m${i}`, `H${i}`, `A${i}`))
    const res = scheduleMatches(matches, opts({ windows: [short], resources: [{ id: 'c1', name: 'C1' }] }))

    expect(res.unscheduled.length).toBeGreaterThan(0)
    expect(res.diagnostics.shortfallMinutes).toBeGreaterThan(0)
    expect(res.diagnostics.suggestion).toMatch(/more court|more hour/i)
    // Nothing was quietly pushed past closing time.
    for (const a of res.assignments) {
      expect(min(a.endTime)).toBeLessThanOrEqual(min(short.end))
    }
  })

  it('distinguishes a constraint deadlock from a raw capacity shortage', () => {
    // Plenty of court time, but one team must play 3 games with 10h rest each.
    const matches = [m('m1', 'A', 'B'), m('m2', 'A', 'C'), m('m3', 'A', 'D')]
    const res = scheduleMatches(matches, opts({ divisionRules: { d1: { minRestMinutes: 600 } } }))
    expect(res.unscheduled.length).toBeGreaterThan(0)
    expect(res.diagnostics.shortfallMinutes).toBe(0)
    expect(res.diagnostics.suggestion).toMatch(/rest/i)
  })

  it('spills into the next day when a second window is available', () => {
    const matches = Array.from({ length: 14 }, (_, i) => m(`m${i}`, `H${i}`, `A${i}`))
    const res = scheduleMatches(matches, opts({ windows: [DAY1, DAY2], resources: [{ id: 'c1', name: 'C1' }] }))
    expect(res.unscheduled).toEqual([])
    expect(res.assignments.some(a => a.startTime.startsWith('2026-08-02'))).toBe(true)
  })
})

describe('scheduleMatches — multi-sport resources', () => {
  it('only uses resources matching the division’s sport', () => {
    const res = scheduleMatches(
      [m('wrestle', 'A', 'B', { divisionId: 'dw' }), m('hoops', 'C', 'D', { divisionId: 'dh' })],
      opts({
        resources: [
          { id: 'mat1', name: 'Mat 1', sportType: 'wrestling' },
          { id: 'court1', name: 'Court 1', sportType: 'basketball' },
        ],
        divisionRules: {
          dw: { minRestMinutes: 0, sportType: 'wrestling' },
          dh: { minRestMinutes: 0, sportType: 'basketball' },
        },
      })
    )
    const by = Object.fromEntries(res.assignments.map(a => [a.matchId, a]))
    expect(by.wrestle.resourceId).toBe('mat1')
    expect(by.hoops.resourceId).toBe('court1')
  })

  it('reports a division with no compatible resource instead of misplacing it', () => {
    const res = scheduleMatches(
      [m('m1', 'A', 'B', { divisionId: 'dw' })],
      opts({
        resources: [{ id: 'court1', name: 'Court 1', sportType: 'basketball' }],
        divisionRules: { dw: { minRestMinutes: 0, sportType: 'wrestling' } },
      })
    )
    expect(res.assignments).toHaveLength(0)
    expect(res.unscheduled[0].reason).toMatch(/wrestling/i)
  })

  it('honors per-division game length (a soccer match is not a volleyball match)', () => {
    const res = scheduleMatches(
      [m('soccer', 'A', 'B', { divisionId: 'ds', durationMinutes: 90 }),
       m('volley', 'C', 'D', { divisionId: 'dv', durationMinutes: 45 })],
      opts({ divisionRules: { ds: { minRestMinutes: 0 }, dv: { minRestMinutes: 0 } } })
    )
    const by = Object.fromEntries(res.assignments.map(a => [a.matchId, a]))
    expect(min(by.soccer.endTime) - min(by.soccer.startTime)).toBe(90)
    expect(min(by.volley.endTime) - min(by.volley.startTime)).toBe(45)
  })
})

describe('scheduleMatches — pinned (director) assignments', () => {
  it('leaves a pinned match exactly where the director put it', () => {
    const pinned: Assignment[] = [{
      matchId: 'm1', resourceId: 'c2',
      startTime: '2026-08-01T14:00:00.000Z', endTime: '2026-08-01T15:00:00.000Z',
    }]
    const res = scheduleMatches([m('m1', 'A', 'B'), m('m2', 'C', 'D')], opts({ pinned }))
    const found = res.assignments.find(a => a.matchId === 'm1')!
    expect(found.startTime).toBe('2026-08-01T14:00:00.000Z')
    expect(found.resourceId).toBe('c2')
  })

  it('schedules around a pinned match rather than through it', () => {
    const pinned: Assignment[] = [{
      matchId: 'm1', resourceId: 'c1',
      startTime: '2026-08-01T08:00:00.000Z', endTime: '2026-08-01T09:00:00.000Z',
    }]
    // Only one court, and team A is busy 08:00–09:00 in the pinned game.
    const res = scheduleMatches(
      [m('m1', 'A', 'B'), m('m2', 'A', 'C')],
      opts({ pinned, resources: [{ id: 'c1', name: 'C1' }], divisionRules: { d1: { minRestMinutes: 0 } } })
    )
    const m2 = res.assignments.find(a => a.matchId === 'm2')!
    expect(min(m2.startTime)).toBeGreaterThanOrEqual(min('2026-08-01T09:00:00.000Z'))
  })
})

describe('scheduleMatches — invariants hold across arbitrary inputs', () => {
  it('property: no resource or team is ever double-booked, and rest is respected', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 14 }),  // match count
        fc.integer({ min: 1, max: 4 }),   // resource count
        fc.integer({ min: 0, max: 60 }),  // min rest
        fc.integer({ min: 20, max: 90 }), // duration
        (matchCount, resourceCount, minRest, duration) => {
          // Reuse a small team pool so teams genuinely collide.
          const matches = Array.from({ length: matchCount }, (_, i) =>
            m(`m${i}`, `T${i % 5}`, `T${(i + 2) % 5}`, { durationMinutes: duration })
          ).filter(x => x.homeTeamId !== x.awayTeamId)

          const res = scheduleMatches(matches, opts({
            windows: [DAY1, DAY2],
            resources: Array.from({ length: resourceCount }, (_, i) => ({ id: `r${i}`, name: `R${i}` })),
            divisionRules: { d1: { minRestMinutes: minRest } },
          }))

          // no resource double-booking
          const byResource = new Map<string, Assignment[]>()
          for (const a of res.assignments) {
            const list = byResource.get(a.resourceId) || []
            list.push(a)
            byResource.set(a.resourceId, list)
          }
          for (const list of byResource.values()) {
            const sorted = [...list].sort((x, y) => min(x.startTime) - min(y.startTime))
            for (let i = 1; i < sorted.length; i++) expect(overlap(sorted[i - 1], sorted[i])).toBe(false)
          }

          // no team double-booking, and rest respected between their games
          const byTeam = new Map<string, Assignment[]>()
          for (const a of res.assignments) {
            const match = matches.find(x => x.id === a.matchId)!
            for (const t of [match.homeTeamId, match.awayTeamId]) {
              if (!t) continue
              const list = byTeam.get(t) || []
              list.push(a)
              byTeam.set(t, list)
            }
          }
          for (const list of byTeam.values()) {
            const sorted = [...list].sort((x, y) => min(x.startTime) - min(y.startTime))
            for (let i = 1; i < sorted.length; i++) {
              expect(overlap(sorted[i - 1], sorted[i])).toBe(false)
              expect(min(sorted[i].startTime) - min(sorted[i - 1].endTime)).toBeGreaterThanOrEqual(minRest)
            }
          }

          // everything sits inside a declared window
          for (const a of res.assignments) {
            const inWindow = [DAY1, DAY2].some(w =>
              min(a.startTime) >= min(w.start) && min(a.endTime) <= min(w.end)
            )
            expect(inWindow).toBe(true)
          }

          // every match is accounted for exactly once
          expect(res.assignments.length + res.unscheduled.length).toBe(matches.length)
        }
      ),
      { numRuns: 60 }
    )
  })
})
