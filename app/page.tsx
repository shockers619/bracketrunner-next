import type { Metadata } from 'next'
import DemoRequestForm from '@/components/marketing/DemoRequestForm'

export const metadata: Metadata = {
  title: 'BracketRunner — Concierge tournament management',
  description:
    'Send us your teams and divisions. We build the whole event and hand you one live link — brackets, scores, and standings updating in real time. No ads, no logins for families.',
}

/** A miniature of the real public event page. It's the most persuasive thing we
 *  have, so the hero shows the actual product rather than a stock illustration. */
function LiveScorebug() {
  return (
    <div className="w-full max-w-[380px] rounded-2xl border border-white/10 bg-base-900/80 p-4 shadow-2xl shadow-black/60 backdrop-blur-xl">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Now Playing</span>
        <span className="flex items-center gap-1.5 rounded-full border border-runner-500/30 bg-runner-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-runner-400">
          <span className="h-1.5 w-1.5 animate-pulseLive rounded-full bg-runner-500" />
          Live
        </span>
      </div>

      <div className="overflow-hidden rounded-xl border border-runner-500/25 bg-gradient-to-b from-runner-500/[0.07] to-base-800/80">
        <div className="border-b border-white/10 px-3.5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">Court 2 · Q3 4:12</span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-white/[0.045] px-3.5 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-blue-400 to-blue-700 text-xs font-bold text-base-950">W</span>
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55">#1</span>
            <span className="truncate text-[15px] font-bold text-white">Warriors</span>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-runner-400">58</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-slate-400 to-slate-700 text-xs font-bold text-base-950">H</span>
            <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-white/55">#8</span>
            <span className="truncate text-[15px] font-medium text-white/85">Hawks</span>
          </div>
          <span className="font-mono text-2xl font-bold tabular-nums text-white/60">41</span>
        </div>
      </div>

      <div className="mt-2.5 overflow-hidden rounded-xl border border-white/10 bg-base-800/70">
        <div className="border-b border-white/10 px-3.5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-electric-400/90">Final</span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-white/[0.045] px-3.5 py-2.5">
          <span className="truncate text-[15px] font-bold text-white">Sixers</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-electric-400">62</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="truncate text-[15px] font-medium text-white/85">Bulls</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-white/45">55</span>
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="relative rounded-2xl border border-white/10 bg-base-800/40 p-6">
      <span className="font-mono text-[11px] font-bold tracking-[0.18em] text-electric-400">{n}</span>
      <h3 className="mt-3 text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-white/60">{body}</p>
    </div>
  )
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="border-l-2 border-electric-500/40 pl-5">
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-white/60">{body}</p>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-base-950 text-white">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-base-950/80 backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="text-[17px] font-extrabold tracking-tight">
            Bracket<span className="text-electric-400">Runner</span>
          </span>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <a href="/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/70 transition-colors hover:text-white">
              Sign in
            </a>
            <a
              href="#demo"
              className="whitespace-nowrap rounded-lg bg-white/10 px-3.5 py-2 text-[13px] font-bold text-white transition-colors hover:bg-white/15 sm:px-4 sm:text-sm"
            >
              Request a demo
            </a>
          </div>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="relative overflow-hidden border-b border-white/10">
        <div className="pointer-events-none absolute -left-32 -top-40 h-[28rem] w-[28rem] rounded-full bg-electric-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 top-20 h-80 w-80 rounded-full bg-runner-500/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1.1fr_auto]">
          <div>
            <span className="inline-block rounded-full border border-electric-500/30 bg-electric-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-electric-400">
              Concierge tournament management
            </span>
            <h1 className="mt-6 text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.03em] text-white sm:text-[3.5rem]">
              Hand us your teams.<br />
              We hand you a live tournament.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-white/65">
              Send us your rosters, divisions, and venues in whatever format you already have. We build the entire
              event and give you one link — brackets, live scores, and standings that update the moment a game ends.
              No ads. No app for families to download. No spreadsheets at the scorer&apos;s table.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <a
                href="#demo"
                className="rounded-xl bg-gradient-to-b from-electric-400 to-electric-600 px-7 py-4 text-[15px] font-bold text-base-950 shadow-lg shadow-electric-500/25 transition-opacity hover:opacity-95"
              >
                Request a demo
              </a>
              <span className="font-mono text-[13px] text-white/40">Custom pricing per event · we&apos;ll scope it with you</span>
            </div>
          </div>
          <div className="flex justify-center lg:justify-end">
            <LiveScorebug />
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-b border-white/10 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">How it works</p>
          <h2 className="mt-3 max-w-2xl text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.25rem]">
            You run the event. We handle the setup.
          </h2>
          {/* Numbered because this genuinely is a sequence the director moves through */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Step
              n="01"
              title="Send us your event"
              body="Rosters, divisions, venues, court availability — a spreadsheet, an email, a photo of a whiteboard. We'll take it from there."
            />
            <Step
              n="02"
              title="We build it with you"
              body="We set up divisions, seeding, pools and brackets, then walk you through it before anything goes public. Nothing goes live until you say so."
            />
            <Step
              n="03"
              title="Share one link"
              body="Coaches and families follow along in real time. You keep full control during the event — and we stay on call while it runs."
            />
          </div>
        </div>
      </section>

      {/* ---- Features ---- */}
      <section className="border-b border-white/10 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">Why directors switch</p>
          <h2 className="mt-3 max-w-2xl text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.25rem]">
            Built by people who&apos;ve watched this software fail in a gym.
          </h2>
          <div className="mt-10 grid gap-8 md:grid-cols-2 md:gap-x-12">
            <Feature
              title="Scores survive dead gym Wi-Fi"
              body="When the signal drops mid-game, scores keep saving on the device and sync themselves the moment it reconnects — in the order they were entered. Nobody re-enters a thing."
            />
            <Feature
              title="A link, not a login"
              body="Families open a URL and see the bracket. No account, no app, no password reset at 8am on a Saturday."
            />
            <Feature
              title="Zero ads. Ever."
              body="No banner ads, no upsells, no third-party trackers between a parent and their kid's game. Compare that to what you're using now."
            />
            <Feature
              title="An engine that doesn't get brackets wrong"
              body="Single and double elimination — including the odd team counts that break other tools — plus round robin, pool play, and transparent tiebreakers. Backed by 100+ automated correctness tests."
            />
          </div>
        </div>
      </section>

      {/* ---- Concierge / positioning ---- */}
      <section className="border-b border-white/10 px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40">White-glove by default</p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.25rem]">
              You shouldn&apos;t have to learn software to run your own event.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/65">
              Most tournament platforms hand you a login and wish you luck. We do the intake ourselves — divisions,
              seeding, pools, brackets — and hand back a finished event. During the weekend you get full control to
              fix a score, override a matchup, or reset a match, with every change logged.
            </p>
            <a
              href="#demo"
              className="mt-8 inline-block rounded-xl border border-white/15 bg-white/[0.04] px-6 py-3.5 text-[15px] font-bold text-white transition-colors hover:bg-white/10"
            >
              Talk to us about your next event
            </a>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              ['Managed setup', 'We build the event for you, start to finish.'],
              ['Live support', 'We’re reachable while your event is running.'],
              ['Director overrides', 'Fix anything mid-event — every change audited.'],
              ['White-label', 'Your branding and your own domain, on request.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-xl border border-white/10 bg-base-800/40 p-5">
                <p className="text-[15px] font-bold text-white">{title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-white/55">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Demo request ---- */}
      <section id="demo" className="scroll-mt-20 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-electric-400">Request a demo</p>
            <h2 className="mt-3 text-[1.75rem] font-bold leading-tight tracking-tight sm:text-[2.25rem]">
              Tell us about your next event.
            </h2>
            <p className="mt-5 text-[17px] leading-relaxed text-white/65">
              We&apos;ll show you exactly what your tournament would look like — using your real teams and divisions,
              not a canned demo. Pricing is scoped to your event size and sport, so let&apos;s start with what
              you&apos;re running.
            </p>
          </div>
          <DemoRequestForm />
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span className="text-[15px] font-extrabold tracking-tight">
            Bracket<span className="text-electric-400">Runner</span>
          </span>
          <p className="font-mono text-xs text-white/35">Tournament management for club and event directors.</p>
          <a href="/signin" className="text-sm font-semibold text-white/60 transition-colors hover:text-white">
            Director sign in →
          </a>
        </div>
      </footer>
    </div>
  )
}
