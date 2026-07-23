'use client'
import type { VenueDraft } from '@/lib/intakeTypes'
import { newLocalId } from '@/lib/intakeTypes'

export default function StepVenues({
  venues, onChange, error,
}: {
  venues: VenueDraft[]
  onChange: (v: VenueDraft[]) => void
  error?: string
}) {
  function addVenue() {
    onChange([...venues, { localId: newLocalId(), name: '', address: '', city: '', state: '', courts: [{ localId: newLocalId(), name: 'Court 1' }] }])
  }
  function updateVenue(localId: string, patch: Partial<VenueDraft>) {
    onChange(venues.map(v => (v.localId === localId ? { ...v, ...patch } : v)))
  }
  function removeVenue(localId: string) {
    onChange(venues.filter(v => v.localId !== localId))
  }
  function addCourt(venueLocalId: string) {
    onChange(venues.map(v =>
      v.localId === venueLocalId
        ? { ...v, courts: [...v.courts, { localId: newLocalId(), name: `Court ${v.courts.length + 1}` }] }
        : v
    ))
  }
  function updateCourtName(venueLocalId: string, courtLocalId: string, name: string) {
    onChange(venues.map(v =>
      v.localId === venueLocalId
        ? { ...v, courts: v.courts.map(c => (c.localId === courtLocalId ? { ...c, name } : c)) }
        : v
    ))
  }
  function removeCourt(venueLocalId: string, courtLocalId: string) {
    onChange(venues.map(v =>
      v.localId === venueLocalId ? { ...v, courts: v.courts.filter(c => c.localId !== courtLocalId) } : v
    ))
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Venues & courts</h2>
      <p className="helper-text" style={{ marginBottom: '20px' }}>
        Venues are shared across the whole BracketRunner network — if this facility hosts other events too, it only needs to be entered once, ever.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '16px' }}>
        {venues.map(v => (
          <div key={v.localId} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr auto', gap: '12px', marginBottom: '14px', alignItems: 'end' }}>
              <div>
                <label>Venue name</label>
                <input value={v.name} onChange={e => updateVenue(v.localId, { name: e.target.value })} placeholder="Riverside Sports Complex" />
              </div>
              <div>
                <label>Address</label>
                <input value={v.address} onChange={e => updateVenue(v.localId, { address: e.target.value })} placeholder="123 Main St" />
              </div>
              <div>
                <label>City</label>
                <input value={v.city} onChange={e => updateVenue(v.localId, { city: e.target.value })} placeholder="Springfield" />
              </div>
              <div>
                <label>State</label>
                <input value={v.state} onChange={e => updateVenue(v.localId, { state: e.target.value })} placeholder="PA" maxLength={2} />
              </div>
              <button className="btn-danger-ghost" onClick={() => removeVenue(v.localId)} type="button">Remove</button>
            </div>

            <label style={{ marginBottom: '8px' }}>Courts / fields</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
              {v.courts.map(c => (
                <div key={c.localId} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input value={c.name} onChange={e => updateCourtName(v.localId, c.localId, e.target.value)} style={{ maxWidth: '220px' }} />
                  <button className="btn-danger-ghost" onClick={() => removeCourt(v.localId, c.localId)} type="button">Remove</button>
                </div>
              ))}
            </div>
            <button className="btn-ghost" onClick={() => addCourt(v.localId)} type="button">+ Add court/field</button>
          </div>
        ))}
      </div>

      {venues.length === 0 && (
        <p className="helper-text" style={{ marginBottom: '16px' }}>No venues yet — add at least one to continue.</p>
      )}

      <button className="btn-secondary" onClick={addVenue} type="button">+ Add venue</button>
    </div>
  )
}
