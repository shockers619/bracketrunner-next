export interface EventDetails {
  title: string
  slug: string
  sport: string
  startDate: string
  endDate: string
}

export interface DivisionDraft {
  localId: string
  name: string
  format: 'single_elimination' | 'double_elimination' | 'pool_to_bracket' | 'round_robin'
  minRestMinutes: number
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

export interface IntakeState {
  tenantId: string
  event: EventDetails
  divisions: DivisionDraft[]
  venues: VenueDraft[]
  teamsByDivision: Record<string, TeamDraft[]>
}

export function emptyIntakeState(): IntakeState {
  return {
    tenantId: '',
    event: { title: '', slug: '', sport: '', startDate: '', endDate: '' },
    divisions: [],
    venues: [],
    teamsByDivision: {},
  }
}

export function newLocalId(): string {
  return Math.random().toString(36).slice(2, 10)
}
