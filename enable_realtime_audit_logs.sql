-- Run once in the Supabase SQL editor, same reason as
-- enable_realtime_matches.sql: without this, the overrides page's audit
-- trail subscription connects but never receives INSERT events.

alter publication supabase_realtime add table audit_logs;

select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
