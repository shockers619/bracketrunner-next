import { notFound } from 'next/navigation'
import { getEventPageData } from '@/lib/eventData'
import EventHero from '@/components/public/EventHero'
import EventPageClient from '@/components/public/EventPageClient'

export const dynamic = 'force-dynamic'

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
