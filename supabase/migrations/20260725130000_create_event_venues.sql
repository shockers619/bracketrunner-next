-- Links an event to the venues it is played at.
--
-- Venues are deliberately shared network-wide (one facility hosts many events,
-- so it's entered once and reused), which means a venue can't carry an
-- event_id. Until now nothing recorded the association at all: intake created
-- venues and courts, then dropped the connection on the floor. The scheduler
-- needs it — without this it cannot know which courts/fields/mats an event may
-- actually use.

CREATE TABLE IF NOT EXISTS event_venues (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  venue_id UUID NOT NULL REFERENCES venues(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, venue_id)
);

CREATE INDEX IF NOT EXISTS event_venues_venue_id_idx ON event_venues (venue_id);

ALTER TABLE event_venues ENABLE ROW LEVEL SECURITY;

-- Readable by anyone who can see the event. The public event page needs court
-- names to display an assignment, and events are already publicly readable.
DROP POLICY IF EXISTS "Event venues are publicly readable" ON event_venues;
CREATE POLICY "Event venues are publicly readable" ON event_venues
FOR SELECT USING (true);

-- Only a member of the owning tenant may attach or detach a venue, matching how
-- every other event-scoped table in this schema gates writes.
DROP POLICY IF EXISTS "Tenant members can attach venues" ON event_venues;
CREATE POLICY "Tenant members can attach venues" ON event_venues
FOR INSERT WITH CHECK (
  event_id IN (
    SELECT e.id FROM events e
    JOIN tenant_members tm ON tm.tenant_id = e.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Tenant members can detach venues" ON event_venues;
CREATE POLICY "Tenant members can detach venues" ON event_venues
FOR DELETE USING (
  event_id IN (
    SELECT e.id FROM events e
    JOIN tenant_members tm ON tm.tenant_id = e.tenant_id
    WHERE tm.user_id = auth.uid()
  )
);
