import type { AnomalyBounds } from './advancement'

// Anomaly bounds are intentionally sport-specific — a 105-38 basketball
// score is very likely a typo (should've been 15), but 105-38 makes no
// sense to even check for a sport where nobody scores past 20. Getting
// these wrong in either direction is bad: too loose and typos slip
// through uncaught, too tight and real blowout wins get incorrectly
// flagged as anomalies, and a director closes the confirmation prompt.
//
// These are reasonable starting defaults, not director-configured values —
// there's no per-division override in the schema yet. That's real product
// work (an admin field, most likely), not something to fake here. Sports
// without an entry below get `undefined`, which disables anomaly checking
// entirely rather than guessing wrong.
const DEFAULT_BOUNDS_BY_SPORT: Record<string, AnomalyBounds> = {
  basketball: { maxSingleTeamScore: 120, maxDifferential: 60 },
  volleyball: { maxSingleTeamScore: 35, maxDifferential: 20 },
  soccer: { maxSingleTeamScore: 15, maxDifferential: 10 },
  football: { maxSingleTeamScore: 80, maxDifferential: 50 },
  baseball: { maxSingleTeamScore: 25, maxDifferential: 15 },
  softball: { maxSingleTeamScore: 25, maxDifferential: 15 },
}

export function getDefaultAnomalyBounds(sport: string | null | undefined): AnomalyBounds | undefined {
  if (!sport) return undefined
  return DEFAULT_BOUNDS_BY_SPORT[sport.toLowerCase().trim()]
}
