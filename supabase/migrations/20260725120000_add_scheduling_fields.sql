-- Inputs the scheduler needs but the intake never collected. Without these the
-- scheduler has no operating window to place matches into and no idea how long
-- a game in a given division actually takes.
--
-- Defaults are chosen so every EXISTING event stays valid and schedulable
-- (8am–8pm, hour-long games) rather than requiring a backfill.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS daily_start_time TIME NOT NULL DEFAULT '08:00',
  ADD COLUMN IF NOT EXISTS daily_end_time   TIME NOT NULL DEFAULT '20:00';

-- Wall-clock minutes the surface is occupied, and the turnaround after it.
-- Per DIVISION rather than per event, because one event can run 15-minute
-- wrestling bouts and 90-minute soccer matches side by side.
ALTER TABLE divisions
  ADD COLUMN IF NOT EXISTS game_duration_minutes INTEGER NOT NULL DEFAULT 60,
  ADD COLUMN IF NOT EXISTS buffer_minutes        INTEGER NOT NULL DEFAULT 10;
