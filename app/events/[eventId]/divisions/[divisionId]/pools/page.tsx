'use client'
import { useState, useEffect } from 'react'
import { useAuthTenant } from '@/lib/useAuthTenant'
import { supabase } from '@/lib/supabase'
import { snakeSeedPools } from '@/lib/engine/poolAssignment'
import type { Team } from '@/lib/engine/types'

interface TeamRow {
  id: string
  name: string
  seed: number | null
}
interface PoolDraft {
  name: string
  teams: TeamRow[]
}

export default function PoolsPage({ params }: { params: { eventId: string; divisionId: string } }) {
  const { ready } = useAuthTenant()
  const [divisionName, setDivisionName] = useState('')
  const [divisionFormat, setDivisionFormat] = useState<'single_elimination' | 'double_elimination'>('single_elimination')
  const [teams, setTeams] = useState<TeamRow[]>([])
  const [poolCount, setPoolCount] = useState(2)
  const [pools, setPools] = useState<PoolDraft[]>([])
  const [advancingPerPool, setAdvancingPerPool] = useState(2)
  const [pointDiffCap, setPointDiffCap] = useState<number | ''>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resolving, setResolving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [poolsSaved, setPoolsSaved] = useState(false)
  const [resolveResult, setResolveResult] = useState<{ bracketMatchCount: number } | null>(null)

  useEffect(() => {
    if (!ready) return
    async function load() {
      const { data: division } = await supabase
        .from('divisions')
        .select('name, format')
        .eq('id', params.divisionId)
        .single()
      setDivisionName(division?.name || '')
      // pool_to_bracket division still needs an eventual elimination format
      // for the generated bracket — default to single elim, director can
      // reconfigure the underlying division format for double elim later.
      setDivisionFormat('single_elimination')

      const { data: teamRows } = await supabase
        .from('teams')
        .select('id, name, seed')
        .eq('division_id', params.divisionId)
      setTeams(teamRows || [])

      const { data: existingPools } = await supabase
        .from('pools')
        .select('id')
        .eq('division_id', params.divisionId)
      setPoolsSaved((existingPools?.length || 0) > 0)

      setLoading(false)
    }
    load()
  }, [ready, params.divisionId])

  function generateAssignment() {
    setError(null)
    try {
      const asTeams: Team[] = teams.map(t => ({ id: t.id, name: t.name, seed: t.seed ?? 1 }))
      const assignment = snakeSeedPools(asTeams, poolCount)
      setPools(assignment.map(a => ({ name: a.poolName, teams: a.teams as TeamRow[] })))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  function movTeam(teamId: string, fromPoolIdx: number, toPoolIdx: number) {
    setPools(prev => {
      const next = prev.map(p => ({ ...p, teams: [...p.teams] }))
      const team = next[fromPoolIdx].teams.find(t => t.id === teamId)
      if (!team) return prev
      next[fromPoolIdx].teams = next[fromPoolIdx].teams.filter(t => t.id !== teamId)
      next[toPoolIdx].teams.push(team)
      return next
    })
  }

  async function handleSavePools() {
    setSaving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired — sign in again.')

      const teamNamesById = Object.fromEntries(teams.map(t => [t.id, t.name]))

      // "Top N from each pool" standard preset — each rank across all pools
      // gets consecutive seeds, so rank-1 finishers don't all cluster at
      // the top of the seed list (matches how snake seeding balances pools).
      const advancementRules: { poolIndex: number; sourcePosition: number; targetSeed: number }[] = []
      let seed = 1
      for (let rank = 1; rank <= advancingPerPool; rank++) {
        for (let poolIndex = 0; poolIndex < pools.length; poolIndex++) {
          if (pools[poolIndex].teams.length >= rank) {
            advancementRules.push({ poolIndex, sourcePosition: rank, targetSeed: seed })
            seed++
          }
        }
      }

      const res = await fetch('/api/pools/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          eventId: params.eventId,
          divisionId: params.divisionId,
          pools: pools.map(p => ({ name: p.name, teamIds: p.teams.map(t => t.id) })),
          advancementRules,
          teamNamesById,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to save pools')
      setPoolsSaved(true)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function handleResolve() {
    setResolving(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired — sign in again.')

      const res = await fetch('/api/pools/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({
          eventId: params.eventId,
          divisionId: params.divisionId,
          format: divisionFormat,
          pointDifferentialCap: pointDiffCap === '' ? undefined : pointDiffCap,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to resolve bracket')
      setResolveResult(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setResolving(false)
    }
  }

  if (!ready || loading) {
    return (
      <div style={{ maxWidth: '440px', margin: '120px auto', padding: '0 24px', textAlign: 'center' }}>
        <p className="helper-text">Loading…</p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '860px', margin: '0 auto', padding: '48px 24px' }}>
      <a href={`/events/${params.eventId}`} style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>
        ← Back to event
      </a>
      <h1 style={{ fontSize: '24px', marginTop: '12px', marginBottom: '4px' }}>{divisionName} — Pool Setup</h1>
      <p className="helper-text" style={{ marginBottom: '28px' }}>{teams.length} teams entered for this division.</p>

      {error && <div className="error-banner">{error}</div>}

      {resolveResult && (
        <div className="card" style={{ marginBottom: '20px', borderColor: 'var(--accent)' }}>
          <p style={{ fontWeight: 700 }}>Bracket generated — {resolveResult.bracketMatchCount} matches created.</p>
          <p className="helper-text">Head to the event's public page to see it live.</p>
        </div>
      )}

      {!poolsSaved && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <h2 style={{ fontSize: '18px', marginBottom: '16px' }}>1. Batch snake-seed assignment</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'end', marginBottom: '16px' }}>
            <div>
              <label>Number of pools</label>
              <input
                type="number"
                min={1}
                max={teams.length}
                value={poolCount}
                onChange={e => setPoolCount(Number(e.target.value))}
                style={{ width: '100px' }}
              />
            </div>
            <button className="btn-secondary" type="button" onClick={generateAssignment}>
              Generate assignment
            </button>
          </div>

          {pools.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(pools.length, 4)}, 1fr)`, gap: '12px', marginBottom: '20px' }}>
              {pools.map((pool, poolIdx) => (
                <div key={pool.name} style={{ border: '1px solid var(--line)', borderRadius: '10px', padding: '12px' }}>
                  <p style={{ fontWeight: 700, marginBottom: '8px' }}>{pool.name}</p>
                  {pool.teams.map(t => (
                    <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0' }}>
                      <span>{t.name} <span className="mono" style={{ color: 'var(--ink-muted)' }}>#{t.seed}</span></span>
                      <select
                        value={poolIdx}
                        onChange={e => movTeam(t.id, poolIdx, Number(e.target.value))}
                        style={{ width: 'auto', padding: '2px 4px', fontSize: '11px' }}
                      >
                        {pools.map((p2, i) => <option key={i} value={i}>{p2.name}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {pools.length > 0 && (
            <>
              <h2 style={{ fontSize: '18px', marginBottom: '12px' }}>2. Advancement preset</h2>
              <div style={{ marginBottom: '16px' }}>
                <label>Teams advancing per pool</label>
                <select value={advancingPerPool} onChange={e => setAdvancingPerPool(Number(e.target.value))} style={{ maxWidth: '220px' }}>
                  <option value={1}>Top 1 (pool winner only)</option>
                  <option value={2}>Top 2</option>
                  <option value={3}>Top 3</option>
                </select>
                <p className="helper-text">
                  Top {advancingPerPool} from each of {pools.length} pools advance to a {pools.length * advancingPerPool}-team bracket.
                </p>
              </div>
              <button className="btn-primary" type="button" onClick={handleSavePools} disabled={saving}>
                {saving ? 'Saving…' : 'Save pools & generate schedule'}
              </button>
            </>
          )}
        </div>
      )}

      {poolsSaved && !resolveResult && (
        <div className="card">
          <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>Pools saved — schedule generated</h2>
          <p className="helper-text" style={{ marginBottom: '16px' }}>
            Once every pool match is marked completed, resolve pool play into the elimination bracket.
          </p>
          <div style={{ marginBottom: '16px' }}>
            <label>Point differential cap (optional)</label>
            <input
              type="number"
              placeholder="e.g. 15 — leave blank for uncapped"
              value={pointDiffCap}
              onChange={e => setPointDiffCap(e.target.value === '' ? '' : Number(e.target.value))}
              style={{ maxWidth: '260px' }}
            />
          </div>
          <button className="btn-primary" type="button" onClick={handleResolve} disabled={resolving}>
            {resolving ? 'Resolving…' : 'Resolve pools to bracket'}
          </button>
        </div>
      )}
    </div>
  )
}
