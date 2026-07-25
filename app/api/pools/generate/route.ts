import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createPoolsForDivision, type PoolInput, type AdvancementRuleInput } from '@/lib/poolSetup'

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anonKey) {
    return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 })
  }
  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const body = await req.json() as {
    eventId: string
    divisionId: string
    pools: PoolInput[]
    advancementRules: AdvancementRuleInput[]
    teamNamesById: Record<string, string>
  }

  if (!body.eventId || !body.divisionId || !body.pools?.length) {
    return NextResponse.json({ error: 'Missing eventId, divisionId, or pools' }, { status: 400 })
  }

  try {
    const { poolIds } = await createPoolsForDivision(supabase, {
      eventId: body.eventId,
      divisionId: body.divisionId,
      pools: body.pools,
      advancementRules: body.advancementRules || [],
      teamNamesById: body.teamNamesById,
    })
    return NextResponse.json({ poolIds })
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
