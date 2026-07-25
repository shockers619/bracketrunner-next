-- Immutable audit log for Director "God-Mode" overrides.
--
-- Depends on the baseline schema (events, matches, tenant_members) — see
-- supabase/README.md. Uses gen_random_uuid() (core Postgres 13+, no extension)
-- and queries tenant_members directly for RLS, the same way every other
-- tenant-scoped table in this app does.

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
DROP POLICY IF EXISTS "Tenant members can read audit logs" ON audit_logs;
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
DROP POLICY IF EXISTS "Tenant members can insert audit logs" ON audit_logs;
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
-- permissive policy for those commands, no one — including tenant members who
-- can read/insert — can modify or remove a row through the client. That's what
-- actually makes this table immutable. (The service role bypasses RLS, as
-- always; immutability means "no director or scorekeeper can rewrite history
-- through the app.")
