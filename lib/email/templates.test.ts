import { describe, it, expect } from 'vitest'
import { eventPublishedEmail, directorInviteEmail, notificationEmail } from './templates'

describe('email templates', () => {
  it('eventPublishedEmail includes the title and public URL in both html and text', () => {
    const email = eventPublishedEmail({
      recipientName: 'Sam',
      eventTitle: 'Spring Slam 2026',
      publicUrl: 'https://bracketrunner.com/spring-slam',
    })
    expect(email.subject).toContain('Spring Slam 2026')
    expect(email.html).toContain('Spring Slam 2026')
    expect(email.html).toContain('https://bracketrunner.com/spring-slam')
    expect(email.html).toContain('Hi Sam,')
    expect(email.text).toContain('https://bracketrunner.com/spring-slam')
  })

  it('eventPublishedEmail falls back to a generic greeting without a name', () => {
    const email = eventPublishedEmail({ eventTitle: 'Cup', publicUrl: 'https://x.co/cup' })
    expect(email.html).toContain('Hi,')
  })

  it('directorInviteEmail includes org and invite link', () => {
    const email = directorInviteEmail({
      orgName: 'Elite Hoops',
      inviteUrl: 'https://bracketrunner.com/invite/abc',
      inviterName: 'Jordan',
    })
    expect(email.subject).toContain('Elite Hoops')
    expect(email.html).toContain('Jordan')
    expect(email.html).toContain('https://bracketrunner.com/invite/abc')
  })

  it('escapes HTML in user-supplied values to prevent injection', () => {
    const email = notificationEmail({
      subject: 'Heads up',
      heading: 'Alert',
      body: 'Watch out <script>alert(1)</script> & stay safe',
    })
    expect(email.html).not.toContain('<script>alert(1)</script>')
    expect(email.html).toContain('&lt;script&gt;')
    expect(email.html).toContain('&amp;')
  })

  it('notificationEmail renders an optional CTA button and text link', () => {
    const withCta = notificationEmail({
      subject: 'S', heading: 'H', body: 'B',
      cta: { label: 'Open', url: 'https://bracketrunner.com/x' },
    })
    expect(withCta.html).toContain('https://bracketrunner.com/x')
    expect(withCta.text).toContain('Open: https://bracketrunner.com/x')

    const withoutCta = notificationEmail({ subject: 'S', heading: 'H', body: 'B' })
    expect(withoutCta.html).not.toContain('<a href')
  })
})
