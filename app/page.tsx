import type { Metadata } from 'next'
import Wordmark from '@/components/Wordmark'
import DemoRequestForm from '@/components/marketing/DemoRequestForm'
import PhoneShowcase from '@/components/marketing/PhoneShowcase'
import ComparisonTable from '@/components/marketing/ComparisonTable'
import {
  OfflineGraphic, NoAdsGraphic, CourtTimelineGraphic, FormatChipsGraphic, HandBuiltGraphic,
} from '@/components/marketing/BentoGraphics'
import {
  FormatsIcon, OfflineIcon, NoAdsIcon, ScheduleIcon, HandBuiltIcon, LinkIcon,
} from '@/components/marketing/BentoIcons'
import { CircleScribble, ArrowDownLeft, ArrowDownRight, InkRule, Underscore } from '@/components/marketing/HandDrawn'

export const metadata: Metadata = {
  title: 'BracketRunner — Flawless event schedules & live scores, handcrafted for you',
  description:
    'Showcases, pool play, or championship brackets — hand us your team list and venue rules. We build your entire event by hand and deliver a live, courtside-ready platform for directors, coaches, and parents.',
}

/** Section tag as a styled pill, not floating dim text — every section opener
 *  gets a warm visual anchor. */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="mk-pill font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-copper-200">
      <span className="mk-dot-live h-1 w-1 rounded-full bg-ember-500" />
      {children}
    </span>
  )
}

/** Warm gradient accent for key headline words — kills the white-on-dark
 *  monotony section by section. */
