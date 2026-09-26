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

## 5. Admin dashboard
- New private admin area at /admin with an email + password sign-in page.
- fegokendigital@gmail.com is the super admin (only after that email is verified). Super admin can add or remove other admins.
- Layout like your reference: side menu, summary cards at the top (total enrolments, revenue, paid vs pending, early-bird sales), a revenue-over-time chart, a "top referral codes" table, and a pie chart of who is enrolling (career switcher, graduate, etc.).
- Enrolments page: searchable, filterable list (by plan, status, referral code, date) with CSV export.
- Referrals page: each code with sign-ups and money collected, for working out commissions.
- Instalments page: who has paid which month and who is due.
- Uses your brand purple, green and Poppins, light look.

## 6. Check it works
- Make a test payment, confirm the record shows "paid" in Supabase and in the admin dashboard, and the email arrives.

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
- Admin: `app_role` enum (`super_admin`, `admin`), `user_roles` table + `has_role` security-definer fn; trigger on auth.users grants `super_admin` to fegokendigital@gmail.com only when `email_confirmed_at` is set (insert + confirm update). Enrolments get SELECT/UPDATE policies for admins via `has_role`. Admin routes under `src/routes/_authenticated/admin/*`, `/auth` sign-in page; data via `requireSupabaseAuth` server fns with role check; `attachSupabaseAuth` added to `src/start.ts` functionMiddleware. Charts with recharts. Email sign-in must be enabled in the Supabase dashboard (external project).
- Needed from you: Resend key, sender address/domain, WhatsApp group link, Flutterwave keys (entered via secure form).
