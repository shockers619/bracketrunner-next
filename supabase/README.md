# Database migrations

Schema changes are version-controlled as timestamped SQL files in
`supabase/migrations/`, applied in lexicographic (chronological) order by the
[Supabase CLI](https://supabase.com/docs/guides/cli). No more ad-hoc SQL run by
hand in the dashboard — every change lands here first.

## One-time setup (when the live project is connected)

```bash
# Install the CLI (macOS)
brew install supabase/tap/supabase

# Link this repo to the BracketRunner Supabase project
supabase link --project-ref <your-project-ref>
```

## ⚠️ Baseline reconciliation — read before the first `db push`

The migrations currently in `supabase/migrations/` are **not the full schema.**
They cover only what previously existed as loose `.sql` scripts at the repo
root (the tenant function, the audit-log table, and the two Realtime enables).

The **core tables were created directly in the Supabase dashboard** and are not
represented as migrations anywhere — so a fresh database would be missing:

- `tenants`, `tenant_members`
- `events`, `divisions`, `teams`, `courts`, `venues`
- `matches`
- `pools`, `pool_teams`, `advancement_rules`

…plus their RLS policies (which are the app's real security boundary and are
**not** fully knowable from application code — do not reconstruct them by hand).

**On first connect, capture the true current schema as the baseline:**

```bash
supabase db pull    # writes supabase/migrations/<timestamp>_remote_schema.sql
```

Because the existing production database *already has* the four migrations here
applied (they were run manually), do **not** re-run them against it. Either:

- **Recommended:** after `db pull`, mark the four historical migrations as
  already-applied so `db push` skips them on the existing project:
  ```bash
  supabase migration repair --status applied 20260722181700 20260722212400 20260723082900 20260723083500
  ```
- Or treat the `db pull` snapshot as the single source of truth and archive the
  four files (their effects are already captured in the snapshot).

The migration files here are written to be **idempotent** (guarded policy
creation, `IF NOT EXISTS`, publication-membership checks), so they are safe to
apply to a *fresh* environment (e.g. a staging project) on top of the pulled
baseline.

## Day-to-day workflow

```bash
npm run db:new -- add_something   # scaffold a new timestamped migration
# ...edit the generated file...
npm run db:diff                   # preview local vs. remote schema drift
npm run db:push                   # apply pending migrations to the linked project
```

Never edit an already-applied migration — add a new one.

## Migration index

| Version | File | Purpose |
|---|---|---|
| _(pending)_ | `<timestamp>_remote_schema.sql` | **Baseline** — generate via `supabase db pull` |
| 20260722181700 | `create_tenant_with_membership` | `SECURITY DEFINER` atomic tenant+membership RPC |
| 20260722212400 | `enable_realtime_matches` | Realtime replication for `matches` |
| 20260723082900 | `create_audit_logs` | Immutable audit-log table + RLS |
| 20260723083500 | `enable_realtime_audit_logs` | Realtime replication for `audit_logs` |

> The four loose `*.sql` files still at the repo root are **superseded** by the
> migrations above and can be deleted once this structure is confirmed.
