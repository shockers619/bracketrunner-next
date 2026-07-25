export interface EventDetails {
  title: string
  slug: string
  sport: string
  startDate: string
  endDate: string
  /** Daily operating window, "HH:MM". The scheduler places every match inside
   *  this window on each day of the event. */
  dailyStartTime: string
  dailyEndTime: string
}

export interface DivisionDraft {
  localId: string
  name: string
  format: 'single_elimination' | 'double_elimination' | 'pool_to_bracket' | 'round_robin'
  minRestMinutes: number
  /** Wall-clock minutes a match occupies the playing surface. */
  gameDurationMinutes: number
  /** Turnaround on the surface between matches. */
  bufferMinutes: number
}

export interface CourtDraft {
  localId: string
  name: string
}

export interface VenueDraft {
  localId: string
  name: string
  address: string
  city: string
  state: string
  courts: CourtDraft[]
}

export interface TeamDraft {
  name: string
  clubName?: string
  seed?: number
}

/** Per-division pool-play setup, keyed by the division's localId. Only used by
 *  divisions with format 'pool_to_bracket'. */
export interface PoolConfigDraft {
  poolCount: number
  advancingPerPool: number
}

export const DEFAULT_POOL_CONFIG: PoolConfigDraft = { poolCount: 2, advancingPerPool: 2 }

export interface IntakeState {
  tenantId: string
  event: EventDetails
  divisions: DivisionDraft[]
  venues: VenueDraft[]
  teamsByDivision: Record<string, TeamDraft[]>
  poolConfigByDivision: Record<string, PoolConfigDraft>
}

export function emptyIntakeState(): IntakeState {
  return {
    tenantId: '',
    event: { title: '', slug: '', sport: '', startDate: '', endDate: '', dailyStartTime: '08:00', dailyEndTime: '20:00' },
    divisions: [],
    venues: [],
    teamsByDivision: {},
    poolConfigByDivision: {},
  }
}

/** Orders teams the way the intake route assigns final seeds: explicitly
 *  seeded teams first (ascending), then unseeded teams in entry order. The
 *  effective seed of each team is its index + 1. Shared by the wizard preview
 *  and the server so the pools a director previews match what gets created. */
export function orderedForSeeding(teams: TeamDraft[]): TeamDraft[] {
  const seeded = teams.filter(t => t.seed != null).sort((a, b) => a.seed! - b.seed!)
  const unseeded = teams.filter(t => t.seed == null)
  return [...seeded, ...unseeded]
}

export function newLocalId(): string {
  return Math.random().toString(36).slice(2, 10)
}
