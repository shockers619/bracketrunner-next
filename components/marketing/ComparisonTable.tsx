// Us vs. them. Built as a responsive grid rather than a <table> so it can
// restack into per-feature cards on a phone — a three-column table at 375px is
// unreadable, and this section is too important to let it degrade.

const ROWS = [
  {
    feature: 'Setup & configuration',
    legacy: 'Hours spent fighting clunky software settings and venue rules.',
    ours: '100% done-for-you. Send us your raw team list; we build the entire event by hand.',
  },
  {
    feature: 'Dead gym Wi-Fi',
    legacy: 'Scores freeze, bracket updates stall out, directors panic.',
    ours: 'Built-in offline sync. Scorekeepers keep entering scores; the system auto-syncs on reconnect.',
  },
  {
    feature: 'Parent mobile view',
    legacy: 'Crammed with pop-up ads, banners, and subscription paywalls.',
    ours: 'Pure courtside broadcast. Ad-free live scores on any phone — no account required.',
  },
  {
    feature: 'Event flexibility',
    legacy: 'Rigid bracket templates that struggle with odd team counts.',
    ours: 'Any event engine: showcases, round robins, pool-to-bracket, and custom game guarantees.',
  },
]

function Cross() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-white/25" aria-hidden="true">
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1" />
      <path d="M5.5 5.5 10.5 10.5M10.5 5.5 5.5 10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0 text-ember-500" aria-hidden="true">
      <circle cx="8" cy="8" r="7.25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M4.6 8.3 6.9 10.6 11.4 5.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export default function ComparisonTable() {
  return (
    <div className="overflow-hidden rounded-2xl border border-ember-500/[0.15] shadow-[0_28px_56px_-36px_rgba(0,0,0,0.95)]">
      {/* Column headers — desktop only; on mobile each card is labelled instead. */}
      <div className="hidden grid-cols-[1.1fr_1.3fr_1.5fr] gap-px bg-white/[0.07] md:grid">
        <div className="bg-obsidian-900 px-6 py-4" />
        <div className="bg-obsidian-900 px-6 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-white/40">Legacy event software</span>
        </div>
        <div className="bg-obsidian-800 px-6 py-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ember-500">BracketRunner concierge</span>
        </div>
      </div>

      <div className="flex flex-col gap-px bg-white/[0.07] md:grid md:grid-cols-[1.1fr_1.3fr_1.5fr]">
        {ROWS.map(row => (
          <div key={row.feature} className="contents">
            {/* feature label */}
            <div className="bg-obsidian-900 px-6 pb-2 pt-6 md:py-6">
              <p className="text-[15px] font-bold tracking-tight text-white">{row.feature}</p>
            </div>

            {/* legacy */}
            <div className="flex gap-3 bg-obsidian-900 px-6 py-4 md:py-6">
              <Cross />
              <div>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-white/30 md:hidden">
                  Legacy software
                </span>
                <p className="text-[14px] leading-[1.6] text-white/45">{row.legacy}</p>
              </div>
            </div>

            {/* ours — visually lifted so the eye lands here */}
            <div className="flex gap-3 bg-obsidian-800 px-6 pb-6 pt-4 md:py-6">
              <Check />
              <div>
                <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.12em] text-ember-500 md:hidden">
                  BracketRunner
                </span>
                <p className="text-[14px] font-medium leading-[1.6] text-white/85">{row.ours}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
