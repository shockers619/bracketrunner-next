import type { EventRecord, VenueRecord } from '@/lib/eventData'

function formatDateRange(start: string, end: string) {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (start === end) return s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
}

export default function EventHero({ event, venues }: { event: EventRecord; venues: VenueRecord[] }) {
  const location = venues.length === 1
    ? `${venues[0].city}, ${venues[0].state}`
    : venues.length > 1 ? `${venues.length} venues` : ''

  return (
    <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-b from-base-900 to-base-950 px-5 pb-7 pt-9 sm:px-8 sm:pb-8 sm:pt-11">
      <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-electric-500/10 blur-3xl" />
      <div className="absolute -left-16 top-32 h-48 w-48 rounded-full bg-runner-500/10 blur-3xl" />
      <div className="relative mx-auto max-w-5xl animate-[fadeInUp_0.4s_ease-out]">
        <span className="inline-block rounded-full border border-electric-500/30 bg-electric-500/10 px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-widest text-electric-400">
          {event.sport}
        </span>
        <h1 className="mt-3 text-[2rem] font-bold leading-[1.08] tracking-tight text-white sm:text-[2.75rem]">
          {event.title}
        </h1>
        <p className="mt-2.5 font-mono text-[13px] font-medium tracking-wide text-white/55">
          {formatDateRange(event.start_date, event.end_date)}
          {location && <> &nbsp;·&nbsp; {location}</>}
        </p>
      </div>
    </div>
  )
}
