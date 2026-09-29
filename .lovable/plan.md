# Quick lead form on the early-bird price card

## What changes
- The early-bird card keeps its label, price and short intro line. The feature list and the "Continue to checkout" button are replaced by a short form:
  First name, Last name, Email, WhatsApp number, Country (dropdown, Nigeria first), Where did you hear about us (dropdown: Instagram, Facebook, LinkedIn, X/Twitter, TikTok, WhatsApp, Google, Friend/referral, Event, Other).
- Green "Get the details" button. After sending, the card shows a thank-you message with a small "Enrol now" link to checkout, so paying stays possible.
- Clear inline errors for missing name, bad email or a short WhatsApp number.

## Admin dashboard
- New **Leads** page in the admin menu: table of all leads (date, name, email, WhatsApp, country, source), search, date filter, and **Export CSV**.
- Leads are kept separate from enrolments, so revenue and enrolment totals don't change.

## Technical details
- New `leads` table (first_name, last_name, email, phone, country, source, mode, created_at); RLS: admins read only, no public access. Inserts go through a public server function `submitLead` (zod-validated, length limits, simple honeypot + per-email dedupe within 10 min) using the admin client.
- `SitePage.tsx` exposes `window.__npaLead`; app.js renders the form at line ~138 and handles a `data-form="lead"` submit.
- Admin: `getLeads` in `admin-tools.functions.ts` (requireAdmin), route `/_authenticated/admin/leads`, nav link in `admin.tsx`, CSV via existing `download` helper.
