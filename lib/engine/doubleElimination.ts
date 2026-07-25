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
 * BYES: non-power-of-2 team counts are supported. The bracket is built at the
 * next power of two and the top seeds receive round-1 byes (exactly like
 * single-elimination). The subtlety unique to double-elim is that a WB
 * round-1 bye produces NO loser to drop into the losers bracket, which leaves
 * LB slots empty. We resolve this by *contracting* those empty LB matches:
 *
 *   - LB round-1 match fed by one real WB loser + one bye  -> the real loser
 *     skips straight to where that LB match would have fed (a "pass-through").
 *   - LB round-1 match fed by two byes                     -> it is dead; the
 *     WB round-2 loser that would have met its survivor skips ahead instead.
 *
 * Because a WB round-2 (or later) match always has two real teams — no WB
 * round-1 match can be a double-bye, since the smaller seed in every pairing
 * is always present — empty slots can only appear in LB round 1 and the first
 * drop round. That keeps the contraction local and 1:1 with no cascading.
 * The result contains only real, playable matches (plus the visible WB byes,
 * which are kept as auto-completed matches the way single-elim does it).
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
  const P = nextPowerOfTwo(n)
  const k = Math.log2(P)
  const order = seedOrder(P)
  const teamBySeed = new Map(teams.map(t => [t.seed, t]))
  const all: Match[] = []

  // ---------- Winners bracket skeleton (built at full power-of-2 size) ----------
  const wb: Match[][] = []
  for (let r = 0; r < k; r++) {
    const count = P / Math.pow(2, r + 1)
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
  // Seed WB round 1 (absent seeds -> null slot = a bye)
  for (let pos = 0; pos < wb[0].length; pos++) {
    wb[0][pos].homeTeamId = teamBySeed.get(order[pos * 2])?.id ?? null
    wb[0][pos].awayTeamId = teamBySeed.get(order[pos * 2 + 1])?.id ?? null
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
    let survivorsCount = wb[0].length // = P/2 = L_1, the round-1 WB loser count

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

  // ---------- Bye resolution ----------
  // Nothing to do for exact powers of two: the bracket above is already whole.
  if (P === n) return all

  const wbById = new Map(all.map(m => [m.id, m]))

  // 1) Auto-advance every WB round-1 bye (one team present) into round 2, the
  //    same way single-elimination does. Record which round-1 positions are
  //    byes so we can find the empty losers-bracket slots they leave behind.
  const byePos = new Set<number>()
  for (let pos = 0; pos < wb[0].length; pos++) {
    const m = wb[0][pos]
    const hasHome = m.homeTeamId !== null
    const hasAway = m.awayTeamId !== null
    if (hasHome === hasAway) continue // real match (or, impossibly, a double-bye)
    byePos.add(pos)
    m.status = 'completed'
    m.bracketMeta.isBye = true
    const advancingId = hasHome ? m.homeTeamId : m.awayTeamId
    if (m.bracketMeta.nextMatchId) {
      const nm = wbById.get(m.bracketMeta.nextMatchId)!
      if (m.bracketMeta.nextMatchSlot === 'home') nm.homeTeamId = advancingId
      else nm.awayTeamId = advancingId
    }
  }

  // 2) Contract the losers bracket. lb[0] = LB round 1, lb[1] = first drop
  //    round; these are the only rounds a bye can touch. LB round-1 match j is
  //    fed by WB round-1 matches 2j (home) and 2j+1 (away); the first drop
  //    round is 1:1 with LB round 1 (drop[j].home <- lb1[j], drop[j].away <-
  //    WB round-2 match j's loser).
  const removed = new Set<string>()
  const lb1 = lb[0]
  const dropRound = lb[1] // exists whenever there are byes (n >= 3 => k >= 2)

  for (let j = 0; j < lb1.length; j++) {
    const homeBye = byePos.has(2 * j)
    const awayBye = byePos.has(2 * j + 1)
    if (!homeBye && !awayBye) continue

    const lb1m = lb1[j]
    if (homeBye && awayBye) {
      // Dead LB round-1 match: no losers arrive. Its drop-round match now has
      // an empty home slot fed only by the (real) WB round-2 loser, so that
      // loser skips the drop match and goes straight to where it fed.
      removed.add(lb1m.id)
      const dropM = dropRound[j]
      const wbR2 = wb[1][j]
      wbR2.bracketMeta.loserNextMatchId = dropM.bracketMeta.nextMatchId
      wbR2.bracketMeta.loserNextMatchSlot = dropM.bracketMeta.nextMatchSlot
      removed.add(dropM.id)
    } else {
      // Pass-through: exactly one real WB loser arrives, so route it straight
      // to where this LB match would have fed and drop the LB match itself.
      const realFeeder = homeBye ? wb[0][2 * j + 1] : wb[0][2 * j]
      realFeeder.bracketMeta.loserNextMatchId = lb1m.bracketMeta.nextMatchId
      realFeeder.bracketMeta.loserNextMatchSlot = lb1m.bracketMeta.nextMatchSlot
      removed.add(lb1m.id)
    }
  }

  // A bye has no loser: sever every WB round-1 bye's dangling loser link so no
  // reference points at a removed match.
  for (const pos of byePos) {
    wb[0][pos].bracketMeta.loserNextMatchId = null
    wb[0][pos].bracketMeta.loserNextMatchSlot = null
  }

  return all.filter(m => !removed.has(m.id))
}
