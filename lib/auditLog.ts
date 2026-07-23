import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuditLogEntry } from './engine/types'

// The engine's own `action` values (score_edit, force_slot, etc.) are
// internal/technical. Map them to the brief's director-facing action_type
// vocabulary for the audit_logs table and UI.
const ACTION_TYPE_MAP: Record<AuditLogEntry['action'], string> = {
  score_edit: 'SCORE_OVERRIDE',
  force_slot: 'FORCE_ADVANCE',
  manual_override: 'STANDINGS_ADJUST',
  anomaly_confirmed: 'ANOMALY_CONFIRMED',
  match_reset: 'MATCH_RESET',
}

/**
 * Writes one or more engine AuditLogEntry objects to the immutable
 * audit_logs table. `reasonCode` is applied to any entry that didn't
 * already carry its own `reason` (recordResult's entries don't set one;
 * forceSlotOverride's do).
 *
 * Throws on failure — callers should treat a failed audit write as reason
 * to abort the whole override rather than silently apply a change with no
 * paper trail. See the ordering note in each route: the audit row is
 * written BEFORE the corresponding match update precisely so a failure
 * here stops the match state from changing at all.
 */
export async function writeAuditLogs(
  supabase: SupabaseClient,
  eventId: string,
  entries: AuditLogEntry[],
  reasonCode: string
): Promise<void> {
  if (entries.length === 0) return
  const rows = entries.map(e => ({
    event_id: eventId,
    actor_id: e.userId,
    target_match_id: e.matchId,
    action_type: ACTION_TYPE_MAP[e.action] || e.action.toUpperCase(),
    previous_state: e.previousState,
    new_state: e.newState,
    reason_code: e.reason || reasonCode,
  }))
  const { error } = await supabase.from('audit_logs').insert(rows)
  if (error) throw new Error(`Writing audit log: ${error.message}`)
}
