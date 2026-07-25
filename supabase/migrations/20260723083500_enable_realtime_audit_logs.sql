-- Enable Realtime replication on `audit_logs` so the overrides page's audit
-- trail subscription receives INSERT events. Same rationale and idempotent
-- guard as 20260722212400_enable_realtime_matches.sql. Ordered after the
-- audit_logs table exists.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'audit_logs'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE audit_logs;
  END IF;
END $$;
