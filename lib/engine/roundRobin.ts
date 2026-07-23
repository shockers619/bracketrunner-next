import type { Team, Match } from './types'

let idCounter = 0
function genId(): string {
  idCounter += 1
  return `rr-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}
export function _resetRoundRobinIdCounterForTests() {
  idCounter = 0
}

export interface RoundRobinOptions {
  divisionId: string
  poolId: string
}

const BYE = '__BYE__'

/**
 * Generates a full round-robin schedule via the classic "circle method":
 * fix one team, rotate the rest around it each round. Produces n-1 rounds
 * for even n (n/2 matches each), or n rounds for odd n (one team sits out
 * each round via a bye slot that's simply omitted from the output).
 *
 * Home/away is alternated round-to-round for the fixed team so it isn't
 * permanently stuck on one side — a minor fairness detail, not load-bearing
 * for correctness.
 */
export function generateRoundRobin(teams: Team[], opts: RoundRobinOptions): Match[] {
  if (teams.length < 2) throw new Error('Need at least 2 teams for round robin')

  const ids: string[] = teams.map(t => t.id)
  const hasBye = ids.length % 2 !== 0
  if (hasBye) ids.push(BYE)

  const n = ids.length
  const rounds = n - 1
  const half = n / 2
  const arr = [...ids] // arr[0] stays fixed; the rest rotate

  const matches: Match[] = []

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i]
      const b = arr[n - 1 - i]
      if (a === BYE || b === BYE) continue

      // Alternate which side is "home" each round for the fixed-position pairing
      const swap = round % 2 === 1 && i === 0
      const homeId = swap ? b : a
      const awayId = swap ? a : b

      matches.push({
        id: genId(),
        divisionId: opts.divisionId,
        courtId: null,
        homeTeamId: homeId,
        awayTeamId: awayId,
        startTime: null,
        durationMinutes: 60,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        bracketMeta: {
          round: round + 1,
          position: i,
          nextMatchId: null,
          nextMatchSlot: null,
          poolId: opts.poolId,
        },
      })
    }

    // rotate: keep arr[0] fixed, cycle the rest
    const last = arr[n - 1]
    for (let i = n - 1; i > 1; i--) arr[i] = arr[i - 1]
    arr[1] = last
  }

  return matches
}
