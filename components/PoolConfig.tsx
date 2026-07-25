'use client'
import { useEffect } from 'react'
import type { PoolConfigDraft, TeamDraft } from '@/lib/intakeTypes'
import { DEFAULT_POOL_CONFIG, orderedForSeeding } from '@/lib/intakeTypes'
import { snakeSeedPools, buildAdvancementRules } from '@/lib/engine/poolAssignment'

export default function PoolConfig({
  teams, config, onChange,
}: {
  teams: TeamDraft[]
  config: PoolConfigDraft | undefined
  onChange: (c: PoolConfigDraft) => void
}) {
  const cfg = config ?? DEFAULT_POOL_CONFIG

  // Persist the defaults the first time so the review step and submit see them
  // even if the director never touches these controls.
  useEffect(() => {
    if (!config) onChange(DEFAULT_POOL_CONFIG)
  }, [config, onChange])

  const teamCount = teams.length

  // Live preview, computed exactly the way the server will: order teams for
  // seeding, then snake-seed into pools. Guard so an impossible pool count
  // (more pools than teams) shows a message instead of throwing.
  let pools: { poolName: string; teamNames: string[] }[] = []
  let bracketSize = 0
  if (teamCount >= cfg.poolCount && cfg.poolCount >= 1) {
    const engineTeams = orderedForSeeding(teams).map((t, i) => ({
      id: String(i),
      name: t.name?.trim() || `Team ${i + 1}`,
      seed: i + 1,
    }))
    const assignment = snakeSeedPools(engineTeams, cfg.poolCount)
    pools = assignment.map(a => ({ poolName: a.poolName, teamNames: a.teams.map(t => t.name) }))
    bracketSize = buildAdvancementRules(assignment.map(a => a.teams.length), cfg.advancingPerPool).length
  }

  const smallestPool = pools.length ? Math.min(...pools.map(p => p.teamNames.length)) : 0
  const warnings: string[] = []
  if (teamCount < 2) warnings.push('Add at least 2 teams to set up pool play.')
  else if (cfg.poolCount > teamCount) warnings.push(`Can't form ${cfg.poolCount} pools from ${teamCount} teams.`)
  else {
    if (smallestPool < 2) warnings.push('Every pool needs at least 2 teams to play a round-robin — reduce the pool count.')
    if (bracketSize < 2) warnings.push('Fewer than 2 teams would advance — increase teams advancing per pool.')
  }

  return (
    <div style={{ border: '1px dashed var(--line)', borderRadius: '8px', padding: '14px', marginTop: '-8px', marginBottom: '16px', background: 'var(--surface-muted, transparent)' }}>
      <p style={{ fontWeight: 600, fontSize: '13px', marginBottom: '10px' }}>Pool play setup</p>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'end', marginBottom: '12px', flexWrap: 'wrap' }}>
        <div>
          <label>Number of pools</label>
          <input
            type="number"
            min={1}
            max={Math.max(1, teamCount)}
            value={cfg.poolCount}
            onChange={e => onChange({ ...cfg, poolCount: Math.max(1, Number(e.target.value) || 1) })}
            style={{ width: '110px' }}
          />
        </div>
        <div>
          <label>Advancing per pool</label>
          <select
            value={cfg.advancingPerPool}
            onChange={e => onChange({ ...cfg, advancingPerPool: Number(e.target.value) })}
            style={{ width: '200px' }}
          >
            <option value={1}>Top 1 (pool winner only)</option>
            <option value={2}>Top 2</option>
            <option value={3}>Top 3</option>
            <option value={4}>Top 4</option>
          </select>
        </div>
      </div>

      {pools.length > 0 && (
        <>
          {/* auto-fit rather than a fixed pool-count column template, so the
              preview reflows to 1–2 columns on a phone instead of squeezing
              four pools into 80px each */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            {pools.map(pool => (
              <div key={pool.poolName} style={{ border: '1px solid var(--line)', borderRadius: '8px', padding: '10px' }}>
                <p style={{ fontWeight: 700, fontSize: '12px', marginBottom: '6px' }}>{pool.poolName}</p>
                {pool.teamNames.map((name, i) => (
                  <p key={i} className="helper-text" style={{ fontSize: '12px' }}>{name}</p>
                ))}
              </div>
            ))}
          </div>
          {bracketSize >= 2 && (
            <p className="helper-text" style={{ fontSize: '12px' }}>
              Round-robin within each pool, then the top {cfg.advancingPerPool} advance to a <strong>{bracketSize}-team</strong> elimination bracket.
            </p>
          )}
        </>
      )}

      {warnings.map((w, i) => (
        <p key={i} className="helper-text" style={{ fontSize: '12px', color: 'var(--danger, #b91c1c)' }}>{w}</p>
      ))}
    </div>
  )
}
