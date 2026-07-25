-- Enable Realtime replication on `matches` so the public /[slug] page's
-- subscription receives postgres_changes events. Without it, the subscription
-- connects successfully but never fires — scores only appear on a manual
-- refresh, which looks like the feature silently failing rather than erroring.
--
-- Idempotent: only adds the table to the publication if it isn't already there
-- (a bare `ALTER PUBLICATION ... ADD TABLE` errors on re-run).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'matches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE matches;
  END IF;
END $$;
