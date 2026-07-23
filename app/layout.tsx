import './globals.css'

export const metadata = {
  title: 'BracketRunner — Event Intake',
  description: 'Set up a tournament: event details, divisions, venues, and teams.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
