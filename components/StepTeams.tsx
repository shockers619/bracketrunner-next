'use client'
import { useState } from 'react'
import type { DivisionDraft, TeamDraft } from '@/lib/intakeTypes'
import { parseTeamsFromCSV, parseTeamsFromJSON } from '@/lib/parser'

function TeamsForDivision({
  division, teams, onChange,
}: {
  division: DivisionDraft
  teams: TeamDraft[]
  onChange: (teams: TeamDraft[]) => void
}) {
  const [mode, setMode] = useState<'manual' | 'paste'>('manual')
  const [pasteText, setPasteText] = useState('')
  const [pasteFormat, setPasteFormat] = useState<'csv' | 'json'>('csv')
  const [pasteErrors, setPasteErrors] = useState<string[]>([])

  function addBlankTeam() {
    onChange([...teams, { name: '' }])
  }
  function updateTeam(index: number, patch: Partial<TeamDraft>) {
    onChange(teams.map((t, i) => (i === index ? { ...t, ...patch } : t)))
  }
  function removeTeam(index: number) {
    onChange(teams.filter((_, i) => i !== index))
  }

  function applyPaste() {
    const result = pasteFormat === 'csv' ? parseTeamsFromCSV(pasteText) : parseTeamsFromJSON(pasteText)
    setPasteErrors(result.errors)
    if (result.teams.length > 0) {
      onChange([...teams, ...result.teams])
      setPasteText('')
    }
  }

  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '16px', marginBottom: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '16px' }}>{division.name || 'Untitled division'}</h3>
        <span className="helper-text">{teams.length} team{teams.length === 1 ? '' : 's'}</span>
      </div>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
        <button
          type="button"
          className={mode === 'manual' ? 'btn-secondary' : 'btn-ghost'}
          onClick={() => setMode('manual')}
        >Add manually</button>
        <button
          type="button"
          className={mode === 'paste' ? 'btn-secondary' : 'btn-ghost'}
          onClick={() => setMode('paste')}
        >Paste or upload CSV/JSON</button>
      </div>

      {mode === 'manual' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            {teams.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 90px auto', gap: '8px' }}>
                <input placeholder="Team name" value={t.name} onChange={e => updateTeam(i, { name: e.target.value })} />
                <input placeholder="Club (optional)" value={t.clubName || ''} onChange={e => updateTeam(i, { clubName: e.target.value })} />
                <input
                  placeholder="Seed"
                  type="number"
                  min={1}
                  value={t.seed ?? ''}
                  onChange={e => updateTeam(i, { seed: e.target.value ? Number(e.target.value) : undefined })}
                />
                <button className="btn-danger-ghost" type="button" onClick={() => removeTeam(i)}>Remove</button>
              </div>
            ))}
          </div>
          <button className="btn-ghost" type="button" onClick={addBlankTeam}>+ Add team</button>
        </>
      )}

      {mode === 'paste' && (
        <div>
          <div style={{ display: 'flex', gap: '16px', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 400 }}>
              <input type="radio" name={`fmt-${division.localId}`} checked={pasteFormat === 'csv'} onChange={() => setPasteFormat('csv')} style={{ width: 'auto' }} />
              CSV
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 400 }}>
              <input type="radio" name={`fmt-${division.localId}`} checked={pasteFormat === 'json'} onChange={() => setPasteFormat('json')} style={{ width: 'auto' }} />
              JSON
            </label>
          </div>
          <textarea
            rows={6}
            value={pasteText}
            onChange={e => setPasteText(e.target.value)}
            placeholder={pasteFormat === 'csv' ? 'name,club_name,seed\nTigers,Elite Basketball,1\nHawks,Pro Skills,2' : '[{"name":"Tigers","club_name":"Elite Basketball","seed":1}]'}
            className="mono"
          />
          <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
            <input
              type="file"
              accept={pasteFormat === 'csv' ? '.csv,text/csv' : '.json,application/json'}
              onChange={async e => {
                const file = e.target.files?.[0]
                if (file) setPasteText(await file.text())
              }}
              style={{ flex: 1 }}
            />
            <button className="btn-secondary" type="button" onClick={applyPaste} disabled={!pasteText.trim()}>Parse & add teams</button>
          </div>
          {pasteErrors.length > 0 && (
            <div className="error-banner">
              {pasteErrors.length} issue{pasteErrors.length === 1 ? '' : 's'} found:
              <ul>{pasteErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function StepTeams({
  divisions, teamsByDivision, onChange,
}: {
  divisions: DivisionDraft[]
  teamsByDivision: Record<string, TeamDraft[]>
  onChange: (v: Record<string, TeamDraft[]>) => void
}) {
  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Teams</h2>
      <p className="helper-text" style={{ marginBottom: '20px' }}>
        Add teams to each division — one at a time, or paste/upload a full roster list.
      </p>
      {divisions.length === 0 && <p className="helper-text">Add a division first (previous step) before adding teams.</p>}
      {divisions.map(d => (
        <TeamsForDivision
          key={d.localId}
          division={d}
          teams={teamsByDivision[d.localId] || []}
          onChange={teams => onChange({ ...teamsByDivision, [d.localId]: teams })}
        />
      ))}
    </div>
  )
}
