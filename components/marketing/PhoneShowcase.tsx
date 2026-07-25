// The product, shown at size. Everything here mirrors the real public event
// page — same scorebug, same LIVE treatment, same bracket tree — because the
// most persuasive asset we have is the thing itself.

function ScoreRow({ team, score, leading, dim }: { team: string; score: string; leading?: boolean; dim?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-3 px-3.5 py-2.5 ${leading ? 'bg-white/[0.045]' : ''}`}>
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[11px] font-bold text-obsidian-950 ${
          dim ? 'bg-gradient-to-br from-slate-400 to-slate-600' : 'bg-gradient-to-br from-sky-300 to-sky-600'
        }`}>
          {team[0]}
        </span>
        <span className={`truncate text-[14px] ${leading ? 'font-bold text-white' : 'font-medium text-white/80'}`}>{team}</span>
      </div>
      <span className={`font-mono text-[19px] font-bold tabular-nums ${
        leading ? (dim ? 'text-electric-400' : 'text-runner-400') : 'text-white/45'
      }`}>
        {score}
      </span>
    </div>
  )
}

function Phone() {
  return (
    <div className="relative w-[272px] shrink-0 rounded-[2.4rem] border border-white/[0.12] bg-gradient-to-b from-obsidian-700 to-obsidian-900 p-[9px] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.95)]">
      <div className="overflow-hidden rounded-[1.95rem] bg-obsidian-950">
        {/* status bar */}
        <div className="flex items-center justify-between px-5 pb-1 pt-3 font-mono text-[10px] text-white/50">
          <span>9:41</span>
          <span className="flex items-center gap-1"><span className="tracking-tighter">••••</span> 5G</span>
        </div>

        {/* event header */}
        <div className="border-b border-white/[0.07] px-4 pb-3 pt-1">
          <p className="text-[15px] font-bold tracking-tight text-white">Spring Classic</p>
          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-white/40">14U Boys Gold</p>
        </div>

        <div className="flex flex-col gap-2.5 p-3">
          <div className="flex items-center justify-between px-1">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Now Playing</span>
            <span className="flex items-center gap-1.5 rounded-full border border-runner-500/30 bg-runner-500/10 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.12em] text-runner-400">
              <span className="h-1 w-1 animate-pulseLive rounded-full bg-runner-500" />
              Live
            </span>
          </div>

          <div className="overflow-hidden rounded-xl border border-runner-500/25 bg-gradient-to-b from-runner-500/[0.08] to-white/[0.02]">
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
              <span className="font-mono text-[9px] uppercase tracking-[0.12em] text-electric-400/90">Final · Court 1</span>
            </div>
            <ScoreRow team="Sixers" score="62" leading dim />
            <div className="h-px bg-white/5" />
            <ScoreRow team="Bulls" score="55" />
          </div>
        </div>
      </div>
    </div>
  )
}

/** The bracket tree, drawn the way the real one renders — cards joined by
 *  bezier connectors, with the decided path lit in accent blue. */
function BracketPanel() {
  const node = (name: string, score: string, won?: boolean, tbd?: boolean) => (
    <div className={`flex items-center justify-between gap-3 rounded-md px-2.5 py-1.5 ${won ? 'bg-white/[0.06]' : ''}`}>
      <span className={`truncate text-[11px] ${tbd ? 'text-white/30' : won ? 'font-bold text-white' : 'text-white/70'}`}>{name}</span>
      <span className={`font-mono text-[11px] font-bold tabular-nums ${tbd ? 'text-white/20' : won ? 'text-electric-400' : 'text-white/40'}`}>{score}</span>
    </div>
  )
  const card = (a: React.ReactNode, b: React.ReactNode) => (
    <div className="w-[128px] overflow-hidden rounded-lg border border-white/[0.09] bg-obsidian-900/90">
      {a}<div className="h-px bg-white/5" />{b}
    </div>
  )

  return (
    <div className="mk-glass relative hidden rounded-2xl p-5 lg:block">
      <p className="mb-4 font-mono text-[9px] uppercase tracking-[0.18em] text-white/40">Bracket</p>
      <div className="relative flex items-center gap-9">
        {/* connectors */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" aria-hidden="true">
          <path d="M128 34 C 148 34, 148 76, 165 76" fill="none" stroke="rgba(56,189,248,0.5)" strokeWidth="1.5" />
          <path d="M128 118 C 148 118, 148 76, 165 76" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="1.5" />
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

export default function PhoneShowcase() {
  return (
    <div className="relative flex items-center justify-center gap-8">
      {/* glow behind the device */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[20rem] w-[26rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ember-500/[0.05] blur-[90px]" />
      <div className="relative">
        <Phone />
      </div>
      <div className="relative">
        <BracketPanel />
      </div>
    </div>
  )
}
