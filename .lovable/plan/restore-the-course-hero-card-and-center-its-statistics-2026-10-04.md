# Restore the course hero card and center its statistics

## Changes

1. **Keep the lead form on the home-page hero**
   - The six-field lead form and Admin → Leads/CSV workflow remain unchanged.

2. **Restore only the Digital Marketing course hero card**
   - On `/courses/digital-marketing`, replace the lead form with the earlier price card content: early-bird/monthly price details, included benefits, and the checkout button.
   - Preserve the compact, responsive hero styling and direct the button to the correct early-bird or monthly checkout option.
   - Use separate home and course hero-card renderers so future edits to one do not unintentionally change the other.

3. **Center the course statistics cards on desktop**
   - Center each statistic and its label within the four-column row.
   - Keep the existing two-column phone layout readable and balanced.

4. **Update the payment reach copy site-wide**
   - Replace “Pay from anywhere in Africa” with “Pay from anywhere in the world” wherever that payment message appears.
   - Leave unrelated brand positioning about Africa’s emerging workforce unchanged.

## Verification

- Check the home page still shows and submits the lead form.
- Check `/courses/digital-marketing` shows the restored price-and-checkout card with no lead form.
- Confirm the course statistics are centered on desktop and remain tidy on mobile.
- Confirm the worldwide payment wording appears on both the home and course pages.
- Test the restored course CTA opens the correct checkout plan and confirm the page has no sideways scrolling.

## Technical notes

- Split the current shared hero price-card function in `src/site/app.js` into purpose-specific home lead and course checkout variants.
- Scope the statistics alignment and restored card presentation in `src/site/premium.css`/`src/site/site.css` without changing payment logic, lead storage, or the Admin Leads page.
