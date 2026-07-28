import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getEventMeta, getEventPageData } from '@/lib/eventData'
import EventHero from '@/components/public/EventHero'
import EventPageClient from '@/components/public/EventPageClient'

export const dynamic = 'force-dynamic'

/** This page IS the product's "share one link" promise — directors paste it into
 *  team group chats and parents open it on a phone. Without this it inherited the
 *  root layout's title and previewed as "BracketRunner — Event Intake", which is
 *  both wrong and meaningless to a parent. The preview has to name the event. */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const event = await getEventMeta(params.slug)
  if (!event) return { title: 'Event not found — BracketRunner' }

  const when = formatDateRange(event.start_date, event.end_date)
  const title = `${event.title} — live schedule & scores`
  const description = [when, event.sport ? titleCase(event.sport) : null, 'Live bracket, court assignments, and scores — updated as games finish.']
    .filter(Boolean)
    .join(' · ')

  return {
    title,
    description,
    alternates: { canonical: `/${event.slug}` },
    openGraph: { title, description, url: `/${event.slug}`, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

function titleCase(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

/** Dates are plain YYYY-MM-DD date columns, so they're rendered in UTC to avoid
 *  a timezone shifting the day — the same convention the schedule views use.
 *
 *  The range is assembled field by field rather than by asking Intl for a
 *  partial pattern. Requesting { day, year } without a month is not a real
 *  en-US format, and Intl answers it with a literal "2026 (day: 6)". */
function formatDateRange(start: string, end: string) {
  if (!start) return null
  const part = (opts: Intl.DateTimeFormatOptions) => (d: string) =>
    new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { timeZone: 'UTC', ...opts })

  const full = part({ month: 'long', day: 'numeric', year: 'numeric' })
  const month = part({ month: 'long' })
  const shortDate = part({ month: 'short', day: 'numeric' })
  const day = part({ day: 'numeric' })
  const year = part({ year: 'numeric' })

  if (!end || end === start) return full(start)
  if (start.slice(0, 7) === end.slice(0, 7)) {
    return `${month(start)} ${day(start)}–${day(end)}, ${year(start)}`
  }
  return `${shortDate(start)} – ${shortDate(end)}, ${year(end)}`
}

export default async function EventPage({ params }: { params: { slug: string } }) {
  const data = await getEventPageData(params.slug)
  if (!data) notFound()

  return (
    <>
      <EventHero event={data.event} venues={data.venues} />
      <EventPageClient data={data} />
    </>
  )
}
