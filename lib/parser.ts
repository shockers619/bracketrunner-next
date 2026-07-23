export interface ParsedTeam {
  name: string
  clubName?: string
  seed?: number
}

export interface ParseResult {
  teams: ParsedTeam[]
  errors: string[]   // human-readable, includes row/line numbers
}

/** Parses a simple CSV with header row: name,club_name,seed (club_name and seed optional). */
export function parseTeamsFromCSV(csv: string): ParseResult {
  const lines = csv.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0)
  const errors: string[] = []
  if (lines.length === 0) return { teams: [], errors: ['CSV is empty'] }

  const header = lines[0].split(',').map(h => h.trim().toLowerCase())
  const nameIdx = header.indexOf('name')
  const clubIdx = header.indexOf('club_name')
  const seedIdx = header.indexOf('seed')

  if (nameIdx === -1) {
    return { teams: [], errors: ['CSV header must include a "name" column'] }
  }

  const teams: ParsedTeam[] = []
  const seenNames = new Set<string>()

  for (let i = 1; i < lines.length; i++) {
    const rowNum = i + 1
    const cols = lines[i].split(',').map(c => c.trim())
    const name = cols[nameIdx]

    if (!name) {
      errors.push(`Row ${rowNum}: missing team name`)
      continue
    }
    if (seenNames.has(name.toLowerCase())) {
      errors.push(`Row ${rowNum}: duplicate team name "${name}"`)
      continue
    }
    seenNames.add(name.toLowerCase())

    let seed: number | undefined
    if (seedIdx !== -1 && cols[seedIdx]) {
      const parsed = Number(cols[seedIdx])
      if (!Number.isInteger(parsed) || parsed < 1) {
        errors.push(`Row ${rowNum}: seed must be a positive integer, got "${cols[seedIdx]}"`)
      } else {
        seed = parsed
      }
    }

    teams.push({
      name,
      clubName: clubIdx !== -1 ? (cols[clubIdx] || undefined) : undefined,
      seed,
    })
  }

  // Seed collisions across the whole set (only meaningful if every team has one)
  const seeds = teams.map(t => t.seed).filter((s): s is number => s !== undefined)
  const seedCounts = new Map<number, number>()
  for (const s of seeds) seedCounts.set(s, (seedCounts.get(s) ?? 0) + 1)
  for (const [seed, count] of seedCounts) {
    if (count > 1) errors.push(`Seed ${seed} is assigned to ${count} teams — seeds must be unique`)
  }

  return { teams, errors }
}

export function parseTeamsFromJSON(json: string): ParseResult {
  const errors: string[] = []
  let raw: unknown
  try {
    raw = JSON.parse(json)
  } catch (e) {
    return { teams: [], errors: [`Invalid JSON: ${(e as Error).message}`] }
  }
  if (!Array.isArray(raw)) {
    return { teams: [], errors: ['JSON input must be an array of team objects'] }
  }

  const teams: ParsedTeam[] = []
  const seenNames = new Set<string>()

  raw.forEach((entry, i) => {
    const rowNum = i + 1
    if (typeof entry !== 'object' || entry === null) {
      errors.push(`Entry ${rowNum}: expected an object`)
      return
    }
    const e = entry as Record<string, unknown>
    const name = typeof e.name === 'string' ? e.name.trim() : ''
    if (!name) {
      errors.push(`Entry ${rowNum}: missing or invalid "name"`)
      return
    }
    if (seenNames.has(name.toLowerCase())) {
      errors.push(`Entry ${rowNum}: duplicate team name "${name}"`)
      return
    }
    seenNames.add(name.toLowerCase())

    let seed: number | undefined
    if (e.seed !== undefined) {
      if (typeof e.seed !== 'number' || !Number.isInteger(e.seed) || e.seed < 1) {
        errors.push(`Entry ${rowNum}: seed must be a positive integer, got ${JSON.stringify(e.seed)}`)
      } else {
        seed = e.seed
      }
    }

    teams.push({
      name,
      clubName: typeof e.club_name === 'string' ? e.club_name : undefined,
      seed,
    })
  })

  return { teams, errors }
}
