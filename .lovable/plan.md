# Admins, referrals, cohorts and admin redesign

## Where things stand
All five phases are built. Still waiting on you:
- Phase 1: a test payment in TEST mode, plus the cohort WhatsApp group link for the welcome email.
- Google Search Console verification and sitemap submission.
- Adding https://bootcamp.npdacademy.com/student to the Supabase redirect URLs.
- Redeploying Vercel so Google Analytics runs on bootcamp.npdacademy.com.

## 1. Hide the super admin from other admins
- On the Admins page, regular admins only see admins. The super admin row is hidden from them.
- The database enforces this too, so an admin can't see the super admin by any other route.

## 2. Invite hayjay.okunolaa@gmail.com as admin
- New "Invite admin" flow: the super admin types an email. If that person has no account yet, one is created and they get the admin role straight away.
- They get a branded email from info@npdacademy.com with a "Set your password" button. It opens the reset-password page, then takes them to /admin.
- After it's built, I'll run this for hayjay.okunolaa@gmail.com and confirm the email was sent.
- The "they must create an account first" note goes away.

## 3. Referral programme, automated (your spreadsheet becomes the system)
Your file has 33 ambassadors, each with a unique code (like RUTH-FH9W). The site replaces the manual spreadsheet:
- Import all 33 ambassadors (name, email, code) into the admin area. Admins can add more later.
- Shareable links that work: bootcamp.npdacademy.com/?ref=CODE. The code is remembered and filled in at checkout automatically.
- Checkout checks the code live: "Code applied — referred by Ruth" or "Code not recognised".
- New students get their own referral code and link in their student profile (/student), ready to share — every student can become an ambassador automatically.

## 4. Commissions — percentage of confirmed payments only
- Commission is a percentage of the fee, calculated only on payments confirmed paid (verified by Flutterwave or marked paid by an admin). Pending, failed or refunded payments earn nothing.
- Two rates you control in admin: one % for outright (pay-once) payments, one % for instalment payments.
- Instalment commission is earned as each monthly payment is actually confirmed — you never owe commission on money not yet received.
- Per ambassador: sign-ups, confirmed revenue, commission earned, paid out, and balance owed — all automatic. The Commissions page keeps its "mark as paid out" button, now with ambassador names.

## 5. Cohorts and courses
- A new "Cohorts" admin page: create a cohort (name, course, start/end dates, WhatsApp group link, status: open/closed).
- Enrolments are tagged to a cohort. The welcome email pulls the cohort's dates and WhatsApp link automatically — no more hardcoded links.
- The current November 2026 bootcamp becomes the first cohort. Future courses/cohorts reuse the same checkout and emails.

## 6. Import existing students
- Send me the Excel file of existing students (this referral file only has ambassadors). I'll import them as paid/manual enrolments in the right cohort, so reminders, receipts and the student portal work for them too.

## 7. Student account (already built, now connected)
- Students already sign in at /student with an email link to see payments and pay the next instalment. With cohorts and imported students, their portal shows their cohort, payment history, next due payment — and their personal referral link.

## 8. Upgrade the admin area
Give every admin page the same premium standard as the public site:
- A shared page header with a title, short subtitle and actions. Uniform stat cards with icons. Better tables: sticky header, row hover, status pills, empty states and loading skeletons.
- Fix the low-contrast "View all enrolments" button (dark text on purple in your screenshot).
- Tighten the sidebar and make it work on mobile, with a slide-in menu.
- Apply to Dashboard, Enrolments, Enrolment details, Leads, Referrals, Instalments, Commissions, Cohorts, Add student, Admins, and the sign-in and reset pages.
- Brand purple and green, Poppins font, light look. No changes to data or features.

## Technical details
- Migration 1: user_roles SELECT policy becomes `user_id = auth.uid() OR has_role(auth.uid(),'super_admin') OR (is_admin(auth.uid()) AND role <> 'super_admin')`; listAdmins filters super_admin for non-super callers.
- Migration 2: `ambassadors` (name, email, code unique, source: imported|student, active) and `cohorts` (name, course, dates, whatsapp_link, status) with admin-only RLS + grants; enrolments gain `cohort_id`; app_settings gain `commission_outright_pct` and `commission_instalment_pct`.
- addAdmin: if no user exists, `supabaseAdmin.auth.admin.createUser({email, email_confirm:true})`, upsert role, `generateLink({type:'recovery'})`, send a new "admin invite" Resend template.
- Referrals: import the 33 codes via run_sql; public server fn validates a code and returns the ambassador's first name only; app.js stores `?ref=` in localStorage and pre-fills checkout; on first confirmed payment a student gets an auto-generated ambassador code (NAME-XXXX pattern like your sheet).
- Commissions: getCommissions joins ambassadors, filters `status='paid'` only, applies outright % to pay-once rows and instalment % to paid instalment rows.
- Admin UI: rework admin.css tokens plus shared PageHeader/StatCard/EmptyState components.
