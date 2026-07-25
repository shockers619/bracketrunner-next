'use client'
import { useState, useEffect } from 'react'

/** The shareable public link — the actual product deliverable, so it gets its
 *  own card with one-tap copy rather than being buried or (as it was before)
 *  absent from the event page entirely. */
export default function ShareCard({ slug }: { slug: string }) {
  const [copied, setCopied] = useState(false)
  // Built from the current origin so the copied link always works from wherever
  // the director is (localhost in dev, bracketrunner.com in production).
  const [url, setUrl] = useState('')
  useEffect(() => { setUrl(`${window.location.origin}/${slug}`) }, [slug])

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard can be blocked (insecure origin, denied permission) — the
      // link stays visible and selectable on screen, so this is a non-event.
    }
  }

  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase', color: 'var(--ink-muted)', marginBottom: '10px' }}>
        Public page
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
        <span
          className="mono"
          style={{
            flex: '1 1 240px', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            fontSize: '14px', color: 'var(--ink)',
            background: 'rgba(255,255,255,0.03)', border: '1px solid var(--line)',
            borderRadius: '8px', padding: '10px 12px',
          }}
        >
          {url.replace(/^https?:\/\//, '') || `…/${slug}`}
        </span>
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button className="btn-secondary" type="button" onClick={copy} style={{ padding: '10px 16px' }}>
            {copied ? '✓ Copied' : 'Copy link'}
          </button>
          <a
            className="btn-primary"
            href={`/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ textDecoration: 'none', padding: '10px 16px', display: 'inline-block' }}
          >
            Open ↗
          </a>
        </div>
      </div>
      <p className="helper-text" style={{ marginTop: '10px' }}>
        Share this with coaches and families — schedules, brackets, and scores update live.
      </p>
    </div>
  )
}
