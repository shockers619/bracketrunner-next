// The product, anchored in the hero. Shows BOTH views — the courtside schedule
// a parent opens and the bracket a director runs — because one phone alone
// reads as a bracket app.
//
// Fidelity matters more than anything else on this page: these mockups have to
// look like a live broadcast product, not grey wireframe boxes. That means real
// contrast, emitting status dots, and court tags as proper chips.

function CourtTag({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'live' | 'blue' }) {
  // High-contrast on purpose — washed-out chips are what make a mockup read
  // as a wireframe placeholder instead of a live product.
  const tones = {
    neutral: 'border-white/20 bg-white/[0.1] text-white/75',
    live: 'border-ember-500/60 bg-ember-500/25 text-ember-300 shadow-[0_0_14px_-4px_rgba(255,107,43,0.7)]',
    blue: 'border-electric-500/50 bg-electric-500/20 text-electric-400',
  }
  return (
    <span className={`rounded-md border px-2 py-[3px] font-mono text-[9.5px] font-semibold uppercase tracking-[0.1em] ${tones[tone]}`}>
      {children}
    </span>
  )
}

function ScoreRow({ team, score, seed, leading, blue }: {
  team: string; score: string; seed: string; leading?: boolean; blue?: boolean
}) {
  return (
    <div className={`flex items-center justify-between gap-2.5 px-3 py-2.5 ${leading ? 'bg-white/[0.07]' : ''}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-extrabold text-obsidian-950 shadow-lg ${
          blue ? 'bg-gradient-to-br from-sky-200 to-sky-500' : 'bg-gradient-to-br from-copper-200 to-copper-400'
        }`}>
          {team[0]}
        </span>
        <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-white/55">{seed}</span>
        <span className={`truncate text-[13.5px] ${leading ? 'font-bold text-white' : 'font-medium text-white/80'}`}>{team}</span>
      </div>
      <span className={`font-mono text-[20px] font-extrabold tabular-nums tracking-tight ${
        leading ? (blue ? 'text-electric-400' : 'text-ember-400') : 'text-white/45'
      }`}>
        {score}
      </span>
    </div>
  )
}

function Phone() {
  return (
    <div className="relative w-[262px] shrink-0 rounded-[2.4rem] border border-white/[0.16] bg-gradient-to-b from-obsidian-700 via-obsidian-800 to-obsidian-900 p-[9px] shadow-[0_50px_90px_-30px_rgba(0,0,0,1),0_0_70px_-16px_rgba(255,107,43,0.35),0_0_0_1px_rgba(255,255,255,0.05)]">
      <div className="overflow-hidden rounded-[1.95rem] border border-white/[0.06] bg-obsidian-950">
        <div className="flex items-center justify-between px-5 pb-1.5 pt-3 font-mono text-[10px] font-medium text-white/55">
          <span>9:41</span>
          <span className="flex items-center gap-1"><span className="tracking-tighter">••••</span> 5G</span>
        </div>

        <div className="flex items-center justify-between gap-2 border-b border-white/[0.09] px-4 pb-3 pt-1">
          <div className="min-w-0">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-white">Spring Classic</p>
            <p className="font-mono text-[9.5px] uppercase tracking-[0.12em] text-white/45">14U Boys Gold</p>
          </div>
          <span className="flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/35 bg-emerald-400/12 px-2 py-[3px] font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-emerald-300">
            <span className="mk-dot-ok h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Live
          </span>
        </div>

        <div className="flex flex-col gap-2.5 bg-gradient-to-b from-white/[0.02] to-transparent p-3">
          <div className="flex items-center justify-between px-0.5">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Now playing</span>
            <span className="font-mono text-[9px] tabular-nums text-white/35">3 courts</span>
          </div>

          {/* live game — the hero card, lit */}
          <div className="overflow-hidden rounded-xl border border-ember-500/35 bg-gradient-to-b from-ember-500/[0.14] to-ember-500/[0.02] shadow-[0_0_28px_-10px_rgba(255,107,43,0.55)]">
            <div className="flex items-center justify-between border-b border-white/[0.09] px-3 py-2">
              <CourtTag tone="live">Court 2</CourtTag>
              <span className="flex items-center gap-1.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ember-300">
                <span className="mk-dot-live h-1.5 w-1.5 rounded-full bg-ember-500" />
                Q3 · 4:12
              </span>
            </div>
            <ScoreRow team="Warriors" seed="#1" score="58" leading />
            <div className="h-px bg-white/[0.07]" />
            <ScoreRow team="Hawks" seed="#8" score="41" />
          </div>

          <div className="flex items-center justify-between px-0.5">
            <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Final</span>
          </div>

          <div className="overflow-hidden rounded-xl border border-white/[0.11] bg-white/[0.035]">
            <div className="flex items-center justify-between border-b border-white/[0.09] px-3 py-2">
              <CourtTag>Court 1</CourtTag>
              <CourtTag tone="blue">Pool A</CourtTag>
            </div>
            <ScoreRow team="Sixers" seed="#4" score="62" leading blue />
            <div className="h-px bg-white/[0.07]" />
            <ScoreRow team="Bulls" seed="#5" score="55" />
          </div>
        </div>
      </div>
    </div>
  )
}

