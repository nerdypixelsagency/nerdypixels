# Fix "We couldn't start the payment" on bootcamp.npdacademy.com

## What we know
- Payments are set to TEST mode.
- No new enrolment was saved when you clicked Pay (the last one was 26 Sept, 19:14). So the failure happens **before** Flutterwave is contacted — at the step where the site saves your details to the database.
- Before the Vercel keys were added, this step worked. The most likely cause is a missing or mistyped key on Vercel (the Supabase service key), but this is not yet confirmed.

## Steps
1. **Find the exact cause.** Reproduce checkout on the custom domain and on nerdypixels.lovable.app, and read the server error behind the message.
2. **Self-heal.** If the custom domain can't reach the database (missing/bad key), automatically pass the payment request to the fully set-up Lovable copy — the same backup route already used for sign-in — so checkout keeps working even if a Vercel key is wrong.
3. **Clearer errors.** Log the real reason (database vs. Flutterwave vs. missing key) so the next failure is diagnosed instantly; buyers still see a friendly message.
4. **Tell you which Vercel key to fix**, if one is wrong.
5. **Test** a TEST-mode checkout end to end until the Flutterwave page opens.

## Technical details
- `startPayment` in `src/lib/payments.functions.ts`: wrap `getPaymentMode`, insert and `flwCreatePayment` with distinct logged error codes.
- Check `relayMiddleware` in `src/start.ts`: relay when the server fn reports missing/invalid `SUPABASE_SERVICE_ROLE_KEY` or `FLW_*` env, not only when env is fully absent.
