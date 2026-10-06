# Ambassador emails, delivery proof, and ambassadors as students

## Where things stand right now
- 38 active ambassadors, all with an email address.
- **No ambassador emails have been sent yet.** The email log has zero ambassador sends, so nobody has received their code yet.
- None of the 38 ambassadors has a student record yet, so they can't sign in to the student portal today.

## 1. Send every ambassador their own email, and prove it arrived
- When this is built, I send the ambassador email to all 38 once, each with their own code, link and current commission rates.
- From then on it's automatic: a new ambassador (added by an admin, or created when a student gets their code) gets their email straight away.
- **Delivery tracking:** each send stores Resend's message ID. The Emails page and the Referrals page then show the real status for each ambassador: Sent, Delivered, Bounced or Failed. A "Refresh delivery status" button checks Resend again.
- Afterwards I report back: how many were delivered and which, if any, bounced.

## 2. One-click resend
- Referrals page: **"Email all ambassadors"** sends everyone their code email again in one click, with a confirmation first.
- Each ambassador row gets a **Resend** button and shows its last email status and date.

## 3. Ambassadors become students automatically
- All 38 current ambassadors get a student record in the Digital Marketing Bootcamp (November 2026 cohort), marked as an **existing student**. It is kept out of revenue and commission totals.
- That lets them sign in at /student with their email (magic link) and see their referral code and link there.
- Any ambassador added later also gets a student record automatically.

## 4. Students become ambassadors automatically
- This already happens when an enrolled student opens their student portal: they get a code and are added to Ambassadors. I'll also do it **at the moment a payment is confirmed**, so every new paying student is an ambassador from day one.
- They then get the ambassador email with their code and link automatically.
- Wording across the admin: "Ambassadors are students who refer other students."

## Technical details
- `email_log`: add `provider_id` and `delivery_status` columns. `sendLogged` stores the Resend `id`. New admin fn `refreshDeliveryStatus` calls Resend `GET /emails/{id}` (`last_event`) for recent rows.
- New helper `sendAmbassadorEmail(ambassador)` in `email-log.server.ts`, called from `saveAmbassador` (insert), `myReferralCode` (new code), and `confirmPayment` (after the receipt, which creates the code if none exists). Each sends at most once per ambassador unless resent manually.
- New admin fns `emailAllAmbassadors` and `emailAmbassador(id)` in `referrals.functions.ts`, throttled about 2 per second.
- Backfill (a one-time data insert): `enrolments` rows for each ambassador email without one: `kind='enrolment'`, `status='existing'`, `source_type='imported'`, `amount=0`, open cohort id, `mode='live'`. Revenue, commission and instalment views already count only `status='paid'`. I'll check each of them still excludes these rows.
- `/student` record matching already uses verified email, so no new auth users are created. The magic link creates the account on first sign-in.
- The one-time send of all 38 runs after deploy, through the same server path, and is logged.