function Accent({ children }: { children: React.ReactNode }) {
  return (
    <span className="bg-gradient-to-r from-copper-200 via-ember-300 to-ember-500 bg-clip-text text-transparent">
      {children}
    </span>
  )
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

/** Bento tile. Three things here are deliberate, and all three exist to stop the
 *  grid reading like a dashboard:
 *
 *  - No icon chip. A rounded square holding an icon in the top-left corner is
 *    the SaaS feature-card cliché; the mark now sits bare and slightly turned.
 *  - No hairline rule. A full-width 1px line under a heading is a table header
 *    separator, and six of them stacked down a page is what made this feel like
 *    a database. It's a short ink stroke now, a different one per card.
 *  - `tilt`, `lift` and `radius` vary per card, so they aren't visibly stamped
 *    from one die. Rotation alone turned out to be nearly invisible at this card
 *    size; `lift` (a few px of translateY) is what actually breaks the strict
 *    shared baseline, which is the thing that reads as "generated grid". It's
 *    transform-only, so it shifts the card visually without moving layout.
 *
 *  `note` is a handwritten margin remark. It sits in normal flow rather than
 *  absolutely positioned, so it can't collide with a neighbour at any width. */
function Bento({ icon, title, body, wide, warm, tilt = 0, lift = 0, rule = 0, radius = '1rem', note, children }: {
  icon: React.ReactNode; title: string; body: string
  wide?: boolean; warm?: boolean; tilt?: number; lift?: number; rule?: number; radius?: string
  note?: string; children: React.ReactNode
}) {
  return (
    <div
      className={`mk-card ${warm ? 'mk-card-warm' : ''} flex flex-col p-6 ${wide ? 'md:col-span-2' : ''}`}
      style={{
        borderRadius: radius,
        transform: `translateY(${lift}px) rotate(${tilt}deg)`,
      }}
    >
      <div className="relative flex items-start gap-3">
        <span
          className={`mt-[3px] shrink-0 ${warm ? 'text-ember-400' : 'text-copper-300/80'}`}
          style={{ transform: `rotate(${-tilt * 3}deg)` }}
        >
          {icon}
        </span>
        <h3 className="text-[1.05rem] font-bold leading-snug tracking-tight text-white">{title}</h3>
      </div>

      <InkRule
        variant={rule}
        className={`relative mt-4 h-[10px] w-[120px] ${warm ? 'text-ember-500/60' : 'text-copper-400/40'}`}
      />

      <p className="relative mt-3.5 max-w-lg text-[14.5px] leading-[1.65] text-white/60">{body}</p>
      <div className="relative mt-6 flex flex-1 items-end">{children}</div>

      {note && (
        <p
          className="mk-hand relative mt-5 text-[17px] leading-tight text-copper-300/70"
          style={{ transform: 'rotate(-1.1deg)' }}
        >
          {note}
        </p>
      )}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="mk-paper min-h-screen bg-obsidian-950 text-white antialiased">
      {/* ---- Nav ---- */}
      <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-obsidian-950/85 backdrop-blur-xl">
        <nav className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          {/* The bracket marks add ~35px to the lockup, which pushed the nav
              actions into the right padding at 375px. Stepping down one size on
              small screens keeps the full logo rather than dropping a mark. */}
          <Wordmark className="text-[15px] font-extrabold tracking-tight sm:text-[17px]" />
          <div className="flex shrink-0 items-center gap-1 sm:gap-3">
            {/* min-h-[44px] on both: these were 36px, under the phone tap floor. */}
            <a href="/signin" className="inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg px-3 text-sm font-semibold text-white/60 transition-colors hover:text-white">
              Sign in
            </a>
            <a href="#demo" className="mk-glow inline-flex min-h-[44px] items-center whitespace-nowrap rounded-lg bg-ember-500 px-4 text-[13px] font-bold text-obsidian-950 transition-transform hover:-translate-y-px sm:text-sm">
              Talk to us
            </a>
          </div>
        </nav>
      </header>

      {/* ---- Hero ----
          Asymmetric on purpose. A centered stack of headline → subhead → CTA →
          screenshot is the exact skeleton every SaaS template uses, and no
          amount of warm colour rescues it. Text holds the left, the product
          breaks out to the right at an angle. */}
      <section className="mk-grid relative overflow-hidden border-b border-white/[0.07]">
        {/* Two blooms, both kept INSIDE the section box. The previous single
            bloom sat at top:-18rem inside an overflow-hidden parent, so most of
            its radius was clipped before it ever painted — it was doing almost
            nothing. One warms the headline side, one sits behind the device. */}
        <div className="mk-bloom pointer-events-none absolute -top-24 left-[-6%] h-[34rem] w-[40rem] opacity-90" />
        <div className="mk-bloom pointer-events-none absolute right-[-8%] top-8 h-[38rem] w-[42rem] opacity-75" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div className="relative z-10">
            <span className="inline-flex items-center gap-2.5 rounded-full border border-ember-500/30 bg-gradient-to-b from-ember-500/[0.16] to-ember-500/[0.04] px-4 py-1.5 text-[12.5px] font-semibold text-copper-200 shadow-[inset_0_1px_0_rgba(255,180,130,0.25),0_0_28px_-14px_rgba(255,107,43,0.9)]">
              <span className="mk-dot-live h-1.5 w-1.5 animate-pulseLive rounded-full bg-ember-500" />
              Run by people, not a portal
            </span>

            <h1 className="mt-7 text-[2.6rem] font-extrabold leading-[1.04] tracking-[-0.035em] sm:text-[3.6rem]">
              Flawless event schedules &amp; live scores.{' '}
              {/* The ink circle is absolutely positioned around the phrase and
                  intentionally doesn't close — a drawn mark, not a border. */}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-copper-200 via-ember-300 to-ember-500 bg-clip-text text-transparent">
                  Handcrafted for you.
                </span>
                <CircleScribble className="pointer-events-none absolute -inset-x-4 -inset-y-3 h-[calc(100%+1.5rem)] w-[calc(100%+2rem)] text-ember-500/55" />
              </span>
            </h1>

            <p className="mt-7 max-w-xl text-[17px] leading-[1.65] text-white/60">
              Showcases, pool play, or championship brackets — hand us your team list and venue rules. We build your
              entire event by hand and deliver a live, courtside-ready platform for your directors, coaches, and parents.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-5">
              <a
                href="#demo"
                className="mk-glow rounded-xl bg-ember-500 px-8 py-4 text-[15px] font-bold text-obsidian-950 transition-transform hover:-translate-y-0.5"
              >
                Tell us about your event
              </a>
              {/* Handwritten aside next to the CTA — the first human mark you hit. */}
              <span className="mk-hand max-w-[11rem] text-[19px] leading-tight">
                a real person replies, usually same day
              </span>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-[13px] text-white/45">
              {['100% managed concierge setup', 'Built-in offline sync', 'Zero ad clutter'].map((b, i) => (
                <span key={b} className="flex items-center gap-2">
                  {i > 0 && <span className="hidden h-1 w-1 rounded-full bg-white/20 sm:block" />}
                  {b}
                </span>
              ))}
            </div>
          </div>

          {/* Product breaks the grid: tilted, oversized, allowed to bleed. */}
          <div className="relative lg:-mr-16 xl:-mr-24">
            <PhoneShowcase />
          </div>
        </div>
      </section>

      {/* ---- Us vs. them ---- */}
      <section className="border-b border-white/[0.07] px-5 py-14 sm:px-8 sm:py-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>The difference</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
            Built for <Accent>live game days</Accent>, not corporate software demos.
          </h2>
          <div className="mt-10">
            <ComparisonTable />
          </div>
        </div>
      </section>

      {/* ---- How it works ---- */}
      <section className="border-b border-white/[0.07] px-5 py-14 sm:px-8 sm:py-[4.5rem]">
        <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
          <div>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="mt-4 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
              You hand it over. <Accent>We do the rest.</Accent>
            </h2>
            <p className="mt-5 text-[16px] leading-[1.65] text-white/55">
              No settings to learn, no templates to wrestle into shape. The whole point is that you don&apos;t
              touch the software unless you want to.
            </p>

            {/* A signed note — the single clearest "a person made this" mark on
                the page. Tilted and offset so it reads as pinned on, not laid out. */}
            <div className="relative mt-10 max-w-sm -rotate-1 rounded-xl border border-copper-400/25 bg-copper-400/[0.05] px-6 py-5">
              <ArrowDownLeft className="absolute -right-2 -top-9 hidden rotate-[16deg] text-copper-400/50 lg:block" />
              <p className="mk-hand text-[21px] leading-[1.35] text-copper-200">
                &ldquo;If something breaks at 8am on a Saturday, you get a person — not a ticket number.&rdquo;
              </p>
              <p className="mk-hand mt-3 text-[18px] text-copper-300/75">— the two of us who build these</p>
            </div>
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
      <section className="border-b border-white/[0.07] px-5 py-14 sm:px-8 sm:py-[4.5rem]">
        <div className="mx-auto max-w-6xl">
          <Eyebrow>A complete event engine</Eyebrow>
          <h2 className="mt-4 max-w-3xl text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
            Not a <Accent>bracket calculator.</Accent>
          </h2>

          {/* The section made six product claims with no human mark anywhere in
              it, which is where the handcrafted story was quietly dropping out.
              Every card below describes something that exists today, so the note
              is a claim we can stand behind rather than decoration. */}
          <div className="mt-5 flex items-start gap-3">
            <ArrowDownRight className="mt-1 hidden h-9 w-11 shrink-0 -scale-y-100 rotate-[10deg] text-copper-400/55 sm:block" />
            <span
              className="mk-hand text-[18px] leading-tight text-copper-300/75 sm:text-[19px]"
              style={{ transform: 'rotate(-0.8deg)' }}
            >
              no roadmap items on this page
            </span>
          </div>

          <div className="mt-9 grid gap-5 md:grid-cols-3">
            <Bento
              wide warm tilt={-0.5} lift={0} rule={0} radius="1.15rem"
              note="yes — even 13 teams"
              icon={<FormatsIcon />}
              title="Every format a real weekend throws at you."
              body="Showcases, round robins, pool play into bracket, single and double elimination — including the odd team counts that break other tools — plus multi-venue events and custom game guarantees."
            >
              <FormatChipsGraphic />
            </Bento>

            <Bento
              tilt={0.65} lift={-10} rule={1} radius="0.85rem"
              icon={<NoAdsIcon />}
              title="Zero ad clutter."
              body="Nothing sits between a parent and their kid's game."
            >
              <NoAdsGraphic />
            </Bento>

            <Bento
              warm tilt={0.5} lift={9} rule={2} radius="1.25rem"
              note="gym Wi-Fi is always bad. always."
              icon={<OfflineIcon />}
              title="Scores survive a dead gym Wi-Fi."
              body="When the signal drops mid-game, scores keep saving on the device and sync themselves the moment it comes back — in the order they were entered."
            >
              <OfflineGraphic />
            </Bento>

            <Bento
              wide tilt={-0.4} lift={-7} rule={1} radius="0.95rem"
              icon={<ScheduleIcon />}
              title="Courts, times, and rest — solved before you arrive."
              body="We lay every game across your courts and hours, respect the rest a team needs between games, and keep bracket rounds in the right order. If it genuinely won't fit, we tell you what to change instead of quietly running past closing time."
            >
              <CourtTimelineGraphic />
            </Bento>

            <Bento
              wide tilt={0.45} lift={7} rule={2} radius="1.2rem"
              icon={<HandBuiltIcon />}
              title="Checked by a person before anyone sees it."
              body="Every event is built and verified by hand. You get a walkthrough before it goes public, and someone reachable while it runs."
            >
              <HandBuiltGraphic />
            </Bento>

            <Bento
              tilt={-0.65} lift={-9} rule={0} radius="0.9rem"
              note="no app store, ever"
              icon={<LinkIcon />}
              title="A link, not a login."
              body="Families open a URL and see the schedule. No account, no app, no password reset on a Saturday morning."
            >
              {/* Was a bordered, filled rectangle — indistinguishable from a
                  read-only input. It's the link itself now, marked with an ink
                  underline the way you'd underline a URL you wrote down. */}
              <div className="relative w-full">
                <span className="font-mono text-[13.5px] text-white/75">
                  bracketrunner.com/<span className="text-ember-400">spring-classic</span>
                </span>
                <Underscore className="mt-1 h-[10px] w-[195px] text-ember-500/75" />
              </div>
            </Bento>
          </div>
        </div>
      </section>

      {/* ---- Demo request ---- */}
      <section id="demo" className="mk-grid relative scroll-mt-20 overflow-hidden px-5 py-14 sm:px-8 sm:py-[4.5rem]">
        <div className="mk-bloom pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[42rem] -translate-x-1/2" />
        <div className="relative mx-auto grid max-w-6xl gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <Eyebrow>Get started</Eyebrow>
            <h2 className="mt-4 text-[1.9rem] font-extrabold leading-tight tracking-[-0.03em] sm:text-[2.6rem]">
              Tell us about <Accent>your event.</Accent>
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
          <Wordmark className="text-[15px] font-extrabold tracking-tight" />
          <p className="text-sm text-white/35">Event schedules, live scores, and brackets — handcrafted.</p>
          <a href="/signin" className="-mx-2 inline-flex min-h-[44px] items-center px-2 text-sm font-semibold text-white/55 transition-colors hover:text-white">
            Director sign in →
          </a>
        </div>
      </footer>
    </div>
  )
}
