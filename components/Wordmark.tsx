/** The brand lockup: the favicon's bracket glyph, the wordmark, then the same
 *  glyph mirrored. Both marks' stems point inward at the name.
 *
 *  The path here is character-for-character the one in app/icon.svg, and the
 *  stroke is ember-500 in both — if either changes, change both, or the tab icon
 *  and the logo drift apart. The viewBox is cropped to the glyph (the icon
 *  file's is 32x32 because a favicon needs the rounded background plate; a logo
 *  on the page does not).
 *
 *  Sized in `em` and painted with `currentColor`, so the mark tracks whatever
 *  font-size and color the caller sets and never needs a second variant. */

function BracketMark({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      viewBox="5.5 8 21 16"
      aria-hidden="true"
      focusable="false"
      className="h-[0.78em] w-auto shrink-0 text-ember-500"
      style={flip ? { transform: 'scaleX(-1)' } : undefined}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 9.5h5.5v13H7" />
      <path d="M12.5 16H25" />
    </svg>
  )
}

export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-[0.36em] ${className}`}>
      <BracketMark />
      <span>
        Bracket<span className="text-ember-500">Runner</span>
      </span>
      <BracketMark flip />
    </span>
  )
}
