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

      {/* The scheduler places every game inside these hours — without them it
          has no window to work in. */}
      <div style={{ marginTop: '18px' }}>
        <label>Daily playing hours</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '10px', alignItems: 'center' }}>
          <input
            aria-label="First game no earlier than"
            type="time"
            value={value.dailyStartTime}
            onChange={e => onChange({ ...value, dailyStartTime: e.target.value })}
          />
          <span className="helper-text" style={{ marginTop: 0 }}>to</span>
          <input
            aria-label="Last game must end by"
            type="time"
            value={value.dailyEndTime}
            onChange={e => onChange({ ...value, dailyEndTime: e.target.value })}
          />
        </div>
        <p className="helper-text">
          First game no earlier than, last game finished by — applied to each day of the event.
        </p>
        {errors.dailyHours && <p className="field-error">{errors.dailyHours}</p>}
      </div>
    </div>
  )
}
