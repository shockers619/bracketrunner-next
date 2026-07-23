'use client'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'

export interface SelectOption {
  value: string
  label: string
}

/**
 * Replaces native <select>. The collapsed box on a native select can be
 * themed with CSS, but the OPEN option list is rendered by the OS/browser
 * chrome itself — that's why the old dropdowns looked like a plain system
 * menu no matter what CSS was thrown at them. This renders the whole
 * thing (trigger + option list) as normal DOM, so it actually matches the
 * app's dark glass cards, brand accent, and motion language.
 *
 * The option list is rendered through a PORTAL into document.body, not as
 * a normal absolutely-positioned child. Reason: every `.card` on this app
 * uses `backdrop-filter`, and that CSS property has a side effect that's
 * easy to miss — it creates its own stacking context. A dropdown living
 * inside one card can't float above a LATER sibling card no matter how
 * high its z-index is, because z-index only competes within the nearest
 * stacking context, not globally. The symptom was a dropdown that visibly
 * had 3 options in the DOM but looked like it only had 1 — the other two
 * were being painted over by the next card section. Portaling to
 * document.body sidesteps the whole stacking-context problem: the list
 * isn't inside any card's layout anymore, so nothing can cover it.
 */
export default function Select({
  value, onChange, options, placeholder = 'Select…', disabled,
}: {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selected = options.find(o => o.value === value)

  useEffect(() => setMounted(true), [])

  // Recompute position every time it opens (covers the case where the
  // page scrolled or the trigger moved between opens).
  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return
    const r = triggerRef.current.getBoundingClientRect()
    setRect({ top: r.bottom + 6, left: r.left, width: r.width })
  }, [open])

  useEffect(() => {
    if (!open) return
    function handlePointer(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target)) return
      if (listRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    // Closing on scroll/resize is simpler and more robust than trying to
    // keep a portaled panel glued to its trigger through every possible
    // scroll container — good enough for a form control like this.
    function handleScrollOrResize() { setOpen(false) }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    window.addEventListener('scroll', handleScrollOrResize, true)
    window.addEventListener('resize', handleScrollOrResize)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
      window.removeEventListener('scroll', handleScrollOrResize, true)
      window.removeEventListener('resize', handleScrollOrResize)
    }
  }, [open])

  return (
    <div style={{ position: 'relative' }}>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '10px 12px',
          fontSize: '13px',
          textAlign: 'left',
          borderRadius: '8px',
          border: `1px solid ${open ? 'var(--accent)' : 'var(--line)'}`,
          background: open ? 'rgba(14, 165, 233, 0.06)' : 'rgba(255, 255, 255, 0.03)',
          color: selected ? 'var(--ink)' : 'rgba(245, 246, 247, 0.35)',
          boxShadow: open ? '0 0 0 3px rgba(14, 165, 233, 0.15)' : 'none',
          opacity: disabled ? 0.5 : 1,
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'border-color 0.15s ease, background 0.15s ease',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label || placeholder}
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}>
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
        </svg>
      </button>

      {mounted && open && rect && createPortal(
        <div
          ref={listRef}
          role="listbox"
          style={{
            position: 'fixed',
            top: rect.top,
            left: rect.left,
            width: rect.width,
            zIndex: 1000,
            maxHeight: '280px',
            overflowY: 'auto',
            background: 'var(--surface-solid)',
            backdropFilter: 'blur(16px)',
            border: '1px solid var(--line-strong)',
            borderRadius: '10px',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
            padding: '4px',
            animation: 'modalIn 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {options.length === 0 && (
            <div style={{ padding: '10px 12px', fontSize: '13px', color: 'var(--ink-muted)' }}>No options</div>
          )}
          {options.map(opt => {
            const isSelected = opt.value === value
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => { onChange(opt.value); setOpen(false) }}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '9px 10px',
                  fontSize: '13px',
                  textAlign: 'left',
                  borderRadius: '6px',
                  background: isSelected ? 'rgba(14, 165, 233, 0.12)' : 'transparent',
                  color: isSelected ? 'var(--ink)' : 'rgba(245, 246, 247, 0.85)',
                  fontWeight: isSelected ? 600 : 400,
                }}
                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
              >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{opt.label}</span>
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, color: 'var(--accent)' }}>
                    <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </div>
  )
}
