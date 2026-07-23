import type { Team, Match, BracketMeta } from './types'
import { seedOrder, nextPowerOfTwo } from './bracket'

let idCounter = 0
function genId(): string {
  idCounter += 1
  return `de-${idCounter}-${Math.random().toString(36).slice(2, 8)}`
}
export function _resetDoubleElimIdCounterForTests() {
  idCounter = 0
}

export interface GenerateDoubleEliminationOptions {
  divisionId: string
}

function blankMeta(round: number, position: number): BracketMeta {
  return { round, position, nextMatchId: null, nextMatchSlot: null }
}

function newMatch(divisionId: string, meta: BracketMeta): Match {
  return {
    id: genId(),
    divisionId,
    courtId: null,
    homeTeamId: null,
    awayTeamId: null,
    startTime: null,
    durationMinutes: 60,
    homeScore: 0,
    awayScore: 0,
    status: 'scheduled',
    bracketMeta: meta,
  }
}

/**
 * Generates a full double-elimination bracket: winners bracket (WB), losers
 * bracket (LB) with the standard alternating consolidation/drop-down
 * structure, and a grand final with a conditional bracket-reset second game.
 *
 * SCOPE: power-of-2 team counts only for now. Byes compound significantly
 * with double-elimination's loser routing (a bye produces no WB loser to
 * route into LB, which shifts LB round sizing) — supporting that properly
 * is real additional design work, deliberately deferred rather than bolted
 * on unsafely. Round-robin and single-elimination both already support byes;
 * this one throws on non-power-of-2 input rather than silently mishandling it.
 *
 * SIMPLIFICATION: LB drop-down pairings use direct positional matching
 * (survivor position i faces new-loser position i) rather than the extra
 * "avoid an immediate rematch of two teams that just played in WB" seeding
 * some bracket software adds. Every team still gets a fully valid, fair
 * double-elimination path — this only affects whether a rematch can happen
 * slightly earlier than the optimal case, not correctness.
 */
