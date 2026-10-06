# Email Centre, form confirmations and lead follow-ups

## Goal
One admin screen where you can track, preview, send, resend and bulk-send email. Every form on the site is saved, sorted into categories and confirmed to the visitor by email. Leads who don't pay can be followed up until they check out.

## 1. Admin: new "Emails" page
- **Sent log:** every email the system sends (receipts, reminders, form confirmations, ambassador notices, custom mails), with recipient, subject, type, date and status (sent / failed). You can search and filter it with the same toolbar the other pages use.
- **Open any email** to see exactly what was sent, then **Resend** it with one click.
- **Compose:** write a custom email (subject and message) using the branded template, **Preview** it before sending, then send to:
  - one person, or
  - a group: all ambassadors, all leads not yet paid, all paid students, a cohort, or monthly-plan students.
- Bulk sends go one by one, so nobody sees anyone else's address. You see a progress count and a list of any that failed.
- First bulk send: the **ambassador announcement** with each person's own code, link and commission rates (15% outright, 10% per confirmed monthly payment, read live from your Commissions settings).

## 2. Every form saved and categorised
Each submission is saved with a clear category so you can filter by it in the admin:
- Hero lead form, Checkout started, Free event sign-up, Student profile, Contact/other forms.
- New "Submissions" view (Leads page extended) shows all of them, newest first, with category filters and CSV export.

## 3. Automatic emails to visitors and students
- **Any form filled:** the visitor gets a "We've received your details" email straight away.
- **Successful payment:** the student gets a payment-confirmed email (receipt, plan, next steps, WhatsApp group link). This only goes out after payment is confirmed by Flutterwave, never on the redirect alone.
- All are logged in the Emails page and can be resent.

## 4. Lead follow-ups (not yet paid)
- Leads page shows a **Payment status** for each lead: "Not paid", "Checkout started" or "Paid", matched by email to confirmed payments.
- Filter "Not paid yet" to see who to chase, with phone/WhatsApp and email shown.
- **Send follow-up** button per lead, plus "Follow up all unpaid" for bulk. A lead is automatically removed from the follow-up list once their payment is confirmed, so paid students never get chased.
- Each lead shows how many follow-ups were sent and when, to avoid over-mailing.

## What I need from you
- Nothing to start. Optionally: preferred wording for the follow-up email; otherwise I'll write a friendly version for you to edit.

## Technical details
- New table `email_log` (to, subject, type, category, html, related_id, status, error, mode, sent_by, created_at); admin-only SELECT via `is_admin`, inserts server-side only. New `form_submissions` columns or category on `leads` (`category`, `followup_count`, `last_followup_at`).
- All sends go through one server helper wrapping `sendViaResend` (from `EMAIL_FROM` info@hello.npdacademy.com) that writes to `email_log`; existing receipt/reminder/auth sends switched to it.
- Admin server functions in `src/lib/emails.functions.ts`: listEmails, resendEmail, previewEmail, sendCustom, sendBulk (audience resolved server-side, never a recipient list from the browser), sendLeadFollowup. All require `requireAdmin`; bulk sends throttled to stay within Resend limits.
- Payment-confirmed email triggered inside `confirmPayment` (idempotent by enrolment id).
- Lead paid-status computed server-side by joining leads to paid enrolments on lower(email).
- New route `src/routes/_authenticated/admin.emails.tsx` + nav item; head meta set.
- Note: bulk/marketing sends use your own Resend account, as chosen.
