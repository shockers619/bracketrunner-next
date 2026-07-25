import type { Metadata } from 'next'
import DemoRequestForm from '@/components/marketing/DemoRequestForm'
import PhoneShowcase from '@/components/marketing/PhoneShowcase'
import ComparisonTable from '@/components/marketing/ComparisonTable'
import {
  OfflineGraphic, NoAdsGraphic, CourtTimelineGraphic, FormatChipsGraphic, HandBuiltGraphic,
} from '@/components/marketing/BentoGraphics'

export const metadata: Metadata = {
  title: 'BracketRunner — Flawless event schedules & live scores, handcrafted for you',
  description:
    'Showcases, pool play, or championship brackets — hand us your team list and venue rules. We build your entire event by hand and deliver a live, courtside-ready platform for directors, coaches, and parents.',
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5">
      <span className="w-8 shrink-0 pt-1 font-mono text-[13px] font-medium tabular-nums text-copper-300">{n}</span>
      <div>
        <h3 className="text-[1.1rem] font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-[15px] leading-[1.6] text-white/55">{body}</p>
      </div>
    </div>
  )
}

/** Bento tile. `wide` spans two columns so the grid reads composed rather than
 *  as three identical boxes. */
function Bento({ title, body, wide, children }: {
  title: string; body: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.022] p-6 ${wide ? 'md:col-span-2' : ''}`}>
      <h3 className="text-[1.05rem] font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-[14.5px] leading-[1.6] text-white/55">{body}</p>
      <div className="mt-5 flex flex-1 items-end">{children}</div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-obsidian-950 text-white antialiased">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-obsidian-950/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <span className="text-[17px] font-extrabold tracking-tight">
            Bracket<span className="text-ember-500">Runner</span>
          </span>
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            <a href="/signin" className="whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold text-white/60 transition-colors hover:text-white">
              Sign in
            </a>
            <a href="#demo" className="mk-glow whitespace-nowrap rounded-lg bg-ember-500 px-4 py-2 text-[13px] font-bold text-obsidian-950 transition-transform hover:-translate-y-px sm:text-sm">
              Talk to us
            </a>
          </div>
        </nav>
      </header>

      {/* ---- Hero ---- */}
      <section className="mk-grid relative overflow-hidden border-b border-white/[0.07]">
        {/* Tight and low-opacity on purpose: a wide warm bloom tints the
            obsidian brown, which is the look this palette is correcting. */}
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[26rem] w-[34rem] -translate-x-1/2 rounded-full bg-ember-500/[0.07] blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-14 text-center sm:px-8 sm:pb-20 sm:pt-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-copper-400/25 bg-copper-400/[0.07] px-3.5 py-1.5 text-[12px] font-medium text-copper-200">
            <span className="h-1.5 w-1.5 animate-pulseLive rounded-full bg-ember-500" />
            Run by people, not a portal
          </span>

          <h1 className="mx-auto mt-6 max-w-4xl text-[2.5rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[3.9rem]">
            Flawless event schedules &amp; live scores.{' '}
            <span className="bg-gradient-to-r from-copper-200 via-ember-400 to-ember-600 bg-clip-text text-transparent">
              Handcrafted for you.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-[17.5px] leading-[1.6] text-white/60">
            Showcases, pool play, or championship brackets — hand us your team list and venue rules. We build your
            entire event by hand and deliver a live, courtside-ready platform for your directors, coaches, and parents.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#demo"
              className="mk-glow rounded-xl bg-ember-500 px-8 py-4 text-[15px] font-bold text-obsidian-950 transition-transform hover:-translate-y-0.5"
            >
              Tell us about your event
            </a>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[13px] text-white/45">
            {['100% managed concierge setup', 'Built-in offline sync', 'Zero ad clutter'].map((b, i) => (
              <span key={b} className="flex items-center gap-2">
                {i > 0 && <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />}
                {b}
              </span>
            ))}
          </div>

          {/* The product, anchored directly beneath the CTA. */}
          <div className="mt-14">
            <PhoneShowcase />
          </div>
        </div>
      </section>

      {/* ---- Us vs. them ---- */}
      <section className="border-b border-white/[0.07] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper-300">The difference</p>
          <h2 className="mt-3 max-w-3xl text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
            Built for live game days, not corporate software demos.
          </h2>
          <div className="mt-10">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-b border-white/[0.07] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper-300">How it works</p>
            <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
              You hand it over. We do the rest.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/55">
              No settings to learn, no templates to wrestle into shape. The whole point is that you don&apos;t
              touch the software unless you want to.
            </p>
          </div>
          <div className="flex flex-col gap-8">
            <Step
              n="01"
              title="You send us what you have."
              body="Rosters, divisions, venues, court availability, game guarantees. A spreadsheet, an email, a photo of a legal pad — we're genuinely not fussy about the format."
            />
            <Step
              n="02"
              title="We build and check it by hand."
              body="Divisions, seeding, pools, brackets, court assignments, and rest between games. We verify the math ourselves, then walk you through it. Nothing goes public until you say it's right."
            />
            <Step
              n="03"
              title="You share one link."
              body="Coaches and families follow along live. You keep full control all weekend — fix a score, override a matchup, move a game — and we stay reachable while it runs."
            />
          </div>
        </div>
      </section>

      {/* ---- Bento ---- */}
      <section className="border-b border-white/[0.07] px-5 py-16 sm:px-8 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper-300">A complete event engine</p>
          <h2 className="mt-3 max-w-3xl text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
            Not a bracket calculator.
          </h2>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Bento
              wide
              title="Every format a real weekend throws at you."
              body="Showcases, round robins, pool play into bracket, single and double elimination — including the odd team counts that break other tools — plus multi-venue events and custom game guarantees."
            >
              <FormatChipsGraphic />
            </Bento>

            <Bento
              title="Zero ad clutter."
              body="Nothing sits between a parent and their kid's game."
            >
              <NoAdsGraphic />
            </Bento>

            <Bento
              title="Scores survive a dead gym Wi-Fi."
              body="When the signal drops mid-game, scores keep saving on the device and sync themselves the moment it comes back — in the order they were entered."
            >
              <OfflineGraphic />
            </Bento>

            <Bento
              wide
              title="Courts, times, and rest — solved before you arrive."
              body="We lay every game across your courts and hours, respect the rest a team needs between games, and keep bracket rounds in the right order. If it genuinely won't fit, we tell you what to change instead of quietly running past closing time."
            >
              <CourtTimelineGraphic />
            </Bento>

            <Bento
              wide
              title="Checked by a person before anyone sees it."
              body="Every event is built and verified by hand. You get a walkthrough before it goes public, and someone reachable while it runs."
            >
              <HandBuiltGraphic />
            </Bento>

            <Bento
              title="A link, not a login."
              body="Families open a URL and see the schedule. No account, no app, no password reset on a Saturday morning."
            >
              <div className="w-full rounded-xl border border-white/10 bg-obsidian-950/70 px-4 py-3.5 font-mono text-[13px] text-white/70">
                bracketrunner.com/<span className="text-ember-400">spring-classic</span>
              </div>
            </Bento>
          </div>
        </div>
      </section>

      {/* ---- Demo request ---- */}
      <section id="demo" className="mk-grid relative scroll-mt-20 overflow-hidden px-5 py-16 sm:px-8 sm:py-20">
        <div className="pointer-events-none absolute left-1/2 top-0 h-72 w-[34rem] -translate-x-1/2 rounded-full bg-ember-500/[0.06] blur-[110px]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-copper-300">Get started</p>
            <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
              Tell us about your event.
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/60">
              We&apos;ll show you what your tournament would actually look like — built from your real teams,
              divisions, and venue rules, not a canned demo.
            </p>
            <p className="mt-4 text-[16px] leading-[1.65] text-white/60">
              Pricing depends on size and sport, so the honest answer is: tell us what you&apos;re running and
              we&apos;ll give you a real number.
            </p>
          </div>
          <DemoRequestForm />
        </div>
      </section>

      {/* ---- Footer ---- */}
      <footer className="border-t border-white/[0.07] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <span className="text-[15px] font-extrabold tracking-tight">
            Bracket<span className="text-ember-500">Runner</span>
          </span>
          <p className="text-sm text-white/35">Event schedules, live scores, and brackets — handcrafted.</p>
          <a href="/signin" className="text-sm font-semibold text-white/55 transition-colors hover:text-white">
            Director sign in →
          </a>
        </div>
      </footer>
    </div>
  )
}