export function generateDoubleEliminationBracket(teams: Team[], opts: GenerateDoubleEliminationOptions): Match[] {
  if (teams.length < 2) throw new Error('Need at least 2 teams to generate a bracket')
  const n = teams.length
  if ((n & (n - 1)) !== 0) {
    throw new Error(
      `generateDoubleEliminationBracket currently requires a power-of-2 team count (got ${n}). ` +
      `Bye support for double-elimination is a deferred follow-up.`
    )
  }

  const k = Math.log2(n)
  const order = seedOrder(n)
  const teamBySeed = new Map(teams.map(t => [t.seed, t]))
  const all: Match[] = []

  // ---------- Winners bracket ----------
  const wb: Match[][] = []
  for (let r = 0; r < k; r++) {
    const count = n / Math.pow(2, r + 1)
    const round: Match[] = []
    for (let pos = 0; pos < count; pos++) {
      const m = newMatch(opts.divisionId, blankMeta(r + 1, pos))
      m.bracketMeta.bracketSide = 'winners'
      round.push(m)
    }
    wb.push(round)
    all.push(...round)
  }
  // WB winner routing (round r -> round r+1), same pattern as single-elim
  for (let r = 0; r < k - 1; r++) {
    for (let pos = 0; pos < wb[r].length; pos++) {
      const next = wb[r + 1][Math.floor(pos / 2)]
      wb[r][pos].bracketMeta.nextMatchId = next.id
      wb[r][pos].bracketMeta.nextMatchSlot = pos % 2 === 0 ? 'home' : 'away'
    }
  }
  // Seed WB round 1
  for (let pos = 0; pos < wb[0].length; pos++) {
    const homeSeed = order[pos * 2]
    const awaySeed = order[pos * 2 + 1]
    wb[0][pos].homeTeamId = teamBySeed.get(homeSeed)?.id ?? null
    wb[0][pos].awayTeamId = teamBySeed.get(awaySeed)?.id ?? null
  }

  // ---------- Losers bracket ----------
  const lb: Match[][] = []
  let wbFinal: Match
  let lbFinal: Match | null = null
  let lbRoundNum = 1

  if (k === 1) {
    // Only 2 teams: a single WB match, one loser, nobody for them to play
    // in a losers bracket — they go straight to the grand final as the
    // "LB champion" slot with zero LB matches.
    wbFinal = wb[0][0]
  } else {
    let survivorsCount = wb[0].length // = n/2 = L_1, the round-1 WB loser count

    // LB round 1: consolidation among round-1 WB losers
    {
      const count = survivorsCount / 2
      const round: Match[] = []
      for (let pos = 0; pos < count; pos++) {
        const m = newMatch(opts.divisionId, blankMeta(1, pos))
        m.bracketMeta.bracketSide = 'losers'
        round.push(m)
      }
      lb.push(round)
      all.push(...round)
      for (let pos = 0; pos < wb[0].length; pos++) {
        const target = round[Math.floor(pos / 2)]
        wb[0][pos].bracketMeta.loserNextMatchId = target.id
        wb[0][pos].bracketMeta.loserNextMatchSlot = pos % 2 === 0 ? 'home' : 'away'
      }
      survivorsCount = count
    }

    lbRoundNum = 2
    for (let wbRound = 1; wbRound < k; wbRound++) {
      const dropCount = survivorsCount
      const dropRound: Match[] = []
      for (let pos = 0; pos < dropCount; pos++) {
        const m = newMatch(opts.divisionId, blankMeta(lbRoundNum, pos))
        m.bracketMeta.bracketSide = 'losers'
        dropRound.push(m)
      }
      lb.push(dropRound)
      all.push(...dropRound)
      lbRoundNum++

      const prevLbRound = lb[lb.length - 2]
      for (let pos = 0; pos < prevLbRound.length; pos++) {
        prevLbRound[pos].bracketMeta.nextMatchId = dropRound[pos].id
        prevLbRound[pos].bracketMeta.nextMatchSlot = 'home'
      }
      for (let pos = 0; pos < wb[wbRound].length; pos++) {
        wb[wbRound][pos].bracketMeta.loserNextMatchId = dropRound[pos].id
        wb[wbRound][pos].bracketMeta.loserNextMatchSlot = 'away'
      }
      survivorsCount = dropCount

      const isLastWbRound = wbRound === k - 1
      if (!isLastWbRound && survivorsCount > 1) {
        const consCount = survivorsCount / 2
        const consRound: Match[] = []
        for (let pos = 0; pos < consCount; pos++) {
          const m = newMatch(opts.divisionId, blankMeta(lbRoundNum, pos))
          m.bracketMeta.bracketSide = 'losers'
          consRound.push(m)
        }
        lb.push(consRound)
        all.push(...consRound)
        lbRoundNum++

        for (let pos = 0; pos < dropRound.length; pos++) {
          const target = consRound[Math.floor(pos / 2)]
          dropRound[pos].bracketMeta.nextMatchId = target.id
          dropRound[pos].bracketMeta.nextMatchSlot = pos % 2 === 0 ? 'home' : 'away'
        }
        survivorsCount = consCount
      }
    }

    wbFinal = wb[k - 1][0]
    lbFinal = lb[lb.length - 1][0]
  }

  // ---------- Grand Final ----------
  const gf1 = newMatch(opts.divisionId, blankMeta(lbRoundNum, 0))
  gf1.bracketMeta.isGrandFinal = true
  gf1.bracketMeta.grandFinalGame = 1
  all.push(gf1)

  const gf2 = newMatch(opts.divisionId, blankMeta(lbRoundNum + 1, 0))
  gf2.bracketMeta.isGrandFinal = true
  gf2.bracketMeta.grandFinalGame = 2
  gf2.status = 'cancelled' // only activated if the LB-side team wins game 1
  all.push(gf2)
  gf1.bracketMeta.nextMatchId = gf2.id // used only for the reset-game wiring

  wbFinal.bracketMeta.nextMatchId = gf1.id
  wbFinal.bracketMeta.nextMatchSlot = 'home'

  if (lbFinal) {
    lbFinal.bracketMeta.nextMatchId = gf1.id
    lbFinal.bracketMeta.nextMatchSlot = 'away'
  } else {
    // k === 1: WB final's LOSER (not winner) is who reaches the grand final
    // from this side, since there was never a losers bracket to survive.
    wbFinal.bracketMeta.loserNextMatchId = gf1.id
    wbFinal.bracketMeta.loserNextMatchSlot = 'away'
  }

  return all
}
