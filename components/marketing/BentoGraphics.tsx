// Small UI visuals for the bento tiles. Each one shows the actual mechanism
// rather than a generic icon — the offline badge really does read
// "Offline · 1 queued", and the bye bracket really is how a 5-team draw resolves.

/** The connection badge moving through its three real states. */
export function OfflineGraphic() {
  const chip = (label: string, tone: 'live' | 'warn', dim?: boolean) => (
    <span
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] ${
        tone === 'live'
          ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
          : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
      } ${dim ? 'opacity-45' : ''}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${tone === 'live' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
      {label}
    </span>
  )
  const arrow = (
    <svg width="16" height="8" viewBox="0 0 16 8" fill="none" className="shrink-0 text-white/25" aria-hidden="true">
      <path d="M0 4h13m0 0-3.5-3.5M13 4l-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-white/[0.08] bg-obsidian-950/60 px-4 py-4">
      {chip('Live', 'live', true)}
      {arrow}
      {chip('Offline · 1 queued', 'warn')}
      {arrow}
      {chip('Live', 'live')}
    </div>
  )
}

/** Ad slots, struck through. States the promise visually without a stock icon. */
export function NoAdsGraphic() {
  return (
    <div className="w-full rounded-xl border border-white/[0.08] bg-obsidian-950/60 p-3">
      <div className="flex flex-col gap-2">
        {['Banner ad', 'Sponsored'].map(label => (
          <div
            key={label}
            className="relative flex h-8 items-center justify-center rounded-md border border-dashed border-white/12 text-[10px] font-medium uppercase tracking-[0.1em] text-white/20"
          >
            {label}
            <span className="absolute left-2 right-2 h-px bg-ember-500/60" />
          </div>
        ))}
      </div>
      <p className="mt-2.5 text-center font-mono text-[10px] uppercase tracking-[0.14em] text-ember-500">Never shipped</p>
    </div>
  )
}

/** A five-team bracket: the top seed draws a bye, which is exactly the case
 *  that trips up other tools. */
export function ByeBracketGraphic() {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-white/[0.08] bg-obsidian-950/60 px-4 py-4">
      <svg width="300" height="112" viewBox="0 0 300 112" fill="none" className="min-w-[300px]" role="img" aria-label="A five-team bracket in which the top seed receives a first-round bye.">
        {[
          { y: 14, label: '#1 Seed', bye: true },
          { y: 44, label: '#4 / #5' },
          { y: 74, label: '#2 / #3' },
        ].map(r => (
          <g key={r.y}>
            <rect x="0" y={r.y} width="96" height="20" rx="4" fill="rgba(255,255,255,0.04)" stroke="rgba(255,255,255,0.1)" />
            <text x="8" y={r.y + 14} fill="rgba(255,255,255,0.65)" fontSize="10" fontFamily="ui-monospace, monospace">{r.label}</text>
            {r.bye && (
              <text x="103" y={r.y + 14} fill="#FF5500" fontSize="9" fontFamily="ui-monospace, monospace">BYE →</text>
            )}
          </g>
        ))}
        {/* round-1 pair joins, then both feed the final */}
        <path d="M96 54 h18 v30 h-18" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none" />
        <path d="M114 69 h20" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none" />
        <path d="M96 24 C 130 24, 130 46, 152 46" stroke="rgba(255,85,0,0.55)" strokeWidth="1.5" fill="none" />
        <path d="M134 69 C 145 69, 145 46, 152 46" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" fill="none" />
        <rect x="152" y="36" width="96" height="20" rx="4" fill="rgba(255,85,0,0.08)" stroke="rgba(255,85,0,0.3)" />
        <text x="160" y="50" fill="rgba(255,255,255,0.8)" fontSize="10" fontFamily="ui-monospace, monospace">Final</text>
        <text x="256" y="50" fill="rgba(255,255,255,0.35)" fontSize="9" fontFamily="ui-monospace, monospace">5 teams</text>
      </svg>
    </div>
  )
}
