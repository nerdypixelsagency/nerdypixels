# Phases 3–5 + Premium Overhaul (per the GODMODE brief)

Same Nerdy Pixels Academy: same content, prices, checkout, payments, emails and admin. It will look more polished, work better on phones and be readable by Google. Work runs in the order below without stopping, then gets tested at phone, tablet and desktop sizes.

## Stage A: Real pages Google can read (Phase 3 + brief sections 27–36)
- Each public page gets its own proper web address instead of a `#/` link: `/`, `/courses`, `/courses/digital-marketing`, `/curriculum`, `/faq`, `/blog`, `/blog/first-marketing-strategy`, `/events/first-marketing-strategy`, `/contact`, `/payment-policy`, `/privacy`, `/terms`, `/checkout`, `/onboarding`, `/pay-instalment`.
- The page text (headline, curriculum, pricing, testimonials, FAQs, links) is already there when the page first loads, so Google sees it without running scripts.
- Old `#/...` links and bookmarks still work and forward to the new addresses. Payment return, reminder "Pay now" links and email links are updated.
- Each page gets its own title, description, share preview and canonical address on bootcamp.npdacademy.com.
- Structured data: Organization, Course (bootcamp + curriculum), FAQ, Event, Article, Breadcrumbs.
- `sitemap.xml`, a sitemap line in robots.txt, and checkout/onboarding/admin kept out of search results.
- A share image (1200x630) in the brand style for WhatsApp and social previews.
- Google Search Console: I set up everything on the site side. You still need to verify the domain (see below).

## Stage B: Premium look and mobile overhaul (brief sections 04–18, 37–48)
- Uses the Halo reference only for principles: tighter headings, a clear type scale, even spacing, rounder panels, a clear order of buttons, subtle motion that turns off for people who prefer less motion. Brand purple and green, Poppins and all wording stay the same.
- Mobile first: a thumb-friendly menu and sticky header, tap targets at least 44px, no sideways scrolling, headlines that fit the screen, a sticky "Enrol" bar on the bootcamp page, and single-column checkout with a clear order summary.
- Forms: visible labels, inline errors, the right phone and email keyboards, clear loading and success states.
- Accessibility: contrast, focus outlines, alt text, skip link, one H1 per page with headings in order.
- Speed: resized, lazy-loaded images, fonts preloaded, the logo reserves its space so the page doesn't jump. The broken logo on the sign-in page gets fixed.
- A re-check of every item in the audit document (Module 4 badge, "Others" option, 10 October early-bird date, 1st-of-month instalments, profile form link, referral codes) so nothing slips.

## Stage C: Admin tools (Phase 4)
- Enrolment details page: full record, notes, "Resend welcome email", "Mark refunded" (with confirmation), and reminder history.
- "Add student manually" for offline or bank-transfer payments (marked as manual, with payment method and amount).
- Commissions page: per referral code, the sales, commission owed at a set rate, "Mark paid out" and payout history. Super admin sets the commission rate (default 10%, which you can change).
- Daily summary email to fegokendigital@gmail.com at 8am Lagos time: new sign-ups, money received, payments due or overdue.

## Stage D: Student area (Phase 5)
- Student sign-in at `/student` using a one-time emailed link sent through Resend. Students see only their own enrolment, payment history and receipts, plus a "Pay next instalment" button that uses the existing checkout.
- Cohort countdown and an early-bird deadline banner on the home page. The banner hides itself after 10 October.

## Testing
- Check each page's first-load text, titles, sitemap and redirects. Take phone (375px), tablet (768px) and desktop (1280px) screenshots of every page.
- Run checkout up to the Flutterwave page, the admin pages, and student sign-in.
- Finish with a report in the format the brief asks for.

## Needs you afterwards (cannot be done by me)
- Verify bootcamp.npdacademy.com in Google Search Console and submit the sitemap.
- Your cohort WhatsApp group link, and a TEST-mode payment to confirm payments work end to end.
- Publish, then redeploy on Vercel.

## Technical details
- Convert the hash router into TanStack file routes that reuse the existing page render functions. Share content data (modules, FAQs, prices) through a browser-safe module that both the page components and `app.js` read. Checkout and the payment logic in `app.js` stay the same; only navigation changes to History API links. A hash-to-path redirect runs on `/`.
- Page `head()` on each route, with canonical `https://bootcamp.npdacademy.com/...` and JSON-LD scripts. Static `public/sitemap.xml`.
- New migrations: `enrolments.source_type` (online/manual) and `admin_notes`. New `commission_payouts` table and `app_settings.commission_rate`, admin-only with grants and RLS. `student` access by matching email through a server function using requireSupabaseAuth; no student role is written to profiles.
- Daily summary sent through the existing pg_cron job pattern at a new `/api/public/cron/daily-summary` endpoint, protected by the cron token.
- Update the rules in AGENTS.md: routing moves from a hash router to file routes.
