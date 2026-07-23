'use client'
import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import type { MatchRecord } from '@/lib/eventData'

export type LiveConnectionStatus = 'connecting' | 'live' | 'disconnected'

/**
 * Keeps a server-rendered match list in sync via Supabase Realtime, so the
 * public bracket tree / scoreboard update the moment a director marks a
 * match FINAL on the scorekeeper view — no polling, no page refresh.
 *
 * Requires the `matches` table to have Realtime replication enabled on the
 * Supabase project (Database > Replication, or:
 *   ALTER PUBLICATION supabase_realtime ADD TABLE matches;
 * ). Without that, this subscribes successfully but silently never
 * receives events — worth checking first if updates aren't showing up.
 */
export function useLiveMatches(eventId: string, initialMatches: MatchRecord[]) {
  const [matches, setMatches] = useState<MatchRecord[]>(initialMatches)
  const [status, setStatus] = useState<LiveConnectionStatus>('connecting')
  const initialRef = useRef(initialMatches)

  // If the server-rendered data changes (e.g. navigating between events
  // without a full reload), reset the baseline.
  useEffect(() => {
    if (initialRef.current !== initialMatches) {
      initialRef.current = initialMatches
      setMatches(initialMatches)
    }
  }, [initialMatches])

  useEffect(() => {
    if (!eventId) return

    const channel = supabase
      .channel(`event-${eventId}-matches`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'matches', filter: `event_id=eq.${eventId}` },
        payload => {
          if (payload.eventType === 'DELETE') {
            const oldId = (payload.old as { id?: string })?.id
            if (oldId) setMatches(prev => prev.filter(m => m.id !== oldId))
            return
          }
          const row = payload.new as MatchRecord
          setMatches(prev => {
            const exists = prev.some(m => m.id === row.id)
            return exists ? prev.map(m => (m.id === row.id ? row : m)) : [...prev, row]
          })
        }
      )
      .subscribe(subStatus => {
        if (subStatus === 'SUBSCRIBED') setStatus('live')
        else if (subStatus === 'CHANNEL_ERROR' || subStatus === 'TIMED_OUT' || subStatus === 'CLOSED') setStatus('disconnected')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [eventId])

  return { matches, status }
}
