'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

const SIZES = ['Under 16 teams', '16–48 teams', '48–100 teams', '100+ teams', 'Multiple events a year']

export default function DemoRequestForm() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [organization, setOrganization] = useState('')
  const [sport, setSport] = useState('')
  const [eventSize, setEventSize] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    const { error: insertErr } = await supabase.from('demo_requests').insert({
      name: name.trim(),
      email: email.trim(),
      organization: organization.trim() || null,
      sport: sport.trim() || null,
      event_size: eventSize || null,
      message: message.trim() || null,
    })
    if (insertErr) {
      setError("That didn't go through. Email us directly at hello@bracketrunner.com and we'll pick it up from there.")
      setStatus('idle')
      return
    }
    setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-ember-500/30 bg-ember-500/[0.07] p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-ember-500">Request received</p>
        <h3 className="mt-3 text-2xl font-extrabold tracking-tight text-white">We&apos;ll be in touch shortly.</h3>
        <p className="mt-2 text-[15px] leading-relaxed text-white/60">
          Thanks{name ? `, ${name.split(' ')[0]}` : ''} — we read every one of these ourselves. Expect a reply within a
          business day, usually sooner.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mk-form mk-card mk-card-warm rounded-2xl p-6 sm:p-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Your name" required>
          <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Reyes" />
        </Field>
        <Field label="Email" required>
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@club.com" />
        </Field>
        <Field label="Club or organization">
          <input type="text" value={organization} onChange={e => setOrganization(e.target.value)} placeholder="Riverside Elite" />
        </Field>
        <Field label="Sport">
          <input type="text" value={sport} onChange={e => setSport(e.target.value)} placeholder="Basketball" />
        </Field>
      </div>

      <div className="mt-4">
        <label className="!mb-2 block text-[13px] font-semibold normal-case tracking-normal text-white/70">
          Typical event size
        </label>
        <div className="flex flex-wrap gap-2">
          {SIZES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setEventSize(s === eventSize ? '' : s)}
              className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
                eventSize === s
                  ? 'border-ember-500/50 bg-ember-500/15 text-ember-400'
                  : 'border-white/10 bg-white/[0.04] text-white/60 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <Field label="Anything we should know?">
          <textarea
            rows={3}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder="When's your next event? Anything your current software gets wrong?"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-300">{error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'sending'}
        className="mt-6 w-full mk-glow rounded-xl bg-ember-500 px-6 py-4 text-[15px] font-bold text-obsidian-950 transition-all duration-150 hover:-translate-y-0.5 hover:bg-ember-400 disabled:opacity-50"
      >
        {status === 'sending' ? 'Sending…' : 'Send this over'}
      </button>
      <p className="mt-3 text-center text-xs text-white/40">No spam, no automated drip — a real person reads this and replies.
      </p>
    </form>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="!mb-2 block text-[13px] font-semibold normal-case tracking-normal text-white/70">
        {label}{required && <span className="text-ember-500"> *</span>}
      </label>
      {children}
    </div>
  )
}
