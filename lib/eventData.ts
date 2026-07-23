import { createClient } from '@supabase/supabase-js'

export interface EventRecord {
  id: string
  title: string
  slug: string
  sport: string
  start_date: string
  end_date: string
}

export interface DivisionRecord {
  id: string
  name: string
  format: 'single_elimination' | 'double_elimination' | 'pool_to_bracket' | 'round_robin'
}

export interface TeamRecord {
  id: string
  division_id: string
  name: string
  club_name: string | null
  seed: number | null
}

export interface BracketMeta {
  round: number
  position: number
  nextMatchId?: string | null
  next_match_id?: string | null
  poolId?: string
  pool_id?: string
  isBye?: boolean
  is_bye?: boolean
  isGrandFinal?: boolean
  grandFinalGame?: 1 | 2
}

export interface MatchRecord {
  id: string
  division_id: string
  court_id: string | null
  home_team_id: string | null
  away_team_id: string | null
  start_time: string | null
  duration_minutes: number
  home_score: number
  away_score: number
  status: 'scheduled' | 'in_progress' | 'pending_confirmation' | 'completed' | 'cancelled'
  bracket_meta: BracketMeta
}

export interface CourtRecord {
  id: string
  venue_id: string
  name: string
  sport_type: string
}

export interface VenueRecord {
  id: string
  name: string
  city: string | null
  state: string | null
}

export interface EventPageData {
  event: EventRecord
  divisions: DivisionRecord[]
  teams: TeamRecord[]
  matches: MatchRecord[]
  courts: CourtRecord[]
  venues: VenueRecord[]
}

function getClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) return null
  return createClient(url, anonKey)
}

export async function getEventPageData(slug: string): Promise<EventPageData | null> {
  const supabase = getClient()
  if (!supabase) return null

  const { data: event, error: eventErr } = await supabase
    .from('events')
    .select('id, title, slug, sport, start_date, end_date')
    .eq('slug', slug)
    .single()

  if (eventErr || !event) return null

  const { data: divisions } = await supabase
    .from('divisions')
    .select('id, name, format')
    .eq('event_id', event.id)

  const divisionIds = (divisions || []).map(d => d.id)

  const { data: teams } = divisionIds.length
    ? await supabase.from('teams').select('id, division_id, name, club_name, seed').in('division_id', divisionIds)
    : { data: [] }

  const { data: matches } = await supabase
    .from('matches')
    .select('id, division_id, court_id, home_team_id, away_team_id, start_time, duration_minutes, home_score, away_score, status, bracket_meta')
    .eq('event_id', event.id)

  const courtIds = Array.from(new Set((matches || []).map(m => m.court_id).filter(Boolean))) as string[]
  const { data: courts } = courtIds.length
    ? await supabase.from('courts').select('id, venue_id, name, sport_type').in('id', courtIds)
    : { data: [] }

  const venueIds = Array.from(new Set((courts || []).map(c => c.venue_id).filter(Boolean))) as string[]
  const { data: venues } = venueIds.length
    ? await supabase.from('venues').select('id, name, city, state').in('id', venueIds)
    : { data: [] }

  return {
    event,
    divisions: divisions || [],
    teams: teams || [],
    matches: (matches || []) as MatchRecord[],
    courts: courts || [],
    venues: venues || [],
  }
}
