// Micro-snippets of the real UI for the bento tiles. Each shows the actual
// mechanism rather than a generic icon — the offline badge really does read
// "Offline · 1 queued", and the timeline really is how games land on courts.

import { InkTick } from './HandDrawn'

/** The connection badge moving through its three real states. */
export function OfflineGraphic() {
  const chip = (label: string, tone: 'live' | 'warn', dim?: boolean) => (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
        tone === 'live'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      } ${dim ? 'opacity-40' : ''}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {label}
    </span>
  )
  const arrow = (
    <svg width="14" height="8" viewBox="0 0 16 8" fill="none" className="shrink-0 text-white/25" aria-hidden="true">
      <path d="M0 4h13m0 0-3.5-3.5M13 4l-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <div className="flex w-full flex-wrap items-center gap-2.5 mk-well px-4 py-4">
      {chip('Live', 'live', true)}
      {arrow}
      {chip('Offline · 1 queued', 'warn')}
      {arrow}
      {chip('Live', 'live')}
    </div>
  )
}

/** Ad slots, struck through — states the promise without a stock icon. */
export function NoAdsGraphic() {
  return (
    <div className="w-full mk-well p-3">
      <div className="flex flex-col gap-2">
        {['Banner ad', 'Sponsored'].map(label => (
          <div
            key={label}
            className="relative flex h-8 items-center justify-center rounded-md border border-dashed border-white/12 text-[10px] font-medium uppercase tracking-[0.1em] text-white/20"
          >
            {label}
            <span className="absolute left-2 right-2 h-px bg-ember-500/70" />
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ember-500">Never shipped</p>
    </div>
  )
}

/** Games laid across courts and time — the scheduling half of the engine, which
 *  is the part a bracket-only tool can't do. */
export function CourtTimelineGraphic() {
  const rows = [
    { court: 'Court 1', blocks: [{ x: 0, w: 26, tone: 'pool' }, { x: 28, w: 22, tone: 'pool' }, { x: 54, w: 30, tone: 'bracket' }] },
    { court: 'Court 2', blocks: [{ x: 4, w: 22, tone: 'pool' }, { x: 30, w: 30, tone: 'pool' }, { x: 66, w: 24, tone: 'live' }] },
    { court: 'Mat 3', blocks: [{ x: 0, w: 18, tone: 'pool' }, { x: 22, w: 18, tone: 'pool' }, { x: 44, w: 18, tone: 'pool' }, { x: 66, w: 22, tone: 'bracket' }] },
  ]
  const tones: Record<string, string> = {
    pool: 'bg-white/[0.13]',
    bracket: 'bg-copper-400/50',
    live: 'bg-ember-500/80',
  }
  return (
    <div className="w-full mk-well p-4">
      <div className="mb-2.5 flex justify-between font-mono text-[9px] uppercase tracking-[0.12em] text-white/30">
        <span>8:00</span><span>12:00</span><span>4:00</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map(r => (
          <div key={r.court} className="flex items-center gap-3">
            <span className="w-14 shrink-0 font-mono text-[10px] text-white/45">{r.court}</span>
            <div className="relative h-4 flex-1 rounded bg-white/[0.04]">
              {r.blocks.map((b, i) => (
                <span
                  key={i}
                  className={`absolute top-0 h-4 rounded-[3px] ${tones[b.tone]}`}
                  style={{ left: `${b.x}%`, width: `${b.w}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[9px] uppercase tracking-[0.1em] text-white/35">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-white/[0.13]" />Pool play</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-copper-400/50" />Bracket</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-[2px] bg-ember-500/80" />Live now</span>
      </div>
    </div>
  )
}

/** The formats we actually run — the proof that this isn't a bracket calculator. */
export function FormatChipsGraphic() {
  const formats = [
    'Showcase', 'Round robin', 'Pool → bracket', 'Single elim',
    'Double elim', '3-game guarantee', 'Multi-venue', 'Odd team counts',
  ]
  // Uniform pills in a neat row read as filter chips — dashboard furniture.
  // Each one gets its own small rotation and corner radius so the row looks
  // like labels someone wrote out, not a control. The variation is derived from
  // the index rather than randomised: this renders on the server, and a random
  // value would produce a hydration mismatch.
  const tilts = [-1.1, 0.8, -0.5, 1.2, -0.9, 0.4, -1.3, 0.7]
  const radii = ['999px', '10px', '999px', '12px', '999px', '9px', '999px', '11px']

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-2.5">
      {formats.map((f, i) => (
        <span
          key={f}
          style={{ transform: `rotate(${tilts[i % tilts.length]}deg)`, borderRadius: radii[i % radii.length] }}
          className="border border-copper-400/25 bg-white/[0.05] px-3 py-1.5 text-[12px] font-medium text-white/70"
        >
          {f}
        </span>
      ))}
    </div>
  )
}

/** What we verify before an event goes live — the "done for you" checklist. */
export function HandBuiltGraphic() {
  const items = ['Divisions & seeding', 'Pools and brackets', 'Court assignments', 'Rest between games']
  // Was a bordered well containing circled tick glyphs and a border-t divider —
  // three separate pieces of form chrome inside a card that claims the work is
  // done by hand. The box and the divider are gone, the ticks are pen strokes,
  // and the closing line is handwriting rather than italics.
  const tilts = [-1.4, 0.9, -0.7, 1.1]
  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        {items.map((i, idx) => (
          <div key={i} className="flex items-center gap-3">
            <InkTick variant={idx} className="shrink-0 text-copper-300/85" />
            <span
              className="text-[13.5px] text-white/60"
              style={{ transform: `rotate(${tilts[idx % tilts.length] * 0.15}deg)` }}
            >
              {i}
            </span>
          </div>
        ))}
      </div>
      <p className="mk-hand mt-4 text-[16px] leading-tight text-copper-300/70" style={{ transform: 'rotate(-0.7deg)' }}>
        checked by us, by hand, before anyone sees it
      </p>
    </div>
  )
}
