-- Pass 2.3: immutable audit log for Director "God-Mode" overrides.
--
-- Two corrections from the original brief, both of which would have failed
-- outright if run as-written:
--   1. gen_random_field() doesn't exist — Postgres/Supabase's UUID default
--      generator is gen_random_uuid() (built into core Postgres 13+, no
--      extension needed).
--   2. is_tenant_member(uuid) doesn't exist anywhere in this schema. The
--      real tenant model (see create_tenant_function.sql, lib/tenant.ts) is
--      a tenant_members(tenant_id, user_id, role) join table — there's no
--      such helper function. The RLS policy below queries tenant_members
--      directly, the same way every other RLS-protected table in this app
--      already does it (events, matches, etc. all key off tenant_id via
--      tenant_members, not a function that was never created).

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  actor_id UUID NOT NULL REFERENCES auth.users(id),
  target_match_id UUID REFERENCES matches(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'SCORE_OVERRIDE' | 'MATCH_RESET' | 'FORCE_ADVANCE' | 'ANOMALY_CONFIRMED'
  previous_state JSONB,
  new_state JSONB,
  reason_code TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS audit_logs_event_id_created_at_idx
  ON audit_logs (event_id, created_at DESC);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Readable by any member of the tenant that owns the event.
CREATE POLICY "Tenant members can read audit logs" ON audit_logs
FOR SELECT USING (
  event_id IN (
    SELECT e.id FROM events e
    JOIN tenant_members tm ON tm.tenant_id = e.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

-- Insertable by tenant members, and only as themselves — a director can't
-- write an audit entry attributing an action to a different user.
CREATE POLICY "Tenant members can insert audit logs" ON audit_logs
FOR INSERT WITH CHECK (
  actor_id = auth.uid()
  AND event_id IN (
    SELECT e.id FROM events e
    JOIN tenant_members tm ON tm.tenant_id = e.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

-- Deliberately NO UPDATE or DELETE policy. RLS is default-deny: with no
-- permissive policy for those commands, no one — including tenant members
-- who can read/insert — can modify or remove a row through the normal
-- client. That's what actually makes this table immutable, not just a
-- naming convention. (The service role bypasses RLS entirely, as always;
-- immutability here means "no director or scorekeeper can rewrite history
-- through the app," not "literally un-deletable by an Anthropic-level
-- database admin.")
