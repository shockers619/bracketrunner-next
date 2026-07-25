'use client'

/** A run-the-event entry point (Scorekeeper, Overrides). These pages already
 *  existed but were reachable only by typing their URLs by hand. */
export default function ActionTile({ href, title, body }: { href: string; title: string; body: string }) {
  return (
    <a
      href={href}
      className="card"
      style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '18px' }}
    >
      <p style={{ fontWeight: 700, fontSize: '15px', marginBottom: '4px' }}>
        {title} <span style={{ color: 'var(--accent)' }}>→</span>
      </p>
      <p className="helper-text" style={{ marginTop: 0 }}>{body}</p>
    </a>
  )
}
