'use client'
import type { IntakeState } from '@/lib/intakeTypes'
import { DEFAULT_POOL_CONFIG, orderedForSeeding } from '@/lib/intakeTypes'
import { snakeSeedPools, buildAdvancementRules } from '@/lib/engine/poolAssignment'

function poolSummary(state: IntakeState, divisionLocalId: string): string | null {
  const cfg = state.poolConfigByDivision[divisionLocalId] ?? DEFAULT_POOL_CONFIG
  const teams = state.teamsByDivision[divisionLocalId] || []
  if (teams.length < 2 || cfg.poolCount < 1 || cfg.poolCount > teams.length) return null
  const engineTeams = orderedForSeeding(teams).map((t, i) => ({ id: String(i), name: t.name, seed: i + 1 }))
  const assignment = snakeSeedPools(engineTeams, cfg.poolCount)
  const bracketSize = buildAdvancementRules(assignment.map(a => a.teams.length), cfg.advancingPerPool).length
  return `${cfg.poolCount} pool${cfg.poolCount === 1 ? '' : 's'}, top ${cfg.advancingPerPool} advance → ${bracketSize}-team bracket`
}

export default function StepReview({
  state, submitting, submitError, onSubmit,
}: {
  state: IntakeState
  submitting: boolean
  submitError: string | null
  onSubmit: () => void
}) {
  const totalTeams = Object.values(state.teamsByDivision).reduce((sum, teams) => sum + teams.length, 0)
  const totalCourts = state.venues.reduce((sum, v) => sum + v.courts.length, 0)

  return (
    <div className="card">
      <h2 style={{ fontSize: '20px', marginBottom: '4px' }}>Review & create</h2>
      <p className="helper-text" style={{ marginBottom: '20px' }}>Double-check everything below, then create the event.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}>
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>{state.event.title || '(untitled event)'}</p>
          <p className="helper-text">
            {state.event.sport || 'sport TBD'} · {state.event.startDate || '?'} – {state.event.endDate || '?'} · bracketrunner.com/{state.event.slug || '...'}
          </p>
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>{state.divisions.length} division{state.divisions.length === 1 ? '' : 's'}</p>
          {state.divisions.map(d => {
            const pools = d.format === 'pool_to_bracket' ? poolSummary(state, d.localId) : null
            return (
              <p key={d.localId} className="helper-text">
                {d.name || '(unnamed)'} — {d.format.replace(/_/g, ' ')}, {(state.teamsByDivision[d.localId] || []).length} teams
                {pools && <span> · {pools}</span>}
              </p>
            )
          })}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>{state.venues.length} venue{state.venues.length === 1 ? '' : 's'}, {totalCourts} court{totalCourts === 1 ? '' : 's'}</p>
          {state.venues.map(v => (
            <p key={v.localId} className="helper-text">{v.name || '(unnamed)'} — {v.city}, {v.state} ({v.courts.length} courts)</p>
          ))}
        </div>
        <div>
          <p style={{ fontWeight: 600, fontSize: '14px' }}>{totalTeams} team{totalTeams === 1 ? '' : 's'} total</p>
        </div>
      </div>

      {submitError && <div className="error-banner">{submitError}</div>}

      <button className="btn-primary" onClick={onSubmit} disabled={submitting} type="button">
        {submitting ? 'Creating event…' : 'Create event'}
      </button>
    </div>
  )
}
