'use client'
import { useState, useEffect } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'

interface EventRow {
  id: string
  title: string
  slug: string
  sport: string
  start_date: string
}

export default function EventsPage() {
  const { ready, tenantId, orgName } = useAuthTenant()
  const [events, setEvents] = useState<EventRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!ready || !tenantId) return
    supabase
      .from('events')
      .select('id, title, slug, sport, start_date')
      .eq('tenant_id', tenantId)
      .order('start_date', { ascending: false })
      .then(({ data }) => {
        setEvents(data || [])
        setLoading(false)
      })
  }, [ready, tenantId])

  if (!ready) {
    return (
      <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="helper-text">Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '760px', margin: '0 auto', padding: '48px 24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
        <h1 style={{ fontSize: '24px' }}>My Events</h1>
        <a href="/intake" className="btn-primary" style={{ textDecoration: 'none', padding: '10px 18px', fontSize: '14px' }}>
          + New Event
        </a>
      </div>
      <p className="helper-text" style={{ marginBottom: '28px' }}>{orgName}</p>

      {loading && <p className="helper-text">Loading events…</p>}
      {!loading && events.length === 0 && <p className="helper-text">No events yet — create your first one.</p>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {events.map(e => (
          <a
            key={e.id}
            href={`/events/${e.id}`}
            className="card"
            style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontWeight: 700, fontSize: '16px' }}>{e.title}</p>
                <p className="helper-text">{e.sport} · {e.start_date}</p>
              </div>
              <span className="mono" style={{ color: 'var(--accent)' }}>Manage →</span>
            </div>
          </a>
        ))}
      </div>
    </div>
  )
}
