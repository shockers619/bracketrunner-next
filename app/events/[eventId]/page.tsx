'use client'
import { useState, useEffect } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'

interface DivisionRow {
  id: string
  name: string
  format: string
}

export default function EventDetailPage({ params }: { params: { eventId: string } }) {
  const { ready } = useAuthTenant()
  const [eventTitle, setEventTitle] = useState('')
  const [divisions, setDivisions] = useState<DivisionRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready) return
    async function load() {
      const { data: event } = await supabase.from('events').select('title').eq('id', params.eventId).single()
      setEventTitle(event?.title || '')
      const { data: divs } = await supabase
        .from('divisions')
        .select('id, name, format')
        .eq('event_id', params.eventId)
      setDivisions(divs || [])
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
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
      <a href="/events" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>← My Events</a>
      <h1 style={{ fontSize: '24px', marginTop: '12px', marginBottom: '28px' }}>{eventTitle}</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {divisions.map(d => (
          <div key={d.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 700, fontSize: '16px' }}>{d.name}</p>
              <p className="helper-text" style={{ textTransform: 'capitalize' }}>{d.format.replace(/_/g, ' ')}</p>
            </div>
            {d.format === 'pool_to_bracket' && (
              <a
                href={`/events/${params.eventId}/divisions/${d.id}/pools`}
                className="btn-secondary"
                style={{ textDecoration: 'none', fontSize: '13px', padding: '8px 14px' }}
              >
                Set up pools →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
