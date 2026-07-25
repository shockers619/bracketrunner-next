import type { Metadata } from 'next'
import DemoRequestForm from '@/components/marketing/DemoRequestForm'
import PhoneShowcase from '@/components/marketing/PhoneShowcase'
import { OfflineGraphic, NoAdsGraphic, ByeBracketGraphic } from '@/components/marketing/BentoGraphics'

export const metadata: Metadata = {
  title: 'BracketRunner — We build your tournament by hand',
  description:
    'Send us your teams however you have them. We set up the whole event ourselves and hand you back one link your families can actually use — live brackets, live scores, no ads.',
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="flex gap-5 sm:gap-7">
      <span className="w-9 shrink-0 pt-1 font-mono text-[13px] font-medium tabular-nums text-ember-500">{n}</span>
      <div>
        <h3 className="text-[1.15rem] font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-[16px] leading-[1.65] text-white/55">{body}</p>
      </div>
    </div>
  )
}

/** Bento tile. `wide` spans two columns on desktop so the grid reads composed
 *  rather than like three identical boxes. */
function Bento({ title, body, wide, children }: {
  title: string; body: string; wide?: boolean; children: React.ReactNode
}) {
  return (
    <div className={`mk-glass flex flex-col overflow-hidden rounded-2xl p-6 sm:p-7 ${wide ? 'md:col-span-2' : ''}`}>
      <h3 className="text-[1.1rem] font-bold tracking-tight text-white">{title}</h3>
      <p className="mt-2 max-w-lg text-[15px] leading-[1.6] text-white/55">{body}</p>
      <div className="mt-6 flex flex-1 items-end">{children}</div>
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
        {/* Kept deliberately tight and low-opacity: a wide warm bloom turns the
            obsidian ground brown, which is the opposite of the intended read. */}
        <div className="pointer-events-none absolute left-1/2 top-[-18rem] h-[26rem] w-[34rem] -translate-x-1/2 rounded-full bg-ember-500/[0.07] blur-[120px]" />
        <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-16 text-center sm:px-8 sm:pb-24 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[12px] font-medium text-white/65">
            <span className="h-1.5 w-1.5 animate-pulseLive rounded-full bg-ember-500" />
            Run by people, not a portal
          </span>

          <h1 className="mx-auto mt-7 max-w-4xl text-[2.75rem] font-extrabold leading-[1.03] tracking-[-0.035em] sm:text-[4.25rem]">
            We build your tournament{' '}
            <span className="bg-gradient-to-r from-ember-300 to-ember-600 bg-clip-text text-transparent">by hand.</span>
          </h1>

          <p className="mx-auto mt-7 max-w-2xl text-[18px] leading-[1.65] text-white/60">
            Send us your teams however you&apos;ve got them — a spreadsheet, an email, a photo of a legal pad. We set
            the whole thing up ourselves, walk you through it before anything goes public, and hand back one link
            your families can actually use.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#demo"
              className="mk-glow rounded-xl bg-ember-500 px-8 py-4 text-[15px] font-bold text-obsidian-950 transition-transform hover:-translate-y-0.5"
            >
              Tell us about your event
            </a>
            <span className="text-[14px] text-white/40">Every event priced on its own — we&apos;ll scope it with you.</span>
          </div>

          {/* The product, shown large rather than cropped into a corner. */}
          <div className="mt-20">
            <PhoneShowcase />
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-b border-white/[0.07] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember-500">How it works</p>
          <h2 className="mt-4 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
            What working with us looks like.
          </h2>
          <div className="mt-12 flex flex-col gap-10">
            <Step
              n="01"
              title="You send us what you have."
              body="Rosters, divisions, venues, court availability. We're genuinely not fussy about the format — if you can read it, we can work from it."
            />
            <Step
              n="02"
              title="We build the event."
              body="Divisions, seeding, pools, brackets, and a schedule that respects rest between games. Then we walk you through the whole thing. Nothing goes public until you say it's right."
            />
            <Step
              n="03"
              title="You share one link."
              body="Coaches and families follow along live. You keep full control all weekend — fix a score, override a matchup, move a game — and we stay reachable while it runs."
            />
          </div>
        </div>
      </section>

      {/* ---- Bento feature grid ---- */}
      <section className="border-b border-white/[0.07] px-5 py-16 sm:px-8 sm:py-24">
        <div className="mx-auto max-w-6xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember-500">Under the hood</p>
          <h2 className="mt-4 max-w-2xl text-[2rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
            The details that decide a weekend.
          </h2>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            <Bento
              wide
              title="Scores survive a dead gym Wi-Fi."
              body="When the signal drops mid-game, scores keep saving on the device and sync themselves the moment it comes back — in the order they were entered. Nobody re-enters anything."
            >
              <OfflineGraphic />
            </Bento>

            <Bento
              title="No ads. Not now, not later."
              body="Nothing sits between a parent and their kid's game."
            >
              <NoAdsGraphic />
            </Bento>

            <Bento
              title="A link, not a login."
              body="Families open a URL and see the bracket. No account, no app, no password reset at eight on a Saturday morning."
            >
              <div className="w-full rounded-xl border border-white/10 bg-obsidian-950/60 px-4 py-3 font-mono text-[13px] text-white/70">
                bracketrunner.com/<span className="text-ember-400">spring-classic</span>
              </div>
            </Bento>

            <Bento
              wide
              title="Brackets that don't get it wrong."
              body="Single and double elimination — including the awkward team counts that break other tools — plus round robin, pool play, and tiebreakers you can explain to a coach. Checked by more than a hundred automated tests."
            >
              <ByeBracketGraphic />
            </Bento>
          </div>
        </div>
      </section>

      {/* ---- Demo request ---- */}
      <section id="demo" className="mk-grid relative scroll-mt-20 overflow-hidden px-5 py-16 sm:px-8 sm:py-24">
        <div className="pointer-events-none absolute left-1/2 top-0 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-ember-500/10 blur-[120px]" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember-500">Get started</p>
            <h2 className="mt-4 text-[2rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.75rem]">
              Tell us about your next event.
            </h2>
            <p className="mt-6 text-[17px] leading-[1.65] text-white/60">
              We&apos;ll show you what your tournament would actually look like — built from your real teams and
              divisions, not a canned demo.
            </p>
            <p className="mt-4 text-[17px] leading-[1.65] text-white/60">
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
          <p className="text-sm text-white/35">Tournament management for club and event directors.</p>
          <a href="/signin" className="text-sm font-semibold text-white/55 transition-colors hover:text-white">
            Director sign in →
          </a>
        </div>
      </footer>
    </div>
  )
}
