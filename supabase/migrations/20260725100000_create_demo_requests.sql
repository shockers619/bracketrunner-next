-- Inbound demo / concierge inquiries submitted from the public marketing page.
CREATE TABLE IF NOT EXISTS demo_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT,
  sport TEXT,
  event_size TEXT,
  message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS demo_requests_created_at_idx ON demo_requests (created_at DESC);

ALTER TABLE demo_requests ENABLE ROW LEVEL SECURITY;

-- Anyone may SUBMIT an inquiry — this form is public by definition.
DROP POLICY IF EXISTS "Anyone can submit a demo request" ON demo_requests;
CREATE POLICY "Anyone can submit a demo request" ON demo_requests
FOR INSERT TO anon, authenticated WITH CHECK (true);

-- ...but there is deliberately NO SELECT/UPDATE/DELETE policy. RLS is
-- default-deny, so submissions are write-only from any client: one prospect
-- can't harvest every other prospect's name and email by querying the table
-- with the public anon key. Read them in the Supabase dashboard (service role
-- bypasses RLS), or add an authenticated staff-only SELECT policy later.
