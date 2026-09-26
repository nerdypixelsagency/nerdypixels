# Next phases for Nerdy Pixels Academy

The admin area works on the live site. Here is what's left, in the order that matters most before the cohort starts on 5 November.

## Phase 1: Confirm payments work end to end (you, about 15 minutes)
- Switch Payments to TEST in the admin area and pay with a Flutterwave test card.
- Check that the enrolment shows "Paid", the welcome email arrives from info@npdacademy.com, and the referral code shows up on the Referrals page.
- Switch back to LIVE.
- Send me the cohort WhatsApp group link so the welcome email includes it.

## Phase 2: Instalment reminders and receipts
- Automatic reminder emails 5 days, 1 day and on the day each monthly payment is due (the 1st), each with a "Pay now" button.
- A "missed payment" email 3 days after the due date, and an "Overdue" flag on the Instalments page.
- A receipt email for every instalment paid.
- A "Send reminder" button next to each student on the Instalments page.

## Phase 3: Get found on Google
- Make every page (home, bootcamp, events, checkout, contact) readable by Google, with its own title, description and share preview.
- Add a sitemap and Google Search Console setup so the site gets indexed.
- Tidy up how links to the site look when shared on WhatsApp and social media.

## Phase 4: Admin tools
- Enrolment details page: notes, resend the welcome email, mark as refunded.
- Manually add offline or bank-transfer students.
- Referral commission report: amount owed per ambassador, with a "mark as paid out" button.
- Daily summary email to the super admin (new sign-ups, money received, payments due).

## Phase 5: Student experience (optional)
- A simple student login to see payment history and pay the next instalment.
- Cohort countdown and early-bird deadline banner on the home page (the countdown you left out earlier, only if you want it now).

## Technical details
- Phase 2: a scheduled job calls a protected public endpoint once a day; reminders are tracked per enrolment and month so nobody gets the same email twice; emails go through Resend.
- Phase 3: move key page content into real server-rendered pages with per-page head metadata, keeping the existing site design; add sitemap.xml.
- Phase 4: new admin-only server functions; a commission payouts table with admin-only access.
