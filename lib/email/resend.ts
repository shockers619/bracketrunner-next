import type { EmailMessage, EmailProvider, EmailSendResult } from './types'

/**
 * Minimal Resend client over the REST API
 * (https://resend.com/docs/api-reference/emails/send-email) using fetch — no
 * SDK dependency, so swapping providers later means writing one more class
 * against the EmailProvider interface, nothing else.
 */
export class ResendProvider implements EmailProvider {
  readonly name = 'resend'
  constructor(private apiKey: string) {}

  async send(message: EmailMessage, from: string): Promise<EmailSendResult> {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to: Array.isArray(message.to) ? message.to : [message.to],
          subject: message.subject,
          html: message.html,
          text: message.text,
          reply_to: message.replyTo,
        }),
      })

      if (!res.ok) {
        const body = await res.text()
        return { id: null, delivered: false, error: `Resend responded ${res.status}: ${body}` }
      }
      const data = (await res.json()) as { id?: string }
      return { id: data.id ?? null, delivered: true }
    } catch (err) {
      return { id: null, delivered: false, error: (err as Error).message }
    }
  }
}
