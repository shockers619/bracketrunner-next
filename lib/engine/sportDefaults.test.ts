import { describe, it, expect } from 'vitest'
import {
  getSportScheduleDefaults,
  hasSportScheduleDefaults,
  resourceNounFor,
  GENERIC_SCHEDULE_DEFAULTS,
} from './sportDefaults'

describe('sport scheduling defaults', () => {
  it('returns tuned values for known sports', () => {
    expect(getSportScheduleDefaults('basketball').durationMinutes).toBe(60)
    expect(getSportScheduleDefaults('soccer').durationMinutes).toBe(90)
    expect(getSportScheduleDefaults('wrestling').durationMinutes).toBe(15)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(getSportScheduleDefaults('  BasketBall ')).toEqual(getSportScheduleDefaults('basketball'))
  })

  it('falls back to the generic profile for unknown sports rather than guessing', () => {
    expect(getSportScheduleDefaults('quidditch')).toEqual(GENERIC_SCHEDULE_DEFAULTS)
    expect(getSportScheduleDefaults(null)).toEqual(GENERIC_SCHEDULE_DEFAULTS)
    expect(hasSportScheduleDefaults('quidditch')).toBe(false)
    expect(hasSportScheduleDefaults('basketball')).toBe(true)
  })

  it('names the playing surface correctly per sport', () => {
    expect(resourceNounFor('basketball')).toBe('court')
    expect(resourceNounFor('soccer')).toBe('field')
    expect(resourceNounFor('wrestling')).toBe('mat')
    expect(resourceNounFor('baseball')).toBe('diamond')
    expect(resourceNounFor('hockey')).toBe('sheet')
  })

  it('flags clockless sports as estimate-only', () => {
    // Baseball and softball have no game clock — the UI must not imply precision.
    expect(getSportScheduleDefaults('baseball').estimatedOnly).toBe(true)
    expect(getSportScheduleDefaults('softball').estimatedOnly).toBe(true)
    expect(getSportScheduleDefaults('basketball').estimatedOnly).toBeUndefined()
  })

  it('every profile is internally sane', () => {
    for (const sport of ['basketball', 'soccer', 'wrestling', 'baseball', 'tennis', 'hockey', 'volleyball']) {
      const d = getSportScheduleDefaults(sport)
      expect(d.durationMinutes).toBeGreaterThan(0)
      expect(d.bufferMinutes).toBeGreaterThanOrEqual(0)
      expect(d.minRestMinutes).toBeGreaterThanOrEqual(0)
      expect(d.resourceNoun.length).toBeGreaterThan(0)
    }
  })
})
