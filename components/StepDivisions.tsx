'use client'
import type { DivisionDraft } from '@/lib/intakeTypes'
import { newLocalId } from '@/lib/intakeTypes'
import Select from '@/components/admin/Select'
import { getSportScheduleDefaults, hasSportScheduleDefaults, resourceNounFor } from '@/lib/engine/sportDefaults'

const FORMAT_LABELS: Record<DivisionDraft['format'], string> = {
  single_elimination: 'Single Elimination',
  double_elimination: 'Double Elimination',
  pool_to_bracket: 'Pool Play → Bracket',
  round_robin: 'Round Robin',
}

export default function StepDivisions({
  divisions, onChange, error, sport,
}: {
  divisions: DivisionDraft[]
  onChange: (v: DivisionDraft[]) => void
  error?: string
  sport?: string
}) {
  // Timing defaults come from the sport, so a wrestling event starts at
  // 15-minute bouts on a mat rather than hour-long basketball games.
  const defaults = getSportScheduleDefaults(sport)
  const tuned = hasSportScheduleDefaults(sport)
  const surface = resourceNounFor(sport)

  function addDivision() {
    onChange([...divisions, {
      localId: newLocalId(),
      name: '',
      format: 'single_elimination',
      minRestMinutes: defaults.minRestMinutes,
      gameDurationMinutes: defaults.durationMinutes,
      bufferMinutes: defaults.bufferMinutes,
    }])
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
          <div key={d.localId} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px' }}>
            <div className="field-row field-row-division">
              <div>
                <label>Division name</label>
                <input value={d.name} onChange={e => updateDivision(d.localId, { name: e.target.value })} placeholder="14U Boys Gold" />
              </div>
              <div>
                <label>Format</label>
                <Select
                  value={d.format}
                  onChange={val => updateDivision(d.localId, { format: val as DivisionDraft['format'] })}
                  options={Object.entries(FORMAT_LABELS).map(([value, label]) => ({ value, label }))}
                />
              </div>
              <button className="btn-danger-ghost" onClick={() => removeDivision(d.localId)} type="button">Remove</button>
            </div>

            {/* Scheduling inputs — the engine needs all three to place games. */}
            <div className="field-row field-row-timing" style={{ marginTop: '12px' }}>
              <div>
                <label>Game length (min)</label>
                <input
                  type="number" min={1}
                  value={d.gameDurationMinutes}
                  onChange={e => updateDivision(d.localId, { gameDurationMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Turnaround (min)</label>
                <input
                  type="number" min={0}
                  value={d.bufferMinutes}
                  onChange={e => updateDivision(d.localId, { bufferMinutes: Number(e.target.value) })}
                />
              </div>
              <div>
                <label>Min rest (min)</label>
                <input
                  type="number" min={0}
                  value={d.minRestMinutes}
                  onChange={e => updateDivision(d.localId, { minRestMinutes: Number(e.target.value) })}
                />
              </div>
            </div>
            <p className="helper-text">
              How long the {surface} is tied up per game, the gap before the next game on it, and the recovery a team gets between its own games.
            </p>
          </div>
        ))}
      </div>

      {divisions.length === 0 && (
        <p className="helper-text" style={{ marginBottom: '16px' }}>No divisions yet — add at least one to continue.</p>
      )}

      {divisions.length > 0 && (
        <p className="helper-text" style={{ marginBottom: '12px' }}>
          {tuned
            ? `Timing prefilled with typical ${sport?.toLowerCase()} values — adjust if your event runs differently.`
            : 'Timing uses generic defaults — worth confirming these match how your sport actually runs.'}
        </p>
      )}

      <button className="btn-secondary" onClick={addDivision} type="button">+ Add division</button>
    </div>
  )
}
