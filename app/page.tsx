import type { Metadata } from 'next'
import DemoRequestForm from '@/components/marketing/DemoRequestForm'

export const metadata: Metadata = {
  title: 'BracketRunner — We build your tournament by hand',
  description:
    'Send us your teams however you have them. We set up the whole event ourselves and hand you back one link your families can actually use — live brackets, live scores, no ads.',
}

/** A miniature of the real event page. Deliberately keeps the product's cooler
 *  palette: a scoreboard should read sharp and precise even when everything
 *  around it is warm. It's also the honest thing to show — this is the actual UI. */
function LiveScorebug() {
  return (
    <div className="w-full max-w-[370px] rounded-2xl border border-white/10 bg-[#0D1014] p-4 shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]">
      <div className="flex items-center justify-between px-1 pb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">Now Playing</span>
        <span className="flex items-center gap-1.5 rounded-full border border-runner-500/30 bg-runner-500/10 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-runner-400">
          <span className="h-1.5 w-1.5 animate-pulseLive rounded-full bg-runner-500" />
          Live
        </span>
      </div>
      <div className="overflow-hidden rounded-xl border border-runner-500/25 bg-gradient-to-b from-runner-500/[0.07] to-white/[0.02]">
        <div className="border-b border-white/10 px-3.5 py-2">
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/45">Court 2 · 9:15 AM</span>
        </div>
        <div className="flex items-center justify-between gap-3 bg-white/[0.045] px-3.5 py-2.5">
          <span className="truncate text-[15px] font-bold text-white">Warriors</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-runner-400">58</span>
        </div>
        <div className="h-px bg-white/5" />
        <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
          <span className="truncate text-[15px] font-medium text-white/85">Hawks</span>
          <span className="font-mono text-2xl font-bold tabular-nums text-white/55">41</span>
        </div>
      </div>
      <div className="mt-2.5 overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]">
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

export default function LandingPage() {
  return (
    <div className="relative min-h-screen bg-[#17120E] text-[#F3EADF]">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-30 border-b border-[#F3EADF]/10 bg-[#17120E]/90 backdrop-blur-md">
        <nav className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="mk-display text-[19px] font-bold">
            Bracket<span className="text-runner-400">Runner</span>
          </span>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <a href="/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-[#F3EADF]/65 transition-colors hover:text-[#F3EADF]">
              Sign in
            </a>
            <a href="#demo" className="whitespace-nowrap rounded-full border border-runner-500/40 bg-runner-500/10 px-4 py-2 text-[13px] font-bold text-runner-400 transition-colors hover:bg-runner-500/20 sm:text-sm">
              Talk to us
            </a>
          </div>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="mk-grain relative overflow-hidden">
        <div className="pointer-events-none absolute -right-40 -top-32 h-[30rem] w-[30rem] rounded-full bg-runner-500/[0.09] blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-14 sm:px-8 sm:pb-24 sm:pt-20">
          <p className="text-[15px] italic text-runner-400/90">Run by people, not a portal.</p>
          <h1 className="mk-display mt-5 max-w-3xl text-[2.75rem] font-bold leading-[1.02] sm:text-[4.25rem]">
            We build your tournament by hand.
          </h1>
          <hr className="mk-rule mt-8 w-40" />

          <div className="mt-8 grid gap-12 lg:grid-cols-[1.05fr_auto] lg:items-start">
            <div>
              <p className="max-w-xl text-[18px] leading-[1.7] text-[#F3EADF]/70">
                Send us your teams however you&apos;ve got them — a spreadsheet, an email, a photo of a legal pad.
                We set the whole thing up ourselves, walk you through it before anything goes public, and hand
                back one link your families can actually use.
              </p>
              <p className="mt-5 max-w-xl text-[18px] leading-[1.7] text-[#F3EADF]/70">
                No software for you to learn. No app for anyone to download. No ads between a parent and
                their kid&apos;s game.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-5">
                <a
                  href="#demo"
                  className="rounded-full bg-runner-500 px-8 py-4 text-[15px] font-bold text-[#17120E] shadow-[0_10px_30px_-8px_rgba(249,115,22,0.6)] transition-transform hover:-translate-y-0.5"
                >
                  Tell us about your event
                </a>
                <span className="text-[14px] italic text-[#F3EADF]/45">
                  Every event priced on its own — we&apos;ll scope it with you.
                </span>
              </div>
            </div>
            <div className="flex justify-center lg:justify-end">
              <LiveScorebug />
            </div>
          </div>
        </div>
      </section>

      {/* ---- How it works: a narrative, not a grid of boxes ---- */}
      <section className="border-t border-[#F3EADF]/10 px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mk-display text-[2rem] font-bold leading-tight sm:text-[2.75rem]">
            What working with us looks like.
          </h2>
          <div className="mt-12 flex flex-col gap-11">
            {[
              ['You send us what you have.',
               'Rosters, divisions, venues, court availability. We are genuinely not fussy about the format — if you can read it, we can work from it.'],
              ['We build the event.',
               'Divisions, seeding, pools, brackets, and a schedule that respects rest between games. Then we walk you through the whole thing. Nothing goes public until you say it is right.'],
              ['You share one link.',
               'Coaches and families follow along live. You keep full control all weekend — fix a score, override a matchup, move a game — and we stay reachable while it runs.'],
            ].map(([title, body], i) => (
              <div key={title} className="flex gap-6 sm:gap-8">
                <span className="mk-display shrink-0 pt-1 text-[2rem] font-bold leading-none text-runner-500/45 sm:text-[2.5rem]">
                  {i + 1}
                </span>
                <div>
                  <h3 className="mk-display text-[1.4rem] font-semibold leading-snug">{title}</h3>
                  <p className="mt-2.5 text-[17px] leading-[1.7] text-[#F3EADF]/65">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Why directors switch ---- */}
      <section className="border-t border-[#F3EADF]/10 bg-[#1C1610] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <h2 className="mk-display text-[2rem] font-bold leading-tight sm:text-[2.75rem]">
            The details that decide a weekend.
          </h2>
          <div className="mt-12 flex flex-col gap-10">
            {[
              ['Scores survive a dead gym Wi-Fi.',
               'When the signal drops mid-game, scores keep saving on the device and sync themselves the moment it comes back — in the order they were entered. Nobody re-enters anything.'],
              ['A link, not a login.',
               'Families open a URL and see the bracket. No account, no app, no password reset at eight in the morning on a Saturday.'],
              ['No ads. Not now, not later.',
               'Nothing sits between a parent and their kid’s game. No banners, no upsells, no trackers. That is not a launch promise we quietly walk back.'],
              ['Brackets that do not get it wrong.',
               'Single and double elimination — including the awkward team counts that break other tools — plus round robin, pool play, and tiebreakers you can actually explain to a coach. It is checked by more than a hundred automated tests.'],
            ].map(([title, body]) => (
              <div key={title}>
                <h3 className="mk-display text-[1.35rem] font-semibold leading-snug">{title}</h3>
                <p className="mt-2.5 text-[17px] leading-[1.7] text-[#F3EADF]/65">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Demo request ---- */}
      <section id="demo" className="mk-grain relative scroll-mt-20 overflow-hidden border-t border-[#F3EADF]/10 px-5 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute -left-32 bottom-0 h-96 w-96 rounded-full bg-runner-500/[0.07] blur-3xl" />
        <div className="relative mx-auto grid max-w-5xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <h2 className="mk-display text-[2rem] font-bold leading-tight sm:text-[2.75rem]">
              Tell us about your next event.
            </h2>
            <hr className="mk-rule mt-6 w-28" />
            <p className="mt-6 text-[17px] leading-[1.7] text-[#F3EADF]/70">
              We&apos;ll show you what your tournament would actually look like — built from your real teams and
              divisions, not a canned demo.
            </p>
            <p className="mt-4 text-[17px] leading-[1.7] text-[#F3EADF]/70">
              Pricing depends on the size and sport, so the honest answer is: tell us what you&apos;re running and
              we&apos;ll give you a real number.
            </p>
          </div>
          <DemoRequestForm />
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-[#F3EADF]/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4">
          <span className="mk-display text-[17px] font-bold">
            Bracket<span className="text-runner-400">Runner</span>
          </span>
          <p className="text-sm italic text-[#F3EADF]/40">Tournament management for club and event directors.</p>
          <a href="/signin" className="text-sm font-semibold text-[#F3EADF]/60 transition-colors hover:text-[#F3EADF]">
            Director sign in →
          </a>
        </div>
      </footer>
    </div>
  )
}
