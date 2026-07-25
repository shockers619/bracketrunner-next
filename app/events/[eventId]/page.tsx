'use client'
import { useState, useEffect } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'
import ShareCard from '@/components/event/ShareCard'
import ActionTile from '@/components/event/ActionTile'

interface DivisionRow {
  id: string
  name: string
  format: string
}

interface EventRow {
  title: string
  slug: string
  sport: string
  start_date: string
  end_date: string
}

function formatDateRange(start: string, end: string) {
  if (!start) return ''
  const s = new Date(start + 'T00:00:00')
  const e = new Date((end || start) + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start === end) return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  const { ready } = useAuthTenant()
  const [event, setEvent] = useState<EventRow | null>(null)
  const [divisions, setDivisions] = useState<DivisionRow[]>([])
  const [divisionsWithPools, setDivisionsWithPools] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    async function load() {
      const { data: eventRow } = await supabase
        .from('events')
        .select('title, slug, sport, start_date, end_date')
        .eq('id', params.eventId)
        .single()
      setEvent(eventRow)

      const { data: divs } = await supabase
        .from('divisions')
        .select('id, name, format')
        .eq('event_id', params.eventId)
      setDivisions(divs || [])

      // Which pool_to_bracket divisions already have pools generated (via the
      // intake wizard or here)? Drives the "Set up" vs "Resolve" label below.
      const poolDivIds = (divs || []).filter(d => d.format === 'pool_to_bracket').map(d => d.id)
      if (poolDivIds.length > 0) {
        const { data: poolRows } = await supabase.from('pools').select('division_id').in('division_id', poolDivIds)
        setDivisionsWithPools(new Set((poolRows || []).map(p => p.division_id)))
      }
      setLoading(false)
    }
    load()
  }, [ready, params.eventId])

  if (!ready || loading) {
    return (
      <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="helper-text">Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '40px 16px 60px' }}>
      <a href="/events" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>← My Events</a>

      <h1 style={{ fontSize: '26px', marginTop: '12px', marginBottom: '6px', letterSpacing: '-0.02em' }}>
        {event?.title || 'Event'}
      </h1>
      <p className="mono" style={{ color: 'var(--ink-muted)', marginBottom: '24px' }}>
        {event?.sport}{event?.sport && event?.start_date ? ' · ' : ''}
        {formatDateRange(event?.start_date || '', event?.end_date || '')}
      </p>

      {event?.slug && <ShareCard slug={event.slug} />}

      {/* Run-the-event actions. These pages already existed but were reachable
          only by typing their URLs by hand — a real hole for a director
          standing courtside. */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        <ActionTile
          href={`/events/${params.eventId}/scorekeeper`}
          title="Scorekeeper"
          body="Enter live scores. Works offline and syncs when you reconnect."
        />
        <ActionTile
          href={`/events/${params.eventId}/admin/overrides`}
          title="Overrides"
          body="Fix a score, reset a match, or force a team through. Every change is logged."
        />
      </div>

      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '10px' }}>
        {divisions.length} division{divisions.length === 1 ? '' : 's'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {divisions.length === 0 && (
          <p className="helper-text">No divisions yet.</p>
        )}
        {divisions.map(d => (
          <div
            key={d.id}
            className="card"
            style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'space-between', alignItems: 'center', padding: '18px' }}
          >
            <div style={{ minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>{d.name}</p>
              <p className="helper-text" style={{ textTransform: 'capitalize', marginTop: '2px' }}>{d.format.replace(/_/g, ' ')}</p>
            </div>
            {d.format === 'pool_to_bracket' && (
              <a
                href={`/events/${params.eventId}/divisions/${d.id}/pools`}
                className="btn-secondary"
                style={{ textDecoration: 'none', fontSize: '13px', padding: '10px 14px', flexShrink: 0 }}
              >
                {divisionsWithPools.has(d.id) ? 'Resolve to bracket →' : 'Set up pools →'}
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
