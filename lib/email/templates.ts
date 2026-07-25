// Pure email templates — no side effects, no provider coupling, so they're
// trivially unit-testable. Each returns a subject plus HTML and plaintext
// bodies. Styles are inlined because email clients strip <style> blocks and
// don't reliably support dark mode; keep everything light-on-light.

export interface RenderedEmail {
  subject: string
  html: string
  text: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function layout(headingHtml: string, bodyHtml: string, cta?: { label: string; url: string }): string {
  const button = cta
    ? `<tr><td style="padding-top:8px;">
         <a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;padding:11px 20px;border-radius:8px;">${escapeHtml(cta.label)}</a>
       </td></tr>`
    : ''
  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:12px;padding:32px;border:1px solid #e4e4e7;">
          <tr><td style="font-weight:800;font-size:18px;color:#4f46e5;padding-bottom:16px;">BracketRunner</td></tr>
          <tr><td style="font-size:20px;font-weight:700;color:#18181b;padding-bottom:12px;">${headingHtml}</td></tr>
          <tr><td style="font-size:14px;line-height:1.6;color:#3f3f46;">${bodyHtml}</td></tr>
          ${button}
        </table>
        <p style="font-size:12px;color:#a1a1aa;margin-top:16px;">BracketRunner · tournament management</p>
      </td></tr>
    </table>
  </body>
</html>`
}

/** Sent to a director when their event's public page goes live. */
export function eventPublishedEmail(args: {
  recipientName?: string
  eventTitle: string
  publicUrl: string
}): RenderedEmail {
  const greeting = args.recipientName ? `Hi ${escapeHtml(args.recipientName)},` : 'Hi,'
  const title = escapeHtml(args.eventTitle)
  return {
    subject: `${args.eventTitle} is live on BracketRunner`,
    html: layout(
      'Your event is live',
      `<p style="margin:0 0 12px;">${greeting}</p>
       <p style="margin:0 0 12px;"><strong>${title}</strong> is published. Share the link below — brackets, schedules, and scores update live as the event runs.</p>
       <p style="margin:0;color:#71717a;word-break:break-all;">${escapeHtml(args.publicUrl)}</p>`,
      { label: 'View event page', url: args.publicUrl }
    ),
    text: `${greeting}\n\n${args.eventTitle} is live on BracketRunner.\n\nShare this link — it updates live as the event runs:\n${args.publicUrl}\n\n— BracketRunner`,
  }
}

/** Sent to invite someone to help run a tenant/organization. */
export function directorInviteEmail(args: {
  orgName: string
  inviteUrl: string
  inviterName?: string
}): RenderedEmail {
  const inviter = args.inviterName ? escapeHtml(args.inviterName) : 'A colleague'
  const org = escapeHtml(args.orgName)
  return {
    subject: `You're invited to help run ${args.orgName} on BracketRunner`,
    html: layout(
      `Join ${org} on BracketRunner`,
      `<p style="margin:0 0 12px;">${inviter} invited you to help run <strong>${org}</strong>'s tournaments on BracketRunner.</p>
       <p style="margin:0;">Accept the invite to get started.</p>`,
      { label: 'Accept invite', url: args.inviteUrl }
    ),
    text: `${inviter} invited you to help run ${args.orgName} on BracketRunner.\n\nAccept the invite:\n${args.inviteUrl}\n\n— BracketRunner`,
  }
}

/** Generic branded notification, for one-off operational messages. */
export function notificationEmail(args: {
  subject: string
  heading: string
  body: string
  cta?: { label: string; url: string }
}): RenderedEmail {
  return {
    subject: args.subject,
    html: layout(escapeHtml(args.heading), `<p style="margin:0;">${escapeHtml(args.body)}</p>`, args.cta),
    text: `${args.heading}\n\n${args.body}${args.cta ? `\n\n${args.cta.label}: ${args.cta.url}` : ''}\n\n— BracketRunner`,
  }
}
