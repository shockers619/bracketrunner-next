// The product, anchored in the hero. Deliberately shows TWO views side by side:
// the courtside schedule a parent opens, and the bracket tree — because the
// pitch is "complete event engine", and a phone alone would read as a bracket app.

function ScoreRow({ team, score, leading, blue }: { team: string; score: string; leading?: boolean; blue?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${leading ? 'bg-white/[0.05]' : ''}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-obsidian-950 ${
          blue ? 'bg-gradient-to-br from-sky-300 to-sky-600' : 'bg-gradient-to-br from-copper-200 to-copper-500'
        }`}>
          {team[0]}
        </span>
        <span className={`truncate text-[14px] ${leading ? 'font-bold text-white' : 'font-medium text-white/75'}`}>{team}</span>
      </div>
      <span className={`font-mono text-[19px] font-bold tabular-nums ${
        leading ? (blue ? 'text-electric-400' : 'text-ember-400') : 'text-white/40'
      }`}>
        {score}
      </span>
    </div>
  )
}

function Phone() {
  return (
    <div className="relative w-[258px] shrink-0 rounded-[2.3rem] border border-white/[0.14] bg-gradient-to-b from-obsidian-700 to-obsidian-900 p-[8px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)]">
      <div className="overflow-hidden rounded-[1.85rem] bg-obsidian-950">
        <div className="flex items-center justify-between px-5 pb-1 pt-3 font-mono text-[10px] text-white/45">
          <span>9:41</span>
          <span className="flex items-center gap-1"><span className="tracking-tighter">••••</span> 5G</span>
        </div>

        <div className="border-b border-white/[0.07] px-4 pb-3 pt-1">
          <p className="text-[15px] font-bold tracking-tight text-white">Spring Classic</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">14U Boys Gold</p>
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Now playing</span>
            <span className="flex items-center gap-1.5 rounded-full border border-ember-500/35 bg-ember-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-ember-400">
              <span className="h-1 w-1 animate-pulseLive rounded-full bg-ember-500" />
              Live
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-ember-500/25 bg-gradient-to-b from-ember-500/[0.09] to-white/[0.015]">
            <div className="border-b border-white/[0.07] px-3.5 py-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-white/45">Court 2 · 9:15 AM</span>
            </div>
            <ScoreRow team="Warriors" score="58" leading />
            <div className="h-px bg-white/5" />
            <ScoreRow team="Hawks" score="41" />
          </div>

          <span className="px-1 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Final</span>
          <div className="overflow-hidden rounded-xl border border-white/[0.09] bg-white/[0.02]">
            <div className="border-b border-white/[0.07] px-3.5 py-1.5">
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-electric-400/90">Court 1 · Pool A</span>
            </div>
            <ScoreRow team="Sixers" score="62" leading blue />
            <div className="h-px bg-white/5" />
            <ScoreRow team="Bulls" score="55" />
          </div>
        </div>
      </div>
    </div>
  )
}

function BracketPanel() {
  const node = (name: string, score: string, won?: boolean, tbd?: boolean) => (
    <div className={`flex items-center justify-between gap-3 px-2.5 py-1.5 ${won ? 'bg-white/[0.06]' : ''}`}>
      <span className={`truncate text-[11px] ${tbd ? 'text-white/25' : won ? 'font-bold text-white' : 'text-white/65'}`}>{name}</span>
      <span className={`font-mono text-[11px] font-bold tabular-nums ${tbd ? 'text-white/15' : won ? 'text-electric-400' : 'text-white/35'}`}>{score}</span>
    </div>
  )
  const card = (a: React.ReactNode, b: React.ReactNode) => (
    <div className="w-[132px] overflow-hidden rounded-lg border border-white/10 bg-obsidian-900">
      {a}<div className="h-px bg-white/[0.07]" />{b}
    </div>
  )

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 backdrop-blur-sm">
      <div className="mb-4 flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Bracket · 14U Gold</span>
        <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-copper-300">Pool → bracket</span>
      </div>
      <div className="relative flex items-center gap-9">
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d="M132 32 C 152 32, 152 74, 169 74" fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" />
          <path d="M132 116 C 152 116, 152 74, 169 74" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
        </svg>
        <div className="flex flex-col gap-9">
          {card(node('Sixers', '62', true), node('Bulls', '55'))}
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
  return (
    <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-white/35">{children}</p>
  )
}

export default function PhoneShowcase() {
  return (
    <div className="relative">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[18rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500/[0.05] blur-[90px]" />
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
