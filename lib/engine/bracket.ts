import type { Team, Match, BracketMeta } from './types'

/** Generates the classic tournament seed order for a bracket of the given
 *  power-of-2 size, e.g. size=8 -> [1,8,4,5,2,7,3,6]. This is what keeps
 *  top seeds apart for as long as possible instead of naive 1v2, 3v4 pairing. */
export function seedOrder(size: number): number[] {
  if (size < 2 || (size & (size - 1)) !== 0) {
    throw new Error(`seedOrder size must be a power of 2 >= 2, got ${size}`)
  }
  let seeds = [1, 2]
  let current = 2
  while (current < size) {
    const sum = current * 2 + 1
    const next: number[] = []
    for (const s of seeds) next.push(s, sum - s)
    seeds = next
    current *= 2
  }
  return seeds
}

export function nextPowerOfTwo(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return p
}

let idCounter = 0
function genId(): string {
  idCounter += 1
  return `m-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}

/** Reset the id counter — test-only, so generated ids are deterministic per test run. */
export function _resetIdCounterForTests() {
  idCounter = 0
}

export interface GenerateOptions {
  divisionId: string
}

/**
 * Builds a full single-elimination bracket for the given teams.
 * - Handles non-power-of-2 team counts via byes (byes go to the top seeds).
 * - Byes auto-complete: the present team is immediately advanced, no match
 *   needs to be "played" for a bye slot.
 * - Every match's bracketMeta.nextMatchId links it to the correct match in
 *   the following round, with nextMatchSlot indicating home/away there.
 */
export function generateSingleEliminationBracket(teams: Team[], opts: GenerateOptions): Match[] {
  if (teams.length < 2) throw new Error('Need at least 2 teams to generate a bracket')

  const bracketSize = nextPowerOfTwo(teams.length)
  const rounds = Math.log2(bracketSize)
  const order = seedOrder(bracketSize)
  const teamBySeed = new Map(teams.map(t => [t.seed, t]))

  // matchesByRound[0] = round 1 matches, in bracket position order
  const matchesByRound: Match[][] = []

  // Pre-create every round's match shells first, so we can link forward.
  for (let r = 0; r < rounds; r++) {
    const countInRound = bracketSize / Math.pow(2, r + 1)
    const roundMatches: Match[] = []
    for (let pos = 0; pos < countInRound; pos++) {
      roundMatches.push({
        id: genId(),
        divisionId: opts.divisionId,
        courtId: null,
        homeTeamId: null,
        awayTeamId: null,
        startTime: null,
        durationMinutes: 60,
        homeScore: 0,
        awayScore: 0,
        status: 'scheduled',
        bracketMeta: { round: r + 1, position: pos, nextMatchId: null, nextMatchSlot: null },
      })
    }
    matchesByRound.push(roundMatches)
  }

  // Link each match to its slot in the next round.
  for (let r = 0; r < rounds - 1; r++) {
    for (let pos = 0; pos < matchesByRound[r].length; pos++) {
      const nextMatch = matchesByRound[r + 1][Math.floor(pos / 2)]
      matchesByRound[r][pos].bracketMeta.nextMatchId = nextMatch.id
      matchesByRound[r][pos].bracketMeta.nextMatchSlot = pos % 2 === 0 ? 'home' : 'away'
    }
  }

  // Seed round 1 with actual teams (or byes).
  const round1 = matchesByRound[0]
  for (let pos = 0; pos < round1.length; pos++) {
    const homeSeed = order[pos * 2]
    const awaySeed = order[pos * 2 + 1]
    const homeTeam = teamBySeed.get(homeSeed) ?? null
    const awayTeam = teamBySeed.get(awaySeed) ?? null
    round1[pos].homeTeamId = homeTeam?.id ?? null
    round1[pos].awayTeamId = awayTeam?.id ?? null

    const isBye = !homeTeam || !awayTeam
    if (isBye) {
      round1[pos].status = 'completed'
      round1[pos].bracketMeta.isBye = true
      const advancingTeam = homeTeam ?? awayTeam
      if (advancingTeam && round1[pos].bracketMeta.nextMatchId) {
        const nextMatch = matchesByRound[1].find(m => m.id === round1[pos].bracketMeta.nextMatchId)!
        if (round1[pos].bracketMeta.nextMatchSlot === 'home') nextMatch.homeTeamId = advancingTeam.id
        else nextMatch.awayTeamId = advancingTeam.id
      }
      // A double-bye (both slots empty) can occur if teams.length is very
      // small relative to bracketSize; propagate emptiness harmlessly —
      // the next round match simply has that slot unfilled too.
    }
  }

  return matchesByRound.flat()
}
