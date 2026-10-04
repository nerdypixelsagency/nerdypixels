# Admins, referrals and admin redesign

## Where things stand
All five phases are built. Still waiting on you:
- Phase 1: a test payment in TEST mode, plus the cohort WhatsApp group link for the welcome email.
- Google Search Console verification and sitemap submission.
- Adding https://bootcamp.npdacademy.com/student to the Supabase redirect URLs.
- Redeploying Vercel so Google Analytics runs on bootcamp.npdacademy.com.

## 1. Hide the super admin from other admins
- On the Admins page, regular admins only see admins. The super admin row is hidden from them.
- The database enforces this too, so an admin can't see the super admin by any other route.

## 2. Make hayjay.okunolaa@gmail.com an admin with an invite email
- New "Invite admin" flow: the super admin types an email. If that person has no account yet, one is created and they get the admin role straight away.
- They get a branded email from info@npdacademy.com with a "Set your password" button. It opens the reset-password page, then takes them to /admin.
- After it's built, I'll run this for hayjay.okunolaa@gmail.com and confirm the email was sent.
- The "they must create an account first" note goes away.

## 3. Referral programme
Right now people can type a referral code at checkout, and the Referrals and Commissions pages track sign-ups, money collected and payouts by hand. Here is what I'd add:
- Ambassadors list: admins add ambassadors (name, email, phone, code, commission %). Typed-in codes are matched to an ambassador, and unknown codes are flagged.
- Commission worked out automatically for each ambassador: amount earned, amount paid out, and balance owed.
- Code check at checkout: "Code applied, referred by ..." or "Code not recognised".
- Shareable referral links (for example /?ref=CODE). The code is saved and filled in at checkout for you.
- Optional later: an ambassador email that shows each person their own sign-ups.

## 4. Upgrade the admin area
Give every admin page the same premium standard as the public site:
- A shared page header with a title, short subtitle and actions. Uniform stat cards with icons. Better tables: sticky header, row hover, status pills, empty states and loading skeletons.
- Fix the low-contrast "View all enrolments" button (dark text on purple in your screenshot).
- Tighten the sidebar and make it work on mobile, with a slide-in menu.
- Apply all of this to Dashboard, Enrolments, Enrolment details, Leads, Referrals, Instalments, Commissions, Add student, Admins, and the sign-in and reset pages.
- Brand purple and green, Poppins font, light look. No changes to data or features.

## Technical details
- Migration: replace the user_roles SELECT policy with `user_id = auth.uid() OR has_role(auth.uid(),'super_admin') OR (is_admin(auth.uid()) AND role <> 'super_admin')`. listAdmins also filters out super_admin for non-super callers.
- addAdmin: if no user is found, `supabaseAdmin.auth.admin.createUser({ email, email_confirm: true })`, upsert the role, then `generateLink({type:'recovery'})` and send a new "admin invite" template through Resend (auth-emails.server.ts), redirecting to /reset-password then /admin.
- Referrals: a new `ambassadors` table (admin-only RLS and grants); a public server function that validates a code and returns the ambassador's first name only; app.js reads `?ref=` into localStorage and pre-fills checkout.
- Admin UI: rework admin.css tokens and components, plus shared PageHeader, StatCard and EmptyState components.
