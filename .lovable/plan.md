# Add GA4 tracking and publish

## Tracking setup

1. **Load Google Analytics once across the whole site**
   - Add the standard asynchronous Google tag and inline `dataLayer`/`gtag` initialization to the shared document head used by every page.
   - Use `GOOGLE_ANALYTICS_MEASUREMENT_ID` as the source for the measurement ID; no visitor details or form values will be sent.
   - Because this TanStack site has no standalone `index.html`, place the equivalent markup in the shared root document that generates the final `<head>`.

2. **Track page views correctly**
   - Keep GA4’s automatic page view for the first page load.
   - Send one additional `page_view` after each client-side route change, including the full current path and query string, without duplicating the initial view.

3. **Preserve campaign parameters**
   - Preserve `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` during internal navigation and the legacy URL conversion path.
   - Keep unrelated destination parameters, such as checkout plan or blog filters, intact.
   - Confirm campaign parameters remain visible in the browser address and are available when GA4 records each page view.

## Custom events

- After the “Get the details” form has been saved successfully, send:
  - `generate_lead` with `form_name: "bootcamp_get_details"` and `form_location: "hero"`.
- Track enrolment/checkout calls to action with `enrol_click` and detailed `button_location` values:
  - `announcement_bar`, `header`, `mobile_menu`, `hero`, `lead_success`, `pricing`, `section_cta`, and `sticky_mobile` as applicable.
- Track visible free-event calls to action with `free_event_click`.
- Track the floating WhatsApp action with `whatsapp_click`.
- Guard every custom call with `typeof window.gtag === "function"` and send no names, email addresses, phone numbers, or other personal data.

## Verification

- Confirm the GA script uses the configured measurement ID and loads only once.
- Test a URL containing all four UTM parameters through multiple internal page changes and verify the parameters remain in the URL.
- Capture browser-side GA calls to confirm one initial page view, one page view per route change, successful lead tracking only after the save completes, and each requested click event with the correct location.
- Confirm the site still builds and the lead form, navigation, checkout links, free-event links, and WhatsApp button continue to work.

## Release

- Publish the verified changes to the live Lovable domain.
- The connected Vercel/custom-domain deployment may still require its normal frontend redeploy if it is managed separately.
