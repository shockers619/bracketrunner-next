-- Run this once in the Supabase SQL editor for the BracketRunner project.
-- Without it, the /[slug] public page's realtime subscription connects
-- successfully but never receives any postgres_changes events — score
-- updates will only show up on a manual refresh, which looks like the
-- feature silently isn't working rather than erroring loudly.

alter publication supabase_realtime add table matches;

-- Sanity check — should list "matches" (and anything else you've enabled).
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime';
