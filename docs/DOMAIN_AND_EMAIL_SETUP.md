# BracketRunner.com — domain & email cutover runbook

The code side is ready; this is the operational checklist for go-live. Steps
marked **(you)** require dashboard/registrar access and must be done by the
account owner — Claude can't and won't log in, create accounts, or enter
secrets. Claude produces exact values and code; you apply them.

## Confirmed configuration

- **Registrar / DNS:** Namecheap (default Namecheap BasicDNS — records go in the domain's **Advanced DNS** tab).
- **Hosting:** Vercel — currently live at `https://bracketrunner-next.vercel.app`.
- **Domains wanted:** both `bracketrunner.com` (apex) and `www.bracketrunner.com`.
- **Email:** Resend (sending only — no mailbox purchased; see the mailbox note in §3).

## 1. Domain → Vercel (Namecheap Advanced DNS)

- **(you)** Vercel → project → Settings → Domains → add `bracketrunner.com` **and** `www.bracketrunner.com`. Vercel shows "Invalid Configuration" with the exact records until DNS is set — **use Vercel's values if they differ from the table below.**
- **(you)** Namecheap → Domain List → **Manage** `bracketrunner.com` → **Advanced DNS**:
  - **Delete** the default parking records first: the `CNAME  www → parkingpage.namecheap.com` and any `URL Redirect Record` on `@`. (Leaving them breaks the setup.)
  - Add these Host Records:

    | Type | Host | Value | TTL |
    |---|---|---|---|
    | A Record | `@` | `76.76.21.21` | Automatic |
    | CNAME Record | `www` | `cname.vercel-dns.com.` | Automatic |

- **(you)** In Vercel, set `bracketrunner.com` as the primary domain (www will redirect to it).
- **SSL** is issued automatically by Vercel once DNS verifies (minutes, up to ~a couple hours). Nothing to configure.

## 2. Supabase auth URLs  **(you)**

Supabase → Auth → URL Configuration:
- **Site URL** → `https://bracketrunner.com`
- **Redirect allow-list** → add `https://bracketrunner.com/**` (must cover `/auth/callback`).

⚠️ Easy to forget and it silently breaks OAuth / email-confirmation redirects after cutover. Do it the moment DNS is live.

## 3. Transactional email (Resend)

### Mailbox note (important)

Sending from `bracketrunner.com` does **not** require an inbox. The "from"
address (`noreply@bracketrunner.com`) is a label; ownership is proved by DNS
(DKIM), not by a mailbox. So no email-hosting purchase is needed to launch.

- **Replies:** set `replyTo` to a real inbox (e.g. `kirbyrectify@gmail.com`) so
  replies reach you. The `sendEmail` message supports `replyTo`.
- **Optional free `info@`:** Namecheap offers free **email *forwarding*** —
  Domain → **Redirect Email / Mail Settings** → forward `info@bracketrunner.com`
  → `kirbyrectify@gmail.com`. That sets MX on the apex; it does **not** conflict
  with Resend, which uses a `send.` subdomain for bounces.

### Setup

- **(you)** Create a Resend account → **Add Domain** `bracketrunner.com`. Resend
  generates ~3 DNS records **unique to your domain** — Claude cannot pre-generate
  the DKIM key. Copy each into Namecheap Advanced DNS:
  - **MX** on the `send` subdomain (bounce handling) → Resend's value.
  - **TXT (SPF)** on `send` → typically `v=spf1 include:amazonses.com ~all`.
  - **TXT (DKIM)** at `resend._domainkey` → long `p=…` value from Resend.
- **(you)** Add a DMARC record (this exact value is a safe monitoring-mode start):

  | Type | Host | Value |
  |---|---|---|
  | TXT | `_dmarc` | `v=DMARC1; p=none; rua=mailto:kirbyrectify@gmail.com` |

- **(you)** Click **Verify** in Resend once records are saved (propagation: minutes).
- **(you)** Create a Resend API key; set env vars in Vercel (Production + Preview)
  and in `.env.local`:
  - `RESEND_API_KEY=…`
  - `EMAIL_FROM="BracketRunner <noreply@bracketrunner.com>"`
- Before verification completes, the code falls back to Resend's shared
  `onboarding@resend.dev` sender so you can test end to end immediately.

### App emails vs. Supabase auth emails

- **App transactional email** (event-published, invites, notifications) → `lib/email/` via Resend. Not wired into any flow yet — integration points below.
- **Auth emails** (confirm signup, password reset) are sent by **Supabase Auth's own SMTP**, not this module. To send those from `bracketrunner.com`, point Supabase → Auth → SMTP at Resend's SMTP credentials **(you)**. Keeping password resets in Supabase Auth (rather than reimplementing them) is deliberate.

## 4. Wiring email into the app (code — when you're ready)

`lib/email/` exposes `sendEmail(message)` plus templates
(`eventPublishedEmail`, `directorInviteEmail`, `notificationEmail`). It no-ops
with a warning until `RESEND_API_KEY` is set, so it's safe to call anywhere.
Natural first integration: send `eventPublishedEmail` from `app/api/intake/route.ts`
after a successful event insert. Left unwired for now so nothing sends
unexpectedly — flip it on deliberately.

## 5. Env var summary

See [`.env.example`](../.env.example). `NEXT_PUBLIC_*` is browser-exposed;
`RESEND_API_KEY` is server-only and must never be `NEXT_PUBLIC`.
