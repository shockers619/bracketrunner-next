import { defineConfig } from 'vitest/config'

// Engine tests are pure (no DOM, no Supabase, no React), so a plain node
// environment is all they need. Tests are co-located next to the source as
// lib/**/*.test.ts.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts'],
  },
})
