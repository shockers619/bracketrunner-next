export interface EmailMessage {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}

export interface EmailSendResult {
  /** Provider message id when delivered, else null. */
  id: string | null
  delivered: boolean
  /** true when no provider was configured, so nothing was sent (not an error). */
  skipped?: boolean
  error?: string
}

export interface EmailProvider {
  readonly name: string
  send(message: EmailMessage, from: string): Promise<EmailSendResult>
}