function BracketPanel() {
  const node = (name: string, score: string, won?: boolean, tbd?: boolean) => (
    <div className={`flex items-center justify-between gap-3 px-2.5 py-[7px] ${won ? 'bg-white/[0.08]' : ''}`}>
      <span className={`truncate text-[11.5px] ${tbd ? 'text-white/30' : won ? 'font-bold text-white' : 'text-white/70'}`}>{name}</span>
      <span className={`font-mono text-[11.5px] font-extrabold tabular-nums ${tbd ? 'text-white/20' : won ? 'text-electric-400' : 'text-white/40'}`}>{score}</span>
    </div>
  )
  const card = (a: React.ReactNode, b: React.ReactNode, lit?: boolean) => (
    <div className={`w-[134px] overflow-hidden rounded-lg border bg-obsidian-900 ${
      lit ? 'border-electric-500/30 shadow-[0_0_22px_-12px_rgba(56,189,248,0.7)]' : 'border-white/[0.11]'
    }`}>
      {a}<div className="h-px bg-white/[0.08]" />{b}
    </div>
  )

  return (
    <div className="mk-card rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-white/45">Bracket · 14U Gold</span>
        <CourtTag tone="blue">Pool → bracket</CourtTag>
      </div>
      <div className="relative flex items-center gap-9">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d="M134 31 C 155 31, 155 73, 172 73" fill="none" stroke="rgba(56,189,248,0.65)" strokeWidth="1.75" />
          <path d="M134 115 C 155 115, 155 73, 172 73" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.75" />
        </svg>
        <div className="flex flex-col gap-9">
          {card(node('Sixers', '62', true), node('Bulls', '55'), true)}
          {card(node('Warriors', '—', false, true), node('Hawks', '—', false, true))}
        </div>
        <div className="flex flex-col">
          {card(node('Sixers', '—', true), node('TBD', '—', false, true))}
        </div>
      </div>
    </div>
  )
}

function Caption({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-copper-300/70">{children}</p>
}

export default function PhoneShowcase() {
  return (
    <div className="relative">
      <div className="mk-bloom pointer-events-none absolute left-1/2 top-1/2 h-[24rem] w-[38rem] -translate-x-1/2 -translate-y-1/2" />
      <div className="relative flex flex-wrap items-start justify-center gap-8 sm:gap-12">
        <div>
          <Phone />
          <Caption>What families see</Caption>
        </div>
        <div className="hidden sm:block">
          <BracketPanel />
          <Caption>What you run</Caption>
        </div>
      </div>
    </div>
  )
}
