import { describe, it, expect } from 'vitest'
import { buildWindows, deriveDependsOn, toSchedulableMatches, formatVenueTime, type MatchRowLike } from './scheduleInputs'

function row(id: string, meta: MatchRowLike['bracket_meta'], over: Partial<MatchRowLike> = {}): MatchRowLike {
  return {
    id,
    division_id: 'd1',
    home_team_id: 'A',
    away_team_id: 'B',
    duration_minutes: 60,
    bracket_meta: meta,
    ...over,
  }
}

describe('buildWindows', () => {
  it('creates one window per day of the event', () => {
    const w = buildWindows('2026-08-01', '2026-08-03', '08:00', '20:00')
    expect(w).toHaveLength(3)
    expect(w[0].start).toBe('2026-08-01T08:00:00.000Z')
    expect(w[0].end).toBe('2026-08-01T20:00:00.000Z')
    expect(w[2].start).toBe('2026-08-03T08:00:00.000Z')
  })

  it('handles a single-day event', () => {
    expect(buildWindows('2026-08-01', '2026-08-01', '09:00', '17:00')).toHaveLength(1)
  })

  it('treats a missing end date as a single day', () => {
    expect(buildWindows('2026-08-01', '', '09:00', '17:00')).toHaveLength(1)
  })

  it('returns nothing for an inverted or zero-length playing window', () => {
    expect(buildWindows('2026-08-01', '2026-08-01', '20:00', '08:00')).toEqual([])
    expect(buildWindows('2026-08-01', '2026-08-01', '09:00', '09:00')).toEqual([])
  })

  it('returns nothing when the end date precedes the start date', () => {
    expect(buildWindows('2026-08-05', '2026-08-01', '08:00', '20:00')).toEqual([])
  })

  it('preserves venue-local wall-clock time regardless of the viewer’s zone', () => {
    // 8am at the venue must round-trip to "8:00 AM", not shift by the tester's
    // local offset — this is the whole reason for the UTC-encoding convention.
    const w = buildWindows('2026-08-01', '2026-08-01', '08:00', '20:00')
    expect(formatVenueTime(w[0].start)).toBe('8:00 AM')
  })
})

describe('deriveDependsOn', () => {
  it('inverts nextMatchId into a dependency edge', () => {
    const rows = [
      row('sf1', { round: 1, position: 0, nextMatchId: 'final' }),
      row('sf2', { round: 1, position: 1, nextMatchId: 'final' }),
      row('final', { round: 2, position: 0, nextMatchId: null }),
    ]
    const deps = deriveDependsOn(rows)
    expect(deps.final.sort()).toEqual(['sf1', 'sf2'])
    expect(deps.sf1).toEqual([])
  })

  it('also treats double-elimination loser routing as a dependency', () => {
    const rows = [
      row('wb1', { round: 1, position: 0, nextMatchId: 'wb2', loserNextMatchId: 'lb1' }),
      row('wb2', { round: 2, position: 0 }),
      row('lb1', { round: 1, position: 0 }),
    ]
    const deps = deriveDependsOn(rows)
    expect(deps.wb2).toEqual(['wb1'])
    expect(deps.lb1).toEqual(['wb1'])
  })

  it('accepts the snake_case next_match_id variant', () => {
    const rows = [row('a', { next_match_id: 'b' }), row('b', {})]
    expect(deriveDependsOn(rows).b).toEqual(['a'])
  })

  it('ignores links pointing outside the given set', () => {
    const rows = [row('a', { nextMatchId: 'not-loaded' })]
    expect(deriveDependsOn(rows).a).toEqual([])
  })

  it('ignores a self-link rather than creating an unschedulable cycle', () => {
    const rows = [row('a', { nextMatchId: 'a' })]
    expect(deriveDependsOn(rows).a).toEqual([])
  })

  it('does not duplicate an edge when winner and loser route to the same match', () => {
    const rows = [row('a', { nextMatchId: 'z', loserNextMatchId: 'z' }), row('z', {})]
    expect(deriveDependsOn(rows).z).toEqual(['a'])
  })
})

describe('toSchedulableMatches', () => {
  it('classifies pool games and bracket games', () => {
    const out = toSchedulableMatches([
      row('p', { poolId: 'pool-a', round: 1 }),
      row('b', { round: 1 }),
    ])
    expect(out.find(m => m.id === 'p')!.phase).toBe('pool')
    expect(out.find(m => m.id === 'b')!.phase).toBe('bracket')
  })

  it('accepts the snake_case pool_id variant', () => {
    const out = toSchedulableMatches([row('p', { pool_id: 'pool-a' })])
    expect(out[0].phase).toBe('pool')
  })

  it('falls back to a default duration when the row has none', () => {
    const out = toSchedulableMatches([row('m', {}, { duration_minutes: null })], 45)
    expect(out[0].durationMinutes).toBe(45)
    const zero = toSchedulableMatches([row('m', {}, { duration_minutes: 0 })], 45)
    expect(zero[0].durationMinutes).toBe(45)
  })

  it('carries dependencies through to the schedulable shape', () => {
    const out = toSchedulableMatches([
      row('sf', { nextMatchId: 'final' }),
      row('final', {}),
    ])
    expect(out.find(m => m.id === 'final')!.dependsOn).toEqual(['sf'])
  })

  it('tolerates a null bracket_meta without throwing', () => {
    const out = toSchedulableMatches([row('m', null)])
    expect(out[0].round).toBe(1)
    expect(out[0].phase).toBe('bracket')
  })
})

describe('formatVenueTime', () => {
  it('renders TBD for an unscheduled match', () => {
    expect(formatVenueTime(null)).toBe('TBD')
    expect(formatVenueTime('not-a-date')).toBe('TBD')
  })
  it('renders venue-local wall clock', () => {
    expect(formatVenueTime('2026-08-01T14:30:00.000Z')).toBe('2:30 PM')
  })
})
