import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  // Deliberately loud rather than silently falling back to a broken client —
  // this project has no real Supabase instance wired up yet. Once the
  // project is provisioned, set these two in .env.local / Vercel env vars.
  console.warn(
    '[bracketrunner] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY are not set. ' +
    'The intake form will render but submission will fail until these are configured.'
  )
}

export const supabase = createClient(url || 'https://placeholder.supabase.co', anonKey || 'placeholder-key')

export const isSupabaseConfigured = Boolean(url && anonKey)
