import './globals.css'
import type { Metadata, Viewport } from 'next'

/** Relative OG/canonical URLs in child routes resolve against this. Without it
 *  Next emits no absolute og:url and social scrapers fall back to the raw link. */
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://bracketrunner.com'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  // Child routes set their own full title; the template passes it through
  // unchanged. The default matters more than it looks: it was
  // "BracketRunner — Event Intake", an internal page title that leaked out as
  // the sitewide fallback — including onto every shared event link.
  title: {
    default: 'BracketRunner — Flawless event schedules & live scores, handcrafted for you',
    template: '%s',
  },
  description:
    'Showcases, pool play, or championship brackets — hand us your team list and venue rules. We build the whole event by hand and give you one link to share.',
  applicationName: 'BracketRunner',
  openGraph: {
    siteName: 'BracketRunner',
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
}

export const viewport: Viewport = {
  // Matches the obsidian page background so mobile browser chrome blends into
  // the page instead of framing it in white.
  themeColor: '#0B0A0F',
  colorScheme: 'dark',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
