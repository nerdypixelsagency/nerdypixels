# Hero lead form — balance and elevation

## Problem
The price card on the home hero stacks 6 full-width fields plus a button under the price block, making it much taller than the headline column beside it. The hero looks lopsided and the form feels like a wall of boxes.

## Changes (home hero price card only — wording, fields and behaviour stay the same)

1. **Compact the price block**
   - Smaller price figure (₦60,000) and tighter spacing between the early-bird pill, price and "Save 50%" line.
   - Remove the divider line and extra padding above the form so the card reads as one unit.

2. **Pair fields two-across on desktop**
   - First name + Last name (already paired).
   - Email + WhatsApp number side by side.
   - Country + "Where did you hear about us?" side by side.
   - Result: 3 rows of fields instead of 5 — the card shrinks by roughly a third and lines up with the headline column.
   - On phones everything stays single-column, full width, thumb-sized.

3. **Tighter, lighter fields**
   - Slightly shorter inputs (44px), smaller labels, less gap between rows.
   - Keep 16px text on mobile so iOS doesn't zoom.

4. **Calmer footer**
   - The privacy line and "Enrol now" link become one small, quiet line under the button.

## Verify
- Screenshot the hero at desktop (1280px) and phone (390px): card height roughly matches the left column, no sideways scrolling, form still submits and saves a lead (test entry deleted afterwards).

## Technical notes
- Edits in `src/site/app.js` (`priceCard()` markup — wrap fields in `grid g2` pairs) and `src/site/premium.css` (hero-scoped sizes/spacing).
- No changes to the lead-saving logic, admin Leads page, checkout, or any other page.
