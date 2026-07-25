# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev         # local dev server (Next.js) at http://localhost:3000
npm run build       # production build — the fastest full typecheck of the whole tree (tsc noEmit + Next build)
npm start           # serve the production build
npm test            # run the vitest engine test suite once
npm run test:watch  # vitest in watch mode
npx vitest run lib/engine/bracket.test.ts   # run a single test file
npm run db:new -- <name>   # scaffold a new supabase migration (CLI required)
npm run db:diff / db:push / db:pull         # supabase schema diff / apply / snapshot
```

Tests use **vitest + fast-check** (property-based) and live co-located with the source as `lib/**/*.test.ts`. The suite **covers every `lib/engine/` module** (bracket, doubleElimination, roundRobin, standings, advancement, poolAssignment, poolToBracketAdvancement, anomalyDefaults) — structural invariants for the generators plus behavioral tests for advancement/overrides and the tiebreak chain. It does **not** cover the DB/route/UI layers (those need a real Supabase instance). There is still **no linter or CI**; `npm run build` remains the typecheck gate. These suites were written *fresh* against this copy of the engine, not ported from the upstream repo the old `lib/engine/*` comments mention — trust the local tests for this codebase.

## Environment / configuration

Two env vars gate essentially everything (`.env.local`, or Vercel env):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

When unset, `lib/supabase.ts` falls back to a placeholder client and `isSupabaseConfigured` is `false`; API routes return `503`. The app still renders, but any data operation fails. Never commit `.env.local`.

There is **no service-role key anywhere by design** (see "Security model" below).

Schema changes are **version-controlled migrations** in `supabase/migrations/` (Supabase CLI), applied in timestamp order — see `supabase/README.md`. **Important:** the core tables (`tenants`, `events`, `matches`, `pools`, …) and their **RLS policies** predate this setup and are **not** in the repo; they must be captured with `supabase db pull` on first connect (do not hand-reconstruct RLS — it's the security boundary). The migrations present cover only the tenant RPC, audit-log table, and Realtime enables, and are written idempotently. Realtime must be enabled on `matches`/`audit_logs` or subscriptions connect silently but receive no events. (The original loose root `*.sql` scripts are superseded by these migrations.)

Transactional email lives in `lib/email/` — provider-agnostic `sendEmail()` + pure templates, with a Resend adapter. It **degrades gracefully** (warns, returns `{ skipped: true }`) when `RESEND_API_KEY` is unset, mirroring `lib/supabase.ts`, and is **not wired into any flow yet**. See `docs/DOMAIN_AND_EMAIL_SETUP.md` for the cutover runbook.

## Architecture

BracketRunner is a **multi-tenant tournament management app**: a director signs up (creating a tenant/org), runs an intake wizard to create an event, then scorekeepers enter live scores and the public sees a live-updating bracket. Next.js 14 App Router + React 18 + Tailwind, backed entirely by Supabase (Postgres + Auth + Realtime). No separate backend.

### The three layers, and the boundary that matters most

1. **`lib/engine/*` — pure, framework-free tournament logic.** No Supabase, no React, no I/O. Every function takes plain `Team[]`/`Match[]` and returns new arrays (**never mutates input**). This is where all bracket/standings correctness lives. Uses the engine's own **camelCase** `Match` shape (`lib/engine/types.ts`).
2. **`lib/*.ts` (non-engine) — the DB adapter layer.** Translates between the engine's camelCase `Match` and Postgres's **snake_case** rows (`matchDb.ts`, `eventData.ts`, `auditLog.ts`), plus client-side concerns (`tenant.ts`, `useAuthTenant.ts`, `useLiveMatches.ts`, `offlineQueue.ts`).
3. **`app/api/*` route handlers — orchestration.** Load the full match set → call an engine function → write back only changed rows. Routes contain *no* bracket math; they delegate to the engine.

**Do not put bracket logic in routes or components, and do not let Supabase types leak into the engine.** The camelCase↔snake_case conversion happens only at the adapter boundary. When you touch a `bracket_meta` field, remember it is stored as JSONB and mirrored in two type definitions (`lib/engine/types.ts` `BracketMeta` and `lib/eventData.ts` `BracketMeta`).

### The engine (`lib/engine/`)

- `bracket.ts` — single elimination. Handles non-power-of-2 counts via **byes to top seeds**; byes auto-complete and immediately advance the present team. Standard seed-order pairing keeps top seeds apart.
- `doubleElimination.ts` — winners + losers bracket with a grand final and a conditional **"bracket reset"** game 2 (starts `cancelled`, activated only if the losers-bracket team wins game 1). Handles **non-power-of-2 counts via round-1 byes**: builds the full power-of-2 skeleton, then *contracts* the losers-bracket matches the byes leave empty (a WB round-1 bye produces no loser to drop in). Contraction is proven correct by an exhaustive playthrough test (every n = 2..40 resolves with each non-champion eliminated at exactly two losses).
- `roundRobin.ts` — circle-method schedule; odd counts get a rotating bye. Matches carry `bracketMeta.poolId`.
- `standings.ts` — win/loss + a **recursive tiebreak chain**: head-to-head → point differential → points allowed → points scored → director manual override → deterministic id sort. Correctly leaves 3-way cycles unresolved at the head-to-head step. Emits a `tiebreakLog` explaining each break. Optional per-game `pointDifferentialCap`.
- `poolAssignment.ts` — `snakeSeedPools` snake-seeds teams into balanced pools; `buildAdvancementRules` builds the "top N per pool advance" seeding plan (ranks interleaved across pools, seeds stay contiguous).
- `poolToBracketAdvancement.ts` — validates all pools complete, computes standings, applies advancement rules (`pool position → bracket seed`), then generates the bracket via the **same** single/double-elim generators. Throws `PoolsNotCompleteError` / `InvalidAdvancementRulesError`.
- `advancement.ts` — the mutation surface: `recordResult` (score entry + winner advancement + loser routing for double-elim + grand-final reset logic) and the three **"God-Mode" director overrides** (`correctScore`, `resetMatch`, `forceSlotOverride`), each of which returns audit-log entries and has guards preventing corruption of already-played downstream matches.
- `anomalyDefaults.ts` — sport-specific score sanity bounds (e.g. basketball 120/60). Sports without an entry return `undefined`, which **disables** anomaly checking rather than guessing.

Engine `genId()` helpers produce local ids for wiring `nextMatchId`/`loserNextMatchId` links. **Routes remap these to `randomUUID()` before insert** (`remapMatchIds` appears in `intake`, `pools/resolve`, and `lib/poolSetup.ts`) — the remap must rewrite every cross-reference (`nextMatchId`, `loserNextMatchId`) or bracket links break.

**Pool play setup** is shared: `lib/poolSetup.ts#createPoolsForDivision` (server-only) inserts pools + `pool_teams` + round-robin matches + `advancement_rules`, and is called by both the intake route (pools generated from the wizard's per-division `PoolConfigDraft`) and `pools/generate`. The intake wizard collects pool config in the Teams step (`components/PoolConfig.tsx`) with a live snake-seed preview; `orderedForSeeding` (in `intakeTypes`) keeps that preview identical to the seeds the server assigns. Resolving pools → elimination bracket still happens after pool games are played, from the event page → `pools/[divisionId]` (single or double elim, chosen there).

### Score-entry flow (important distinction)

Two separate endpoints, deliberately **not** merged:

- `POST /api/matches/update-score` — every `+1`/`-1` tap and the `scheduled→in_progress` toggle. Plain score write, no engine call, **ties allowed**, can **never** set `completed`.
- `POST /api/matches/record-result` — fired **once** on FINAL. The only place `recordResult()` (and therefore advancement) runs. **Rejects ties.** Implements the **anomaly flow**: an out-of-bounds score returns `requiresConfirmation: true` and sets `pending_confirmation` without advancing; the client re-submits with `confirmed: true` after showing the flagged numbers.

`lib/offlineQueue.ts` backs the mobile scorekeeper: writes are appended to IndexedDB first (optimistic UI), flushed FIFO, and replayed on reconnect — stopping at the first failure so same-match score updates never apply out of order.

> **⚠️ Untested in production.** This offline sync flow (IndexedDB queue → FIFO replay on reconnect) has **never been verified end-to-end against a real Supabase instance**. Do not assume it works. Treat any bug report or code change here as landing in unproven territory, and verify the full offline→reconnect→replay path against production before calling related work done.

### Overrides & audit trail

`POST /api/admin/overrides` handles the three God-Mode actions. It is **director-role gated** and, in every branch, **writes the audit log BEFORE the match update** — this repo uses no cross-table Postgres transactions, so that ordering is the deliberate stand-in for atomicity (a failed audit write aborts the change). `audit_logs` is **immutable via RLS** (no UPDATE/DELETE policy). Override reads come back live via Realtime on `audit_logs`.

### Public page & Realtime

`app/[slug]/page.tsx` is `force-dynamic`, server-fetches via `getEventPageData`, then `useLiveMatches` subscribes to `postgres_changes` on `matches` filtered by `event_id`, so brackets/scoreboards update the instant a match goes FINAL. Requires Realtime replication enabled on the table (the SQL scripts above).

### Auth & multi-tenancy

- `lib/tenant.ts` / `useAuthTenant.ts`: on first sign-in a tenant is created via the `create_tenant_with_membership` RPC (a `SECURITY DEFINER` function that checks `auth.uid()` itself). `useAuthTenant` redirects to `/signin` if signed out, `/onboarding` if the user has no tenant membership yet. A pending org name is stashed in `sessionStorage` across the OAuth/email-confirmation round trip.
- Membership lives in `tenant_members(tenant_id, user_id, role)`; every account today is created with role `'director'`.

### Security model (do not break this)

API routes create the Supabase client with the **anon key + the caller's own `Authorization: Bearer` token** — never a service-role key. Every insert/update therefore runs through **RLS as that specific user**. Routes also **re-derive `event_id`/`tenant_id` from the DB** (looking them up from the match) rather than trusting the request body. When adding a route, follow this pattern: pass through the bearer token, let RLS enforce tenancy, and never accept a tenant/event id from the client as authorization.

## Conventions specific to this repo

- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- Client components that hit Supabase directly use the shared singleton from `lib/supabase.ts`; **API routes construct a fresh per-request client** with the caller's token instead.
- DB writes go through `writeChangedMatches` (diff vs. a `before` snapshot, write only changed rows) — mirror this rather than blind-updating whole match sets.
- Deferred cases still surface as explicit **warnings or thrown errors**, never silent mis-handling — preserve that when extending. (Double-elim byes and pool-play in the intake wizard are both now fully supported — see above.)
