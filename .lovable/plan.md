# Email all ambassadors their referral codes and links

## Goal
Every ambassador in the system (the 33 imported from your spreadsheet, plus any added since) receives a branded email with their personal referral code, their shareable link, and how commissions work.

## What ambassadors will receive
- From: Nerdy Pixels Academy <info@hello.npdacademy.com> (the verified sending address).
- Branded email matching the site: purple header with logo, green button, clean white layout.
- Personalised with their name, their code (e.g. `SARAH-X7K2`), and their link: `bootcamp.npdacademy.com/?ref=THEIR-CODE`.
- A short explanation: share the link, the code is pre-filled at checkout, and they earn a percentage of every confirmed payment (current rates: 15% of outright payments / 10% of each confirmed monthly payment, pulled live from your Commissions settings so the email always shows the real numbers).

## How it will be sent
1. A one-time send, run by me from the server side using your existing Resend key — no new screens or buttons needed unless you want to re-send later.
2. Each email is sent individually and personalised; no ambassador sees anyone else's details.
3. Only active ambassadors are emailed; anyone marked "Off" is skipped.
4. I'll report back exactly how many were sent and flag any addresses Resend rejects (invalid or bounced emails).

## Optional extra (say if you want it)
- An "Email ambassadors" button in /admin → Referrals so you can re-send this notification yourself anytime, to everyone or to one person.

## Technical details
- Reads `ambassadors` (name, email, code, active) server-side via the admin client; skips rows with no email.
- Sends via Resend `POST /emails` with `RESEND_API_KEY`, from `EMAIL_FROM` (info@hello.npdacademy.com), one call per ambassador with a small delay between sends.
- Template reuses the existing branded auth-email style in `src/lib/auth-emails.server.ts`; commission rates read from `app_settings` (`commission_outright_pct`, `commission_instalment_pct`).
- Runs as a server function invoked once (or a one-off server script), never from the browser; failures are collected and reported, not silently dropped.
