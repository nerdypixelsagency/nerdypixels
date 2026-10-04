# Add GA4 tracking across Lovable, Vercel, and the custom domain

## Configuration and deployment coverage

- Use the already saved `GOOGLE_ANALYTICS_MEASUREMENT_ID`; no additional value is needed in chat.
- Add GA4 through the shared TanStack document head, which is this site’s equivalent of `index.html`, so every public, student, authentication, payment-return, and admin page receives the tag.
- Read the measurement ID through a server-served analytics configuration so the existing runtime variable works without exposing private environment data. The GA measurement ID itself is sent to the browser, as GA4 requires.
- Fail safely when the variable is absent: the site continues working, while analytics remains inactive rather than loading a malformed Google URL.
- Publish the completed change to the Lovable live domain.
- For the separately hosted Vercel/custom domain, confirm `GOOGLE_ANALYTICS_MEASUREMENT_ID` exists in Vercel’s Production environment and redeploy the frontend. This external Vercel setting cannot be changed from the project code, but the implementation will use the same variable name on both hosts.

## Page views and campaign URLs

- Keep the initial GA4 page view from the standard `gtag('config', ...)` initialization.
- Send exactly one additional `page_view` after each TanStack client-side route change, including the current path and full query string.
- Preserve `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` through internal navigation, while merging them with destination parameters such as checkout plans and blog filters.
- Preserve those UTM values during the legacy hash-link conversion too.

## Custom events

- After “Get the details” is successfully saved, send `generate_lead` with only:
  - `form_name: "bootcamp_get_details"`
  - `form_location: "hero"`
- Send `enrol_click` for enrolment and checkout calls to action with detailed `button_location` values such as `announcement_bar`, `header`, `mobile_menu`, `hero`, `lead_success`, `pricing`, `section_cta`, and `sticky_mobile`.
- Send `free_event_click` for free-event calls to action.
- Send `whatsapp_click` for the floating WhatsApp button.
- Guard every custom event with `typeof window.gtag === "function"` and never send names, email addresses, phone numbers, or form values.

## Verification

- Confirm Google’s script loads once with the configured ID on the Lovable deployment.
- Test a URL containing all four UTM parameters through multiple internal navigations and confirm they remain visible and readable.
- Capture emitted GA calls to verify the initial page view, one page view per route change, correct detailed CTA locations, and lead tracking only after successful storage.
- Re-test lead submission, checkout navigation, free-event navigation, WhatsApp, and page loading with analytics blocked or unavailable.
- Publish after the build and browser checks pass, then report the live Lovable URL and the exact Vercel redeploy requirement.
