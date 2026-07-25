// Crisp line icons for the bento card headers. Stroke-based and inherit
// currentColor so the warm cards tint them automatically.

const base = {
  width: 19,
  height: 19,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
}

/** Stacked layers — many event formats. */
export function FormatsIcon() {
  return (
    <svg {...base}>
      <path d="M12 3 3 7.5l9 4.5 9-4.5L12 3Z" />
      <path d="M3 12.5 12 17l9-4.5" />
      <path d="M3 17 12 21.5 21 17" />
    </svg>
  )
}

/** Wi-Fi with a slash — scores survive a dead connection. */
export function OfflineIcon() {
  return (
    <svg {...base}>
      <path d="M2 8.5a15.5 15.5 0 0 1 8-3.4" />
      <path d="M14.5 5.4A15.5 15.5 0 0 1 22 8.5" />
      <path d="M5.5 12.3a10.5 10.5 0 0 1 3.4-2" />
      <path d="M15.5 10.5a10.5 10.5 0 0 1 3 1.8" />
      <path d="M9 15.8a5 5 0 0 1 6 0" />
      <path d="M12 19.5h.01" />
      <path d="m3 3 18 18" />
    </svg>
  )
}

/** Crossed-out megaphone — zero ad clutter. */
export function NoAdsIcon() {
  return (
    <svg {...base}>
      <path d="M4 10v4a1 1 0 0 0 1 1h2.5L14 19V5L7.5 9H5a1 1 0 0 0-1 1Z" />
      <path d="M18 9.5a4 4 0 0 1 0 5" />
      <path d="m3 3 18 18" />
    </svg>
  )
}

/** Calendar with a clock — courts, times and rest solved ahead. */
export function ScheduleIcon() {
  return (
    <svg {...base}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
      <circle cx="12" cy="15.5" r="3" />
      <path d="M12 14v1.6l1.1.9" />
    </svg>
  )
}

/** Hand holding a check — built and verified by a person. */
export function HandBuiltIcon() {
  return (
    <svg {...base}>
      <path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M12 10.5V4.5a1.5 1.5 0 0 1 3 0V11" />
      <path d="M15 10.5V6.5a1.5 1.5 0 0 1 3 0V14a7 7 0 0 1-7 7h-.5a6.5 6.5 0 0 1-6.5-6.5V12a1.5 1.5 0 0 1 3 0v2" />
    </svg>
  )
}

/** Link — a URL, not a login. */
export function LinkIcon() {
  return (
    <svg {...base}>
      <path d="M10 13.5a4 4 0 0 0 5.7.4l3-3a4 4 0 0 0-5.7-5.7l-1.7 1.7" />
      <path d="M14 10.5a4 4 0 0 0-5.7-.4l-3 3a4 4 0 0 0 5.7 5.7l1.7-1.7" />
    </svg>
  )
}
