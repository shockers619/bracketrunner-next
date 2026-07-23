'use client'

// Offline-first local queue for score-entry actions taken on the mobile
// scorekeeper view. Every write is appended here FIRST (optimistic UI reads
// its own state, not this queue), then this module tries to flush it to the
// network immediately. If that fails — offline, flaky gym wifi, whatever —
// the entry stays queued and gets replayed in original order (FIFO) the
// moment the browser fires a genuine `online` event or a manual retry runs.
//
// Deliberately NOT using a service worker / Background Sync API here: this
// is a same-tab, app-open scorekeeping session, not a "close the tab and
// it syncs later" use case. Plain IndexedDB + window online/offline is the
// right amount of complexity for that.

const DB_NAME = 'bracketrunner-offline-queue'
const DB_VERSION = 1
const STORE_NAME = 'pending-actions'

export type QueuedAction =
  | {
      id: string
      type: 'update_score'
      createdAt: string // high-res ISO timestamp, set at the moment of the tap
      payload: { matchId: string; homeScore: number; awayScore: number; status: 'scheduled' | 'in_progress' }
    }
  | {
      id: string
      type: 'record_result'
      createdAt: string
      payload: { matchId: string; homeScore: number; awayScore: number; confirmed?: boolean }
    }

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export async function enqueue(action: Omit<QueuedAction, 'id' | 'createdAt'>): Promise<QueuedAction> {
  const db = await openDb()
  const full = { ...action, id: makeId(), createdAt: new Date().toISOString() } as QueuedAction
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(full)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
  return full
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDb()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

export async function listQueued(): Promise<QueuedAction[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => {
      // FIFO by createdAt, not insertion order into the object store (which
      // IndexedDB doesn't guarantee for getAll()).
      const rows = (req.result as QueuedAction[]).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
      resolve(rows)
    }
    req.onerror = () => reject(req.error)
  })
}

type Sender = (action: QueuedAction) => Promise<void> // should throw on failure

/**
 * Replays every queued action sequentially (FIFO), stopping at the first
 * failure so we never send action #3 before #2 has actually landed — score
 * updates for the same match are order-dependent.
 */
export async function flushQueue(send: Sender): Promise<{ sent: number; remaining: number }> {
  const queued = await listQueued()
  let sent = 0
  for (const action of queued) {
    try {
      await send(action)
      await dequeue(action.id)
      sent++
    } catch {
      // Stop here — leave this action and everything after it queued, and
      // try again on the next flush trigger (reconnect or manual retry).
      break
    }
  }
  const remaining = (await listQueued()).length
  return { sent, remaining }
}
