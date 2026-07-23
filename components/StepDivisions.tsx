'use client'
import type { DivisionDraft } from '@/lib/intakeTypes'
import { newLocalId } from '@/lib/intakeTypes'

const FORMAT_LABELS: Record<DivisionDraft['format'], string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  pool_to_bracket: 'Pool Play → Bracket',
  round_robin: 'Round Robin',
}

export default function StepDivisions({
  divisions, onChange, error,
}: {
  divisions: DivisionDraft[]
  onChange: (v: DivisionDraft[]) => void
  error?: string
}) {
  function addDivision() {
    onChange([...divisions, { localId: newLocalId(), name: '', format: 'single_elimination', minRestMinutes: 45 }])
  }
  function updateDivision(localId: string, patch: Partial<DivisionDraft>) {
    onChange(divisions.map(d => (d.localId === localId ? { ...d, ...patch } : d)))
  }
  function removeDivision(localId: string) {
    onChange(divisions.filter(d => d.localId !== localId))
  }

  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Divisions</h2>
      <p className="helper-text" style={{ marginBottom: '20px' }}>
        Each division gets its own bracket format and teams — e.g. &ldquo;14U Boys Gold&rdquo; and &ldquo;14U Girls Gold&rdquo; are usually separate divisions.
      </p>

      {error && <div className="error-banner">{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
        {divisions.map(d => (
          <div key={d.localId} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <div>
              <label>Division name</label>
              <input value={d.name} onChange={e => updateDivision(d.localId, { name: e.target.value })} placeholder="14U Boys Gold" />
            </div>
            <div>
              <label>Format</label>
              <select value={d.format} onChange={e => updateDivision(d.localId, { format: e.target.value as DivisionDraft['format'] })}>
                {Object.entries(FORMAT_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label>Min rest (min)</label>
              <input
                type="number"
                min={0}
                value={d.minRestMinutes}
                onChange={e => updateDivision(d.localId, { minRestMinutes: Number(e.target.value) })}
              />
            </div>
            <button className="btn-danger-ghost" onClick={() => removeDivision(d.localId)} type="button">Remove</button>
          </div>
        ))}
      </div>

      {divisions.length === 0 && (
        <p className="helper-text" style={{ marginBottom: '16px' }}>No divisions yet — add at least one to continue.</p>
      )}

      <button className="btn-secondary" onClick={addDivision} type="button">+ Add division</button>
    </div>
  )
}
