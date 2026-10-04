# Admin Settings, Course CMS, and Read-only User Preview

## Goal
Turn the admin area into the source of truth for payment mode, courses, cohorts, offers, countdowns, and the public course experience—while giving admins a safe way to preview what guests and individual students see.

## What will change

### 1. Add a dedicated Settings page
- Add **Settings** to the admin navigation.
- Move the LIVE/TEST payment switch from the top bar into a clear **Payment settings** section.
- Keep the current payment mode visible as a compact, read-only status in the admin header and retain the TEST-mode warning.
- Keep payment-mode changes restricted to the super admin, matching the current server and database protections.
- Add grouped settings for global site details that are not tied to one course or cohort.

### 2. Build a course and cohort CMS
- Introduce a proper course record rather than relying only on the free-text course name currently stored on cohorts.
- Let admins create and edit courses, then connect each cohort to a course.
- Let admins manage each cohort’s public-facing content:
  - course and cohort name
  - headline and offer label
  - early-bird enabled/disabled
  - early-bird price and deadline/countdown
  - outright and instalment payment copy and amounts
  - start/end dates and WhatsApp link
  - open/closed status
- Allow early-bird payment to be removed completely from an individual cohort. When disabled or expired, it disappears from the public offer and checkout and cannot be selected through a crafted URL.
- Preserve existing cohort and enrolment records during the upgrade, including the November 2026 cohort.

### 3. Wire the CMS to the full public experience
- Load the active course/cohort configuration before the public page is rendered, using the same server-first pattern already used for WordPress content.
- Use one settings payload across the announcement bar, countdown, course page, pricing cards, checkout, payment policy/FAQ copy, student instalment display, payment creation, receipts, and welcome emails.
- Make server-side payment calculation use the same saved cohort prices and offer availability shown publicly; browser-provided amounts or stale early-bird links will never determine the charge.
- Keep reliable fallback values so the site remains available if settings cannot be loaded.
- Update page metadata and structured course/offer data from the active configuration so search previews do not contradict the page.

### 4. Add safe “View as” previews
- Add a **View as** control for both admins and the super admin.
- Provide two preview choices:
  - **Guest / prospective student:** opens the public enrolment journey using the active cohort configuration.
  - **Student:** select an existing enrolment and render that student’s dashboard and payment history in a clearly labelled preview.
- Keep previews read-only: no session swap, generated login link, payment, email, record update, referral creation, or form submission.
- Keep the administrator signed in as themselves at all times and add a persistent preview banner with an obvious exit action.
- Record student-preview access in an audit log with the administrator, target enrolment, and timestamp.

### 5. Fix the footer brand mark
- Preserve the logo’s natural aspect ratio instead of forcing mismatched width and height.
- Align it consistently with the footer content on desktop and mobile.
- Verify that the footer does not stretch, clip, or shift across common viewport sizes.

## Admin permissions
- **Super admin:** can change payment mode and all commercial/global settings.
- **Admin and super admin:** can manage courses/cohorts and use read-only previews.
- Existing database-enforced role checks remain in place; preview endpoints receive their own admin checks and expose only the selected read-only data.

## Technical details
- Extend the database with a `courses` table, cohort-to-course relationship, cohort offer/payment fields, and an admin preview audit table. Every new table will include explicit grants and row-level security policies in the same migration.
- Continue using the existing `app_settings` table for global settings such as payment mode; course/cohort commercial content belongs on course/cohort records.
- Add validated authenticated server functions for CMS editing and student preview, plus a minimal public settings reader that returns only safe published fields.
- Refactor the student dashboard into reusable display components so live student view and admin preview stay visually consistent while preview actions remain disabled.
- Preserve the existing server-side Flutterwave verification flow, referral calculation rules, analytics safeguards, and WordPress integration.

## Verification
- Confirm super admin can change LIVE/TEST mode from Settings and a regular admin cannot.
- Create/edit a course and cohort, then verify every changed headline, countdown, price, and payment message appears on the public pages after refresh and during navigation.
- Disable early bird for one cohort and verify it is absent from the site and rejected by direct checkout/payment requests.
- Confirm displayed totals equal the amount the server sends to Flutterwave in both payment modes.
- Preview guest and student experiences as both admin roles; confirm the target user session never replaces the administrator session and all state-changing actions are unavailable.
- Confirm preview access is logged.
- Check the footer logo and all touched flows on desktop and mobile, then confirm the preview build is clean.
