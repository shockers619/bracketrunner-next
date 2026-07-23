'use client'
import type { EventDetails } from '@/lib/intakeTypes'

function slugify(text: string): string {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default function StepEvent({
  value, onChange, errors,
}: {
  value: EventDetails
  onChange: (v: EventDetails) => void
  errors: Record<string, string>
}) {
  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Event details</h2>
      <p className="helper-text" style={{ marginBottom: '24px' }}>The basics — you can add divisions, venues, and teams next.</p>

      <div style={{ marginBottom: '18px' }}>
        <label htmlFor="title">Event name</label>
        <input
          id="title"
          value={value.title}
          onChange={e => onChange({ ...value, title: e.target.value, slug: value.slug || slugify(e.target.value) })}
          placeholder="Fall Classic Showcase"
        />
        {errors.title && <p className="field-error">{errors.title}</p>}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label htmlFor="slug">Public URL</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span className="mono" style={{ color: 'var(--ink-muted)' }}>bracketrunner.com/</span>
          <input id="slug" value={value.slug} onChange={e => onChange({ ...value, slug: slugify(e.target.value) })} placeholder="fall-classic-showcase" />
        </div>
        {errors.slug && <p className="field-error">{errors.slug}</p>}
      </div>

      <div style={{ marginBottom: '18px' }}>
        <label htmlFor="sport">Sport</label>
        <input id="sport" value={value.sport} onChange={e => onChange({ ...value, sport: e.target.value })} placeholder="Basketball" />
        {errors.sport && <p className="field-error">{errors.sport}</p>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label htmlFor="startDate">Start date</label>
          <input id="startDate" type="date" value={value.startDate} onChange={e => onChange({ ...value, startDate: e.target.value })} />
          {errors.startDate && <p className="field-error">{errors.startDate}</p>}
        </div>
        <div>
          <label htmlFor="endDate">End date</label>
          <input id="endDate" type="date" value={value.endDate} onChange={e => onChange({ ...value, endDate: e.target.value })} />
          {errors.endDate && <p className="field-error">{errors.endDate}</p>}
        </div>
      </div>
    </div>
  )
}
