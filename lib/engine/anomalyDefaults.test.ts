import { describe, it, expect } from 'vitest'
import { getDefaultAnomalyBounds } from './anomalyDefaults'

describe('getDefaultAnomalyBounds', () => {
  it('returns sport-specific bounds for known sports', () => {
    expect(getDefaultAnomalyBounds('basketball')).toEqual({ maxSingleTeamScore: 120, maxDifferential: 60 })
    expect(getDefaultAnomalyBounds('soccer')).toEqual({ maxSingleTeamScore: 15, maxDifferential: 10 })
  })

  it('is case-insensitive and trims whitespace', () => {
    expect(getDefaultAnomalyBounds('  Basketball ')).toEqual({ maxSingleTeamScore: 120, maxDifferential: 60 })
    expect(getDefaultAnomalyBounds('VOLLEYBALL')).toEqual({ maxSingleTeamScore: 35, maxDifferential: 20 })
  })

  it('returns undefined for unknown sports (disables anomaly checking rather than guessing)', () => {
    expect(getDefaultAnomalyBounds('quidditch')).toBeUndefined()
  })

  it('returns undefined for null/empty input', () => {
    expect(getDefaultAnomalyBounds(null)).toBeUndefined()
    expect(getDefaultAnomalyBounds(undefined)).toBeUndefined()
    expect(getDefaultAnomalyBounds('')).toBeUndefined()
  })
})
