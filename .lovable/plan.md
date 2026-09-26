# Plan: Audit fixes, enrolment tracking and welcome emails

## 1. Content and page fixes
- Move the certification badge from Module 8 (Growth & Career Launch) to Module 4 (SEO).
- Add "Others" to the "Which best describes you?" dropdown at checkout.
- Change the early-bird deadline to 10th October, 2026 everywhere: the top banner, the countdown, and the price copy ("Save 50% ₦60,000 when you pay once before 10th October, 2026").
- Change the instalment copy to "equal monthly payments, due on the 1st of every month".
- Point "Complete your student profile" to the Google Form: https://forms.gle/9Yt5Pa5kT5F19MYN8

## 2. Save every enrolment centrally (Supabase)
- New enrolments list holding: name, email, phone, persona, plan (pay once or instalment), amount, referral code, status, date.
- Checkout and free-event sign-ups save a record there, in addition to what the browser keeps today.
- Public visitors can only add records, never read them. You view, filter and export them in the Supabase dashboard (for example, filter by referral code to work out commissions by hand).

## 3. Welcome emails (Resend)
- Save your Resend key securely (a secure form will open for it).
- After an enrolment is saved, send a welcome email with: plan and amount, cohort dates, the WhatsApp group link and the Google profile form link.
- Emails are sent from your verified Resend domain. Until it is verified, only test sends to your own address will work.

## 4. Real payments with Flutterwave
- Save your Flutterwave keys securely (secret key, public key, and a webhook secret hash).
- At checkout, "Pay" opens Flutterwave's payment page (card, bank transfer, USSD) for the exact amount: pay once, or the first instalment.
- Flutterwave tells the site when a payment succeeds. Only then is the enrolment marked "paid" and the welcome email sent.
- The referral code is attached to each payment so it also shows on your Flutterwave receipts.
- "Pay an instalment" uses the same flow for later monthly payments.
- Test with Flutterwave's test keys first, then switch to live keys.

## 5. Check it works
- Make a test payment, confirm the record shows "paid" in Supabase and the email arrives.

## Not included this round
- Instalment reminder emails (needs a scheduled job; can follow).
- SEO fix for search engines (crawlable page content). Planned as a separate step.
- Logo swap. Waiting on a new logo file if you have one.

## Technical details
- `src/site/app.js`: edit MODULES cert flags, persona options, EARLY_END (`2026-10-10T23:59:59+01:00`), copy, onboarding link; call a bridge function (`window.__submitEnrolment`) on checkout/registration.
- Migration: `public.enrolments` table with grants to anon (insert only) and service_role, RLS enabled, insert-only anon policy with basic validation, updated_at trigger.
- `src/lib/enrolments.functions.ts`: public `createServerFn` validating input with zod, inserting the row, then sending via Resend REST API using `RESEND_API_KEY` read inside the handler; email failure does not block enrolment.
- `src/routes/index.tsx` wires the bridge from the plain JS bundle to the server function.
- Flutterwave: server fn creates a Standard checkout (`POST /v3/payments`) with `tx_ref` = enrolment id, amount set server-side from plan (never trusted from browser), meta includes referral code; redirect back to `#/checkout?tx_ref=...`. Server route `/api/public/flutterwave-webhook` verifies the `verif-hash` header against `FLW_SECRET_HASH`, re-verifies via `GET /v3/transactions/:id/verify` (amount + currency NGN), marks row paid, then sends the Resend email. Secrets: `FLW_SECRET_KEY`, `FLW_PUBLIC_KEY`, `FLW_SECRET_HASH`.
- Needed from you: Resend key, sender address/domain, WhatsApp group link, Flutterwave keys (entered via secure form).
