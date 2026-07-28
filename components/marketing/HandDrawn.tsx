// Hand-drawn ink marks. Every path is deliberately irregular — uneven curves,
// overshooting ends, a circle that doesn't quite close. Perfect geometry is
// what makes a page feel machine-generated; these are the opposite signal.

/** A curved arrow pointing down-left, for annotating something below-left. */
export function ArrowDownLeft({ className = '' }: { className?: string }) {
  return (
    <svg width="64" height="52" viewBox="0 0 64 52" fill="none" className={className} aria-hidden="true">
      <path
        d="M58 4c2 13-3 23-12 30-8 6-19 9-31 10"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
      <path d="M22 38c-3 2-6 4-9 6M15 39c0 2 0 4 0 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** A curved arrow pointing down-right. */
export function ArrowDownRight({ className = '' }: { className?: string }) {
  return (
    <svg width="60" height="50" viewBox="0 0 60 50" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 5c-1 12 4 22 13 28 7 5 17 8 27 9"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      />
      <path d="M37 36c3 2 6 4 9 6M44 38c0 2 0 3 0 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

/** An ink circle that doesn't quite close — drawn around a word. */
export function CircleScribble({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 62" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path
        d="M158 8C120 2 60 1 26 12 4 19 2 36 18 46c20 12 84 15 130 8 32-5 48-15 40-26-5-7-22-12-42-15"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
      />
    </svg>
  )
}

/** A short, uneven ink stroke used instead of a hairline rule under a card
 *  heading. Three variants, because six identical rules down a page is exactly
 *  what makes a grid read as a table. Deliberately short — a full-width hairline
 *  is chrome, a stroke that stops early is a mark someone made. */
const RULES = [
  'M2 6c22-3 52-4 84-3 26 1 44 2 58 4',
  'M3 5c18 3 46 4 76 3 24-1 42-2 62-4',
  'M2 7c26-4 60-4 90-2 22 1 38 2 52 2',
]

export function InkRule({ variant = 0, className = '' }: { variant?: number; className?: string }) {
  return (
    <svg viewBox="0 0 146 12" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d={RULES[variant % RULES.length]} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

/** A checkmark drawn by hand rather than a circled tick glyph. A perfect circle
 *  with a perfect check inside is a form-validation icon; this is a pen stroke. */
const TICKS = [
  'M2 8.4c2 1.5 3.4 3.1 4.7 5.3C8.7 8.9 11.1 4.9 15.1 1.7',
  'M2.2 7.9c2.2 1.3 3.6 3 4.9 5.5C8.5 8.5 11.4 4.5 15.3 2.1',
]

export function InkTick({ variant = 0, className = '' }: { variant?: number; className?: string }) {
  return (
    <svg viewBox="0 0 17 16" width="15" height="14" fill="none" className={className} aria-hidden="true">
      <path
        d={TICKS[variant % TICKS.length]}
        stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}

/** A rough underline with a second, lighter pass — like someone went over it
 *  twice. */
export function Underscore({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 14" fill="none" preserveAspectRatio="none" className={className} aria-hidden="true">
      <path d="M3 7c34-4 78-5 118-4 30 1 55 3 76 5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M12 11c40-3 92-4 138-2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
    </svg>
  )
}
