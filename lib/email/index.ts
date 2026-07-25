import type { EmailMessage, EmailSendResult, EmailProvider } from './types'
import { ResendProvider } from './resend'

export type { EmailMessage, EmailSendResult } from './types'
export * from './templates'

// Server-only. `from` defaults to Resend's shared onboarding sender so the
// module works before a domain is verified; once bracketrunner.com is set up,
// set EMAIL_FROM to e.g. "BracketRunner <noreply@bracketrunner.com>".
const DEFAULT_FROM = process.env.EMAIL_FROM || 'BracketRunner <onboarding@resend.dev>'

export const isEmailConfigured = Boolean(process.env.RESEND_API_KEY)

function selectProvider(): EmailProvider | null {
  if (process.env.RESEND_API_KEY) return new ResendProvider(process.env.RESEND_API_KEY)
  return null
}

/**
 * Sends a transactional email. Mirrors lib/supabase.ts: if no provider is
 * configured it degrades loudly (a console warning) and returns
 * `{ skipped: true }` rather than throwing, so unconfigured dev/preview
 * environments never crash on an email attempt. Callers should treat a
 * non-delivered result as non-fatal for anything that isn't the email itself.
 */
export async function sendEmail(message: EmailMessage, from: string = DEFAULT_FROM): Promise<EmailSendResult> {
  const provider = selectProvider()
  if (!provider) {
    console.warn(
      `[bracketrunner] Email not sent — no provider configured (set RESEND_API_KEY). Subject: "${message.subject}"`
    )
    return { id: null, delivered: false, skipped: true }
  }
  return provider.send(message, from)
}
