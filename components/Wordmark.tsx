/** The brand lockup, rendered from supplied artwork.
 *
 *  The source file was 1983x793 with a solid black background and no alpha —
 *  80% of it dead space, and dropping it straight onto the page would have shown
 *  a black rectangle against the #0B0A0F ground. The asset in public/brand is
 *  cropped to the artwork and converted to real transparency: the logo is
 *  glow-on-black, i.e. purely additive, so max(r,g,b) is the coverage and the
 *  colour is unpremultiplied back out. It composites correctly over any
 *  background rather than only over black.
 *
 *  Sized by height — callers pass an `h-*` class and the width follows from the
 *  8.08:1 aspect. The width/height attributes are the intrinsic pixel size, kept
 *  so the browser reserves the right box before the image loads instead of
 *  reflowing the header.
 *
 *  To swap in a new logo later: replace public/brand/bracketrunner-logo.png and,
 *  if the proportions change, update LOGO_W/LOGO_H here. app/icon.svg (the tab
 *  icon) is separate and drawn by hand — update it too if the mark changes. */

const LOGO_W = 800
const LOGO_H = 99

export default function Wordmark({ className = '' }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/bracketrunner-logo.png"
      alt="BracketRunner"
      width={LOGO_W}
      height={LOGO_H}
      className={`w-auto shrink-0 select-none ${className}`}
    />
  )
}
